import useAdminOverview from "./useAdminOverview";
import { inventorySizes } from "../data/inventory";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const dates = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });
const label = (value) => typeof value === "string" ? value.replaceAll("_", " ") : "—";
const dateValue = (order) => order.createdAt?.toMillis?.() || 0;
const tone = (value) => ({ approved: "approved", processing: "approved", packed: "approved", shipped: "shipped", delivered: "delivered" })[value] || "pending";

export default function AdminOverview() {
  const { loading, error, orders, products, retry } = useAdminOverview();
  if (loading) return <p className="admin-products-message" role="status">LOADING OVERVIEW...</p>;
  if (error) return <div><p className="admin-products-message" role="alert">{error}</p><button type="button" className="button button-dark" onClick={retry}>TRY AGAIN</button></div>;

  const approved = orders.filter((order) => order.payment?.status === "approved");
  const pending = orders.filter((order) => order.payment?.status === "pending_verification").length;
  const earnings = approved.reduce((sum, order) => sum + (Number.isFinite(order.total) ? Math.round(order.total * 100) : 0), 0) / 100;
  const lowStock = products.map((product) => ({ ...product, lowSizes: inventorySizes
    .filter((size) => Number.isInteger(product.stock?.[size]) && product.stock[size] >= 1 && product.stock[size] <= 2)
    .map((size) => ({ size, remaining: product.stock[size] })) })).filter((product) => product.lowSizes.length);
  const overviewMetrics = [
    { label: "Total Earnings", value: peso.format(earnings), note: "Approved payment totals" },
    { label: "Pending Verification", value: pending, note: "Awaiting payment review" },
    { label: "Approved Orders", value: approved.length, note: "Payment approved" },
    { label: "Orders to Ship", value: approved.filter((order) => order.orderStatus !== "delivered").length, note: "Approved, not yet delivered" },
    { label: "Low Stock", value: lowStock.length, note: "Products with sizes at 1–2 pieces" },
    { label: "Total Products", value: products.length, note: "Products in Firestore" },
  ];
  const recentOrders = [...orders].sort((a, b) => dateValue(b) - dateValue(a) || a.id.localeCompare(b.id)).slice(0, 5);
  const orderStatuses = [
    { label: "Pending Verification", count: pending, tone: "pending" },
    ...[["Processing", "processing"], ["Packed", "packed"], ["Shipped", "shipped"], ["Delivered", "delivered"], ["Payment Rejected", "payment_rejected"]]
      .map(([name, value]) => ({ label: name, count: orders.filter((order) => order.orderStatus === value).length, tone: tone(value) })),
  ];
  return (
    <>
      <section className="admin-metrics" aria-label="Store overview metrics">
        {overviewMetrics.map((metric, index) => (
          <article className={`admin-metric ${index === 0 ? "admin-metric-featured" : ""}`} key={metric.label}>
            <h2>{metric.label}</h2>
            <strong>{metric.value}</strong>
            <p>{metric.note}</p>
          </article>
        ))}
      </section>
      <section className="admin-data-panel" aria-labelledby="recent-orders-title">
        <header className="admin-section-heading">
          <h2 id="recent-orders-title">RECENT ORDERS</h2>
          <span>LATEST {String(recentOrders.length).padStart(2, "0")} / {orders.length} ORDERS</span>
        </header>
        <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Recent orders table">
          <table className="admin-orders-table">
            <thead><tr><th scope="col">ORDER</th><th scope="col">CUSTOMER</th><th scope="col">TOTAL</th><th scope="col">PAYMENT STATUS</th><th scope="col">ORDER / SHIPPING STATUS</th><th scope="col">DATE (PHT)</th></tr></thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <th scope="row">{order.orderNumber || order.id}</th><td>{order.customer?.fullName || "—"}</td><td>{Number.isFinite(order.total) ? peso.format(order.total) : "—"}</td>
                  <td><span className={`admin-status admin-status-${tone(order.payment?.status)}`}>{label(order.payment?.status)}</span></td>
                  <td><span className={`admin-status admin-status-${tone(order.orderStatus)}`}>{label(order.orderStatus)}</span></td>
                  <td>{order.createdAt?.toDate ? dates.format(order.createdAt.toDate()) : "Date unavailable"}</td>
                </tr>
              ))}
              {!recentOrders.length && <tr><td colSpan={6}>No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <div className="admin-overview-bottom">
        <section className="admin-data-panel" aria-labelledby="low-stock-title">
          <header className="admin-section-heading"><h2 id="low-stock-title">LOW STOCK</h2><span>{lowStock.length} PRODUCTS</span></header>
          <ul className="admin-stock-list">
            {lowStock.map((item) => (
              <li key={item.id}><div><strong>{item.name || item.id}</strong>{item.lowSizes.map(({ size, remaining }) => <span key={size}>SIZE {size} — {remaining} LEFT</span>)}</div></li>
            ))}
            {!lowStock.length && <li>{products.length ? "No sizes are low on stock." : "No products yet."}</li>}
          </ul>
        </section>
        <section className="admin-data-panel" aria-labelledby="order-status-title">
          <header className="admin-section-heading"><h2 id="order-status-title">ORDER STATUS</h2><span>{orders.length} ORDERS</span></header>
          <dl className="admin-status-list">
            {orderStatuses.map((status) => (
              <div key={status.label}><dt><span className={`admin-status-dot admin-status-${status.tone}`} />{status.label}</dt><dd>{String(status.count).padStart(2, "0")}</dd></div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}
