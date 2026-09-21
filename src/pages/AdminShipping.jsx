import { useEffect, useRef, useState } from "react";
import { loadAdminAuth } from "../firebase/adminAuth";
import { shippingLabels, nextShippingStatus, updateShippingStatus } from "../firebase/adminShipping";
import "./AdminOrders.css";
import { sendOrderStatusEmail } from "../firebase/orderEmail";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const dates = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

function ShippingOrder({ order, onUpdated }) {
  const [confirmation, setConfirmation] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [shippingReference, setShippingReference] = useState(order.shippingReference || "");
  const [courierName, setCourierName] = useState(order.courierName || "");
  const lock = useRef(false);
  const currentStatus = shippingLabels[order.orderStatus] || "Unknown status";
  const next = nextShippingStatus[order.orderStatus];
  const address = order.shippingAddress || {};
  const addressText = [address.street, address.barangay, address.city, address.province, address.postalCode]
    .filter((value) => typeof value === "string" && value.trim()).join(", ");
  const created = order.createdAt?.toDate?.();

  async function confirmUpdate() {
    if (lock.current || !confirmation) return;
    if (confirmation === "packed" && !shippingReference.trim()) {
      setFeedback({ error: true, text: "Enter a shipping reference / tracking number before marking this order Shipped." });
      return;
    }
    lock.current = true;
    setUpdating(true);
    setFeedback(null);
    try {
      const result = await updateShippingStatus(order.id, confirmation, { shippingReference, courierName });
      onUpdated(result.order);
      setConfirmation(null);
      if (result.changed) {
        const email = await sendOrderStatusEmail(order.id, result.order.orderStatus);
        setFeedback({ error: !email.ok, text: `Shipping status updated to ${shippingLabels[result.order.orderStatus]}. ${email.message}` });
      } else {
        setFeedback({ error: true, text: "This order changed since it was loaded. Its latest status is now shown; no shipping update was made." });
      }
    } catch (error) {
      setFeedback({ error: true, text: error.code === "shipping/invalid-tracking" ? error.message : error.code === "permission-denied"
        ? "Update denied. Check admin access and publish the updated Firestore rules."
        : error.code === "order/not-found" ? "This order no longer exists. Reopen Shipping to refresh the list."
        : "Could not confirm the shipping update. Check your connection and try again." });
    } finally {
      lock.current = false;
      setUpdating(false);
    }
  }

  return (
    <article className="admin-data-panel admin-real-order">
      <header className="admin-section-heading">
        <div><h2>{order.orderNumber || "Order number unavailable"}</h2><p>{created ? dates.format(created) + " (PHT)" : "Date unavailable"}</p></div>
        <strong>{Number.isFinite(order.total) ? peso.format(order.total) : "—"}</strong>
      </header>
      <div className="admin-order-detail-grid">
        <section><h3>CUSTOMER</h3><p>{order.customer?.fullName || "—"}</p></section>
        <section><h3>SHIPPING STATUS</h3><p><strong>{currentStatus}</strong>{order.orderStatus === "delivered" ? " — Final" : ""}</p></section>
        <section><h3>SHIPPING ADDRESS</h3><p>{addressText || "—"}</p></section>
        <section><h3>TOTAL</h3><p>{Number.isFinite(order.total) ? peso.format(order.total) : "—"}</p></section>
        {order.shippingReference && <section><h3>TRACKING REFERENCE</h3><p>{order.shippingReference}</p>{order.courierName && <p>Courier: {order.courierName}</p>}</section>}
      </div>
      <div className="admin-table-scroll" role="region" tabIndex={0} aria-label={`Products in ${order.orderNumber || "order"}`}>
        <table className="admin-orders-table">
          <thead><tr><th scope="col">PRODUCT</th><th scope="col">SIZE</th><th scope="col">QUANTITY</th></tr></thead>
          <tbody>{Array.isArray(order.items) && order.items.length ? order.items.map((item, index) => (
            <tr key={`${item.productId}-${item.size}-${index}`}><th scope="row">{item.productName || "—"}</th><td>{item.size || "—"}</td><td>{Number.isFinite(item.quantity) ? item.quantity : "—"}</td></tr>
          )) : <tr><td colSpan={3}>No product details available.</td></tr>}</tbody>
        </table>
      </div>
      <div className="admin-payment-review" aria-busy={updating}>
        {next && (confirmation ? (
          <>
            <p>Change {order.orderNumber} from {shippingLabels[confirmation]} to {shippingLabels[nextShippingStatus[confirmation]]}? This cannot be moved backward.</p>
            {confirmation === "packed" && <div className="admin-shipping-fields">
              <label>SHIPPING REFERENCE / TRACKING NUMBER<input required maxLength={150} value={shippingReference} disabled={updating} onChange={(event) => setShippingReference(event.target.value)} /></label>
              <label>COURIER NAME (OPTIONAL)<input maxLength={100} value={courierName} disabled={updating} onChange={(event) => setCourierName(event.target.value)} /></label>
            </div>}
            <div className="admin-payment-actions">
              <button type="button" disabled={updating} onClick={confirmUpdate}>{updating ? "UPDATING..." : "CONFIRM STATUS CHANGE"}</button>
              <button type="button" className="admin-payment-secondary" disabled={updating} onClick={() => { setConfirmation(null); setFeedback(null); }}>CANCEL</button>
            </div>
          </>
        ) : (
          <div className="admin-payment-actions"><button type="button" disabled={updating} onClick={() => { setConfirmation(order.orderStatus); setFeedback(null); }}>MARK AS {shippingLabels[next].toUpperCase()}</button></div>
        ))}
        {!next && <p>{order.orderStatus === "delivered" ? "DELIVERED — No further status changes." : "No valid shipping transition is available for this order."}</p>}
        {feedback && <p role={feedback.error ? "alert" : "status"} className={feedback.error ? "admin-payment-error" : "admin-payment-success"}>{feedback.text}</p>}
      </div>
    </article>
  );
}

