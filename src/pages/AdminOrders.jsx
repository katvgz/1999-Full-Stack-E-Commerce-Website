import { useEffect, useRef, useState } from "react";
import { loadAdminAuth } from "../firebase/adminAuth";
import "./AdminOrders.css";
import { sendOrderStatusEmail } from "../firebase/orderEmail";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const dates = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila",
});
const text = (value) => typeof value === "string" && value.trim() ? value : "—";
const money = (value) => Number.isFinite(value) ? peso.format(value) : "—";
const status = (value) => text(value).replaceAll("_", " ");

function OrderDetails({ order, onReviewed }) {
  const [confirmation, setConfirmation] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const updateLock = useRef(false);
  const customer = order.customer || {};
  const payment = order.payment || {};
  const address = order.shippingAddress || {};
  const created = order.createdAt?.toDate?.();
  const addressLines = [address.street, address.barangay, address.city, address.province, address.postalCode]
    .filter((value) => typeof value === "string" && value.trim());

  async function reviewPayment() {
    if (updateLock.current || !confirmation || payment.status !== "pending_verification") return;
    updateLock.current = true;
    setUpdating(true);
    setFeedback(null);
    const decision = confirmation;
    try {
      const { auth } = await loadAdminAuth();
      if (auth.currentUser?.email !== "admin@gmail.com") throw new Error("Admin access required.");
      const [{ doc, runTransaction, serverTimestamp }, { getOrderDatabase }, { deductPaymentInventory }] = await Promise.all([
        import("firebase/firestore/lite"), import("../firebase/firebase"), import("../firebase/paymentInventory"),
      ]);
      const database = getOrderDatabase();
      const reference = doc(database, "orders", order.id);
      const result = await runTransaction(database, async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists()) throw new Error("Order no longer exists.");
        const current = snapshot.data();
        if (current.payment?.status !== "pending_verification") {
          return { order: { ...current, id: order.id }, alreadyReviewed: true };
        }
        if (decision === "approved") {
          await deductPaymentInventory(transaction, database, current.items);
        }
        const orderStatus = decision === "approved" ? "processing" : "payment_rejected";
        transaction.update(reference, {
          "payment.status": decision,
          orderStatus,
          paymentVerifiedAt: serverTimestamp(),
        });
        return { order: { ...current, id: order.id, payment: { ...current.payment, status: decision }, orderStatus }, alreadyReviewed: false };
      });
      onReviewed(result.order);
      setConfirmation(null);
      if (result.alreadyReviewed) {
        setFeedback({ error: true, text: "This payment has already been reviewed. Its current status is shown above." });
      } else {
        const email = await sendOrderStatusEmail(order.id, decision === "approved" ? "payment_approved" : "payment_rejected");
        setFeedback({ error: !email.ok, text: `Payment ${decision} successfully. ${email.message}` });
      }
    } catch (error) {
      setFeedback({ error: true, text: error.code?.startsWith("inventory/") ? error.message : error.code === "permission-denied"
        ? "Update denied. Check admin access and publish the updated Firestore rules. This payment may already have been reviewed."
        : "Could not confirm the payment update. Check your connection and try again." });
    } finally {
      updateLock.current = false;
      setUpdating(false);
    }
  }
  return (
    <article className="admin-data-panel admin-real-order">
      <header className="admin-section-heading">
        <div><h2>{text(order.orderNumber)}</h2><p>{created ? dates.format(created) + " (PHT)" : "Date unavailable"}</p></div>
        <strong>{money(order.total)}</strong>
      </header>
      <div className="admin-order-detail-grid">
        <section aria-label="Customer details">
          <h3>CUSTOMER</h3>
          <dl><dt>Name</dt><dd>{text(customer.fullName)}</dd><dt>Email</dt><dd>{text(customer.email)}</dd><dt>Phone</dt><dd>{text(customer.phone)}</dd></dl>
        </section>
        <section aria-label="Payment details">
          <h3>PAYMENT</h3>
          <dl><dt>Method</dt><dd>{payment.method === "gcash" ? "GCash" : payment.method === "bank_transfer" ? "Bank transfer" : text(payment.method)}</dd><dt>Reference code</dt><dd>{text(payment.referenceCode)}</dd><dt>Payment status</dt><dd><strong className={`admin-payment-status admin-payment-${payment.status === "approved" ? "approved" : payment.status === "rejected" ? "rejected" : "pending"}`}>{status(payment.status)}</strong></dd><dt>Order status</dt><dd>{status(order.orderStatus)}</dd></dl>
        </section>
        <section aria-label="Shipping address"><h3>SHIPPING ADDRESS</h3><p>{addressLines.length ? addressLines.join(", ") : "—"}</p></section>
        <section aria-label="Order notes"><h3>ORDER NOTES</h3><p className="admin-order-notes">{text(order.orderNotes)}</p></section>
      </div>
      <div className="admin-table-scroll" role="region" tabIndex={0} aria-label={`Products in ${text(order.orderNumber)}`}>
        <table className="admin-orders-table">
          <thead><tr><th scope="col">PRODUCT</th><th scope="col">SIZE</th><th scope="col">QUANTITY</th><th scope="col">UNIT PRICE</th></tr></thead>
          <tbody>{Array.isArray(order.items) && order.items.length ? order.items.map((item, index) => (
            <tr key={`${item.productId}-${item.size}-${index}`}><th scope="row">{text(item.productName)}</th><td>{text(item.size)}</td><td>{Number.isFinite(item.quantity) ? item.quantity : "—"}</td><td>{money(item.unitPrice)}</td></tr>
          )) : <tr><td colSpan={4}>No product details available.</td></tr>}</tbody>
        </table>
      </div>
      <dl className="admin-order-totals"><div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div><div><dt>Shipping fee</dt><dd>{money(order.shippingFee)}</dd></div><div><dt>Total</dt><dd>{money(order.total)}</dd></div></dl>
      {(payment.status === "pending_verification" || feedback) && (
        <div className="admin-payment-review" aria-busy={updating}>
          {payment.status === "pending_verification" && (confirmation ? (
            <>
              <p>Confirm {confirmation === "approved" ? "approval" : "rejection"} of payment for {text(order.orderNumber)}? This payment cannot be reviewed again.</p>
              <div className="admin-payment-actions">
                <button type="button" disabled={updating} onClick={reviewPayment}>{updating ? "UPDATING..." : confirmation === "approved" ? "CONFIRM APPROVAL" : "CONFIRM REJECTION"}</button>
                <button type="button" className="admin-payment-secondary" disabled={updating} onClick={() => { setConfirmation(null); setFeedback(null); }}>CANCEL</button>
              </div>
            </>
          ) : (
            <div className="admin-payment-actions">
              <button type="button" disabled={updating} onClick={() => { setConfirmation("approved"); setFeedback(null); }}>APPROVE PAYMENT</button>
              <button type="button" className="admin-payment-secondary" disabled={updating} onClick={() => { setConfirmation("rejected"); setFeedback(null); }}>REJECT PAYMENT</button>
            </div>
          ))}
          {feedback && <p className={feedback.error ? "admin-payment-error" : "admin-payment-success"} role={feedback.error ? "alert" : "status"}>{feedback.text}</p>}
        </div>
      )}
    </article>
  );
}

