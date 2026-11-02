const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const express = require('express');

const auth = require('../middleware/auth');
const supabase = require('../supabase');
let role = 'buyer';
let existingAddress = { country: 'Philippines', region: 'CALABARZON', province: 'Cavite', city_municipality: 'Tagaytay City', barangay: 'Kaybagal South' };
let written;

auth.requireAuth = (req, _res, next) => {
  req.user = { id: 'current-user' };
  req.profile = { role, ...existingAddress };
  next();
};
supabase.getSupabase = () => ({
  from(table) {
    assert.equal(table, 'profiles');
    return {
      update(changes) { written = changes; return this; },
      eq(field, id) { assert.equal(field, 'id'); assert.equal(id, 'current-user'); return this; },
      select() { return this; },
      async single() { return { data: { id: 'current-user', ...written }, error: null }; },
    };
  },
});

const app = express();
app.use(express.json());
app.use('/api/profile', require('../routes/profile'));
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
let server;
let baseUrl;
before(() => new Promise((resolve) => {
  server = app.listen(0, '127.0.0.1', () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));
after(() => new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve());
}));

async function save(changes) {
  return fetch(`${baseUrl}/api/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
}
const details = {
  full_name: 'Updated User', mobile_number: '09123456789', business_name: 'Fresh Market',
  country: 'Philippines', region: 'CALABARZON', province: 'Cavite', city_municipality: 'Tagaytay City', barangay: 'Kaybagal South',
};

test('buyer profile saves business without changing the selected default address when location is unchanged', async () => {
  role = 'buyer'; written = null;
  const response = await save(details);
  assert.equal(response.status, 200);
  assert.equal(written.business_name, 'Fresh Market');
  assert.equal(written.default_delivery_address_id, undefined);
  assert.equal((await response.json()).profile.full_name, 'Updated User');
});

test('buyer location changes reset an older checkout address preference', async () => {
  role = 'buyer'; written = null;
  const response = await save({ ...details, barangay: 'Maitim 2nd Central' });
  assert.equal(response.status, 200);
  assert.equal(written.default_delivery_address_id, null);
  assert.equal(written.delivery_address_confirmed_at, null);
});

test('staff cannot write buyer business details and invalid location is rejected', async () => {
  role = 'farm_worker'; written = null;
  const response = await save(details);
  assert.equal(response.status, 200);
  assert.equal(written.business_name, undefined);
  written = null;
  const invalid = await save({ ...details, region: '' });
  assert.equal(invalid.status, 400);
  assert.equal(written, null);
});