export default function AdminShipping() {
  const [state, setState] = useState({ loading: true, orders: [], error: "" });
  useEffect(() => {
    let active = true;
    let generation = 0;
    let unsubscribe;
    loadAdminAuth().then(({ auth, onAuthStateChanged }) => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!active) return;
        const request = ++generation;
        setState({ loading: true, orders: [], error: "" });
        if (user?.email !== "admin@gmail.com") {
          setState({ loading: false, orders: [], error: "Shipping is available only to the authorized admin account." });
          return;
        }
        try {
          const [{ collection, getDocs, query, where }, { getOrderDatabase }] = await Promise.all([
            import("firebase/firestore/lite"), import("../firebase/firebase"),
          ]);
          if (!active || request !== generation) return;
          const snapshot = await getDocs(query(collection(getOrderDatabase(), "orders"), where("payment.status", "==", "approved")));
          if (!active || request !== generation) return;
          const orders = snapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
          orders.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
          setState({ loading: false, orders, error: "" });
        } catch (error) {
          if (!active || request !== generation) return;
          setState({ loading: false, orders: [], error: error.code === "permission-denied"
            ? "Shipping access denied. Check admin access and publish the updated Firestore rules."
            : "Shipping orders could not be loaded. Check your connection and reopen Shipping to try again." });
        }
      }, () => {
        if (active) { generation++; setState({ loading: false, orders: [], error: "Unable to verify admin access. Please sign in again." }); }
      });
    }).catch(() => {
      if (active) setState({ loading: false, orders: [], error: "Unable to initialize admin access. Please sign in again." });
    });
    return () => { active = false; generation++; unsubscribe?.(); };
  }, []);

  if (state.loading) return <p className="admin-orders-message" role="status">LOADING SHIPPING ORDERS...</p>;
  if (state.error) return <p className="admin-orders-message" role="alert">{state.error}</p>;
  if (!state.orders.length) return <p className="admin-orders-message">NO APPROVED ORDERS YET.</p>;
  return <section className="admin-real-orders" aria-label="Approved orders for shipping">{state.orders.map((order) => (
    <ShippingOrder key={order.id} order={order} onUpdated={(updated) => setState((current) => ({ ...current, orders: current.orders.map((item) => item.id === updated.id ? updated : item).filter((item) => item.payment?.status === "approved") }))} />
  ))}</section>;
}
