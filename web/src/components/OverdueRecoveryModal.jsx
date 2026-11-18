import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { OPERATION_REASON_NAMES } from '../utils/operationReasonNames.js'
import '../styles/work-order-dialogs.css'
import '../styles/operations-recovery.css'

const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

async function request(path, body) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session) throw new Error('Please sign in again.')
  const response = await fetch(`${base}/api/operations${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Unable to complete this request.')
  return result
}

const format = (value) => value
  ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })
  : '—'
const label = (value) => String(value || '').replaceAll('_', ' ')
const needsFollowup = (incident) => !incident.recovered_at || (incident.task_id && incident.recovery_action === 'completed' && !incident.reviewed_at)
const todayManila = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())
const defaultRecoveryDate = () => {
  const now = new Date()
  const defaultStartToday = new Date(`${todayManila()}T08:00:00+08:00`)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now >= defaultStartToday ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : now)
}

export default function OverdueRecoveryModal({
  isOpen = true,
  onClose,
  initialIncidentId = null,
  initialTaskId = null,
  initialOrderId = null,
  initialStatus = null,
  onCancelAssignment,
  onCountChange,
}) {
  const [data, setData] = useState({ incidents: [], workers: [] })
  const [selectedId, setSelectedId] = useState(initialIncidentId)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [classification, setClassification] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')
  const [stopNotes, setStopNotes] = useState('')
  const [decision, setDecision] = useState('keep')
  const [form, setForm] = useState({ assignee_id: '', date: defaultRecoveryDate(), start_time: '08:00', end_time: '09:00' })
  const initializedIdRef = useRef(null)
  const countChangeRef = useRef(onCountChange)
  countChangeRef.current = onCountChange

  const load = useCallback(async () => {
    const result = await request('/admin')
    setData(result)
    countChangeRef.current?.((result.incidents || []).filter(needsFollowup).length)
    setLoading(false)
    return result
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined
    load().catch((caught) => { setError(caught.message); setLoading(false) })
    const timer = window.setInterval(() => load().catch(() => {}), 30000)
    return () => window.clearInterval(timer)
  }, [isOpen, load])

  useEffect(() => {
    if (selectedId || !data.incidents.length) return
    const item = initialTaskId != null
      ? data.incidents.find((incident) => Number(incident.task_id) === Number(initialTaskId) && needsFollowup(incident))
      : initialOrderId != null
        ? data.incidents.find((incident) => Number(incident.order_id) === Number(initialOrderId))
        : data.incidents.find((incident) => needsFollowup(incident) && incident.reason_submitted_at)
          || data.incidents.find(needsFollowup)
          || data.incidents[0]
    if (item) setSelectedId(item.id)
  }, [data.incidents, initialTaskId, initialOrderId, selectedId])

  const selected = useMemo(() => data.incidents.find((incident) => incident.id === selectedId) || null,
    [data.incidents, selectedId])

  useEffect(() => {
    if (!selected) return
    const formKey = `${selected.id}:${selected.reason_submitted_at || ''}`
    if (initializedIdRef.current === formKey) return
    initializedIdRef.current = formKey
    const earliestDate = defaultRecoveryDate()
    const requested = selected.buyer_requested_date || earliestDate
    let replacement = null
    if (selected.task_id && selected.can_continue === false) {
      const currentStatus = initialStatus || selected.original_status
      const currentCategory = data.workers.find((worker) => worker.id === selected.assignee_id)?.worker_category
      replacement = data.workers.find((worker) => worker.worker_category === currentCategory && worker.id !== selected.assignee_id)
      setDecision(currentStatus === 'in_progress' ? 'stop' : replacement ? 'reassign' : 'cancel')
    } else {
      setDecision('keep')
    }
    setForm({ assignee_id: replacement?.id || selected.assignee_id, date: requested >= earliestDate ? requested : earliestDate, start_time: '08:00', end_time: '09:00' })
    setClassification('')
    setReviewNotes('')
    setStopNotes('')
  }, [selected, initialStatus, data.workers])

  useEffect(() => {
    if (!isOpen) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape' && !busy) onClose?.() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, busy, onClose])

  const workerName = (id) => data.workers.find((worker) => worker.id === id)?.full_name || 'Assigned worker'
  const category = selected?.order_id ? 'driver'
    : data.workers.find((worker) => worker.id === selected?.assignee_id)?.worker_category || 'crop_management_worker'
  const available = data.workers.filter((worker) => worker.worker_category === category && worker.id !== selected?.assignee_id)
  const status = initialStatus || selected?.original_status
  const canReassign = selected?.task_id ? ['pending', 'scheduled'].includes(status) : status === 'assigned'
  const canCancel = selected?.task_id ? status === 'pending' : status === 'assigned'
  const canKeep = !selected?.task_id || selected.can_continue !== false
  const canStop = Boolean(selected?.task_id && status === 'in_progress' && selected.can_continue === false)
  const hasExplanation = Boolean(selected?.reason_submitted_at)
  const needsReview = hasExplanation && !selected?.reviewed_at
  const durationValid = form.start_time && form.end_time && form.end_time > form.start_time
  const startIsFuture = form.date && form.start_time && new Date(`${form.date}T${form.start_time}:00+08:00`).getTime() > Date.now()
  const decisionAllowed = decision === 'keep' ? canKeep
    : decision === 'reassign' ? canReassign && available.length > 0
      : decision === 'cancel' ? canCancel && Boolean(onCancelAssignment)
        : decision === 'stop' ? canStop : false
  const canSave = !busy && selected && !selected.recovered_at && hasExplanation && decisionAllowed
    && (!needsReview || (classification && reviewNotes.trim().length <= 2000))
    && (decision === 'cancel' || (decision === 'stop' ? stopNotes.trim().length >= 5 && stopNotes.trim().length <= 2000
      : durationValid && startIsFuture && (decision !== 'reassign' || form.assignee_id !== selected.assignee_id)))

  async function saveReview(event) {
    event.preventDefault()
    if (!selected || !needsReview || !classification || busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await request(`/${selected.id}/review`, { classification, notes: reviewNotes.trim() })
      setNotice('Delay review saved and the worker was notified.')
      await load()
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }

  function chooseDecision(value) {
    setDecision(value)
    setForm((current) => ({ ...current, assignee_id: value === 'reassign' ? available[0]?.id || '' : selected.assignee_id }))
  }

  async function saveDecision(event) {
    event.preventDefault()
    if (!canSave) return
    if (decision === 'cancel' && !window.confirm(`Cancel ${selected.label}? The assignee will be notified.`)) return
    if (decision === 'stop' && !window.confirm(`Stop ${selected.label}? The work already done will remain in its history.`)) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (needsReview) await request(`/${selected.id}/review`, { classification, notes: reviewNotes.trim() })
      if (decision === 'cancel') {
        if (!onCancelAssignment) throw new Error('Cancellation is unavailable. Please refresh and try again.')
        const cancelled = await onCancelAssignment(selected, true)
        if (!cancelled) throw new Error('This assignment could not be cancelled. Please refresh and try again.')
      } else if (decision === 'stop') {
        await request(`/${selected.id}/stop`, { notes: stopNotes.trim() })
      } else {
        await request(`/${selected.id}/recover`, {
          ...form,
          assignee_id: decision === 'reassign' ? form.assignee_id : selected.assignee_id,
        })
      }
      setNotice('Decision saved and the assignee was notified.')
      await load().catch(() => {})
    } catch (caught) {
      await load().catch(() => {})
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="task-modal-backdrop" onClick={() => { if (!busy) onClose?.() }} role="presentation">
      <section className="wo-dialog is-recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="overdue-decision-title" onClick={(event) => event.stopPropagation()}>
        <header className="wo-head">
          <div className="wo-head-text">
            <p className="wo-eyebrow">{selected?.task_id ? `WORK ORDER  #TASK-${selected.task_id}` : selected?.order_id ? `DELIVERY  #${selected.order_id}` : 'OVERDUE WORK'}</p>
            <h2 id="overdue-decision-title">{selected?.label || 'Overdue work'}</h2>
            <p className="wo-sub">Review the delay and decide what happens to this assignment.</p>
          </div>
          <button className="wo-close" type="button" onClick={onClose} disabled={busy} aria-label="Close dialog"><X size={20} aria-hidden="true" /></button>
        </header>
        <div className="wo-scroll custom-scrollbar">
          {error && (!selected || !hasExplanation || selected.recovered_at) && <p className="wo-error" role="alert">{error}</p>}
          {notice && <p className="or-success" role="status">{notice}</p>}
          {loading && <p className="wo-empty">Loading overdue work…</p>}
          {!loading && !selected && <p className="wo-empty">No overdue assignment was found.</p>}
          {selected && (
            <>
              <div className="or-facts">
                <span className={`status-pill ${selected.recovered_at ? 'is-recovered' : 'is-overdue'}`}>{selected.recovered_at ? label(selected.recovery_action) : 'Overdue'}</span>
                <span>Original schedule <strong>{format(selected.scheduled_at)}</strong></span>
                <span>Assigned to <strong>{workerName(selected.assignee_id)}</strong></span>
                <span>Status <strong>{label(status)}</strong></span>
              </div>

              {hasExplanation && (
                <section className="wo-section or-section">
                  <h3>{selected.order_id ? 'Driver explanation' : 'Worker explanation'}</h3>
                  <div className="or-explanation">
                    <strong>{workerName(selected.assignee_id)} · {OPERATION_REASON_NAMES[selected.reason_code] || label(selected.reason_code)}</strong>
                    <p>{selected.reason_notes}</p>
                    {selected.can_continue != null && <p><strong>Can still complete: {selected.can_continue ? 'Yes' : 'No'}</strong></p>}
                    <small>Submitted {format(selected.reason_submitted_at)}</small>
                  </div>
                </section>
              )}

              {hasExplanation && (
                <section className="wo-section or-section">
                  <h3>Admin classification</h3>
                  {selected.reviewed_at ? (
                    <p className="or-review-result"><strong>{selected.classification === 'excused' ? 'Excused' : 'Unexcused'}</strong>{selected.review_notes ? ` · ${selected.review_notes}` : ''}</p>
                  ) : (
                    <>
                      <div className="or-choices" role="group" aria-label="Delay classification">
                        {['excused', 'unexcused'].map((value) => (
                          <button key={value} type="button" className={`or-choice ${classification === value ? 'is-selected' : ''}`} aria-pressed={classification === value} disabled={busy} onClick={() => setClassification(value)}>
                            <span className="or-choice-dot" aria-hidden="true" />{value === 'excused' ? 'Excused' : 'Unexcused'}
                          </button>
                        ))}
                      </div>
                      <div className="wo-field or-notes">
                        <label htmlFor="overdue-review-notes">Decision notes (optional)</label>
                        <textarea id="overdue-review-notes" className="wo-input" maxLength={2000} rows={2} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Explain the classification" disabled={busy} />
                      </div>
                    </>
                  )}
                </section>
              )}

              <section className="wo-section or-section">
                <h3>{selected.task_id ? 'Task decision' : 'Delivery decision'}</h3>
                {selected.recovered_at ? (
                  <div className="or-outcome">
                    <strong>{selected.recovery_action === 'cancelled' ? (selected.task_id ? (selected.original_status === 'in_progress' ? 'Task stopped' : 'Task cancelled') : 'Assignment cancelled') : selected.recovery_action === 'reassign' ? 'Reassigned and rescheduled' : selected.recovery_action === 'reschedule' ? 'Same assignee, new schedule' : 'Work completed'}</strong>
                    {selected.new_scheduled_at && <p>New schedule: {format(selected.new_scheduled_at)} · {workerName(selected.new_assignee_id || selected.assignee_id)}</p>}
                    {needsReview && <form onSubmit={saveReview}><button type="submit" className="wo-btn is-primary" disabled={busy || !classification}>Save delay review</button></form>}
                  </div>
                ) : !hasExplanation ? (
                  <p className="wo-fine">The {selected.order_id ? 'driver' : 'worker'} must submit a delay reason before an admin decision is available.</p>
                ) : (
                  <form onSubmit={saveDecision}>
                    {canReassign || canCancel || canStop ? (
                      <div className="or-decisions" role="group" aria-label="Assignment decision">
                        {canKeep && <button type="button" className={`or-choice ${decision === 'keep' ? 'is-selected' : ''}`} aria-pressed={decision === 'keep'} disabled={busy} onClick={() => chooseDecision('keep')}><span className="or-choice-dot" aria-hidden="true" />Keep {selected.order_id ? 'driver' : 'worker'} and reschedule</button>}
                        {canReassign && available.length > 0 && <button type="button" className={`or-choice ${decision === 'reassign' ? 'is-selected' : ''}`} aria-pressed={decision === 'reassign'} disabled={busy} onClick={() => chooseDecision('reassign')}><span className="or-choice-dot" aria-hidden="true" />Reassign and reschedule</button>}
                        {canCancel && onCancelAssignment && <button type="button" className={`or-choice ${decision === 'cancel' ? 'is-selected' : ''}`} aria-pressed={decision === 'cancel'} disabled={busy} onClick={() => chooseDecision('cancel')}><span className="or-choice-dot" aria-hidden="true" />Cancel {selected.task_id ? 'task' : 'assignment'}</button>}
                        {canStop && <button type="button" className={`or-choice ${decision === 'stop' ? 'is-selected' : ''}`} aria-pressed={decision === 'stop'} disabled={busy} onClick={() => chooseDecision('stop')}><span className="or-choice-dot" aria-hidden="true" />Stop task and record work done</button>}
                      </div>
                    ) : <p className="wo-fine">Work has started, so this assignment remains with {workerName(selected.assignee_id)}.</p>}
                    {decision === 'stop' && <div className="wo-field or-notes"><label htmlFor="overdue-stop-notes">Work already done</label><textarea id="overdue-stop-notes" className="wo-input" minLength={5} maxLength={2000} rows={3} required value={stopNotes} onChange={(event) => setStopNotes(event.target.value)} placeholder="Record the work completed before stopping" disabled={busy} /></div>}
                    {decision !== 'cancel' && decision !== 'stop' && (
                      <div className="wo-grid or-schedule">
                        {decision === 'reassign' && <div className="wo-field is-wide"><label htmlFor="overdue-assignee">{selected.order_id ? 'New driver' : 'New worker'}</label><select id="overdue-assignee" className="wo-input" required value={form.assignee_id} onChange={(event) => setForm({ ...form, assignee_id: event.target.value })}>{available.map((worker) => <option key={worker.id} value={worker.id}>{worker.full_name}</option>)}</select></div>}
                        <div className="wo-field is-wide"><label htmlFor="overdue-date">New date</label><input id="overdue-date" className="wo-input" required type="date" min={todayManila()} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
                        <div className="wo-field"><label htmlFor="overdue-start">Start time</label><input id="overdue-start" className="wo-input" required type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} /></div>
                        <div className="wo-field"><label htmlFor="overdue-end">End time</label><input id="overdue-end" className="wo-input" required type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} /></div>
                      </div>
                    )}
                    {error && <p className="wo-error" role="alert">{error}</p>}
                    {decision !== 'cancel' && decision !== 'stop' && !startIsFuture && form.date && form.start_time && <p className="wo-error" role="status">Choose a future start date and time.</p>}
                    <div className="or-actions"><button type="submit" className={`wo-btn ${['cancel', 'stop'].includes(decision) ? 'is-danger' : 'is-primary'}`} disabled={!canSave}>{busy ? 'Saving…' : `Save decision & notify ${selected.order_id ? 'driver' : 'worker'}`}</button></div>
                  </form>
                )}
              </section>

            </>
          )}
        </div>
      </section>
    </div>
  )
}
