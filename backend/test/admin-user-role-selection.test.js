const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const express = require('express');

const auth = require('../middleware/auth');
const supabase = require('../supabase');

auth.requireAuth = (req, _res, next) => {
  req.user = { id: 'current-admin' };
  req.profile = { role: 'admin' };
  next();
};
auth.requireRole = () => (_req, _res, next) => next();

const profiles = new Map([
  ['buyer-1', { id: 'buyer-1', role: 'buyer', full_name: 'Buyer One', email: 'buyer@example.com' }],
  ['admin-1', { id: 'admin-1', role: 'admin', full_name: 'Admin One', email: 'admin@example.com' }],
]);
let authWrites = 0;
supabase.getSupabase = () => ({
  auth: { admin: {
    createUser: async () => { authWrites += 1; throw new Error('Unexpected create'); },
    getUserById: async (id) => ({ data: { user: { id, email: profiles.get(id)?.email, user_metadata: {} } }, error: null }),
    updateUserById: async () => { authWrites += 1; return { error: null }; },
  } },
  from(table) {
    assert.equal(table, 'profiles');
    return {
      id: null,
      updates: null,
      select() { return this; },
      eq(_column, id) { this.id = id; return this; },
      update(values) { this.updates = values; return this; },
      async single() {
        const existing = profiles.get(this.id);
        if (!existing) return { data: null, error: { code: 'PGRST116' } };
        return { data: this.updates ? { ...existing, ...this.updates } : existing, error: null };
      },
    };
  },
});

const app = express();
app.use(express.json());
app.use('/api/admin/users', require('../routes/admin-users'));
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

function request(path, method, body) {
  return fetch(`${baseUrl}/api/admin/users${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('User Management cannot create an Admin account', async () => {
  authWrites = 0;
  const response = await request('', 'POST', {
    full_name: 'New Admin', email: 'new@example.com', password: 'Password1!', role: 'admin',
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Admin accounts cannot be created/);
  assert.equal(authWrites, 0);
});

test('User Management cannot promote a buyer or change an existing Admin role', async () => {
  authWrites = 0;
  const profile = { full_name: 'Updated User', email: 'updated@example.com', mobile_number: '' };
  const promote = await request('/buyer-1', 'PATCH', { ...profile, role: 'admin' });
  const demote = await request('/admin-1', 'PATCH', { ...profile, role: 'buyer' });
  assert.equal(promote.status, 400);
  assert.equal(demote.status, 400);
  assert.equal(authWrites, 0);
});

test('editing an existing Admin profile preserves its role', async () => {
  authWrites = 0;
  const response = await request('/admin-1', 'PATCH', {
    full_name: 'Updated Admin', email: 'admin@example.com', mobile_number: '', role: 'admin',
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.role, 'admin');
  assert.equal(authWrites, 1);
});
