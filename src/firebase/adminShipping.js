import { loadAdminAuth } from "./adminAuth";

export const shippingLabels = {
  processing: "Processing", packed: "Packed", shipped: "Shipped", delivered: "Delivered",
};
export const nextShippingStatus = {
  processing: "packed", packed: "shipped", shipped: "delivered",
};

export async function updateShippingStatus(orderId, expectedStatus, shipping = {}) {
  const { auth } = await loadAdminAuth();
  if (auth.currentUser?.email !== "admin@gmail.com") throw new Error("Admin access required.");
  const next = nextShippingStatus[expectedStatus];
  if (!next) throw new Error("No further shipping transition is available.");
  const tracking = { shippingReference: (shipping.shippingReference || "").trim(), courierName: (shipping.courierName || "").trim() };
  if (next === "shipped" && (!tracking.shippingReference || tracking.shippingReference.length > 150 || tracking.courierName.length > 100)) {
    throw Object.assign(new Error("Enter a tracking reference (up to 150 characters). Courier name is optional (up to 100 characters)."), { code: "shipping/invalid-tracking" });
  }
  const [{ doc, runTransaction, serverTimestamp }, { getOrderDatabase }] = await Promise.all([
    import("firebase/firestore/lite"), import("./firebase"),
  ]);
  const database = getOrderDatabase();
  const reference = doc(database, "orders", orderId);
  return runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) {
      const error = new Error("Order no longer exists.");
      error.code = "order/not-found";
      throw error;
    }
    const current = snapshot.data();
    // A stale screen must never advance an order beyond the step confirmed.
    if (current.payment?.status !== "approved" || current.orderStatus !== expectedStatus) {
      return { changed: false, order: { ...current, id: snapshot.id } };
    }
    const changes = { orderStatus: next, shippingUpdatedAt: serverTimestamp(), ...(next === "shipped" ? tracking : {}) };
    transaction.update(reference, changes);
    return { changed: true, order: { ...current, ...changes, id: snapshot.id } };
  });
}
