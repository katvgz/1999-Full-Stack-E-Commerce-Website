let currentAttempt = null;
let inFlight = false;
let confirmedReceipt = null;

export function getConfirmedReceipt() {
  return confirmedReceipt;
}

export async function submitOrder(draft) {
  if (inFlight)
    throw new Error("An order is already being submitted. Please wait.");
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error(
      "You’re offline. Reconnect and try again. Your bag and details have been kept.",
    );
  }
  inFlight = true;
  try {
    const [{ collection, doc, serverTimestamp, setDoc }, { getOrderDatabase }] = await Promise.all([
      import("firebase/firestore/lite"),
      import("./firebase"),
    ]);
    const fingerprint = JSON.stringify(draft);
    if (!currentAttempt || currentAttempt.fingerprint !== fingerprint) {
      const reference = doc(collection(getOrderDatabase(), "orders"));
      currentAttempt = {
        fingerprint,
        reference,
        orderNumber: `1999-${reference.id}`,
      };
    }
    // Retries of an unchanged order reuse the same generated document ID.
    // Create-only rules prevent a retry from producing a second order document.
    const attempt = currentAttempt;
    await setDoc(attempt.reference, {
      ...draft,
      orderNumber: attempt.orderNumber,
      payment: {
        method: draft.payment.method,
        referenceCode: draft.payment.referenceCode,
        status: "pending_verification",
      },
      orderStatus: "pending",
      createdAt: serverTimestamp(),
    });
    // Only the server-acknowledged write can set this in-memory receipt.
    confirmedReceipt = {
      orderNumber: attempt.orderNumber,
      firstName: draft.customer.fullName.trim().split(/\s+/)[0],
    };
    currentAttempt = null;
    return confirmedReceipt;
  } catch (error) {
    if (error.code === "permission-denied")
      throw new Error(
        "Your order could not be submitted. Please try again or contact 1999. Your bag and details have been kept.",
      );
    if (error.code === "app/missing-config")
      throw new Error(
        "Ordering is temporarily unavailable. Please try again later. Your bag and details have been kept.",
      );
    if (error.code)
      throw new Error(
        "We couldn’t confirm your order. Check your connection and try again. Your bag and details have been kept.",
      );
    throw error;
  } finally {
    inFlight = false;
  }
}
