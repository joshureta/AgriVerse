const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const express = require('express');

const auth = require('../middleware/auth');
const supabase = require('../supabase');
const storage = require('../lib/storage');
const notifications = require('../lib/order-notifications');

const driverId = '22222222-2222-4222-8222-222222222222';
const manilaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
});
const today = manilaDay.format(new Date());
const yesterday = manilaDay.format(new Date(Date.parse(`${today}T00:00:00+08:00`) - 86400000));
let order;
let uploads;
let server;
let baseUrl;

class OrderQuery {
  constructor() { this.filters = []; this.changes = null; }
  select() { return this; }
  eq(column, value) { this.filters.push([column, value]); return this; }
  update(changes) { this.changes = changes; return this; }
  result() {
    if (this.filters.some(([column, value]) => order[column] !== value)) return { data: null, error: null };
    if (this.changes) Object.assign(order, this.changes);
    return { data: { ...order }, error: null };
  }
  maybeSingle() { return Promise.resolve(this.result()); }
  then(resolve, reject) { return Promise.resolve(this.result()).then(resolve, reject); }
}

auth.requireAuth = (req, _res, next) => { req.user = { id: driverId }; req.profile = { worker_category: 'driver' }; next(); };
auth.requireRole = () => (_req, _res, next) => next();
auth.requireInitialPasswordChanged = (_req, _res, next) => next();
auth.requireProfileOnboardingComplete = (_req, _res, next) => next();
supabase.getSupabase = () => ({ from: () => new OrderQuery() });
storage.uploadImage = async () => { uploads++; return { imageUrl: 'https://example.test/proof.jpg', storagePath: 'proof.jpg' }; };
notifications.createOrderStatusNotification = async () => {};

const app = express();
app.use(express.json());
app.use('/api/driver/orders', require('../routes/driver-orders'));
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

before(() => new Promise((resolve) => {
  server = app.listen(0, '127.0.0.1', () => { baseUrl = `http://127.0.0.1:${server.address().port}`; resolve(); });
}));
after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
beforeEach(() => {
  uploads = 0;
  order = {
    id: 12, order_number: 'ORD-12', buyer_id: '33333333-3333-4333-8333-333333333333',
    assigned_driver_id: driverId, assigned_vehicle_id: null, delivery_assignment_status: 'out_for_delivery',
    order_status: 'out_for_delivery', payment_method: 'gcash', delivery_scheduled_at: `${yesterday}T08:00:00+08:00`,
  };
});

async function complete(body = {}) {
  const response = await fetch(`${baseUrl}/api/driver/orders/12/complete`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: 'data:image/jpeg;base64,AA==', ...body }),
  });
  return { response, result: await response.json() };
}

test('late delivery requires a reason before uploading proof or changing status', async () => {
  const { response, result } = await complete({ notes: 'Left the parcel with the guard.' });
  assert.equal(response.status, 400);
  assert.match(result.error, /Explain why this delivery is overdue/);
  assert.equal(uploads, 0);
  assert.equal(order.delivery_assignment_status, 'out_for_delivery');
});

test('late delivery saves its reason with completed proof', async () => {
  const { response, result } = await complete({ notes: 'Left the parcel with the guard.', delivery_delay_reason_notes: 'Road closure delayed the trip.' });
  assert.equal(response.status, 200);
  assert.equal(uploads, 1);
  assert.equal(result.order.delivery_assignment_status, 'delivered');
  assert.equal(result.order.delivery_proof_notes, 'Left the parcel with the guard.');
  assert.equal(result.order.delivery_delay_reason_notes, 'Road closure delayed the trip.');
  assert.ok(result.order.delivery_delay_reason_submitted_at);
});

test('late delivery can leave optional delivery notes empty', async () => {
  const { response, result } = await complete({ delivery_delay_reason_notes: 'Traffic stopped the delivery route.' });
  assert.equal(response.status, 200);
  assert.equal(result.order.delivery_proof_notes, null);
  assert.equal(result.order.delivery_delay_reason_notes, 'Traffic stopped the delivery route.');
});

test('delivery on its scheduled Manila date needs no delay reason', async () => {
  order.delivery_scheduled_at = `${today}T08:00:00+08:00`;
  const { response, result } = await complete();
  assert.equal(response.status, 200);
  assert.equal(result.order.delivery_assignment_status, 'delivered');
  assert.equal(result.order.delivery_delay_reason_notes, undefined);
});