export default function AdminOrders({ pendingOnly = false, onPendingCountChange }) {
  const [state, setState] = useState({ loading: true, orders: [], error: "" });
  const pendingCount = state.orders.filter((order) => order.payment?.status === "pending_verification").length;
  useEffect(() => {
    onPendingCountChange?.(pendingCount);
  }, [pendingCount, onPendingCountChange]);

  useEffect(() => {
    let active = true;
    let generation = 0;
    let unsubscribe;
    loadAdminAuth().then(({ auth, onAuthStateChanged }) => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        const request = ++generation;
        setState({ loading: true, orders: [], error: "" });
        if (!user || user.email !== "admin@gmail.com") {
          setState({ loading: false, orders: [], error: "Orders are available only to the authorized admin account." });
          return;
        }
        try {
          const [{ collection, getDocs, orderBy, query }, { getOrderDatabase }] = await Promise.all([
            import("firebase/firestore/lite"), import("../firebase/firebase"),
          ]);
          if (!active || request !== generation) return;
          const snapshot = await getDocs(query(collection(getOrderDatabase(), "orders"), orderBy("createdAt", "desc")));
          if (!active || request !== generation) return;
          setState({ loading: false, orders: snapshot.docs.map((document) => ({ ...document.data(), id: document.id })), error: "" });
        } catch (error) {
          if (!active || request !== generation) return;
          setState({ loading: false, orders: [], error: error.code === "permission-denied"
            ? "Order access was denied. Sign in with the admin account and publish the updated Firestore rules."
            : "Orders could not be loaded. Check your connection and reopen Orders to try again." });
        }
      }, () => {
        if (active) {
          generation++;
          setState({ loading: false, orders: [], error: "Unable to verify admin access. Please sign in again." });
        }
      });
    }).catch(() => {
      if (active) setState({ loading: false, orders: [], error: "Unable to initialize admin access. Please sign in again." });
    });
    return () => { active = false; generation++; unsubscribe?.(); };
  }, []);

  if (state.loading) return <p className="admin-orders-message" role="status">LOADING ORDERS...</p>;
  if (state.error) return <p className="admin-orders-message" role="alert">{state.error}</p>;
  if (!state.orders.length) return <p className="admin-orders-message">NO ORDERS YET.</p>;
  const visibleOrders = pendingOnly ? state.orders.filter((order) => order.payment?.status === "pending_verification") : state.orders;
  if (!visibleOrders.length) return <p className="admin-orders-message">NO ORDERS WAITING FOR PAYMENT APPROVAL.</p>;
  return <section className="admin-real-orders" aria-label="Orders, newest first">{visibleOrders.map((order) => <OrderDetails key={order.id} order={order} onReviewed={(reviewed) => setState((current) => ({ ...current, orders: current.orders.map((item) => item.id === reviewed.id ? reviewed : item) }))} />)}</section>;
}
