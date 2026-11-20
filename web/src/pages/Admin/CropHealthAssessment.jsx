import { useEffect, useState } from 'react'
import {
  AlertCircle, AlertTriangle, Bug, CalendarDays, ClipboardList, Droplets, FlaskConical, Info, Link2,
  ListChecks, Microscope, RefreshCw, Sparkles, Sprout, ThermometerSun, Waves, Wind,
} from 'lucide-react'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import Pagination from '../../components/Pagination.jsx'
import CropAssessmentSkeleton from '../../components/CropAssessmentSkeleton.jsx'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/crop-health-assessment.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const FIELDS = ['Field A', 'Field B', 'Field C', 'Field D']
const PERIODS = [{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }]
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000
// Gets today's date in Manila for the initial report filter.
// Gets today's date in Manila for the initial report filter.
const manilaToday = () => new Date(Date.now() + MANILA_OFFSET_MS).toISOString().slice(0, 10)

const DIMENSION_ICONS = { cropCondition: Sprout, pest: Bug, nutrient: FlaskConical, disease: Microscope }
const PARAMETER_ICONS = { airTemperature: ThermometerSun, soilTemperature: Waves, humidity: Wind, soilMoisture: Droplets }
const CROP_TONE = { HEALTHY: 'normal', 'NEEDS ATTENTION': 'warning', CRITICAL: 'critical', INCONCLUSIVE: 'muted' }
const ENV_TONE = { 'WITHIN RANGE': 'normal', 'OUT OF RANGE': 'warning', 'CRITICAL READING': 'critical', 'PARTIAL DATA': 'muted', 'NO DATA': 'muted' }
const PRIORITY_TONE = { URGENT: 'critical', HIGH: 'warning', ROUTINE: 'normal' }
const RECORDS_PER_PAGE = 10
const DIMENSION_KEYS = [
  { key: 'cropCondition', label: 'Crop Condition' },
  { key: 'pest', label: 'Pest' },
  { key: 'nutrient', label: 'Nutrient' },
  { key: 'disease', label: 'Disease' },
]

