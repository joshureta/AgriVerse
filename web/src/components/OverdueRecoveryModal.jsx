import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  PauseCircle,
  RotateCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sprout,
  Truck,
  User,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import '../styles/work-order-dialogs.css'
import '../styles/operations-recovery.css'

const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

async function request(path, body) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session) throw new Error('Please sign in again.')
  const response = await fetch(`${base}/api/operations${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to complete this request.')
  return result
}

const format = (value) =>
  value
    ? new Date(value).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—'

const label = (value) => (value || '').replaceAll('_', ' ')

const REASON_NAMES = {
  vehicle_breakdown: 'Vehicle Breakdown',
  traffic_road_closure: 'Traffic / Road Closure',
  customer_unavailable: 'Customer Unavailable',
  weather: 'Adverse Weather',
  supplies_unavailable: 'Supplies Unavailable',
  illness_emergency: 'Illness / Emergency',
  other: 'Other Reason',
}

const getTodayManila = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

/**
 * Step 6: Incident Review & Accountability Component
 * Faithful to design specification wireframe 6:
 * - Target item with days late
 * - Reason summary and quoted worker explanation
 * - Interactive Excused vs Unexcused classification toggle
 * - Real-time staff accountability KPIs (Missed dates, On-time rate)
 * - Repeated unexcused misses alert banner
 * - Generate Incident Report CTA & Save Review Decision CTA
 * - Policy / compliance legal footnote
 */
function IncidentReviewCard({
  selected,
  assigneeMetric,
  review,
  setReview,
  busy,
  act,
  existingReport,
}) {
  const [reclassifying, setReclassifying] = useState(false)

  const daysLate = useMemo(() => {
    if (!selected?.scheduled_at) return null
    const sched = new Date(selected.scheduled_at)
    const now = new Date()
    const diff = Math.max(1, Math.round((now - sched) / (1000 * 60 * 60 * 24)))
    return `${diff} ${diff === 1 ? 'day' : 'days'} late`
  }, [selected?.scheduled_at])

  const reasonText = selected?.reason_code
    ? REASON_NAMES[selected.reason_code] || label(selected.reason_code)
    : selected?.reason_submitted_at
      ? 'Delay reason provided'
      : 'Delay explanation pending submission'

  const hasRepeatUnexcused =
    (assigneeMetric?.unexcused || 0) >= 2 ||
    ((assigneeMetric?.unexcused || 0) >= 1 && review.classification === 'unexcused')

  if (!selected) return null

  return (
    <div className="incident-review-card">
      <div className="incident-review-header">
        <div className="incident-review-title">
          <div className="incident-review-icon-box">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3>Incident Review &amp; Accountability</h3>
            <span className="incident-review-subtitle">
              Classify delay cause and record staff performance accountability
            </span>
          </div>
        </div>
        {selected.reviewed_at && !reclassifying ? (
          <span className={`chip-classification ${selected.classification}`}>
            {label(selected.classification).toUpperCase()}
          </span>
        ) : (
          <span className="status-pill is-pending">Awaiting Review</span>
        )}
      </div>

      {/* Incident Target Hero Bar (Direct from Wireframe 6) */}
      <div className="incident-target-hero">
        <div className="incident-target-main">
          <div className="incident-target-icon">
            {selected.order_id ? <Truck size={17} /> : <Sprout size={17} />}
          </div>
          <div className="incident-target-details">
            <div className="incident-target-label-row">
              <strong className="incident-target-label">{selected.label}</strong>
              {daysLate && <span className="incident-late-badge">{daysLate}</span>}
            </div>
            <div className="incident-reason-line">
              <span className="incident-reason-tag">Reason:</span>
              <span className="incident-reason-value">{reasonText}</span>
            </div>
          </div>
        </div>

        {selected.reason_notes && (
          <div className="incident-reason-quote">
            &ldquo;{selected.reason_notes}&rdquo;
          </div>
        )}
      </div>

      {selected.reviewed_at && !reclassifying ? (
        <div className="review-already-completed">
          <div className="review-completed-header">
            <CheckCircle2 size={18} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <strong>Classified as {label(selected.classification).toUpperCase()}</strong>
                <button
                  type="button"
                  className="recovery-secondary-btn"
                  style={{ padding: '3px 9px', fontSize: '11px' }}
                  onClick={() => {
                    setReview({ classification: selected.classification || 'excused', notes: selected.review_notes || '' })
                    setReclassifying(true)
                  }}
                >
                  Change Decision
                </button>
              </div>
              {selected.review_notes && (
                <p>&ldquo;{selected.review_notes}&rdquo;</p>
              )}
              <small>Reviewed on {format(selected.reviewed_at)}</small>
            </div>
          </div>

          {/* Quick Metrics display */}
          <div className="accountability-kpi-row" style={{ marginTop: '12px' }}>
            <div className="accountability-kpi-tile">
              <div className="kpi-icon-wrap">
                <Calendar size={16} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">Missed Dates</span>
                <span className="kpi-value">{assigneeMetric?.missed ?? 1}</span>
              </div>
            </div>

            <div className="accountability-kpi-tile">
              <div className="kpi-icon-wrap">
                <BarChart2 size={16} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">On-Time Rate</span>
                <span className="kpi-value">
                  {assigneeMetric?.on_time_rate != null
                    ? `${assigneeMetric.on_time_rate}%`
                    : 'Updated'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            act(`/${selected.id}/review`, review)
            setReclassifying(false)
          }}
          className="incident-review-form"
        >
          {/* Classification Option Cards (Excused vs Unexcused) */}
          <div className="classification-section">
            <span className="section-label">Classification</span>
            <div className="classification-cards-grid">
              <button
                type="button"
                className={`classification-choice-card excused ${
                  review.classification === 'excused' ? 'is-selected' : ''
                }`}
                onClick={() => setReview((prev) => ({ ...prev, classification: 'excused' }))}
              >
                <div className="choice-card-radio">
                  <div className="radio-inner" />
                </div>
                <div className="choice-card-content">
                  <div className="choice-card-title">
                    <CheckCircle2 size={15} />
                    <span>Excused</span>
                  </div>
                  <span className="choice-card-sub">
                    Unavoidable: severe weather, vehicle breakdown, emergency
                  </span>
                </div>
              </button>

              <button
                type="button"
                className={`classification-choice-card unexcused ${
                  review.classification === 'unexcused' ? 'is-selected' : ''
                }`}
                onClick={() => setReview((prev) => ({ ...prev, classification: 'unexcused' }))}
              >
                <div className="choice-card-radio">
                  <div className="radio-inner" />
                </div>
                <div className="choice-card-content">
                  <div className="choice-card-title">
                    <AlertTriangle size={15} />
                    <span>Unexcused</span>
                  </div>
                  <span className="choice-card-sub">
                    Preventable: missed scheduled window, unannounced delay
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Staff Performance Metrics Tiles (From Wireframe 6) */}
          <div className="accountability-kpi-row">
            <div className="accountability-kpi-tile">
              <div className="kpi-icon-wrap">
                <Calendar size={16} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">Missed Dates</span>
                <span className="kpi-value">{assigneeMetric?.missed ?? 1}</span>
              </div>
            </div>

            <div className="accountability-kpi-tile">
              <div className="kpi-icon-wrap">
                <BarChart2 size={16} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">On-Time Rate</span>
                <span className="kpi-value">
                  {assigneeMetric?.on_time_rate != null
                    ? `${assigneeMetric.on_time_rate}%`
                    : 'Updated'}
                </span>
              </div>
            </div>
          </div>

          {/* Repeat Unexcused Misses Callout Banner (From Wireframe 6) */}
          {hasRepeatUnexcused && (
            <div className="repeat-misses-alert">
              <RotateCw size={15} className="repeat-alert-icon" />
              <div className="repeat-alert-content">
                <strong>Repeated Unexcused Misses</strong>
                <p>
                  Staff member has {assigneeMetric?.unexcused || 1} prior unexcused incident(s).
                  Farm operations policy permits generating an authorized incident report for HR review.
                </p>
              </div>
            </div>
          )}

          {/* Decision Notes */}
          <div className="recovery-form-group">
            <label htmlFor="incident-review-notes">
              Decision Justification Notes (Required)
            </label>
            <textarea
              id="incident-review-notes"
              required
              minLength={5}
              maxLength={2000}
              rows={2}
              placeholder="State the justification for this classification (e.g. Verified torrential rain on Field A / Flat tire reported to dispatch)..."
              value={review.notes}
              onChange={(e) => setReview({ ...review, notes: e.target.value })}
            />
          </div>

          {/* Action CTAs: Generate Incident Report & Save Review Decision */}
          <div className="incident-actions-bar">
            {reclassifying && (
              <button
                type="button"
                className="recovery-secondary-btn"
                onClick={() => setReclassifying(false)}
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              className="recovery-secondary-btn generate-report-btn"
              disabled={busy || Boolean(existingReport)}
              onClick={() => act(`/${selected.id}/report`)}
              title={
                existingReport
                  ? `Report #${existingReport.id} already generated`
                  : 'Generate formal incident record for HR documentation'
              }
            >
              <FileText size={14} />
              <span>{existingReport ? `Report #${existingReport.id} Generated` : 'Generate Incident Report'}</span>
            </button>

            <button
              type="submit"
              className="recovery-primary-btn save-decision-btn"
              disabled={busy || !review.notes.trim() || review.notes.trim().length < 5}
            >
              <ShieldCheck size={15} />
              <span>Save Review Decision</span>
            </button>
          </div>
        </form>
      )}

      {/* Compliance / Policy Notice (From Wireframe 6) */}
      <div className="policy-compliance-footer">
        <Info size={13} />
        <span>
          HR reviews evidence and company policy before any action. No automatic punishment, no legal claim.
        </span>
      </div>
    </div>
  )
}

