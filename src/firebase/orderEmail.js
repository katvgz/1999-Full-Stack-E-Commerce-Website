import { loadAdminAuth } from "./adminAuth";

// Send once after the order transaction commits. Email failure never rolls back
// a saved payment or shipping update.
export async function sendOrderStatusEmail(orderId, event) {
  try {
    const { auth } = await loadAdminAuth();
    if (!auth.currentUser) throw new Error("Sign-in required.");
    const token = await auth.currentUser.getIdToken();
    const response = await fetch("/api/order-status-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderId, event }),
      signal: AbortSignal.timeout(60000),
    });
    const result = await response.json();
    return response.ok
      ? { ok: true, message: "Email accepted by Resend." }
      : { ok: false, message: result.error || "Email could not be sent. The order update is saved." };
  } catch {
    return { ok: false, message: "Email could not be confirmed. The order update is saved." };
  }
}
