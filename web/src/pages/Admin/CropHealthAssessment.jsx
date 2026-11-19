import { useEffect, useState } from 'react'
import { AlertCircle, CalendarDays, RefreshCw, Sparkles } from 'lucide-react'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/crop-health-assessment.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const FIELDS = ['Field A', 'Field B', 'Field C', 'Field D']
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000
const manilaToday = () => new Date(Date.now() + MANILA_OFFSET_MS).toISOString().slice(0, 10)

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
  if (!response.ok) throw new Error(body.error || 'Assessment is unavailable.')
  return body
}

function factorValue(factor) {
  if (factor.score == null) return '—'
  return Number.isInteger(factor.score) ? factor.score : factor.score.toFixed(1)
}

function readingValue(value, unit) {
  return value == null ? '—' : `${value} ${unit}`
}

export default function CropHealthAssessment() {
  const [field, setField] = useState('Field A')
  const [date, setDate] = useState(manilaToday)
  const [assessment, setAssessment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recommendations, setRecommendations] = useState([])
  const [guidanceSource, setGuidanceSource] = useState('')
  const [guidanceLoading, setGuidanceLoading] = useState(false)
  const [guidanceError, setGuidanceError] = useState('')
  const [guidanceVersion, setGuidanceVersion] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setAssessment(null)
    setError('')
    assessmentRequest(`?${new URLSearchParams({ field, date })}`)
      .then((result) => { if (active) setAssessment(result) })
      .catch((caught) => { if (active) setError(caught.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [field, date])

  useEffect(() => {
    let active = true
    setGuidanceError('')
    const saved = assessment?.image?.recommendations || []
    setRecommendations(saved)
    setGuidanceSource(saved.length ? 'Saved image analysis' : '')
    const hasEvidence = assessment?.image || assessment?.factors?.some((factor) => factor.count > 0)
      || assessment?.context?.soilTemperature?.count > 0
    if (!hasEvidence || guidanceVersion === 0) {
      setGuidanceLoading(false)
      return () => { active = false }
    }
    setGuidanceLoading(true)
    assessmentRequest('/recommendations', {
      method: 'POST', body: JSON.stringify({ field, date }),
    })
      .then((result) => {
        if (!active) return
        setRecommendations(result.recommendations || [])
        setGuidanceSource('Field guidance')
      })
      .catch((caught) => {
        if (!active) return
        setGuidanceError(/quota|RESOURCE_EXHAUSTED|rate.limit|429/i.test(caught.message)
          ? 'Gemini request limit reached. Try again later.'
          : caught.message.length > 180 ? 'Gemini guidance is temporarily unavailable.' : caught.message)
      })
      .finally(() => { if (active) setGuidanceLoading(false) })
    return () => { active = false }
  }, [assessment, field, date, guidanceVersion])

  const hasEvidence = assessment?.image || assessment?.factors?.some((factor) => factor.count > 0)
    || assessment?.context?.soilTemperature?.count > 0
  const score = assessment?.cropHealthScore
  const missingImage = assessment?.factors?.some((factor) => factor.source === 'image' && factor.score == null)
  const missingReadings = assessment?.factors?.some((factor) => factor.source === 'sensor' && factor.count === 0)
  const moistureFactor = assessment?.factors?.find((factor) => factor.key === 'moisture')
  const soilTemperature = assessment?.context?.soilTemperature
  const missingDetails = [
    missingImage && (assessment?.image ? 'Image scores incomplete' : 'Scored image missing'),
    missingReadings && 'Sensor readings missing',
    moistureFactor?.average != null && moistureFactor.score == null && 'Soil moisture limits missing',
  ].filter(Boolean)

  function changeField(nextField) {
    if (nextField === field) return
    setAssessment(null)
    setRecommendations([])
    setGuidanceSource('')
    setGuidanceVersion(0)
    setLoading(true)
    setField(nextField)
  }

  function changeDate(nextDate) {
    if (!nextDate || nextDate === date) return
    setAssessment(null)
    setRecommendations([])
    setGuidanceSource('')
    setGuidanceVersion(0)
    setLoading(true)
    setDate(nextDate)
  }

  return (
    <main className="admin-dashboard crop-assessment-page">
      <AdminSidebar active="crop-assessment" />
      <section className="admin-workspace">
        <AdminTopbar />
        <div className="admin-content crop-assessment-content">
          <header className="crop-assessment-heading">
            <h1>Crop Health Assessment</h1>
          </header>

          <section className="crop-assessment-field-panel" aria-label={`${field} assessment`}>
            <nav className="crop-assessment-field-tabs" aria-label="Select field">
              {FIELDS.map((item) => (
                <button key={item} type="button" className={item === field ? 'is-active' : ''}
                  aria-current={item === field ? 'true' : undefined}
                  onClick={() => changeField(item)}>{item}</button>
              ))}
              <label className="crop-assessment-date">
                <span>Assessment date</span>
                <span className="crop-assessment-date-input"><CalendarDays size={17} aria-hidden="true" />
                  <input type="date" value={date} max={manilaToday()} onChange={(event) => changeDate(event.target.value)}
                    aria-label="Assessment date" />
                </span>
              </label>
            </nav>
            <div className="crop-assessment-tab-content">
              {error && <div className="crop-assessment-error" role="alert"><AlertCircle size={17} />{error}</div>}
              {assessment?.sensorError && <div className="crop-assessment-error" role="status"><AlertCircle size={17} />{assessment.sensorError}</div>}

            <section className="crop-assessment-card crop-assessment-main" aria-label="Crop health score and factors">
              <div className="crop-assessment-card-heading">Calculated Crop Health Score</div>
              <div className="crop-assessment-score-row">
                <div className="crop-assessment-score">{loading ? '…' : score == null ? '—' : score}<small> / 100</small></div>
                <div className={`crop-assessment-classification${score == null ? ' is-pending' : ''}`}>
                  {score == null ? 'Incomplete' : assessment.classification}
                </div>
              </div>
              <div className="crop-assessment-track is-overall"><span style={{ width: `${score || 0}%` }} /></div>
              {score == null && !loading && assessment && <p className="crop-assessment-missing">
                {missingDetails.join(' · ') || 'No assessment data for this date'}
              </p>}
              {assessment?.image && <p className="crop-assessment-image-source">
                Image analysis: {new Date(assessment.image.analyzedAt).toLocaleTimeString('en-PH', {
                  timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit',
                })}
              </p>}
              {assessment?.image?.healthScore != null && (
                <div className="crop-assessment-image-source">
                  <strong>Visible crop image score: {assessment.image.healthScore} / 100</strong>
                  {assessment.image.scoringMethod === 'visible-crop-area-v3' && <span> (assessable crop in the photo only)</span>}
                  {assessment.image.regions?.length > 0 && (
                    <ul>
                      {assessment.image.regions.map((region, index) => (
                        <li key={index}>{region.sharePercent}% {region.severity} — {region.evidence}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="crop-assessment-factors">
                {(assessment?.factors || []).map((factor) => (
                  <div className="crop-assessment-factor" key={factor.key}>
                    <div className="crop-assessment-factor-label">
                      <span>{factor.label} ({Math.round(factor.weight * 100)}%)</span>
                      <span className="crop-assessment-factor-measure">
                        {factor.average != null && <small>{readingValue(factor.average, factor.key === 'temperature' ? '°C' : '%')}</small>}
                        <strong>{factorValue(factor)}</strong>
                      </span>
                    </div>
                    <div className="crop-assessment-track"><span style={{ width: `${factor.score || 0}%` }} /></div>
                    {factor.key === 'pest' && assessment?.image?.pestRating?.severity && (
                      <small>Image finding: {assessment.image.pestRating.severity}</small>
                    )}
                  </div>
                ))}
                {loading && <p className="crop-assessment-empty">Loading…</p>}
              </div>
              <div className="crop-assessment-context">
                <span>Soil temperature <small>(context)</small></span>
                <strong>{readingValue(soilTemperature?.average, '°C')}</strong>
              </div>
            </section>

              <section className="crop-assessment-card crop-assessment-guidance" aria-label="Gemini recommendations">
                <h2><Sparkles size={18} aria-hidden="true" /> Gemini Recommendations</h2>
                {guidanceSource && <p className="crop-assessment-guidance-source">{guidanceSource}</p>}
                {guidanceLoading && <p className="crop-assessment-empty">Generating…</p>}
                {!guidanceLoading && guidanceError && <p className="crop-assessment-guidance-error" role="alert">{guidanceError}</p>}
                {!guidanceLoading && recommendations.length > 0 && (
                  <ol className="crop-assessment-recommendations">
                    {recommendations.map((recommendation, index) => <li key={`${index}-${recommendation}`}>{recommendation}</li>)}
                  </ol>
                )}
                {!guidanceLoading && !guidanceError && !hasEvidence && <p className="crop-assessment-empty">No field data for this date.</p>}
                <button type="button" className="crop-assessment-regenerate" disabled={guidanceLoading || loading || !hasEvidence} onClick={() => setGuidanceVersion((version) => version + 1)}>
                  <RefreshCw size={15} aria-hidden="true" /> {recommendations.length ? 'Update guidance' : 'Generate guidance'}
                </button>
                {recommendations.length > 0 && <small>Confirm in the field before treatment.</small>}
              </section>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
