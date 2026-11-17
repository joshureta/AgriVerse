const { getSupabase } = require('../supabase');
const { sendPushNotifications, firebaseIsConfigured } = require('./push-notifications');
const { httpError } = require('./http-error');

const REASONS = ['vehicle_breakdown', 'traffic_road_closure', 'customer_unavailable', 'weather', 'supplies_unavailable', 'illness_emergency', 'other'];
function validateReason(body) {
  const notes = String(body.notes || '').trim();
  if (!REASONS.includes(body.reason_code)) throw httpError(400, 'Select a delay reason.');
  if (notes.length < 5 || notes.length > 2000) throw httpError(400, 'Explain the delay in 5–2000 characters.');
  return { reason_code: body.reason_code, reason_notes: notes, reason_submitted_at: new Date().toISOString() };
}
function recoveryWindow(body, now = new Date()) {
  const date = String(body.date || '');
  const start = String(body.start_time || '');
  const end = String(body.end_time || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) throw httpError(400, 'Select a valid date and time window.');
  const from = new Date(`${date}T${start}:00+08:00`);
  const to = new Date(`${date}T${end}:00+08:00`);
  if (Number.isNaN(from.getTime()) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date || to <= from) throw httpError(400, 'Select a valid date and an end time after the start time.');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  if (date < today) throw httpError(400, 'Recovery must be scheduled for today or a future date.');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(body.assignee_id || ''))) throw httpError(400, 'Choose a worker or driver.');
  return { p_assignee: body.assignee_id, p_start: from.toISOString(), p_end: to.toISOString() };
}
async function flushOperationPushes() {
  // In-app notices are already committed even without a configured push provider.
  if (!firebaseIsConfigured()) return;
  const db = getSupabase();
  const { data: batch, error } = await db.rpc('claim_operation_notifications');
  if (error) throw error;
  for (const item of batch || []) {
    try {
      const { data: notification, error: readError } = await db.from('notifications').select('*').eq('id', item.notification_id).single();
      if (readError) throw readError;
      const result = await sendPushNotifications([notification]);
      if (result.failed > 0) throw new Error('Some push devices could not be reached.');
      const { error: savedError } = await db.from('operation_notification_outbox').update({ delivered_at: new Date().toISOString() }).eq('id', item.id);
      if (savedError) throw savedError;
    } catch (caught) { console.error('Overdue push will be retried:', caught.message); }
  }
}
let sweep;
async function detectOverdueOperations() {
  const { error } = await getSupabase().rpc('detect_overdue_operations');
  if (error) throw error;
}
function sweepOverdueOperations() {
  if (!sweep) sweep = detectOverdueOperations().then(flushOperationPushes).finally(() => { sweep = null; });
  return sweep;
}
function startOverdueMonitor() {
  const run = () => sweepOverdueOperations().catch((error) => console.error('Overdue operations scan failed:', error.message));
  run();
  const timer = setInterval(run, 30000);
  timer.unref();
  return () => clearInterval(timer);
}
module.exports = { REASONS, validateReason, recoveryWindow, detectOverdueOperations, sweepOverdueOperations, flushOperationPushes, startOverdueMonitor };
