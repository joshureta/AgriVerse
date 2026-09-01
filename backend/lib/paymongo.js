const API_BASE = "https://api.paymongo.com/v1";

function authHeader() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) {
    const error = new Error("PayMongo is not configured");
    error.status = 503;
    throw error;
  }
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

async function paymongoRequest(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify(body),
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

async function paymongoGet(path) {
  const response = await fetch(`${API_BASE}${path}`, {
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