// Sends an authenticated crop health assessment request.
// Sends an authenticated crop health assessment request.
async function assessmentRequest(path, options = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')
  const response = await fetch(`${API_URL}/api/admin/crop-health-assessment${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'The monitoring report is unavailable.')
  return body
}

// Formats a report date in Manila time.
// Formats a report date in Manila time.
const formatDate = (value) => new Date(`${value}T00:00:00+08:00`).toLocaleDateString('en-PH', {
  timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
})
// Formats a reading time, optionally including its day.
// Formats a reading time, optionally including its day.
const formatTime = (value, withDay) => new Date(value).toLocaleString('en-PH', {
  timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', ...(withDay ? { month: 'short', day: 'numeric' } : {}),
})
// Shows a measured value with its unit or a missing-value marker.
// Shows a measured value with its unit or a missing-value marker.
const formatReading = (point, unit) => point ? `${point.value}${unit === '°C' ? '°C' : ` ${unit}`}` : '—'
// Converts a severity code into its display label.
// Converts a severity code into its display label.
const severityText = (severity) => !severity ? null : severity === 'UNDETERMINED' ? 'Severity undetermined' : `${severity[0]}${severity.slice(1).toLowerCase()} severity`

// Renders a status label with the requested tone.
// Renders a status label with the requested tone.
function Pill({ tone, children }) {
  return <span className={`cha-pill is-${tone || 'muted'}`}>{children}</span>
}

// Chooses the status tone for a crop assessment dimension.
// Chooses the status tone for a crop assessment dimension.
function dimensionTone(item) {
  if (item.result === 'NO ISSUE DETECTED') return 'normal'
  if (item.highestSeverity === 'HIGH') return 'critical'
  if (item.issueCount) return 'warning'
  return 'muted'
}

// Displays the findings for one crop health dimension.
// Displays the findings for one crop health dimension.
function DimensionRow({ item, weekly }) {
  const Icon = DIMENSION_ICONS[item.key]
  return (
    <li className="cha-row">
      <span className={`cha-row-icon is-${dimensionTone(item)}`}><Icon size={17} aria-hidden="true" /></span>
      <div className="cha-row-body">
        <div className="cha-row-head">
          <strong>{item.label}</strong>
          <Pill tone={dimensionTone(item)}>{item.issueCount ? severityText(item.highestSeverity) : item.result}</Pill>
        </div>
        {item.findings.length > 0 ? item.findings.map((finding) => (
          <p key={finding.condition}>
            {finding.condition}
            <small> · {finding.status === 'ISSUE SUSPECTED' ? 'Suspected' : 'Detected'}, {severityText(finding.severity).toLowerCase()}</small>
            {finding.symptoms.length > 0 && <span className="cha-symptoms">{finding.symptoms.join('; ')}</span>}
          </p>
        )) : <p className="is-quiet">{item.note}</p>}
        {item.recordCount > 0 && (
          <small className="cha-row-meta">
            {item.issueCount
              ? `Recorded in ${item.issueCount} of ${item.recordCount} assessment${item.recordCount === 1 ? '' : 's'}${weekly && item.issueDays.length > 1 ? ` on ${item.issueDays.length} separate days` : ''}${item.recurring ? ' · recurring finding' : ''}`
              : `${item.assessedCount} of ${item.recordCount} assessment${item.recordCount === 1 ? '' : 's'} could assess this`}
          </small>
        )}
      </div>
    </li>
  )
}

// Displays one environmental parameter and its readings.
// Displays one environmental parameter and its readings.
function ParameterRow({ item }) {
  const Icon = PARAMETER_ICONS[item.key]
  return (
    <li className="cha-row">
      <span className={`cha-row-icon is-${item.tone}`}><Icon size={17} aria-hidden="true" /></span>
      <div className="cha-row-body">
        <div className="cha-row-head">
          <strong>{item.parameter}</strong>
          <Pill tone={item.tone}>{item.descriptor}</Pill>
        </div>
        {item.count > 0 ? (
          <dl className="cha-readings">
            <div><dt>Latest</dt><dd>{formatReading(item.latest, item.unit)} <small>{item.latest.status} · {formatTime(item.latest.at, true)}</small></dd></div>
            <div><dt>Min</dt><dd>{formatReading(item.min, item.unit)}</dd></div>
            <div><dt>Max</dt><dd>{formatReading(item.max, item.unit)}</dd></div>
            <div><dt>Readings</dt><dd>{item.count.toLocaleString()}</dd></div>
          </dl>
        ) : <p className="is-quiet">No valid readings in this period.</p>}
        <small className="cha-row-meta">Configured range: {item.range}</small>
        {item.notable.length > 0 && <ul className="cha-notable">{item.notable.map((note) => <li key={note}>{note}</li>)}</ul>}
        {item.count > 0 && <p className="cha-implication">{item.implication}</p>}
      </div>
    </li>
  )
}

// Displays a group of combined findings when it has entries.
// Displays a group of combined findings when it has entries.
function CombinedList({ title, items, icon: Icon }) {
  if (!items.length) return null
  return (
    <div className="cha-combined-group">
      <h4><Icon size={14} aria-hidden="true" /> {title}</h4>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  )
}

// Displays daily and weekly crop health assessment reports.
// Displays daily and weekly crop health assessment reports.
export default function CropHealthAssessment() {
  const [field, setField] = useState('Field A')
  const [period, setPeriod] = useState('daily')
  const [date, setDate] = useState(manilaToday)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryVersion, setSummaryVersion] = useState(0)
  const [recordPage, setRecordPage] = useState(1)

  // Loads the assessment report whenever its field, period, or date changes.
  useEffect(() => {
    let active = true
    setLoading(true)
    setReport(null)
    setSummary(null)
    setRecordPage(1)
    setError('')
    assessmentRequest(`?${new URLSearchParams({ field, period, date })}`)
      .then((result) => { if (active) setReport(result) })
      .catch((caught) => { if (active) setError(caught.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [field, period, date])

  const hasRecords = report && (report.info.cropRecords > 0 || report.info.environmentalReadings > 0)

  // Loads the combined summary when the report contains records.
  useEffect(() => {
    if (!hasRecords) return undefined
    let active = true
    setSummaryLoading(true)
    assessmentRequest('/summary', { method: 'POST', body: JSON.stringify({ field, period, date }) })
      .then((result) => { if (active) setSummary(result) })
      .catch(() => { if (active) setSummary(null) })
      .finally(() => { if (active) setSummaryLoading(false) })
    return () => { active = false }
  }, [hasRecords, field, period, date, summaryVersion])

  const records = report?.crop.records || []
  const recordPages = Math.max(1, Math.ceil(records.length / RECORDS_PER_PAGE))
  const pagedRecords = records.slice((recordPage - 1) * RECORDS_PER_PAGE, recordPage * RECORDS_PER_PAGE)
  const weekly = period === 'weekly'
  const overview = summary?.overview || report?.overview
  const combinedText = summary?.combinedExplanation || report?.combined.explanation
  const summarySource = summary?.source === 'ai'
    ? 'AI-generated summary based on rule-based assessment findings'
    : 'Summary generated from rule-based assessment findings'

  return (
    <main className="admin-dashboard crop-assessment-page">
      <AdminSidebar active="crop-assessment" />
      <section className="admin-workspace">
        <AdminTopbar />
        <div className="admin-content crop-assessment-content">
          <header className="crop-assessment-heading">
            <h1>Crop Health Assessment</h1>
            <p>Combined crop health and environmental monitoring report for pineapple fields.</p>
          </header>

          <section className="crop-assessment-field-panel" aria-label={`${field} monitoring report`}>
            <nav className="crop-assessment-field-tabs" aria-label="Select field">
              {FIELDS.map((item) => (
                <button key={item} type="button" className={item === field ? 'is-active' : ''}
                  aria-current={item === field ? 'true' : undefined}
                  onClick={() => setField(item)}>{item}</button>
              ))}
              <div className="cha-controls">
                <div className="cha-segmented" role="group" aria-label="Reporting period">
                  {PERIODS.map((item) => (
                    <button key={item.value} type="button" className={period === item.value ? 'is-active' : ''}
                      aria-pressed={period === item.value} onClick={() => setPeriod(item.value)}>{item.label}</button>
                  ))}
                </div>
                <label className="crop-assessment-date">
                  <span>{weekly ? 'Week ending' : 'Report date'}</span>
                  <span className="crop-assessment-date-input"><CalendarDays size={17} aria-hidden="true" />
                    <input type="date" value={date} max={manilaToday()} onChange={(event) => event.target.value && setDate(event.target.value)}
                      aria-label={weekly ? 'Week ending date' : 'Report date'} />
                  </span>
                </label>
              </div>
            </nav>

            <div className="crop-assessment-tab-content">
              {error && <div className="crop-assessment-error" role="alert"><AlertCircle size={17} />{error}</div>}
              {report?.sensorError && <div className="crop-assessment-error" role="status"><AlertCircle size={17} />{report.sensorError}</div>}
              {loading && <CropAssessmentSkeleton label={`Preparing the ${weekly ? 'weekly' : 'daily'} report for ${field}`} />}

              {report && <>
                {/* A. Report information */}
                <section className="cha-info" aria-label="Report information">
                  <div><span>Field</span><strong>{report.info.field}</strong></div>
                  <div><span>Reporting period</span><strong>{report.info.period}</strong></div>
                  <div><span>Period</span><strong>{report.info.startDate === report.info.endDate
                    ? formatDate(report.info.endDate)
                    : `${formatDate(report.info.startDate)} – ${formatDate(report.info.endDate)}`}</strong></div>
                  <div><span>Crop health records</span><strong>{report.info.cropRecords}</strong></div>
                  <div><span>Environmental records</span><strong>{report.info.environmentalRecords.toLocaleString()}</strong></div>
                </section>

                {/* B. Overall monitoring summary */}
                <section className="crop-assessment-card cha-overview" aria-label="Overall monitoring summary">
                  <div className="cha-card-title">
                    <h2><ClipboardList size={18} aria-hidden="true" /> Overall Monitoring Summary</h2>
                    <div className="cha-status-group">
                      <div><small>Crop health</small><Pill tone={CROP_TONE[report.crop.status]}>{report.crop.status}</Pill></div>
                      <div><small>Environment</small><Pill tone={ENV_TONE[report.environment.status]}>{report.environment.status}</Pill></div>
                    </div>
                  </div>
                  <p className="cha-overview-text">{overview}</p>
                  <div className="cha-overview-foot">
                    <small><Sparkles size={13} aria-hidden="true" /> {summaryLoading ? 'Generating AI summary…' : `${summarySource}${report.info.isCurrent ? ` as of ${formatTime(report.info.end)}` : ''}`}</small>
                    <button type="button" className="crop-assessment-regenerate" disabled={summaryLoading || !hasRecords}
                      onClick={() => setSummaryVersion((version) => version + 1)}>
                      <RefreshCw size={15} aria-hidden="true" /> Refresh summary
                    </button>
                  </div>
                </section>

                <div className="cha-grid">
                  {/* C. Crop health summary */}
                  <section className="crop-assessment-card" aria-label="Crop health summary">
                    <div className="cha-card-title">
                      <h2><Sprout size={18} aria-hidden="true" /> Crop Health Summary</h2>
                      <Pill tone={CROP_TONE[report.crop.status]}>{report.crop.status}</Pill>
                    </div>
                    <p className="cha-card-sub">
                      {report.crop.recordCount
                        ? `${report.crop.recordCount} AI photo assessment${report.crop.recordCount === 1 ? '' : 's'} · severities as assigned by the validated classification`
                        : <>No crop assessment recorded. <a href="/admin/monitoring/crop-health">Analyze a photo in Crop Health Monitoring</a>.</>}
                    </p>
                    <ul className="cha-rows">{report.crop.dimensions.map((item) => <DimensionRow key={item.key} item={item} weekly={weekly} />)}</ul>
                  </section>

                  {/* D. Environmental monitoring summary */}
                  <section className="crop-assessment-card" aria-label="Environmental monitoring summary">
                    <div className="cha-card-title">
                      <h2><ThermometerSun size={18} aria-hidden="true" /> Environmental Monitoring</h2>
                      <Pill tone={ENV_TONE[report.environment.status]}>{report.environment.status}</Pill>
                    </div>
                    <p className="cha-card-sub">{report.info.environmentalReadings
                      ? `${report.info.environmentalReadings.toLocaleString()} valid readings · classified by configured AgriVerse ranges`
                      : 'No environmental readings in this period.'}</p>
                    <ul className="cha-rows">{report.environment.parameters.map((item) => <ParameterRow key={item.key} item={item} />)}</ul>
                  </section>
                </div>

                {/* E. Combined findings */}
                <section className="crop-assessment-card" aria-label="Combined findings">
                  <div className="cha-card-title">
                    <h2><Link2 size={18} aria-hidden="true" /> Combined Findings</h2>
                    <span className="cha-scenario">{report.combined.title}</span>
                  </div>
                  <p className="cha-overview-text">{combinedText}</p>
                  <div className="cha-combined">
                    <CombinedList title="Direct observations" items={report.combined.direct} icon={ListChecks} />
                    <CombinedList title="Potential environmental risk factors" items={report.combined.risks} icon={AlertTriangle} />
                    <CombinedList title="Suspected relationships" items={report.combined.relationships} icon={Link2} />
                    <CombinedList title="Needs field confirmation" items={report.combined.confirm} icon={Microscope} />
                  </div>
                </section>

                <div className="cha-grid is-actions">
                  {/* F. Priority concerns */}
                  <section className="crop-assessment-card" aria-label="Priority concerns">
                    <div className="cha-card-title"><h2><AlertTriangle size={18} aria-hidden="true" /> Priority Concerns</h2></div>
                    {report.concerns.length ? (
                      <ol className="cha-concerns">
                        {report.concerns.map((item) => (
                          <li key={`${item.related}-${item.concern}`}>
                            <div><strong>{item.concern}</strong><Pill tone={PRIORITY_TONE[item.level]}>{item.level}</Pill></div>
                            <small>{item.reason}</small>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="crop-assessment-empty">No crop health or environmental concern was recorded in this period.</p>}
                  </section>

                  {/* G. Recommended actions */}
                  <section className="crop-assessment-card" aria-label="Recommended actions">
                    <div className="cha-card-title"><h2><ListChecks size={18} aria-hidden="true" /> Recommended Actions</h2></div>
                    <ol className="cha-actions">
                      {report.recommendations.map((item) => (
                        <li key={item.action} className={`is-${PRIORITY_TONE[item.priority]}`}>
                          <div className="cha-action-head"><Pill tone={PRIORITY_TONE[item.priority]}>{item.priority}</Pill><small>{item.related}</small></div>
                          <strong>{item.action}</strong>
                          <small>Why: {item.reason}</small>
                        </li>
                      ))}
                    </ol>
                    <small className="cha-foot-note">Confirm findings in the field before any treatment. No chemical dosages or irrigation volumes are recommended without diagnostic and field data.</small>
                  </section>
                </div>

                <section className="crop-assessment-card cha-records" aria-label="Assessment records">
                  <div className="cha-card-title">
                    <h2><ClipboardList size={18} aria-hidden="true" /> Assessment Records</h2>
                  </div>
                  <div className="cha-table-wrap">
                    <table className="cha-table" aria-label={`${field} assessment records`}>
                      <thead>
                        <tr>
                          <th scope="col">Date &amp; Time</th>
                          <th scope="col">Status</th>
                          <th scope="col">Main Finding</th>
                          <th scope="col">Areas Flagged</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedRecords.length ? pagedRecords.map((record) => {
                          const flagged = DIMENSION_KEYS.filter(({ key }) => ['ISSUE SUSPECTED', 'ISSUE DETECTED'].includes(record.dimensions[key]?.status))
                          return (
                            <tr key={record.id}>
                              <td className="cha-table-time">{formatTime(record.at, weekly)}</td>
                              <td><Pill tone={CROP_TONE[record.status]}>{record.status}</Pill></td>
                              <td className="cha-table-finding">{record.headline || record.summary || 'Crop assessment'}</td>
                              <td>
                                {flagged.length ? (
                                  <div className="cha-chips">
                                    {flagged.map(({ key, label }) => {
                                      const severity = record.dimensions[key].severity
                                      const tone = severity === 'HIGH' ? 'critical' : 'warning'
                                      return <span key={key} className={`cha-chip is-${tone}`}>{label} · {severity === 'UNDETERMINED' ? 'Undetermined' : `${severity[0]}${severity.slice(1).toLowerCase()}`}</span>
                                    })}
                                  </div>
                                ) : <span className="cha-table-none">None</span>}
                              </td>
                            </tr>
                          )
                        }) : (
                          <tr><td colSpan={4} className="cha-table-empty">No crop assessments in this period.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <footer className="pagination-footer cha-records-footer">
                    <span>{field}: {records.length} assessment record{records.length === 1 ? '' : 's'}</span>
                    <Pagination page={recordPage} totalPages={recordPages} onChange={setRecordPage} hideOnSinglePage ariaLabel="Assessment record pages" />
                  </footer>
                </section>

                {/* H. Assessment limitations */}
                {report.limitations.length > 0 && (
                  <section className="cha-limitations" aria-label="Assessment limitations">
                    <h3><Info size={15} aria-hidden="true" /> Assessment Limitations</h3>
                    <ul>{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
                  </section>
                )}
              </>}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
