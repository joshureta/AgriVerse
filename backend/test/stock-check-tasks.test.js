const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const express = require('express');

const auth = require('../middleware/auth');
const supabase = require('../supabase');
const storage = require('../lib/storage');
const { summarize } = require('../lib/stock-check');
const { readStockCounts, STOCK_CONDITIONS } = require('../lib/task-details');

const workerId = '11111111-1111-4111-8111-111111111111';
const adminId = '22222222-2222-4222-8222-222222222222';
const statusIds = { pending: 1, in_progress: 2, awaiting_approval: 3, completed: 4 };

// Every size and condition counted; overrides set specific quantities.
function fullCounts(sizes, overrides = {}) {
  return sizes.flatMap((size) => STOCK_CONDITIONS.map((condition) => ({
    size, condition, quantity: overrides[`${size}|${condition}`] ?? 0, damage_types: [],
  })));
}

test('stock counts must cover every size and condition with whole numbers', () => {
  assert.equal(readStockCounts(fullCounts(['Small']), ['Small']).length, STOCK_CONDITIONS.length);
  assert.throws(() => readStockCounts(fullCounts(['Small']).slice(1), ['Small']), /every size and condition/);
  assert.throws(() => readStockCounts(fullCounts(['Small'], { 'Small|good': 1.5 }), ['Small']), /whole numbers/);
  assert.throws(() => readStockCounts(fullCounts(['Medium']), ['Small']), /not part of this stock check/);
});

test('totals write off non-saleable and unaccounted pineapples and add pineapples found', () => {
  const counts = [
    { size: 'Small', condition: 'good', quantity: 58 }, { size: 'Small', condition: 'minor_damage', quantity: 2 },
    { size: 'Small', condition: 'overripe', quantity: 1 }, { size: 'Small', condition: 'spoiled', quantity: 1 },
    { size: 'Large', condition: 'good', quantity: 62 },
  ];
  const result = summarize([{ size: 'Small', system_quantity: 63 }, { size: 'Large', system_quantity: 60 }], counts);
  const [small, large] = result.sizes;
  assert.deepEqual([small.counted, small.good, small.non_saleable, small.unaccounted, small.written_off, small.updated_quantity], [62, 58, 4, 1, 5, 58]);
  assert.deepEqual([large.found, large.written_off, large.updated_quantity], [2, -2, 62]);
  assert.equal(result.written_off, 3);
});

// A small fake of the Supabase client: task rows by ID, and a record of RPC calls and uploads.
let tasks;
let rpcCalls;
let uploads;
let rpcErrors;

class Query {
  constructor(table) { this.table = table; this.filters = []; this.changes = null; }
  select() { return this; }
  eq(column, value) { this.filters.push([column, value]); return this; }
  in() { return this; }
  order() { return this; }
  update(changes) { this.changes = changes; return this; }
  result() {
    if (this.table === 'task_statuses') {
      const code = this.filters.find(([column]) => column === 'code')?.[1];
      if (code) return { data: { id: statusIds[code], code }, error: null };
      return { data: Object.entries(statusIds).map(([statusCode, id]) => ({ code: statusCode, id })), error: null };
    }
    if (this.table === 'schedule_statuses') return { data: { id: 9, code: 'in_progress' }, error: null };
    if (this.table === 'schedules') return { data: null, error: null };
    if (['stock_check_snapshots', 'stock_check_counts', 'stock_check_photos'].includes(this.table)) return { data: [], error: null };
    const id = this.filters.find(([column]) => column === 'id')?.[1];
    const task = tasks[id];
    if (!task) return { data: null, error: null };
    if (this.changes) Object.assign(task, this.changes, { task_status: { code: 'awaiting_approval' } });
    return { data: { ...task }, error: null };
  }
  maybeSingle() { return Promise.resolve(this.result()); }
  single() { return Promise.resolve(this.result()); }
  then(resolve, reject) { return Promise.resolve(this.result()).then(resolve, reject); }
}

