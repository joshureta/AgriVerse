const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const express = require("express");

const rows = {
  task_categories: [{ id: 1, category_name: "Harvesting", status: true }],
  farm_fields: [{ id: 2, field_name: "Field A", status: true }],
};

class LookupQuery {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.changes = null;
  }

  select() { return this; }
  eq(column, value) { this.filters.push([column, value]); return this; }
  neq() { return this; }
  order() { return this; }
  update(changes) { this.changes = changes; return this; }

  result(single = false) {
    const matches = (rows[this.table] || []).filter((row) => this.filters.every(([column, value]) => row[column] === value));
    if (this.changes) matches.forEach((row) => Object.assign(row, this.changes));
    return single ? { data: matches[0] || null, error: matches.length ? null : { code: "PGRST116" } } : { data: matches, error: null };
  }

  single() { return Promise.resolve(this.result(true)); }
  then(resolve, reject) { return Promise.resolve(this.result()).then(resolve, reject); }
}

const auth = require("../middleware/auth");
const supabase = require("../supabase");
auth.requireAuth = (_req, _res, next) => next();
auth.requireRole = () => (_req, _res, next) => next();
supabase.getSupabase = () => ({ from: (table) => new LookupQuery(table) });

const app = express();
app.use(express.json());
app.use("/api/admin/lookups", require("../routes/admin-lookups"));
app.use("/api/admin/tasks", require("../routes/admin-tasks"));

let server;
let baseUrl;
before(() => new Promise((resolve) => {
  server = app.listen(0, "127.0.0.1", () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));
after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.status, 200);
  return response.json();
}

async function setStatus(resource, id, status) {
  const response = await fetch(`${baseUrl}/api/admin/lookups/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).value.status, status);
}

test("archived Settings values leave active lists and task options, then return when restored", async () => {
  for (const [resource, id, optionKey] of [["task-categories", 1, "categories"], ["fields", 2, "fields"]]) {
    const path = `/api/admin/lookups/${resource}`;
    assert.equal((await get(path)).values.length, 1);
    await setStatus(resource, id, false);
    assert.deepEqual((await get(path)).values, []);
    assert.equal((await get(`${path}?includeInactive=true`)).values[0].status, false);
    assert.deepEqual((await get("/api/admin/tasks/options"))[optionKey], []);
    await setStatus(resource, id, true);
    assert.equal((await get(path)).values.length, 1);
    assert.equal((await get("/api/admin/tasks/options"))[optionKey].length, 1);
  }
});
