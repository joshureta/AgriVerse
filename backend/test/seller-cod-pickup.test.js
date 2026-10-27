const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const express = require("express");

const auth = require("../middleware/auth");
const supabase = require("../supabase");
const notifications = require("../lib/order-notifications");

auth.requireAuth = (req, _res, next) => {
  req.user = { id: "seller-1" };
  req.profile = { worker_category: "seller" };
  next();
};
auth.requireRole = () => (_req, _res, next) => next();
notifications.createOrderStatusNotification = async () => {};

let order;
let paymentUpdates = 0;
let settleInRpc = false;
supabase.getSupabase = () => ({
  rpc: async (_name, { p_new_status }) => {
    order.order_status = p_new_status;
    if (settleInRpc && order.payment_method === "cash") order.payment_status = "paid";
    return { data: { ...order }, error: null };
  },
  from: () => {
    const filters = [];
    let changes;
    return {
      update(value) { changes = value; return this; },
      eq(column, value) { filters.push([column, value]); return this; },
      select() { return this; },
      async maybeSingle() {
        if (filters.every(([column, value]) => order[column] === value)) {
          Object.assign(order, changes);
          paymentUpdates += 1;
          return { data: { ...order }, error: null };
        }
        return { data: null, error: null };
      },
    };
  },
});

const app = express();
app.use(express.json());
app.use("/api/seller/orders", require("../routes/seller-orders"));

let server;
let baseUrl;
before(() => new Promise((resolve) => {
  server = app.listen(0, "127.0.0.1", () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));
after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

test("completing a cash pickup also marks its payment paid", async () => {
  order = {
    id: 38, order_number: "TEST-38", buyer_id: "buyer-1",
    delivery_method: "pickup", payment_method: "cash", payment_status: "unpaid",
    order_status: "ready_for_pickup", subtotal: 100, shipping_fee: 0,
    total_amount: 100, items: [],
  };
  paymentUpdates = 0;
  settleInRpc = false;
  const response = await fetch(`${baseUrl}/api/seller/orders/38/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "completed" }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).order.payment_status, "paid");
  assert.equal(order.payment_status, "paid");
  assert.equal(paymentUpdates, 1);
});

test("a cash pickup already settled by the database is not updated again", async () => {
  order = {
    id: 39, order_number: "TEST-39", buyer_id: "buyer-1",
    delivery_method: "pickup", payment_method: "cash", payment_status: "unpaid",
    order_status: "ready_for_pickup", subtotal: 100, shipping_fee: 0,
    total_amount: 100, items: [],
  };
  paymentUpdates = 0;
  settleInRpc = true;
  const response = await fetch(`${baseUrl}/api/seller/orders/39/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "completed" }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).order.payment_status, "paid");
  assert.equal(paymentUpdates, 0);
});
