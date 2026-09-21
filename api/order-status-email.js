import { serverFirebase } from "../server/firebaseAdmin.js";
import { buildOrderEmail, emailEvents } from "../server/orderEmailTemplate.js";

function reply(response, status, value) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(value));
}
function failure(status, message) { return Object.assign(new Error(message), { httpStatus: status }); }

async function readBody(request) {
  if (!request.headers["content-type"]?.startsWith("application/json")) throw failure(415, "JSON required.");
  if (Number(request.headers["content-length"] || 0) > 2048) throw failure(413, "Request too large.");
  let body = request.body;
  if (body === undefined) {
    let raw = "";
    for await (const chunk of request) {
      raw += chunk;
      if (Buffer.byteLength(raw) > 2048) throw failure(413, "Request too large.");
    }
    body = raw;
  }
  try { if (typeof body === "string") body = JSON.parse(body); }
  catch { throw failure(400, "Invalid JSON."); }
  if (!body || Array.isArray(body) || Object.keys(body).some((key) => !["orderId", "event"].includes(key)) ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(body.orderId || "") || !emailEvents.includes(body.event)) throw failure(400, "Invalid order email request.");
  return body;
}

export default async function handler(request, response) {
  if (request.method !== "POST") { response.setHeader("Allow", "POST"); return reply(response, 405, { error: "POST required." }); }
  const bearer = request.headers.authorization;
  if (typeof bearer !== "string" || !bearer.startsWith("Bearer ")) return reply(response, 401, { error: "Admin sign-in required." });
  try {
    const body = await readBody(request);
    let services;
    try { services = serverFirebase(); } catch { throw failure(503, "Server Firebase credentials are not configured."); }
    let token;
    try { token = await services.auth.verifyIdToken(bearer.slice(7), true); }
    catch { throw failure(401, "Your session could not be verified. Sign in again."); }
    if (token.email !== "admin@gmail.com" || token.firebase?.sign_in_provider !== "password") throw failure(403, "Admin access required.");
    if (!process.env.RESEND_API_KEY) throw failure(503, "Server email configuration is missing RESEND_API_KEY.");
    const sender = process.env.RESEND_FROM || "1999 <onboarding@resend.dev>";
    if (/[\r\n]/.test(sender)) throw failure(503, "Invalid sender configuration.");

    const order = await services.db.collection("orders").doc(body.orderId).get();
    if (!order.exists) throw failure(404, "Order not found.");
    let payload;
    try { payload = buildOrderEmail(order.data(), body.event, sender); }
    catch (error) { throw failure(409, error.message); }
    const provider = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json",
        "Idempotency-Key": "1999/" + body.orderId + "/" + body.event,
      },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(15000),
    });
    const result = await provider.json();
    if (!provider.ok || typeof result.id !== "string") throw failure(502, provider.status === 403
      ? "Email not sent. Verify the Resend sender domain; the testing sender only sends to your Resend account email."
      : "Email could not be confirmed. The order update is saved.");
    return reply(response, 200, { status: "sent" });
  } catch (error) {
    // Never log request credentials, service-account keys, or customer data.
    if (!error.httpStatus) console.error("[order-status-email]", error.code || "server-error");
    return reply(response, error.httpStatus || 503, { error: error.httpStatus ? error.message : "Email service is temporarily unavailable. The order update is saved." });
  }
}
