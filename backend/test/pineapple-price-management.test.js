const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const express = require('express');

const auth = require('../middleware/auth');
const supabase = require('../supabase');

auth.requireAuth = (req, _res, next) => {
  const isSeller = req.baseUrl.startsWith('/api/seller/');
  req.user = { id: isSeller ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001' };
  req.profile = isSeller
    ? { role: 'farm_worker', worker_category: 'seller' }
    : { role: 'admin' };
  next();
};

const calls = [];
let rpcError = null;
supabase.getSupabase = () => ({
  async rpc(name, args) {
    calls.push({ name, args });
    return { data: rpcError ? null : { id: 2, size_name: 'Medium', selling_price: args.p_new_price }, error: rpcError };
  },
});

const app = express();
app.use(express.json());
const router = require('../routes/admin-inventory');
app.use('/api/admin/inventory', router);
app.use('/api/seller/inventory', router);
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

let server;
let baseUrl;
before(() => new Promise((resolve) => {
  server = app.listen(0, '127.0.0.1', () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));
after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

function updatePrice(prefix, sellingPrice, expectedPrice = 65) {
  return fetch(`${baseUrl}${prefix}/pineapple-sizes/2/price`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selling_price: sellingPrice, expected_price: expectedPrice }),
  });
}

test('admin price changes use the audited database function', async () => {
  calls.length = 0;
  const response = await updatePrice('/api/admin/inventory', '70.50');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).size.selling_price, 70.5);
  assert.deepEqual(calls, [{
    name: 'update_pineapple_selling_price',
    args: {
      p_size_id: 2,
      p_new_price: 70.5,
      p_expected_price: 65,
      p_changed_by: '00000000-0000-0000-0000-000000000001',
    },
  }]);
});

test('seller price changes use the same audited function and seller identity', async () => {
  calls.length = 0;
  const response = await updatePrice('/api/seller/inventory', '72.00');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).size.selling_price, 72);
  assert.deepEqual(calls, [{
    name: 'update_pineapple_selling_price',
    args: {
      p_size_id: 2,
      p_new_price: 72,
      p_expected_price: 65,
      p_changed_by: '00000000-0000-0000-0000-000000000002',
    },
  }]);
});

test('invalid prices and unrelated seller inventory edits never reach the database function', async () => {
  calls.length = 0;
  for (const prefix of ['/api/admin/inventory', '/api/seller/inventory']) for (const value of ['0', '70.001', '100000000']) {
    const response = await updatePrice(prefix, value);
    assert.equal(response.status, 400);
  }
  const sellerResponse = await fetch(`${baseUrl}/api/seller/inventory/12`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_name: 'Unrelated item' }),
  });
  assert.equal(sellerResponse.status, 403);
  assert.equal(calls.length, 0);
});

test('a stale price edit is reported as a conflict', async () => {
  rpcError = { code: 'P0001' };
  const response = await updatePrice('/api/admin/inventory', '70.00');
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /price changed/i);
  rpcError = null;
});
