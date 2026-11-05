const express = require('express');

const {
  requireAuth,
  requireInitialPasswordChanged,
  requireProfileOnboardingComplete,
} = require('../middleware/auth');
const { httpError } = require('../lib/http-error');
const { insertNotifications } = require('../lib/push-notifications');
const { getSupabase } = require('../supabase');

const router = express.Router();

router.use(requireAuth, requireInitialPasswordChanged, requireProfileOnboardingComplete);

function readToken(value) {
  const token = typeof value === 'string' ? value.trim() : '';
  if (token.length < 20 || token.length > 4096) throw httpError(400, 'A valid FCM device token is required');
  return token;
}

function readDeviceName(value) {
  if (value === undefined || value === null || value === '') return null;
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > 200) throw httpError(400, 'Invalid device name');
  return name;
}

router.post('/', async (req, res, next) => {
  try {
    const token = readToken(req.body?.token);
    if (req.body?.platform !== 'android' || req.body?.provider !== 'fcm') {
      throw httpError(400, 'Only Android FCM registrations are supported');
    }

    const now = new Date().toISOString();
    const { data, error } = await getSupabase().from('push_devices').upsert({
      user_id: req.user.id,
      token,
      platform: 'android',
      provider: 'fcm',
      device_name: readDeviceName(req.body?.device_name),
      active: true,
      last_seen_at: now,
      updated_at: now,
    }, { onConflict: 'token' }).select('id, platform, provider, device_name, active, last_seen_at').single();
    if (error) throw error;

    return res.status(201).json({ device: data });
  } catch (error) { return next(error); }
});

router.delete('/', async (req, res, next) => {
  try {
    const token = readToken(req.body?.token);
    const { error } = await getSupabase().from('push_devices')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .eq('token', token);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (error) { return next(error); }
});

router.post('/test', async (req, res, next) => {
  try {
    const [notification] = await insertNotifications({
      recipient_id: req.user.id,
      type: 'admin_broadcast',
      title: 'AgriVerse notifications are ready',
      body: 'Firebase Cloud Messaging is connected to this device.',
      entity_type: null,
      entity_id: null,
    });
    return res.status(201).json({ notification });
  } catch (error) { return next(error); }
});

module.exports = { router, readDeviceName, readToken };
