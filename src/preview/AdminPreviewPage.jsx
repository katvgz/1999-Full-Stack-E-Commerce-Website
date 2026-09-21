import { useEffect, useState } from "react";
import { LayoutDashboard, ClipboardList, Truck, Shirt, Package, ArrowLeft, ArrowUpRight } from "lucide-react";
import { createPreviewData } from "./sampleData";
import { inventorySizes, stockSummary } from "../data/inventory";
import "../pages/AdminDashboardPage.css";
import "../pages/AdminOrders.css";
import "../pages/AdminProducts.css";
import "../pages/AdminInventory.css";
import "./preview.css";

const navigation = [["OVERVIEW", LayoutDashboard], ["ORDERS", ClipboardList], ["SHIPPING", Truck], ["PRODUCTS", Shirt], ["INVENTORY", Package]];
const money = (value) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
const label = (value) => value.replaceAll("_", " ");
const nextStatus = { processing: "packed", packed: "shipped", shipped: "delivered" };

function OrderTable({ orders }) {
  return <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Sample recent orders"><table className="admin-orders-table">
    <thead><tr>{["ORDER", "CUSTOMER", "TOTAL", "PAYMENT", "STATUS", "DATE"].map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
    <tbody>{orders.map((order) => <tr key={order.id}><th scope="row">{order.id}</th><td>{order.customer}</td><td>{money(order.total)}</td><td>{label(order.payment)}</td><td>{label(order.status)}</td><td>{order.date}</td></tr>)}</tbody>
  </table></div>;
}

function Overview({ data }) {
  const approved = data.orders.filter((order) => order.payment === "approved");
  const low = data.products.filter((product) => stockSummary(product.stock).status === "LOW STOCK");
  const metrics = [["Total Earnings", money(approved.reduce((sum, order) => sum + order.total, 0))],
    ["Pending Verification", data.orders.filter((order) => order.payment === "pending_verification").length],
    ["Approved Orders", approved.length], ["Orders to Ship", approved.filter((order) => order.status !== "delivered").length],
    ["Low Stock", low.length], ["Total Products", data.products.length]];
  return <><section className="admin-metrics">{metrics.map(([name, value], index) => <article key={name} className={`admin-metric ${index === 0 ? "admin-metric-featured" : ""}`}><h2>{name}</h2><strong>{value}</strong><p>Sample store activity</p></article>)}</section>
    <section className="admin-data-panel"><header className="admin-section-heading"><h2>RECENT ORDERS</h2><span>SAMPLE DATA</span></header><OrderTable orders={data.orders.slice(0, 5)} /></section>
    <div className="admin-overview-bottom"><section className="admin-data-panel"><header className="admin-section-heading"><h2>LOW STOCK</h2></header><ul className="admin-stock-list">{low.map((product) => <li key={product.id}><div><strong>{product.name}</strong>{inventorySizes.filter((size) => product.stock[size] > 0 && product.stock[size] <= 2).map((size) => <span key={size}>SIZE {size} — {product.stock[size]} LEFT</span>)}</div></li>)}{!low.length && <li>No low-stock products.</li>}</ul></section>
    <section className="admin-data-panel"><header className="admin-section-heading"><h2>ORDER STATUS</h2></header><dl className="admin-status-list">{["pending", "processing", "packed", "shipped", "delivered", "payment_rejected"].map((status) => <div key={status}><dt>{status === "pending" ? "Pending verification" : label(status)}</dt><dd>{data.orders.filter((order) => order.status === status).length}</dd></div>)}</dl></section></div></>;
}

function SampleOrder({ order, shipping, onAction }) {
  const [confirm, setConfirm] = useState(null);
  const [tracking, setTracking] = useState(order.tracking);
  const [courier, setCourier] = useState(order.courier);
  const [message, setMessage] = useState("");
  const next = nextStatus[order.status];
  function submit(event) {
    event.preventDefault();
    const result = onAction(order.id, confirm, tracking.trim(), courier.trim());
    setMessage(result || "Sample order updated. No email sent.");
    if (!result) setConfirm(null);
  }
  return <article className="admin-data-panel admin-real-order"><header className="admin-section-heading"><div><h2>{order.id}</h2><p>{order.date}</p></div><strong>{money(order.total)}</strong></header>
    <div className="admin-order-detail-grid"><section><h3>CUSTOMER</h3><p>{order.customer}</p><p>{order.email}</p></section><section><h3>STATUS</h3><p>{label(order.payment)} / {label(order.status)}</p></section><section><h3>SHIPPING ADDRESS</h3><p>{order.address}</p></section><section><h3>PRODUCTS</h3>{order.items.map((item) => <p key={`${item.productId}-${item.size}`}>{item.name} — {item.size} × {item.quantity}</p>)}</section>{order.tracking && <section><h3>TRACKING</h3><p>{order.courier} / {order.tracking}</p></section>}</div>
    <dl className="admin-order-totals"><div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div><div><dt>Shipping</dt><dd>{money(order.shippingFee)}</dd></div><div><dt>Total</dt><dd>{money(order.total)}</dd></div></dl>
    <div className="admin-payment-review">{confirm ? <form onSubmit={submit}><p>Confirm {label(confirm)} for {order.id}?</p>{confirm === "shipped" && <div className="admin-shipping-fields"><label>TRACKING REFERENCE<input required maxLength={150} value={tracking} onChange={(event) => setTracking(event.target.value)} /></label><label>COURIER (OPTIONAL)<input maxLength={100} value={courier} onChange={(event) => setCourier(event.target.value)} /></label></div>}<div className="admin-payment-actions"><button type="submit">CONFIRM</button><button type="button" className="admin-payment-secondary" onClick={() => setConfirm(null)}>CANCEL</button></div></form> : <div className="admin-payment-actions">{!shipping && order.payment === "pending_verification" && <><button onClick={() => setConfirm("approved")}>APPROVE PAYMENT</button><button className="admin-payment-secondary" onClick={() => setConfirm("rejected")}>REJECT PAYMENT</button></>}{shipping && next && <button onClick={() => setConfirm(next)}>MARK AS {next.toUpperCase()}</button>}{shipping && !next && <p>DELIVERED — FINAL</p>}</div>}{message && <p role="status">{message}</p>}</div>
  </article>;
}

function ProductEditor({ product, onSave, onCancel }) {
  const [name, setName] = useState(product?.name || "");
  const [price, setPrice] = useState(product?.price || "");
  const [category, setCategory] = useState(product?.category || "tops");
  return <form className="admin-product-editor" onSubmit={(event) => { event.preventDefault(); if (name.trim()) onSave({ name: name.trim(), price: Number(price), category }); }}><h2>{product ? "EDIT PRODUCT" : "ADD PRODUCT"}</h2><fieldset><label>PRODUCT NAME<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label><label>PRICE (PHP)<input required type="number" min="1" max="1000000" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label>CATEGORY<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="tops">Top</option><option value="bottoms">Bottom</option></select></label><div className="admin-product-actions"><button type="submit">SAVE PRODUCT</button><button type="button" className="admin-product-secondary" onClick={onCancel}>CANCEL</button></div></fieldset></form>;
}

function InventoryEditor({ product, onSave, onCancel }) {
  const [stock, setStock] = useState({ ...product.stock });
  return <form className="admin-product-editor" onSubmit={(event) => { event.preventDefault(); onSave(Object.fromEntries(inventorySizes.map((size) => [size, Number(stock[size])]))); }}><h2>RESTOCK / {product.name}</h2><fieldset>{inventorySizes.map((size) => <label key={size}>SIZE {size}<input required type="number" min="0" max="999" step="1" value={stock[size]} onChange={(event) => setStock({ ...stock, [size]: event.target.value })} /></label>)}<div className="admin-product-actions"><button type="submit">SAVE STOCK</button><button type="button" className="admin-product-secondary" onClick={onCancel}>CANCEL</button></div></fieldset></form>;
}

function Catalog({ products, inventory, onSave, onRemove }) {
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [message, setMessage] = useState("");
  const product = products.find((item) => item.id === editing);
  const save = (changes) => { onSave(editing, changes); setEditing(null); setMessage("Sample changes saved for this visit only."); };
  return <section className="admin-products"><div className="admin-products-toolbar"><span>{products.length} SAMPLE PRODUCTS</span>{!inventory && <button onClick={() => setEditing("new")}>ADD PRODUCT</button>}</div>
    {editing && (inventory ? <InventoryEditor key={editing} product={product} onSave={(stock) => save({ stock })} onCancel={() => setEditing(null)} /> : <ProductEditor key={editing} product={product} onSave={save} onCancel={() => setEditing(null)} />)}
    {message && <p className="admin-products-message" role="status">{message}</p>}
    <div className="admin-table-scroll" tabIndex={0} role="region" aria-label={inventory ? "Sample inventory" : "Sample products"}><table className="admin-orders-table admin-products-table"><thead><tr>{["IMAGE", "PRODUCT", ...(inventory ? ["S", "M", "L", "XL", "TOTAL", "STOCK STATUS"] : ["CATEGORY", "PRICE"]), "ACTIONS"].map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr></thead><tbody>{products.map((item) => { const summary = stockSummary(item.stock); return <tr key={item.id}><td><div className="admin-product-image">{item.images[0] ? <img src={item.images[0]} alt={item.name} /> : <span className="admin-product-no-image">NO IMAGE</span>}</div></td><th scope="row"><span className="admin-product-name">{item.name}</span><span className="admin-product-id">{item.id}</span></th>{inventory ? <>{inventorySizes.map((size) => <td key={size}>{item.stock[size]}</td>)}<td>{summary.total}</td><td>{summary.status}</td></> : <><td>{item.category === "tops" ? "Top" : "Bottom"}</td><td>{money(item.price)}</td></>}<td><div className="admin-product-actions"><button onClick={() => setEditing(item.id)}>{inventory ? "EDIT / RESTOCK" : "EDIT"}</button>{!inventory && (removing === item.id ? <><button onClick={() => { onRemove(item.id); setRemoving(null); if (editing === item.id) setEditing(null); setMessage("Sample product removed."); }}>CONFIRM REMOVE</button><button className="admin-product-secondary" onClick={() => setRemoving(null)}>CANCEL</button></> : <button className="admin-product-secondary" onClick={() => setRemoving(item.id)}>REMOVE</button>)}</div></td></tr>; })}{!products.length && <tr><td colSpan={inventory ? 9 : 5}>No sample products. Add a product in Products.</td></tr>}</tbody></table></div></section>;
}

export default function AdminPreviewPage() {
  const [data, setData] = useState(createPreviewData);
  const [section, setSection] = useState("OVERVIEW");
  useEffect(() => { document.title = "Admin Preview — 1999"; }, []);
  function orderAction(id, action, tracking, courier) {
    const order = data.orders.find((item) => item.id === id);
    if (!order) return "Sample order not found.";
    let products = data.products;
    let payment = order.payment;
    let status = order.status;
    if (["approved", "rejected"].includes(action)) {
      if (payment !== "pending_verification") return "This sample payment was already reviewed.";
      if (action === "approved") {
        const quantities = new Map();
        for (const item of order.items) {
          const key = `${item.productId}:${item.size}`;
          quantities.set(key, (quantities.get(key) || 0) + item.quantity);
        }
        for (const [key, quantity] of quantities) {
          const [productId, size] = key.split(":");
          const product = products.find((item) => item.id === productId);
          if (!product || product.stock[size] < quantity) return `Insufficient sample stock for ${product?.name || productId}, size ${size}. Restock in Inventory first.`;
        }
        products = products.map((product) => ({ ...product, stock: Object.fromEntries(inventorySizes.map((size) => [size, product.stock[size] - (quantities.get(`${product.id}:${size}`) || 0)])) }));
      }
      payment = action; status = action === "approved" ? "processing" : "payment_rejected";
    } else {
      if (payment !== "approved" || nextStatus[status] !== action) return "This sample order cannot move to that status.";
      if (action === "shipped" && !tracking) return "Enter a sample tracking reference.";
      status = action;
    }
    setData({ products, orders: data.orders.map((item) => item.id === id ? { ...item, payment, status, ...(action === "shipped" ? { tracking, courier } : {}) } : item) });
    return "";
  }
  function saveProduct(id, changes) {
    setData((current) => ({ ...current, products: id === "new" ? [...current.products, { id: `PREVIEW-${crypto.randomUUID()}`, images: [], stock: { S: 5, M: 5, L: 5, XL: 5 }, ...changes }] : current.products.map((product) => product.id === id ? { ...product, ...changes } : product) }));
  }
  const orders = section === "SHIPPING" ? data.orders.filter((order) => order.payment === "approved") : data.orders;
  return <div className="admin-dashboard admin-preview"><a className="skip-link" href="#preview-content">Skip to preview content</a><aside className="admin-sidebar"><div className="admin-sidebar-brand"><span>1999</span><p>ADMIN PREVIEW</p></div><nav aria-label="Admin preview navigation">{navigation.map(([name, Icon]) => <button key={name} aria-current={section === name ? "page" : undefined} onClick={() => setSection(name)}><Icon size={17} aria-hidden="true" />{name}</button>)}</nav><div className="admin-sidebar-bottom"><p>SAME PEOPLE.<br />DIFFERENT TIME.</p><a className="admin-logout" href="/"><ArrowLeft size={17} />BACK TO STORE</a></div></aside>
    <main className="admin-dashboard-main" id="preview-content"><div className="admin-dashboard-topline"><span>1999 / CONTROL ROOM</span><span className="admin-demo-label">PREVIEW MODE — CHANGES ARE NOT SAVED</span></div><header className="admin-dashboard-heading"><div><p className="admin-dashboard-eyebrow">THE EVERYDAY, AT A GLANCE.</p><h1>{section}</h1></div><ArrowUpRight size={40} aria-hidden="true" /></header><p className="admin-sample-note">Explore with fictional orders and sample products. Changes last only for this visit; refreshing resets the preview.</p>
      {section === "OVERVIEW" ? <Overview data={data} /> : ["PRODUCTS", "INVENTORY"].includes(section) ? <Catalog key={section} products={data.products} inventory={section === "INVENTORY"} onSave={saveProduct} onRemove={(id) => setData((current) => ({ ...current, products: current.products.filter((product) => product.id !== id) }))} /> : <section className="admin-real-orders">{orders.map((order) => <SampleOrder key={`${section}-${order.id}`} order={order} shipping={section === "SHIPPING"} onAction={orderAction} />)}{!orders.length && <p>No approved sample orders yet. Approve a payment in Orders.</p>}</section>}
      <footer className="admin-dashboard-footer"><span>1999 — THE EVERYDAY UNIFORM</span><span>PREVIEW / {section}</span></footer>
    </main></div>;
}
