const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const auth = require('../middleware/auth');
const supabase = require('../supabase');
let role = 'farm_worker';
let queryLog = [];
let calls = [];
let dbError = null;
let incidentReasonSubmitted = true;
let incidentReviewed = true;
let allowReasonSave = false;
const currentId = '22222222-2222-4222-8222-222222222222';
auth.requireAuth = (req, res, next) => {
  if (!req.get('authorization')) return res.status(401).json({ error: 'Sign in' });
  req.user = { id: currentId }; req.profile = { role, onboarding_completed_at: true, name_confirmed_at: true }; next();
};
class Query {
  constructor(table) { this.table = table; this.filters = []; this.changes = null; }
  select() { return this; } eq(key, value) { this.filters.push([key, value]); return this; }
  is(key, value) { this.filters.push([key, value]); return this; } order() { return this; }
  limit() { return this; } or(expression) { this.filters.push(['or', expression]); return this; } update(changes) { this.changes = changes; return this; }
  then(resolve, reject) { queryLog.push(this); return Promise.resolve({ data: [], error: dbError }).then(resolve, reject); }
  maybeSingle() {
    queryLog.push(this);
    const reasonLookup = this.table === 'operation_incidents' && !this.changes;
    return Promise.resolve({ data: reasonLookup ? {
      reason_submitted_at: incidentReasonSubmitted ? '2026-11-18T00:00:00Z' : null,
      reviewed_at: incidentReviewed ? '2026-11-18T01:00:00Z' : null,
    } : this.changes && allowReasonSave && this.table === 'operation_incidents'
      ? { id: 42, label: 'Field task', task_id: 42, order_id: null, ...this.changes } : null,
    error: this.changes ? dbError : null });
  }
  single() { queryLog.push(this); return Promise.resolve({ data: { assignee_id: currentId, label: 'Field task', task_id: 42, order_id: null }, error: dbError }); }
}
supabase.getSupabase = () => ({ from: (table) => new Query(table), rpc: async (name, args) => { calls.push({ name, args }); return { data: [], error: dbError }; } });
const { recoveryWindow } = require('../lib/overdue-operations');
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
  const ownIncidents = await request('/mine');
  assert.equal(ownIncidents.status, 200, JSON.stringify(await ownIncidents.json()));
  assert.ok(queryLog.find((q) => q.filters.some(([key, value]) => key === 'assignee_id' && value === currentId)));
  assert.ok(calls.some((c) => c.name === 'detect_overdue_operations'));
  queryLog = [];
  assert.equal((await request('/42/reason', { reason_code: 'weather', notes: 'Flooded access road', can_continue: true })).status, 409);
  const query = queryLog[0];
  assert.deepEqual(query.filters, [['id', 42], ['assignee_id', currentId], ['reason_submitted_at', null], ['or', 'recovered_at.is.null,and(task_id.not.is.null,recovery_action.eq.completed)']]);
});
test('delay submission requires a can-continue answer', async () => {
  role = 'farm_worker'; queryLog = [];
  assert.equal((await request('/42/reason', { reason_code: 'weather', notes: 'Flooded access road' })).status, 400);
  assert.equal(queryLog.length, 0);
});
test('worker submission stores the delay and continuation answer together', async () => {
  role = 'farm_worker'; queryLog = []; allowReasonSave = true;
  assert.equal((await request('/42/reason', { reason_code: 'weather', notes: 'The field is flooded', can_continue: false })).status, 200);
  const update = queryLog.find((query) => query.changes?.can_continue === false);
  assert.equal(update.changes.reason_notes, 'The field is flooded');
  assert.ok(update.changes.reason_submitted_at);
  allowReasonSave = false;
});
test('admin decisions wait for a submitted delay reason', async () => {
  role = 'admin'; incidentReasonSubmitted = false; calls = [];
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const form = { date, start_time: '08:00', end_time: '09:00', assignee_id: currentId };
  assert.equal((await request('/42/review', { classification: 'excused', notes: 'Flooded access road' })).status, 409);
  assert.equal((await request('/42/recover', form)).status, 409);
  assert.equal((await request('/42/stop', { notes: 'Cleared the first field row' })).status, 409);
  assert.equal(calls.filter((call) => ['review_operation_incident', 'recover_operation', 'stop_overdue_task'].includes(call.name)).length, 0);
  incidentReasonSubmitted = true;
});
test('rescheduling and stopping wait for admin classification', async () => {
  role = 'admin'; incidentReviewed = false; calls = [];
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const form = { date, start_time: '08:00', end_time: '09:00', assignee_id: currentId };
  assert.equal((await request('/42/recover', form)).status, 409);
  assert.equal((await request('/42/stop', { notes: 'Cleared the first field row' })).status, 409);
  assert.equal(calls.filter((call) => ['recover_operation', 'stop_overdue_task'].includes(call.name)).length, 0);
  incidentReviewed = true;
});
test('admin review notifies the assigned worker of the classification', async () => {
  role = 'admin'; calls = [];
  assert.equal((await request('/42/review', { classification: 'excused', notes: 'Flooding blocked the field' })).status, 200);
  assert.ok(calls.some((call) => call.name === 'review_operation_incident' && call.args.p_incident === 42));
  assert.ok(calls.some((call) => call.name === 'operation_notify' && call.args.p_recipient === currentId && call.args.p_title === 'Delay review: Excused'));
});
test('admin review accepts a classification without decision notes', async () => {
  role = 'admin'; calls = [];
  assert.equal((await request('/42/review', { classification: 'unexcused' })).status, 200);
  assert.ok(calls.some((call) => call.name === 'review_operation_incident' && call.args.p_classification === 'unexcused' && call.args.p_notes === null));
});
test('recovery schedule must start in the future', () => {
  const form = { date: '2026-11-18', start_time: '08:00', end_time: '09:00', assignee_id: currentId };
  assert.throws(() => recoveryWindow(form, new Date('2026-11-18T11:00:00Z')), /future start date and time/);
  assert.equal(recoveryWindow({ ...form, date: '2026-11-19' }, new Date('2026-11-18T11:00:00Z')).p_start, '2026-11-19T00:00:00.000Z');
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
  const conflict = await request('/12/recover', form);
  assert.equal(conflict.status, 409);
  assert.match((await conflict.json()).error, /already has a task during this time/i);
  dbError = { code: 'P0001', message: 'This task is no longer active.' };
  const staleTask = await request('/12/recover', form);
  assert.equal(staleTask.status, 409);
  assert.match((await staleTask.json()).error, /task is no longer active/i);
  dbError = null;
});
test('admin can stop in-progress work only through the recorded stop action', async () => {
  role = 'admin'; calls = [];
  assert.equal((await request('/42/stop', { notes: 'Cleared two rows before the worker became ill' })).status, 200);
  assert.ok(calls.some((call) => call.name === 'stop_overdue_task' && call.args.p_incident === 42));
});
