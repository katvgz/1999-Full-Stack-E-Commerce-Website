export const emailEvents = ["payment_approved", "payment_rejected", "packed", "shipped", "delivered"];
const copy = {
  payment_approved: { title: "PAYMENT VERIFIED.", status: "Processing", message: "Your payment has been verified. Your order is now processing." },
  payment_rejected: { title: "PAYMENT UPDATE.", status: "Payment Rejected", message: "Payment verification was unsuccessful for your order." },
  packed: { title: "PACKED & READY.", status: "Packed", message: "Your order has been packed." },
  shipped: { title: "ON ITS WAY.", status: "Shipped", message: "Your order has been shipped. Your tracking details are below." },
  delivered: { title: "DELIVERED.", status: "Delivered", message: "Your order has been marked delivered." },
};
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export function buildOrderEmail(order, event, from) {
  if (!emailEvents.includes(event)) throw new Error("Unsupported email event.");
  const email = order.customer?.email;
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error("The order has no valid customer email.");
  if (typeof order.orderNumber !== "string" || /[\r\n]/.test(order.orderNumber)) throw new Error("Invalid order number.");
  const shipping = ["processing", "packed", "shipped", "delivered"];
  const allowed = event === "payment_approved" ? order.payment?.status === "approved"
    : event === "payment_rejected" ? order.payment?.status === "rejected"
    : order.payment?.status === "approved" && shipping.indexOf(order.orderStatus) >= shipping.indexOf(event);
  if (!allowed) throw new Error("The saved order does not match this email event.");
  if (event === "shipped" && !order.shippingReference?.trim()) throw new Error("Shipping reference is missing.");
  const details = copy[event];
  const tracking = event === "shipped" ? [
    ...(order.courierName ? [["Courier", order.courierName]] : []),
    ["Shipping / tracking reference", order.shippingReference],
  ] : [];
  const rows = [["Order number", order.orderNumber], ["Status", details.status], ...tracking];
  const text = ["1999", details.title, details.message, ...rows.map(([key, value]) => `${key}: ${value}`)].join("\n\n");
  const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#eeede7;color:#20211e;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px"><tr><td style="background:#20211e;color:#eeede7;padding:32px;font-size:64px;font-weight:900;letter-spacing:-6px">1999</td></tr><tr><td style="padding:32px 24px;border:1px solid #ccc9bc"><p style="font-size:10px;letter-spacing:2px;margin:0 0 20px">ORDER UPDATE</p><h1 style="font-size:30px;line-height:1.1;margin:0 0 20px">${details.title}</h1><p style="font-size:15px;line-height:1.7">${details.message}</p>${rows.map(([key, value]) => `<p style="margin:24px 0 0;font-size:10px;letter-spacing:1px;text-transform:uppercase">${escapeHtml(key)}</p><p style="margin:7px 0 0;font-size:17px;font-weight:bold;overflow-wrap:anywhere">${escapeHtml(value)}</p>`).join("")}<p style="border-top:1px solid #ccc9bc;padding-top:24px;margin-top:32px;font-size:10px;letter-spacing:1px">1999 / CUSTOMER ORDER NOTIFICATION</p></td></tr></table></td></tr></table></body></html>`;
  return { from, to: [email], subject: `1999 — ${details.status} — ${order.orderNumber}`, html, text };
}
