const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const express = require("express");

const auth = require("../middleware/auth");
const supabase = require("../supabase");
const paymongo = require("../lib/paymongo");

auth.requireAuth = (req, _res, next) => {
  req.user = { id: "buyer-1", email: "buyer@example.com" };
  next();
};
auth.requireRole = () => (_req, _res, next) => next();

let order;
let intentStatus;
let createdRequests;
let updates;
supabase.getSupabase = () => ({
  from: () => ({
    select() { return this; },
    eq() { return this; },
    async single() { return { data: { ...order }, error: null }; },
    update(changes) {
      updates.push(changes);
      Object.assign(order, changes);
      return { async eq() { return { error: null }; } };
    },
  }),
});
paymongo.paymongoGet = async () => ({
  data: { attributes: { status: intentStatus, next_action: { redirect: { url: "https://pay.example/existing" } } } },
});
paymongo.paymongoRequest = async (path) => {
  createdRequests.push(path);
  if (path === "/payment_methods") return { data: { id: "pm-new" } };
  if (path === "/payment_intents") return { data: { id: "pi-new", attributes: { client_key: "key-new" } } };
  return { data: { attributes: { next_action: { redirect: { url: "https://pay.example/new" } } } } };
};

const app = express();
app.use(express.json());
app.use("/api/buyer/payments", require("../routes/buyer-payments"));
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

let server;
let baseUrl;
before(() => new Promise((resolve) => {
  server = app.listen(0, "127.0.0.1", () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));
after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

function resetOrder() {
  order = {
    id: 42, order_number: "TEST-42", buyer_id: "buyer-1", order_status: "pending",
    payment_method: "gcash", payment_status: "pending", total_amount: 1680,
    delivery_full_name: "Buyer", delivery_mobile_number: "09123456789",
    paymongo_payment_intent_id: "pi-existing",
  };
  createdRequests = [];
  updates = [];
}

async function retryPayment() {
  const response = await fetch(`${baseUrl}/api/buyer/payments/42/gcash-checkout`, { method: "POST" });
  return { status: response.status, body: await response.json() };
}

test("an active GCash attempt reopens without creating a second intent", async () => {
  resetOrder();
  intentStatus = "awaiting_next_action";
  const result = await retryPayment();
  assert.equal(result.status, 200);
  assert.equal(result.body.checkout_url, "https://pay.example/existing");
  assert.equal(createdRequests.length, 0);
  assert.equal(updates.length, 0);
});

test("a failed GCash attempt gets a new checkout on the same order", async () => {
  resetOrder();
  order.payment_status = "failed";
  intentStatus = "awaiting_payment_method";
  const result = await retryPayment();
  assert.equal(result.status, 200);
  assert.equal(result.body.checkout_url, "https://pay.example/new");
  assert.equal(createdRequests.length, 3);
  assert.equal(order.paymongo_payment_intent_id, "pi-new");
  assert.equal(order.payment_status, "pending");
});

test("a processing payment cannot start another GCash intent", async () => {
  resetOrder();
  intentStatus = "processing";
  const result = await retryPayment();
  assert.equal(result.status, 409);
  assert.equal(createdRequests.length, 0);
  assert.equal(updates.length, 0);
});
