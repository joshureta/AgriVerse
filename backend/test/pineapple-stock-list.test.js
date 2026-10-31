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

const sizes = Array.from({ length: 7 }, (_, index) => ({ id: index + 1, size_name: `Size ${index + 1}` }));
const lots = [
  { id: 1, item_name: "Size 1 Pineapple", category: { code: "pineapple" }, quantity: 4, updated_at: "2026-10-01T00:00:00Z", unit: { abbreviation: "pcs" }, pineapple_inventory: { size_id: 1 } },
  { id: 2, item_name: "Size 1 Pineapple", category: { code: "pineapple" }, quantity: 7, updated_at: "2026-10-03T00:00:00Z", unit: { abbreviation: "pcs" }, pineapple_inventory: { size_id: 1 } },
  { id: 3, item_name: "Size 7 Pineapple", category: { code: "pineapple" }, quantity: 3, updated_at: "2026-10-02T00:00:00Z", unit: { abbreviation: "pcs" }, pineapple_inventory: { size_id: 7 } },
];

supabase.getSupabase = () => ({
  from(table) {
    const query = {
      table, options: {}, filters: [], start: 0, end: Infinity,
      select(_columns, options = {}) { this.options = options; return this; },
      eq(column, value) { this.filters.push([column, "eq", value]); return this; },
      neq(column, value) { this.filters.push([column, "neq", value]); return this; },
      is(column, value) { this.filters.push([column, "is", value]); return this; },
      not(column, operator, value) { this.filters.push([column, `not-${operator}`, value]); return this; },
      order() { return this; },
      range(start, end) { this.start = start; this.end = end; return this; },
      async maybeSingle() { return { data: { id: 1 }, error: null }; },
      then(resolve, reject) {
        let data = this.table === "pineapple_sizes" ? sizes : this.table === "inventory_items" ? lots : [];
        if (this.table === "inventory_items") {
          if (this.filters.some(([column, operator]) => column === "archived_at" && operator === "not-is")) data = [];
          if (this.filters.some(([column, operator, value]) => column === "inventory_category_id" && operator === "neq" && value === 1)) data = [];
        }
        const result = { data: this.options.head ? null : data.slice(this.start, this.end + 1), count: data.length, error: null };
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return query;
  },
});

const app = express();
app.use("/api/seller/inventory", require("../routes/admin-inventory"));
let server;
let baseUrl;
before(() => new Promise((resolve) => {
  server = app.listen(0, "127.0.0.1", () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));
after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

test("pineapple stock groups lots by size before pagination and includes zero-stock sizes", async () => {
  const first = await (await fetch(`${baseUrl}/api/seller/inventory?page=1&pageSize=5`)).json();
  assert.equal(first.pagination.total, 7);
  assert.equal(first.pagination.totalPages, 2);
  assert.equal(first.items.length, 5);
  assert.equal(first.items[0].stock_quantity, 11);
  assert.equal(first.items[0].updated_at, "2026-10-03T00:00:00Z");
  assert.equal(first.items[1].stock_quantity, 0);

  const second = await (await fetch(`${baseUrl}/api/seller/inventory?page=2&pageSize=5`)).json();
  assert.deepEqual(second.items.map((item) => item.details.size_id), [6, 7]);
  assert.equal(second.items[1].stock_quantity, 3);
  assert.equal(second.viewCounts.stock, 7);
});

test("pineapple stock alerts use size totals rather than individual lot quantities", async () => {
  const response = await fetch(`${baseUrl}/api/seller/inventory/alerts`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.stock.out, 5);
  assert.equal(body.stock.low, 1);
  assert.equal(body.stock.examples.low[0].quantity, 3);
});
