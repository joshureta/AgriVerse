const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

// Exercise the production client configuration with real Supabase session logic.
// Each module load represents a new app process; only device storage survives.
const source = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/lib/supabase.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } },
).outputText;
const user = { id: 'test-worker', aud: 'authenticated', role: 'authenticated', email: 'worker@example.test' };
const accessToken = [
  { alg: 'HS256', typ: 'JWT' },
  { sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 },
].map((value) => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.') + '.test';

function device() {
  const values = new Map();
  let refreshes = 0;
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  async function fetchAuth(url) {
    if (String(url).includes('/logout')) return new Response(null, { status: 204 });
    if (String(url).includes('grant_type=refresh_token')) refreshes++;
    return new Response(JSON.stringify({
      access_token: accessToken,
      refresh_token: 'saved-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
      user,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  function openApp() {
    const exports = {};
    const listeners = [];
    vm.runInNewContext(source, {
      exports,
      process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://session-test.supabase.co', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-key' } },
      require(name) {
        if (name === 'react-native-url-polyfill/auto') return {};
        if (name === '@react-native-async-storage/async-storage') return { __esModule: true, default: storage };
        if (name === 'react-native') return {
          Platform: { OS: 'android' },
          AppState: { addEventListener: (_event, callback) => { listeners.push(callback); } },
        };
        if (name === '@supabase/supabase-js') return {
          createClient: (url, key, options) => createClient(url, key, { ...options, global: { fetch: fetchAuth } }),
        };
        throw new Error(`Unexpected import: ${name}`);
      },
    });
    return { client: exports.supabase, listeners };
  }
  return { values, openApp, get refreshes() { return refreshes; } };
}

test('closing and reopening Android restores the same account despite an old unchecked Remember me preference', async () => {
  const phone = device();
  phone.values.set('agriverse-remember-session', 'false');
  const first = phone.openApp().client;
  const { error } = await first.auth.signInWithPassword({ email: user.email, password: 'test-password' });
  assert.ifError(error);
  await first.auth.stopAutoRefresh();

  const reopened = phone.openApp().client;
  try {
    const { data, error: restoreError } = await reopened.auth.getSession();
    assert.ifError(restoreError);
    assert.equal(data.session.user.id, user.id);
    assert.equal(data.session.refresh_token, 'saved-refresh-token');
  } finally { await reopened.auth.stopAutoRefresh(); }
});

test('an expired saved session refreshes after reopening without another password login', async () => {
  const phone = device();
  const first = phone.openApp().client;
  await first.auth.signInWithPassword({ email: user.email, password: 'test-password' });
  await first.auth.stopAutoRefresh();
  for (const [key, value] of phone.values) {
    if (key.endsWith('-auth-token')) {
      phone.values.set(key, JSON.stringify({ ...JSON.parse(value), expires_at: 1 }));
    }
  }
  const reopened = phone.openApp().client;
  try {
    const { data, error } = await reopened.auth.getSession();
    assert.ifError(error);
    assert.equal(data.session.user.id, user.id);
    assert.ok(phone.refreshes > 0);
  } finally { await reopened.auth.stopAutoRefresh(); }
});

test('explicit sign-out removes the saved session across app restarts', async () => {
  const phone = device();
  const first = phone.openApp().client;
  await first.auth.signInWithPassword({ email: user.email, password: 'test-password' });
  const { error } = await first.auth.signOut();
  assert.ifError(error);
  await first.auth.stopAutoRefresh();
  const reopened = phone.openApp().client;
  try {
    const { data } = await reopened.auth.getSession();
    assert.equal(data.session, null);
  } finally { await reopened.auth.stopAutoRefresh(); }
});
