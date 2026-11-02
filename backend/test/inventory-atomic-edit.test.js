const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const express = require("express");

const auth = require("../middleware/auth");
const supabase = require("../supabase");

auth.requireAuth = (req, _res, next) => {
  req.user = { id: "admin-1" };
  req.profile = { role: "admin" };
  next();
};

const calls = [];
let rpcError = null;
const item = {
  id: 12, inventory_category_id: 2, unit_id: 3, item_name: "Complete Fertilizer",
  quantity: 20, category: { category_name: "Fertilizer", code: "fertilizer" },
  unit: { abbreviation: "bags" }, fertilizer_inventory: { formulation: "14-14-14" },
};

supabase.getSupabase = () => ({
  from(table) {
    return {
      select() { return this; },
      eq() { return this; },
      single: async () => {
        if (table === "inventory_categories") return { data: { id: 2, code: "fertilizer" }, error: null };
        if (table === "measurement_units") return { data: { id: 3 }, error: null };
        if (table === "inventory_items") return { data: item, error: null };
        throw new Error(`Unexpected table: ${table}`);
      },
      update() { throw new Error("Edit must not write the item outside the RPC"); },
      delete() { throw new Error("Edit must not delete details outside the RPC"); },
      insert() { throw new Error("Edit must not insert details outside the RPC"); },
    };
  },
  async rpc(name, args) {
    calls.push({ name, args });
    return { data: rpcError ? null : 12, error: rpcError };
  },
});

const app = express();
app.use(express.json());
app.use("/api/admin/inventory", require("../routes/admin-inventory"));
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

async function edit() {
  return fetch(`${baseUrl}/api/admin/inventory/12`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inventory_category_id: 2, unit_id: 3, item_name: "Complete Fertilizer",
      formulation: "14-14-14",
    }),
  });
}

test("item edits use one atomic RPC instead of separate database writes", async () => {
  calls.length = 0;
  rpcError = null;
  const response = await edit();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).item.stock_quantity, 20);
  assert.deepEqual(calls, [{
    name: "update_inventory_item",
    args: {
      p_item_id: 12, p_inventory_category_id: 2, p_unit_id: 3,
      p_item_name: "Complete Fertilizer", p_detail: { formulation: "14-14-14" },
    },
  }]);
});

test("an edit RPC failure returns an error without making separate writes", async () => {
  calls.length = 0;
  rpcError = { code: "23503" };
  const response = await edit();
  assert.equal(response.status, 400);
  assert.equal(calls.length, 1);
  rpcError = null;
});
