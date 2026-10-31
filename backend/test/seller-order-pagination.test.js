const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const express = require("express");

const auth = require("../middleware/auth");
const supabase = require("../supabase");

auth.requireAuth = (req, _res, next) => {
  req.user = { id: "seller-1" };
  req.profile = { role: "farm_worker", worker_category: "seller" };
  next();
};
auth.requireRole = () => (_req, _res, next) => next();

const orders = Array.from({ length: 215 }, (_, index) => {
  const id = index + 1;
  return {
    id, order_number: `JT-${id}`, buyer_id: "buyer-1",
    order_status: id <= 10 ? "pending" : id <= 20 ? "confirmed" : "completed",
    delivery_full_name: `Buyer ${id}`, delivery_mobile_number: "09123456789",
    created_at: new Date(Date.UTC(2026, 0, id)).toISOString(),
    subtotal: 100, shipping_fee: 0, total_amount: 100, items: [], history: [],
  };
});

supabase.getSupabase = () => ({
  from: () => {
    const query = {
      selected: null, options: {}, statuses: null, search: "", start: 0, end: Infinity,
      select(columns, options = {}) { this.selected = columns; this.options = options; return this; },
      in(_column, values) { this.statuses = values; return this; },
      or(filter) { this.search = filter.split("order_number.ilike.%")[1].split("%,")[0].toLowerCase(); return this; },
      order() { return this; },
      range(start, end) { this.start = start; this.end = end; return this; },
      then(resolve, reject) {
        let matching = orders.filter((order) => !this.statuses || this.statuses.includes(order.order_status));
        if (this.search) matching = matching.filter((order) =>
          [order.order_number, order.delivery_full_name, order.delivery_mobile_number]
            .some((value) => value.toLowerCase().includes(this.search)));
        matching.sort((a, b) => b.id - a.id);
        const result = {
          data: this.options.head ? null : matching.slice(this.start, this.end + 1),
          count: matching.length,
          error: null,
        };
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return query;
  },
});

const app = express();
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

test("seller order pages and stage counts include orders older than the former 200-order cap", async () => {
  const response = await fetch(`${baseUrl}/api/seller/orders?page=31&pageSize=7&stage=all`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.pagination.total, 215);
  assert.equal(body.pagination.totalPages, 31);
  assert.deepEqual(body.orders.map((order) => order.id), [5, 4, 3, 2, 1]);
  assert.deepEqual(body.counts, { all: 215, awaiting: 10, fulfillment: 10, completed: 195, cancelled: 0 });
});

test("seller order search returns an exact filtered total across all pages", async () => {
  const response = await fetch(`${baseUrl}/api/seller/orders?stage=completed&search=Buyer%2021&page=2&pageSize=3`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.pagination.total, 7);
  assert.equal(body.pagination.totalPages, 3);
  assert.equal(body.orders.length, 3);
  assert.ok(body.orders.every((order) => order.order_status === "completed" && order.delivery_full_name.includes("21")));
});

test("seller order requests past the last page return the last valid page", async () => {
  const response = await fetch(`${baseUrl}/api/seller/orders?page=99&pageSize=7&stage=all`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.pagination.page, 31);
  assert.deepEqual(body.orders.map((order) => order.id), [5, 4, 3, 2, 1]);
});
