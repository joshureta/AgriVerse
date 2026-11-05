const assert = require('node:assert/strict');
const { test } = require('node:test');

const { readDeviceName, readToken } = require('../routes/push-devices');
const { firebaseIsConfigured, readServiceAccount } = require('../lib/push-notifications');

test('push device fields are normalized and validated', () => {
  assert.equal(readToken('  fcm-token-that-is-long-enough  '), 'fcm-token-that-is-long-enough');
  assert.equal(readDeviceName('  Pixel emulator  '), 'Pixel emulator');
  assert.equal(readDeviceName(null), null);
  assert.throws(() => readToken('short'), /valid FCM device token/i);
  assert.throws(() => readDeviceName('x'.repeat(201)), /invalid device name/i);
});

test('Firebase service account configuration supports base64 credentials', () => {
  const account = { project_id: 'agriverse', client_email: 'firebase@example.com', private_key: 'private-key' };
  const encoded = Buffer.from(JSON.stringify(account)).toString('base64');
  assert.deepEqual(readServiceAccount({ FIREBASE_SERVICE_ACCOUNT_BASE64: encoded }), account);
  assert.equal(firebaseIsConfigured({ FIREBASE_SERVICE_ACCOUNT_BASE64: encoded }), true);
  assert.equal(firebaseIsConfigured({}), false);
});