auth.requireAuth = (req, _res, next) => {
  const isAdmin = req.baseUrl.startsWith('/api/admin/');
  req.user = { id: isAdmin ? adminId : workerId };
  req.profile = isAdmin ? { role: 'admin' } : { worker_category: 'farm_worker' };
  next();
};
auth.requireRole = () => (_req, _res, next) => next();
auth.requireInitialPasswordChanged = (_req, _res, next) => next();
auth.requireProfileOnboardingComplete = (_req, _res, next) => next();
supabase.getSupabase = () => ({
  from: (table) => new Query(table),
  rpc: async (name, args) => { rpcCalls.push({ name, args }); return { data: null, error: rpcErrors[name] || null }; },
});
storage.uploadImage = async (_bucket, _data, _mime, prefix) => { uploads.push(prefix); return { imageUrl: `https://example.test/${uploads.length}.jpg`, storagePath: `${uploads.length}.jpg` }; };

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use('/api/worker/tasks', require('../routes/worker-tasks'));
app.use('/api/admin/tasks', require('../routes/admin-tasks'));
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

let server;
let baseUrl;
before(() => new Promise((resolve) => {
  server = app.listen(0, '127.0.0.1', () => { baseUrl = `http://127.0.0.1:${server.address().port}`; resolve(); });
}));
after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

beforeEach(() => {
  rpcCalls = [];
  uploads = [];
  rpcErrors = {};
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  tasks = {
    7: {
      id: 7, assigned_worker_id: workerId, status_id: statusIds.in_progress, activity_type: null,
      details: null,
      schedules: { schedule_date: today, start_time: '08:00:00' },
      category: { category_name: 'Stock Check' }, field: { field_name: 'Packing Shed' },
      task_status: { code: 'in_progress' },
    },
  };
});

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { response, result: await response.json() };
}

test('a stock check is submitted with counts and per-condition photos instead of one proof photo', async () => {
  const { response } = await post('/api/worker/tasks/7/complete', {
    completed_at: new Date().toISOString(),
    stock_counts: fullCounts(['Small', 'Medium', 'Large'], { 'Small|good': 58, 'Small|spoiled': 1 }),
    stock_photos: [{ size: 'Small', condition: 'spoiled', image: 'data:image/jpeg;base64,AA==', image_mime: 'image/jpeg' }],
  });
  assert.equal(response.status, 200);
  assert.equal(uploads.length, 1);
  const save = rpcCalls.find((call) => call.name === 'save_stock_check_submission');
  assert.ok(save, 'counts are saved through the database function');
  assert.equal(save.args.p_counts.length, 3 * STOCK_CONDITIONS.length);
  assert.deepEqual(save.args.p_photos.map(({ size, condition }) => `${size}|${condition}`), ['Small|spoiled']);
  assert.equal(tasks[7].status_id, statusIds.awaiting_approval);
});

test('a stock check missing a size is rejected before anything is uploaded or saved', async () => {
  const { response, result } = await post('/api/worker/tasks/7/complete', {
    completed_at: new Date().toISOString(),
    stock_counts: fullCounts(['Small']),
  });
  assert.equal(response.status, 400);
  assert.match(result.error, /every size and condition/);
  assert.equal(uploads.length, 0);
  assert.equal(rpcCalls.length, 0);
  assert.equal(tasks[7].status_id, statusIds.in_progress);
});

test('a missing photo reported by the database keeps the task in progress', async () => {
  rpcErrors.save_stock_check_submission = { message: 'A photo is required for Small, Spoiled' };
  const { response, result } = await post('/api/worker/tasks/7/complete', {
    completed_at: new Date().toISOString(),
    stock_counts: fullCounts(['Small', 'Medium', 'Large'], { 'Small|spoiled': 1 }),
  });
  assert.equal(response.status, 400);
  assert.match(result.error, /photo is required/);
  assert.equal(tasks[7].status_id, statusIds.in_progress);
});

test('the admin approves a stock check through its own route with the corrected counts', async () => {
  tasks[7].status_id = statusIds.awaiting_approval;
  tasks[7].task_status = { code: 'awaiting_approval' };
  const counts = fullCounts(['Small', 'Medium', 'Large'], { 'Small|good': 57 });
  const { response } = await post('/api/admin/tasks/7/approve-stock-check', { counts });
  assert.equal(response.status, 200);
  const approve = rpcCalls.find((call) => call.name === 'approve_stock_check_task');
  assert.equal(approve.args.p_admin_id, adminId);
  assert.equal(approve.args.p_counts.find((count) => count.size === 'Small' && count.condition === 'good').quantity, 57);
});

test('the generic approve route refuses a stock check so stock is never skipped', async () => {
  tasks[7].task_status = { code: 'awaiting_approval' };
  const { response, result } = await post('/api/admin/tasks/7/approve', {});
  assert.equal(response.status, 400);
  assert.match(result.error, /stock check review/);
  assert.equal(rpcCalls.length, 0);
});
