const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const express = require('express');

const auth = require('../middleware/auth');
const supabase = require('../supabase');
const storage = require('../lib/storage');

const workerId = '11111111-1111-4111-8111-111111111111';
const manilaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
});
const today = manilaDay.format(new Date());
const yesterday = manilaDay.format(new Date(Date.parse(`${today}T00:00:00+08:00`) - 86400000));
const statusIds = { pending: 1, in_progress: 2, awaiting_approval: 3, completed: 4 };
let task;
let uploads;
let server;
let baseUrl;

class Query {
  constructor(table) { this.table = table; this.filters = []; this.changes = null; }
  select() { return this; }
  eq(column, value) { this.filters.push([column, value]); return this; }
  in() { return this; }
  update(changes) { this.changes = changes; return this; }
  result() {
    if (this.table === 'task_statuses') {
      return { data: Object.entries(statusIds).map(([code, id]) => ({ code, id })), error: null };
    }
    if (this.table === 'schedule_statuses') return { data: { id: 2, code: 'in_progress' }, error: null };
    if (this.table === 'schedules') return { data: null, error: null };
    if (this.filters.some(([column, value]) => task[column] !== value)) return { data: null, error: null };
    if (this.changes) {
      Object.assign(task, this.changes);
      task.task_status = { code: 'awaiting_approval', status_name: 'Awaiting approval' };
    }
    return { data: { ...task }, error: null };
  }
  maybeSingle() { return Promise.resolve(this.result()); }
  single() { return Promise.resolve(this.result()); }
  then(resolve, reject) { return Promise.resolve(this.result()).then(resolve, reject); }
}

auth.requireAuth = (req, _res, next) => { req.user = { id: workerId }; req.profile = { worker_category: 'farm_worker' }; next(); };
auth.requireRole = () => (_req, _res, next) => next();
auth.requireInitialPasswordChanged = (_req, _res, next) => next();
auth.requireProfileOnboardingComplete = (_req, _res, next) => next();
supabase.getSupabase = () => ({ from: (table) => new Query(table) });
storage.uploadImage = async () => { uploads++; return { imageUrl: 'https://example.test/proof.jpg', storagePath: 'proof.jpg' }; };

const app = express();
app.use(express.json());
app.use('/api/worker/tasks', require('../routes/worker-tasks'));
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

before(() => new Promise((resolve) => {
  server = app.listen(0, '127.0.0.1', () => { baseUrl = `http://127.0.0.1:${server.address().port}`; resolve(); });
}));
after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
beforeEach(() => {
  uploads = 0;
  task = {
    id: 12, assigned_worker_id: workerId, status_id: statusIds.in_progress, activity_type: 'action',
    schedules: { schedule_date: yesterday, start_time: '08:00:00' },
    category: { category_name: 'Fertilization' }, field: { field_name: 'Field A' },
  };
});

async function complete(body = {}) {
  const response = await fetch(`${baseUrl}/api/worker/tasks/12/complete`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed_at: new Date().toISOString(), image: 'data:image/jpeg;base64,AA==', ...body }),
  });
  return { response, result: await response.json() };
}

test('late farm task requires a separate reason before uploading proof or changing status', async () => {
  const { response, result } = await complete({ completion_notes: 'Applied fertilizer to the field.' });
  assert.equal(response.status, 400);
  assert.match(result.error, /Explain why this task is overdue/);
  assert.equal(uploads, 0);
  assert.equal(task.status_id, statusIds.in_progress);
});

test('late farm task saves completion notes and overdue reason separately', async () => {
  const { response, result } = await complete({ completion_notes: 'Applied fertilizer to the field.', delay_reason_notes: 'Rain delayed the field work.' });
  assert.equal(response.status, 200);
  assert.equal(uploads, 1);
  assert.equal(result.task.status, 'awaiting_approval');
  assert.equal(result.task.completion_notes, 'Applied fertilizer to the field.');
  assert.equal(result.task.delay_reason_notes, 'Rain delayed the field work.');
  assert.ok(result.task.delay_reason_submitted_at);
});

test('late farm task can leave optional completion notes empty', async () => {
  const { response, result } = await complete({ delay_reason_notes: 'Rain delayed the field work.' });
  assert.equal(response.status, 200);
  assert.equal(result.task.completion_notes, null);
  assert.equal(result.task.delay_reason_notes, 'Rain delayed the field work.');
});

test('farm task on its scheduled Manila date needs no overdue reason', async () => {
  task.schedules.schedule_date = today;
  const { response, result } = await complete();
  assert.equal(response.status, 200);
  assert.equal(result.task.delay_reason_notes, undefined);
});