export default function OverdueRecoveryModal({
  isOpen = true,
  onClose,
  initialIncidentId = null,
  onCountChange,
}) {
  const [data, setData] = useState({
    incidents: [],
    workers: [],
    reports: [],
    dependencies: [],
    metrics: [],
  })
  const [activeTab, setActiveTab] = useState('recovery') // 'recovery' | 'performance' | 'reports'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedId, setSelectedId] = useState(initialIncidentId)
  const [form, setForm] = useState({
    assignee_id: '',
    date: getTodayManila(),
    start_time: '08:00',
    end_time: '09:00',
  })
  const [review, setReview] = useState({ classification: 'excused', notes: '' })
  const [hold, setHold] = useState({ kind: 'warehouse', step: '' })
  const [hrNotes, setHrNotes] = useState({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await request('/admin')
      setData(result)
      const needRecCount = (result.incidents || []).filter((i) => !i.recovered_at).length
      if (onCountChange) onCountChange(needRecCount)
      setError('')
    } catch (caught) {
      setError(caught.message)
    } finally {
      setLoading(false)
    }
  }, [onCountChange])

  useEffect(() => {
    if (!isOpen) return undefined
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [isOpen, load])

  useEffect(() => {
    if (initialIncidentId) {
      setSelectedId(initialIncidentId)
    } else if (data.incidents.length > 0 && !selectedId) {
      const unrecovered = data.incidents.find((i) => !i.recovered_at)
      setSelectedId(unrecovered ? unrecovered.id : data.incidents[0].id)
    }
  }, [initialIncidentId, selectedId, data.incidents])

  useEffect(() => {
    if (selectedId && data.incidents.length) {
      const item = data.incidents.find((i) => i.id === selectedId)
      if (item) {
        const today = getTodayManila()
        const targetDate = item.buyer_requested_date || today
        setForm((prev) => ({
          ...prev,
          assignee_id: item.assignee_id,
          date: targetDate >= today ? targetDate : today,
        }))
      }
    }
  }, [selectedId, data.incidents])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return undefined
    function handleKeyDown(event) {
      if (event.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const workerName = useCallback(
    (id) => data.workers.find((w) => w.id === id)?.full_name || id,
    [data.workers],
  )

  const selected = useMemo(
    () => data.incidents.find((i) => i.id === selectedId) || data.incidents[0] || null,
    [data.incidents, selectedId],
  )

  const available = useMemo(() => {
    if (!selected) return []
    return data.workers.filter(
      (w) =>
        w.worker_category ===
        (selected.order_id
          ? 'driver'
          : data.workers.find((u) => u.id === selected.assignee_id)?.worker_category),
    )
  }, [selected, data.workers])

  async function act(path, body) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await request(path, body)
      setNotice('Saved successfully.')
      await load()
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }

  function select(item) {
    setSelectedId(item.id)
    setReview({ classification: 'excused', notes: '' })
    setHold({ kind: 'warehouse', step: '' })

    const today = getTodayManila()
    const targetDate = item.buyer_requested_date || today
    setForm({
      assignee_id: item.assignee_id,
      date: targetDate >= today ? targetDate : today,
      start_time: '08:00',
      end_time: '09:00',
    })
  }

  const durationMins = useMemo(() => {
    if (!form.start_time || !form.end_time) return null
    const [sh, sm] = form.start_time.split(':').map(Number)
    const [eh, em] = form.end_time.split(':').map(Number)
    const diff = eh * 60 + em - (sh * 60 + sm)
    return diff > 0 ? diff : null
  }, [form.start_time, form.end_time])

  const overdueDurationText = useMemo(() => {
    if (!selected?.scheduled_at) return ''
    const sched = new Date(selected.scheduled_at)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - sched.getTime()) / (1000 * 60 * 60))
    if (diffHours >= 48) {
      return `${Math.floor(diffHours / 24)} days late`
    }
    if (diffHours >= 1) {
      return `${diffHours} hr${diffHours === 1 ? '' : 's'} late`
    }
    return 'Recently overdue'
  }, [selected])

  if (!isOpen) return null

  const needRecoveryCount = data.incidents.filter((i) => !i.recovered_at).length
  const unreviewedCount = data.incidents.filter((i) => !i.reviewed_at).length
  const assigneeMetric = selected
    ? data.metrics.find((m) => m.assignee_id === selected.assignee_id)
    : null
  const existingReport = selected
    ? data.reports.find((r) => r.snapshot?.incident?.id === selected.id)
    : null
  const selectedDependencies = selected
    ? data.dependencies.filter((d) => d.incident_id === selected.id)
    : []

  return (
    <div className="task-modal-backdrop" onClick={onClose} role="presentation">
      <section
        className="wo-dialog is-recovery-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Simple & Clean Header */}
        <header className="wo-head">
          <div className="wo-head-text">
            <p className="wo-eyebrow">
              OPERATIONS RECOVERY
              {selected ? <span>{selected.order_id ? 'DELIVERY RECOVERY' : 'TASK RECOVERY'}</span> : null}
            </p>
            <h2 id="recovery-modal-title">
              {selected ? selected.label : 'Overdue Operations & Recovery'}
            </h2>
            <p className="wo-sub">
              {selected
                ? `Originally scheduled for ${format(selected.scheduled_at)} · Assigned to ${workerName(selected.assignee_id)}`
                : 'Review worker delay explanations and confirm recovery schedules.'}
            </p>
          </div>
          <button className="wo-close" type="button" onClick={onClose} aria-label="Close dialog">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {/* Clean Sub-Navigation Tabs */}
        <div className="recovery-nav-tabs">
          <button
            type="button"
            className={`recovery-nav-tab ${activeTab === 'recovery' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('recovery')}
          >
            <Clock size={15} />
            <span>Overdue Recovery</span>
            {needRecoveryCount > 0 && <span className="tab-badge is-alert">{needRecoveryCount}</span>}
          </button>
          <button
            type="button"
            className={`recovery-nav-tab ${activeTab === 'performance' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            <Scale size={15} />
            <span>Review &amp; Accountability</span>
            {unreviewedCount > 0 && <span className="tab-badge is-alert">{unreviewedCount}</span>}
          </button>
          {data.reports.length > 0 && (
            <button
              type="button"
              className={`recovery-nav-tab ${activeTab === 'reports' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <ShieldAlert size={15} />
              <span>HR Reports</span>
              <span className="tab-badge">{data.reports.length}</span>
            </button>
          )}
        </div>

        {/* Horizontal Overdue Incident Switcher (when multiple items exist) */}
        {activeTab === 'recovery' && data.incidents.length > 1 && (
          <div className="recovery-item-switcher">
            <span className="switcher-label">Overdue Items ({data.incidents.length}):</span>
            <div className="switcher-pills">
              {data.incidents.map((inc) => {
                const isSel = inc.id === selectedId
                const isRec = Boolean(inc.recovered_at)
                const needsR = !inc.reason_submitted_at
                return (
                  <button
                    key={inc.id}
                    type="button"
                    className={`switcher-pill ${isSel ? 'is-selected' : ''}`}
                    onClick={() => select(inc)}
                  >
                    <span className="switcher-pill-icon">{inc.order_id ? <Truck size={13} /> : <Sprout size={13} />}</span>
                    <span>{inc.label}</span>
                    {needsR ? (
                      <span className="switcher-flag is-pending">Reason Needed</span>
                    ) : isRec ? (
                      <span className="switcher-flag is-done">✓ Recovered</span>
                    ) : (
                      <span className="switcher-flag is-overdue">Overdue</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="wo-scroll custom-scrollbar" style={{ padding: '20px 24px' }}>
          {/* Feedback Banners */}
          {error && (
            <div role="alert" className="recovery-banner is-error">
              <div>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
              <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
                <X size={14} />
              </button>
            </div>
          )}

          {notice && (
            <div role="status" className="recovery-banner is-success">
              <div>
                <CheckCircle2 size={16} />
                <span>{notice}</span>
              </div>
              <button type="button" onClick={() => setNotice('')} aria-label="Dismiss notice">
                <X size={14} />
              </button>
            </div>
          )}

          {/* TAB 1: Overdue Recovery View */}
          {activeTab === 'recovery' && (
            <>
              {loading && data.incidents.length === 0 ? (
                <div className="recovery-empty-state" style={{ padding: '40px 20px' }}>
                  <RotateCw size={28} className="recovery-spin" />
                  <p>Loading overdue operations…</p>
                </div>
              ) : !selected ? (
                <div className="recovery-empty-state" style={{ padding: '48px 24px' }}>
                  <CheckCircle2 size={42} style={{ color: '#16a34a' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#14532d', margin: '8px 0 4px' }}>
                    All Operations On Schedule
                  </h3>
                  <p style={{ color: '#556758', margin: 0 }}>
                    There are no active overdue tasks or deliveries requiring recovery.
                  </p>
                </div>
              ) : (
                <>
                  {/* Top Context Banner: Item metadata + Worker Delay Explanation */}
                  <div className="recovery-context-banner">
                    {/* Left: Item Profile & Overdue Status */}
                    <div className="context-banner-item">
                      <div className="context-icon-box">
                        {selected.order_id ? <Truck size={20} /> : <Sprout size={20} />}
                      </div>
                      <div className="context-item-details">
                        <div className="context-title-row">
                          <span className="context-title-text">{selected.label}</span>
                          <span
                            className={`status-pill ${selected.recovered_at ? 'is-recovered' : 'is-overdue'}`}
                          >
                            {selected.recovered_at
                              ? `✓ ${label(selected.recovery_action).toUpperCase()}`
                              : 'OVERDUE'}
                          </span>
                          {overdueDurationText && (
                            <span className="incident-late-badge">{overdueDurationText}</span>
                          )}
                        </div>
                        <div className="context-meta-row">
                          <span className="context-meta-item">
                            Assigned: <strong>{workerName(selected.assignee_id)}</strong>
                          </span>
                          <span>•</span>
                          <span className="context-meta-item">
                            Original: <strong>{format(selected.scheduled_at)}</strong>
                          </span>
                          <span>•</span>
                          <span className="context-meta-item">
                            Status: <strong>{label(selected.original_status)}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Worker Delay Explanation */}
                    <div className={`context-explanation-box ${selected.reason_submitted_at ? '' : 'is-pending'}`}>
                      <div className="context-explanation-head">
                        <span>Worker Delay Reason</span>
                        {selected.reason_submitted_at ? (
                          <span className="context-reason-pill">
                            ✓ {REASON_NAMES[selected.reason_code] || label(selected.reason_code)}
                          </span>
                        ) : (
                          <span className="switcher-flag is-pending">Pending Submission</span>
                        )}
                      </div>
                      {selected.reason_submitted_at ? (
                        <p className="context-quote-text">
                          &ldquo;{selected.reason_notes || 'No detailed explanation provided.'}&rdquo;
                        </p>
                      ) : (
                        <p style={{ margin: 0, fontSize: '11.5px', color: '#92400e', fontWeight: 600 }}>
                          ⚠ Awaiting worker submission before closing this task or starting another job.
                        </p>
                      )}
                      {selected.buyer_requested_date && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 700 }}>
                            <CalendarCheck size={12} style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                            Customer requested: {selected.buyer_requested_date}
                          </span>
                          {!selected.recovered_at && form.date !== selected.buyer_requested_date && (
                            <button
                              type="button"
                              className="recovery-secondary-btn"
                              style={{ padding: '2px 6px', fontSize: '10px' }}
                              onClick={() => setForm((prev) => ({ ...prev, date: selected.buyer_requested_date }))}
                            >
                              Use Date
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Balanced 2-Column Action Grid: Step 4 Reschedule on Left, Step 6 Incident Review on Right */}
                  <div className="recovery-balanced-grid">
                    {/* Left Column: Confirm Recovery Schedule & Operational Holds */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="recovery-action-card">
                        <div className="recovery-action-card-head">
                          <h3>
                            <CalendarCheck size={16} />
                            <span>Confirm Recovery Schedule</span>
                          </h3>
                          {selected.recovered_at ? (
                            <span className="status-pill is-recovered">Schedule Active</span>
                          ) : (
                            <span className="status-pill is-pending">Action Required</span>
                          )}
                        </div>

                        {selected.recovered_at ? (
                          <div className="recovery-confirmed-card" style={{ margin: 0 }}>
                            <CheckCircle2 size={20} />
                            <div>
                              <strong>Recovery Rescheduled Successfully</strong>
                              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                                Assigned to: <b>{workerName(selected.new_assignee_id || selected.assignee_id)}</b>
                                <br />
                                New schedule: <b>{format(selected.new_scheduled_at || selected.recovered_at)}</b>
                              </p>
                            </div>
                          </div>
                        ) : (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              act(`/${selected.id}/recover`, form)
                            }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                          >
                            <div className="recovery-field">
                              <label htmlFor="simple-worker-select">
                                <User size={13} /> Assignee (Worker / Driver)
                              </label>
                              <select
                                id="simple-worker-select"
                                required
                                value={form.assignee_id}
                                onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
                              >
                                {available.map((w) => (
                                  <option key={w.id} value={w.id}>
                                    {w.full_name} ({w.worker_category === 'driver' ? 'Driver' : 'Crop Worker'})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="recovery-field">
                              <label htmlFor="simple-date-input">
                                <Calendar size={13} /> Recovery Date
                              </label>
                              <input
                                id="simple-date-input"
                                required
                                type="date"
                                min={getTodayManila()}
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                              />
                            </div>

                            <div className="recovery-time-row">
                              <div className="recovery-field">
                                <label htmlFor="simple-start-time">
                                  <Clock size={13} /> Start Time
                                </label>
                                <input
                                  id="simple-start-time"
                                  required
                                  type="time"
                                  value={form.start_time}
                                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                                />
                              </div>
                              <div className="recovery-field">
                                <label htmlFor="simple-end-time">
                                  <Clock size={13} /> End Time
                                </label>
                                <input
                                  id="simple-end-time"
                                  required
                                  type="time"
                                  value={form.end_time}
                                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                                />
                              </div>
                            </div>

                            {durationMins && (
                              <div className="recovery-duration-badge">
                                <Clock size={12} />
                                <span>Duration: {durationMins} mins allocated</span>
                              </div>
                            )}

                            <button
                              type="submit"
                              className="recovery-confirm-btn"
                              disabled={busy}
                            >
                              <Check size={16} />
                              {busy ? 'Confirming Recovery…' : 'Confirm Recovery & Alert Staff'}
                            </button>
                          </form>
                        )}
                      </div>

                      {/* Linked Operational Holds (Clean Card) */}
                      <div className="recovery-action-card">
                        <div className="recovery-action-card-head">
                          <h3>
                            <PauseCircle size={16} />
                            <span>Linked Operational Holds</span>
                          </h3>
                          {selectedDependencies.length > 0 && (
                            <span className="status-pill is-info">
                              {selectedDependencies.length} Hold{selectedDependencies.length === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>

                        {selectedDependencies.length > 0 && (
                          <div className="recovery-holds-list" style={{ margin: 0 }}>
                            {selectedDependencies.map((d) => (
                              <div
                                key={d.id}
                                className={`recovery-hold-row ${d.released_at ? 'is-ready' : 'is-paused'}`}
                              >
                                <div className="recovery-hold-info">
                                  <span className="hold-kind-chip">{d.kind}</span>
                                  <strong>{d.step}</strong>
                                  <span className={`status-pill ${d.released_at ? 'is-recovered' : 'is-pending'}`}>
                                    {d.released_at ? 'Ready / Released' : 'Paused'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="hold-complete-btn"
                                  disabled={busy || !d.released_at}
                                  onClick={() => act(`/dependencies/${d.id}/complete`, {})}
                                >
                                  Complete Step
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {!selected.recovered_at && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              act(`/${selected.id}/dependencies`, hold)
                            }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                          >
                            <div className="recovery-time-row" style={{ margin: 0 }}>
                              <div className="recovery-field" style={{ margin: 0 }}>
                                <label htmlFor="simple-hold-kind">Type</label>
                                <select
                                  id="simple-hold-kind"
                                  value={hold.kind}
                                  onChange={(e) => setHold({ ...hold, kind: e.target.value })}
                                >
                                  <option value="warehouse">Warehouse</option>
                                  <option value="billing">Billing</option>
                                </select>
                              </div>

                              <div className="recovery-field" style={{ margin: 0, flex: 2 }}>
                                <label htmlFor="simple-hold-step">Step to Pause</label>
                                <input
                                  id="simple-hold-step"
                                  required
                                  maxLength={200}
                                  placeholder="e.g. Packing slip replacement"
                                  value={hold.step}
                                  onChange={(e) => setHold({ ...hold, step: e.target.value })}
                                />
                              </div>
                            </div>

                            <button type="submit" className="recovery-secondary-btn" disabled={busy}>
                              <PauseCircle size={14} /> Pause Linked Step Until Recovery
                            </button>
                          </form>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Step 6 Incident Review & Accountability */}
                    <div>
                      <IncidentReviewCard
                        selected={selected}
                        assigneeMetric={assigneeMetric}
                        review={review}
                        setReview={setReview}
                        busy={busy}
                        act={act}
                        existingReport={existingReport}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* TAB 2: Review & Accountability */}
          {activeTab === 'performance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Incident Triage & Active Review Widget */}
              {data.incidents.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#14331a' }}>
                        Overdue Incident Triage ({data.incidents.length})
                      </h3>
                      <span style={{ fontSize: '11.5px', color: '#637766' }}>
                        Select an overdue work order to review explanation and determine accountability classification
                      </span>
                    </div>
                    {unreviewedCount > 0 && (
                      <span className="status-pill is-pending">
                        {unreviewedCount} Awaiting Review
                      </span>
                    )}
                  </div>

                  {data.incidents.length > 1 && (
                    <div className="recovery-item-switcher" style={{ margin: '0 0 14px', background: '#f8faf7', borderRadius: '10px', padding: '10px 14px' }}>
                      <span className="switcher-label">Select Incident:</span>
                      <div className="switcher-pills">
                        {data.incidents.map((inc) => {
                          const isSel = inc.id === selectedId
                          const isReviewed = Boolean(inc.reviewed_at)
                          return (
                            <button
                              key={inc.id}
                              type="button"
                              className={`switcher-pill ${isSel ? 'is-selected' : ''}`}
                              onClick={() => select(inc)}
                            >
                              <span className="switcher-pill-icon">{inc.order_id ? <Truck size={13} /> : <Sprout size={13} />}</span>
                              <span>{inc.label}</span>
                              {isReviewed ? (
                                <span className={`switcher-flag is-done ${inc.classification}`}>
                                  ✓ {label(inc.classification)}
                                </span>
                              ) : (
                                <span className="switcher-flag is-pending">Needs Review</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {selected && (
                    <IncidentReviewCard
                      selected={selected}
                      assigneeMetric={assigneeMetric}
                      review={review}
                      setReview={setReview}
                      busy={busy}
                      act={act}
                      existingReport={existingReport}
                    />
                  )}
                </div>
              )}

              {/* Staff Accountability Records Table */}
              <div className="recovery-simple-card">
                <div className="recovery-simple-card-header">
                  <h3>
                    <Scale size={16} />
                    <span>Staff Performance &amp; Accountability Records</span>
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#556758' }}>
                  On-time rate = jobs completed by the scheduled date ÷ completed jobs. Missed dates remain in record after recovery.
                </p>

                <div className="recovery-table-wrap" style={{ margin: '10px 0 0' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Staff Member</th>
                        <th>Completed Jobs</th>
                        <th>On-Time Rate</th>
                        <th>Missed Dates</th>
                        <th>Excused Delays</th>
                        <th>Unexcused Incidents</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.metrics.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#637866' }}>
                            No staff performance records available.
                          </td>
                        </tr>
                      ) : (
                        data.metrics.map((m) => {
                          const rate = m.on_time_rate
                          const rateClass =
                            rate === null ? '' : rate >= 90 ? 'high' : rate >= 70 ? 'medium' : 'low'

                          return (
                            <tr key={m.assignee_id}>
                              <td>
                                <strong>{m.name}</strong>
                              </td>
                              <td>{m.completed}</td>
                              <td>
                                {rate === null ? (
                                  '—'
                                ) : (
                                  <span className={`rate-badge ${rateClass}`}>{rate}%</span>
                                )}
                              </td>
                              <td>{m.missed}</td>
                              <td>
                                <span className="status-pill is-recovered">{m.excused}</span>
                              </td>
                              <td>
                                <span
                                  className={`status-pill ${m.unexcused > 0 ? 'is-overdue' : 'is-info'}`}
                                >
                                  {m.unexcused}
                                </span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HR Reports View */}
          {activeTab === 'reports' && (
            <div className="recovery-simple-card">
              <div className="recovery-simple-card-header">
                <h3>
                  <ShieldAlert size={16} />
                  <span>Authorized HR Incident Reports</span>
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#556758' }}>
                Reports triggered after repeat unexcused incidents or manual escalations for policy review.
              </p>

              {data.reports.length === 0 ? (
                <div className="recovery-empty-state" style={{ padding: '32px' }}>
                  <ShieldCheck size={32} style={{ color: '#16a34a' }} />
                  <p>No incident reports currently awaiting review.</p>
                </div>
              ) : (
                <div className="recovery-reports-grid" style={{ marginTop: '12px' }}>
                  {data.reports.map((report) => (
                    <article className="recovery-report-card" key={report.id}>
                      <div className="recovery-report-header">
                        <div>
                          <h3>
                            Report #{report.id} · {workerName(report.assignee_id)}
                          </h3>
                          <span>Generated: {format(report.generated_at)}</span>
                        </div>
                        <span
                          className={`status-pill ${report.status === 'awaiting_hr_review' ? 'is-pending' : 'is-recovered'}`}
                        >
                          {label(report.status)}
                        </span>
                      </div>

                      <div className="recovery-snapshot-box">
                        <div className="recovery-snapshot-summary">
                          <div>
                            <small>Item</small>
                            <strong>{report.snapshot?.incident?.label || 'Overdue item'}</strong>
                          </div>
                          <div>
                            <small>Reason</small>
                            <strong>
                              {report.snapshot?.incident?.reason_code
                                ? label(report.snapshot.incident.reason_code)
                                : 'Not provided'}
                            </strong>
                          </div>
                          <div>
                            <small>Historical Incidents</small>
                            <strong>
                              {Array.isArray(report.snapshot?.history)
                                ? report.snapshot.history.length
                                : '—'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {report.status === 'awaiting_hr_review' ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            act(`/reports/${report.id}/review`, {
                              notes: hrNotes[report.id],
                            })
                          }}
                        >
                          <div className="recovery-form-group">
                            <label htmlFor={`modal-hr-notes-${report.id}`}>Authorized HR Review Notes</label>
                            <textarea
                              id={`modal-hr-notes-${report.id}`}
                              required
                              minLength={5}
                              maxLength={4000}
                              rows={2}
                              placeholder="Enter HR policy determination..."
                              value={hrNotes[report.id] || ''}
                              onChange={(e) =>
                                setHrNotes({ ...hrNotes, [report.id]: e.target.value })
                              }
                            />
                          </div>
                          <button
                            type="submit"
                            className="recovery-primary-btn"
                            disabled={busy}
                            style={{ width: '100%' }}
                          >
                            <ShieldCheck size={15} /> Record Authorized Review
                          </button>
                        </form>
                      ) : (
                        <div className="recovery-confirmed-card">
                          <CheckCircle2 size={18} />
                          <div>
                            <strong>HR Review Recorded</strong>
                            <p>
                              &ldquo;{report.hr_notes}&rdquo; · {format(report.reviewed_at)}
                            </p>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Work Order Style Footer */}
        <footer className="wo-foot">
          <div className="wo-foot-note">
            <span>Philippine Standard Time (Asia/Manila) · Audited recovery history retained</span>
          </div>
          <div className="wo-foot-actions">
            <button
              type="button"
              className="wo-btn is-link"
              onClick={load}
              disabled={busy}
            >
              <RotateCw size={14} className={busy ? 'recovery-spin' : ''} />
              {busy ? 'Syncing…' : 'Refresh'}
            </button>
            <button
              type="button"
              className="wo-btn is-primary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}
