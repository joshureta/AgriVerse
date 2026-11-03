const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

const { getSupabase } = require('../supabase');

const NOTIFICATION_SELECT = 'id, recipient_id, type, title, body, entity_type, entity_id, created_at';
const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-argument',
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

let firebaseApp;
let firebaseInitialized = false;

function readServiceAccount(env = process.env) {
  const encoded = env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  const raw = encoded
    ? Buffer.from(encoded, 'base64').toString('utf8')
    : env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  const account = JSON.parse(raw);
  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error('Firebase service account JSON is incomplete');
  }
  return account;
}

function firebaseIsConfigured(env = process.env) {
  return Boolean(
    env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim()
    || env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
    || env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
  );
}

function getFirebaseApp() {
  if (firebaseInitialized) return firebaseApp;
  firebaseInitialized = true;

  const account = readServiceAccount();
  if (!account && !process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) return null;

  firebaseApp = getApps()[0] || initializeApp({
    credential: account ? cert(account) : applicationDefault(),
    ...(account?.project_id ? { projectId: account.project_id } : {}),
  });
  return firebaseApp;
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function deactivateInvalidTokens(tokens) {
  if (!tokens.length) return;
  const { error } = await getSupabase().from('push_devices')
    .update({ active: false, updated_at: new Date().toISOString() })
    .in('token', [...new Set(tokens)]);
  if (error) throw error;
}

async function sendPushNotifications(notifications) {
  const app = getFirebaseApp();
  if (!app || !notifications.length) return { sent: 0, skipped: true };

  const recipientIds = [...new Set(notifications.map((item) => item.recipient_id).filter(Boolean))];
  const { data: devices, error } = await getSupabase().from('push_devices')
    .select('user_id, token')
    .in('user_id', recipientIds)
    .eq('active', true);
  if (error) throw error;

  const devicesByUser = new Map();
  for (const device of devices || []) {
    const userDevices = devicesByUser.get(device.user_id) || [];
    userDevices.push(device.token);
    devicesByUser.set(device.user_id, userDevices);
  }

  const messages = notifications.flatMap((notification) => (
    (devicesByUser.get(notification.recipient_id) || []).map((token) => ({
      token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        notificationId: String(notification.id),
        notificationType: String(notification.type),
        entityType: notification.entity_type ? String(notification.entity_type) : '',
        entityId: notification.entity_id == null ? '' : String(notification.entity_id),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'agriverse-updates',
          color: '#237C31',
          sound: 'default',
          tag: `agriverse-${notification.id}`,
        },
      },
    }))
  ));

  let sent = 0;
  const invalidTokens = [];
  for (const batch of chunks(messages, 500)) {
    const result = await getMessaging(app).sendEach(batch);
    sent += result.successCount;
    result.responses.forEach((response, index) => {
      if (!response.success && INVALID_TOKEN_CODES.has(response.error?.code)) {
        invalidTokens.push(batch[index].token);
      }
    });
  }
  await deactivateInvalidTokens(invalidTokens);
  return { sent, failed: messages.length - sent };
}

async function insertNotifications(rows) {
  const values = Array.isArray(rows) ? rows : [rows];
  if (!values.length) return [];

  const { data, error } = await getSupabase().from('notifications')
    .insert(values)
    .select(NOTIFICATION_SELECT);
  if (error) throw error;

  try {
    await sendPushNotifications(data || []);
  } catch (pushError) {
    console.error('Firebase push delivery failed:', pushError.message);
  }
  return data || [];
}

module.exports = {
  firebaseIsConfigured,
  insertNotifications,
  readServiceAccount,
  sendPushNotifications,
};
