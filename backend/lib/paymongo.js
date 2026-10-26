const API_BASE = "https://api.paymongo.com/v1";
const QRPH_REFUND_API_BASE = "https://refunds-api.paymongo.com/v1";

function apiBase(qrphRefund) {
  return qrphRefund ? QRPH_REFUND_API_BASE : API_BASE;
}

function authHeader() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) {
    const error = new Error("PayMongo is not configured");
    error.status = 503;
    throw error;
  }
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

async function paymongoRequest(path, body, { idempotencyKey, qrphRefund = false } = {}) {
  const response = await fetch(`${apiBase(qrphRefund)}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader(), ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.errors?.[0]?.detail || "PayMongo request failed";
    const error = new Error(message);
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    error.paymongoStatus = response.status;
    error.paymongoPayload = payload;
    throw error;
  }
  return payload;
}

async function paymongoGet(path, { qrphRefund = false } = {}) {
  const response = await fetch(`${apiBase(qrphRefund)}${path}`, {
    method: "GET",
    headers: { Authorization: authHeader() },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.errors?.[0]?.detail || "PayMongo request failed";
    const error = new Error(message);
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw error;
  }
  return payload;
}

module.exports = { paymongoRequest, paymongoGet };
