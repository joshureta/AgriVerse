const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const auth = require('../middleware/auth');
const supabase = require('../supabase');
let role = 'farm_worker';
let queryLog = [];
let calls = [];
let dbError = null;
const currentId = '22222222-2222-4222-8222-222222222222';
auth.requireAuth = (req, res, next) => {
  if (!req.get('authorization')) return res.status(401).json({ error: 'Sign in' });
  req.user = { id: currentId }; req.profile = { role, onboarding_completed_at: true, name_confirmed_at: true }; next();
};
class Query {
  constructor(table) { this.table = table; this.filters = []; this.changes = null; }
  select() { return this; } eq(key, value) { this.filters.push([key, value]); return this; }
  is(key, value) { this.filters.push([key, value]); return this; } order() { return this; }
  limit() { return this; } update(changes) { this.changes = changes; return this; }
  then(resolve, reject) { queryLog.push(this); return Promise.resolve({ data: [], error: dbError }).then(resolve, reject); }
  maybeSingle() { queryLog.push(this); return Promise.resolve({ data: null, error: dbError }); }
}
supabase.getSupabase = () => ({ from: (table) => new Query(table), rpc: async (name, args) => { calls.push({ name, args }); return { data: [], error: dbError }; } });
const app = express(); app.use(express.json()); app.use('/operations', require('../routes/operations'));
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
let server; let base;
before(async () => { server = app.listen(0, '127.0.0.1'); await new Promise((r) => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}/operations`; });
after(async () => { await new Promise((r) => server.close(r)); });
async function request(path, body, signedIn = true) {
  return fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(signedIn ? { Authorization: 'Bearer test' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
test('operations endpoints require authentication and protect manager recovery and HR views', async () => {
  role = 'farm_worker';
  assert.equal((await request('/mine', null, false)).status, 401);
  assert.equal((await request('/admin')).status, 403);
  assert.equal((await request('/1/recover', {})).status, 403);
  assert.equal((await request('/reports/1/review', { notes: 'Forged HR review' })).status, 403);
});
test('staff can query only their own incident history and cannot submit another person\'s reason', async () => {
  role = 'farm_worker'; queryLog = []; calls = [];
  assert.equal((await request('/mine')).status, 200);
  assert.ok(queryLog.find((q) => q.filters.some(([key, value]) => key === 'assignee_id' && value === currentId)));
  assert.ok(calls.some((c) => c.name === 'detect_overdue_operations'));
  queryLog = [];
  assert.equal((await request('/42/reason', { reason_code: 'weather', notes: 'Flooded access road' })).status, 409);
  const query = queryLog[0];
  assert.deepEqual(query.filters, [['id', 42], ['assignee_id', currentId], ['reason_submitted_at', null]]);
});
test('buyer cannot see internal reasons, classify incidents, or alter recovery schedules', async () => {
  role = 'buyer'; queryLog = [];
  assert.equal((await request('/admin')).status, 403);
  assert.equal((await request('/1/review', { classification: 'excused', notes: 'Attempt' })).status, 403);
  assert.equal((await request('/1/reason', { reason_code: 'weather', notes: 'Attempt' })).status, 403);
  assert.equal((await request('/orders/1')).status, 404);
  assert.ok(queryLog.at(-1).filters.some(([key, value]) => key === 'buyer_id' && value === currentId));
});
test('manager recovery uses the atomic transaction and returns conflict errors without false success', async () => {
  role = 'admin'; calls = [];
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const form = { date, start_time: '08:00', end_time: '09:00', assignee_id: currentId };
  assert.equal((await request('/12/recover', form)).status, 200);
  assert.equal(calls[0].name, 'recover_operation'); assert.equal(calls[0].args.p_admin, currentId);
  dbError = { code: 'P0001', message: 'worker_schedule_conflict' };
  assert.equal((await request('/12/recover', form)).status, 409);
  dbError = null;
});
