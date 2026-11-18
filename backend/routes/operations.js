const express = require('express');
const { requireAuth, requireRole, requireInitialPasswordChanged, requireProfileOnboardingComplete } = require('../middleware/auth');
const { getSupabase } = require('../supabase');
const { httpError } = require('../lib/http-error');
const { mapScheduleConflictDatabaseError } = require('../lib/schedule-conflicts');
const { REASONS, validateReason, recoveryWindow, detectOverdueOperations, flushOperationPushes } = require('../lib/overdue-operations');
const router = express.Router();
router.use(requireAuth);
router.use((req, res, next) => {
  if (req.profile.role !== 'farm_worker') return next();
  return requireInitialPasswordChanged(req, res, () => requireProfileOnboardingComplete(req, res, next));
});
const admin = requireRole('admin');
const staff = requireRole('farm_worker');
const buyer = requireRole('buyer');
function id(value) { const n = Number(value); if (!Number.isSafeInteger(n) || n < 1) throw httpError(400, 'Invalid incident.'); return n; }
function fail(error) {
  if (!error) return;
  if (error.code === 'P0001' || error.code === '23514') throw httpError(409, error.message);
  throw error;
}
async function requireSubmittedReason(incidentId, requireReview = false) {
  const { data, error } = await getSupabase().from('operation_incidents')
    .select('reason_submitted_at, reviewed_at').eq('id', incidentId).maybeSingle();
  fail(error);
  if (!data) throw httpError(404, 'Overdue assignment was not found.');
  if (!data.reason_submitted_at) throw httpError(409, 'The assignee must submit a delay reason before an admin decision.');
  if (requireReview && !data.reviewed_at) throw httpError(409, 'Review the delay reason before deciding this assignment.');
}
async function notifyAdmins(item, type, title, body) {
  const { data, error } = await getSupabase().from('profiles').select('id').eq('role', 'admin');
  fail(error);
  for (const a of data || []) {
    const { error: notifyError } = await getSupabase().rpc('operation_notify', { p_recipient: a.id, p_type: type, p_title: title, p_body: body, p_task: item.task_id, p_order: item.order_id });
    fail(notifyError);
  }
}
router.get('/mine', staff, async (req, res, next) => {
  try {
    await detectOverdueOperations();
    const { data, error } = await getSupabase().from('operation_incidents').select('*').eq('assignee_id', req.user.id).order('detected_at', { ascending: false });
    fail(error); res.json({ incidents: data || [], reasons: REASONS });
  } catch (error) { next(error); }
});
router.post('/:id/reason', staff, async (req, res, next) => {
  try {
    const changes = validateReason(req.body);
    const { data, error } = await getSupabase().from('operation_incidents').update(changes).eq('id', id(req.params.id)).eq('assignee_id', req.user.id).is('reason_submitted_at', null)
      .or('recovered_at.is.null,and(task_id.not.is.null,recovery_action.eq.completed)').select('*').maybeSingle();
    fail(error); if (!data) throw httpError(409, 'This reason was already submitted or the incident is not assigned to you.');
    // Reason is saved even if notification delivery needs a retry.
    await notifyAdmins(data, 'operation_reason', 'Delay reason submitted', `${data.label}: ${changes.reason_code.replaceAll('_', ' ')}. ${data.recovery_action === 'completed' ? 'Task submitted for review.' : changes.can_continue ? 'Assignee can continue.' : 'Assignee cannot continue.'} Review the overdue assignment.`).catch(console.error);
    res.json({ incident: data });
  } catch (error) { next(error); }
});
router.get('/admin', admin, async (_req, res, next) => {
  try {
    await detectOverdueOperations();
    const db = getSupabase();
    const results = await Promise.all([
      db.from('operation_incidents').select('*').order('detected_at', { ascending: false }).limit(500),
      db.from('profiles').select('id, full_name, worker_category').eq('role', 'farm_worker'),
      db.from('operation_reports').select('*').order('generated_at', { ascending: false }).limit(100),
      db.from('operation_dependencies').select('*').is('completed_at', null),
      db.rpc('operation_performance'),
    ]);
    results.forEach((result) => fail(result.error));
    res.json({ incidents: results[0].data, workers: results[1].data, reports: results[2].data, dependencies: results[3].data, metrics: results[4].data });
  } catch (error) { next(error); }
});
router.post('/:id/recover', admin, async (req, res, next) => {
  try {
    const incidentId = id(req.params.id);
    const window = recoveryWindow(req.body);
    await requireSubmittedReason(incidentId, true);
    const { error } = await getSupabase().rpc('recover_operation', { p_incident: incidentId, p_admin: req.user.id, ...window });
    if (error) fail(mapScheduleConflictDatabaseError(error));
    res.json({ ok: true });
  } catch (error) { next(error); }
});
router.post('/:id/stop', admin, async (req, res, next) => {
  try {
    const notes = String(req.body.notes || '').trim();
    if (notes.length < 5 || notes.length > 2000) throw httpError(400, 'Record the work already done in 5–2000 characters.');
    const incidentId = id(req.params.id);
    await requireSubmittedReason(incidentId, true);
    const { error } = await getSupabase().rpc('stop_overdue_task', {
      p_incident: incidentId, p_admin: req.user.id, p_notes: notes,
    });
    fail(error); res.json({ ok: true });
  } catch (error) { next(error); }
});
router.post('/:id/review', admin, async (req, res, next) => {
  try {
    if (!['excused', 'unexcused'].includes(req.body.classification)) throw httpError(400, 'Select excused or unexcused.');
    const notes = String(req.body.notes || '').trim();
    if (notes.length > 2000) throw httpError(400, 'Review notes must be 2000 characters or fewer.');
    const db = getSupabase();
    const incidentId = id(req.params.id);
    await requireSubmittedReason(incidentId);
    const { error } = await db.rpc('review_operation_incident', { p_incident: incidentId, p_admin: req.user.id, p_classification: req.body.classification, p_notes: notes || null });
    fail(error);
    try {
      const { data: incident, error: readError } = await db.from('operation_incidents')
        .select('assignee_id, label, task_id, order_id').eq('id', incidentId).single();
      if (readError) throw readError;
      const { error: notifyError } = await db.rpc('operation_notify', {
        p_recipient: incident.assignee_id,
        p_type: 'operation_recovery',
        p_title: `Delay review: ${req.body.classification === 'excused' ? 'Excused' : 'Unexcused'}`,
        p_body: `${incident.label}: your delay explanation was reviewed as ${req.body.classification}.`,
        p_task: incident.task_id,
        p_order: incident.order_id,
      });
      if (notifyError) throw notifyError;
    } catch (notifyError) {
      console.error('Delay review notification failed:', notifyError.message);
    }
    res.json({ ok: true });
  } catch (error) { next(error); }
});
router.post('/:id/report', admin, async (req, res, next) => {
  try {
    const { error } = await getSupabase().rpc('generate_operation_report', { p_incident: id(req.params.id), p_admin: req.user.id });
    fail(error); res.json({ ok: true });
  } catch (error) { next(error); }
});
router.post('/reports/:id/review', admin, async (req, res, next) => {
  try {
    const notes = String(req.body.notes || '').trim();
    if (notes.length < 5 || notes.length > 4000) throw httpError(400, 'Enter HR review notes in 5–4000 characters.');
    const { data, error } = await getSupabase().from('operation_reports').update({ status: 'reviewed', hr_notes: notes, reviewed_by: req.user.id, reviewed_at: new Date().toISOString() }).eq('id', id(req.params.id)).eq('status', 'awaiting_hr_review').select('id').maybeSingle();
    fail(error); if (!data) throw httpError(409, 'Report already reviewed or not found.'); res.json({ ok: true });
  } catch (error) { next(error); }
});
router.post('/:id/dependencies', admin, async (req, res, next) => {
  try {
    const step = String(req.body.step || '').trim();
    if (!['warehouse', 'billing'].includes(req.body.kind) || !step || step.length > 200) throw httpError(400, 'Enter a warehouse or billing step (up to 200 characters).');
    const { error } = await getSupabase().rpc('add_operation_dependency', { p_incident: id(req.params.id), p_step: step, p_kind: req.body.kind });
    fail(error); res.json({ ok: true });
  } catch (error) { next(error); }
});
router.post('/dependencies/:id/complete', admin, async (req, res, next) => {
  try {
    const { error } = await getSupabase().rpc('complete_operation_dependency', { p_dependency: id(req.params.id) });
    fail(error); res.json({ ok: true });
  } catch (error) { next(error); }
});
// Buyer sees only delivery updates and their own request, never internal reasons or HR data.
router.get('/orders/:id', buyer, async (req, res, next) => {
  try {
    const { data: order, error: orderError } = await getSupabase().from('buyer_orders').select('id, order_number, delivery_scheduled_at, delivery_window_end_at, order_status, delivered_at').eq('id', id(req.params.id)).eq('buyer_id', req.user.id).maybeSingle();
    fail(orderError); if (!order) throw httpError(404, 'Order not found.');
    const { data, error } = await getSupabase().from('operation_incidents').select('id, detected_at, recovered_at, new_scheduled_at, recovery_action, buyer_requested_date, buyer_request_notes').eq('order_id', order.id).order('detected_at', { ascending: false }).limit(1);
    fail(error); res.json({ update: data?.[0] || null, order });
  } catch (error) { next(error); }
});
router.post('/orders/:id/request-date', buyer, async (req, res, next) => {
  try {
    const date = String(req.body.date || '');
    recoveryWindow({ date, start_time: '00:00', end_time: '23:59', assignee_id: req.user.id });
    const notes = String(req.body.notes || '').trim();
    if (notes.length > 1000) throw httpError(400, 'Notes must not exceed 1000 characters.');
    const { error } = await getSupabase().rpc('request_operation_delivery_date', { p_order: id(req.params.id), p_buyer: req.user.id, p_date: date, p_notes: notes });
    fail(error); res.json({ ok: true });
  } catch (error) { next(error); }
});
router.post('/push/retry', admin, async (_req, res, next) => { try { await flushOperationPushes(); res.json({ ok: true }); } catch (e) { next(e); } });
module.exports = router;
