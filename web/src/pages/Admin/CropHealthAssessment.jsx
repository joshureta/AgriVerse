import { useEffect, useState } from 'react'
import { AlertCircle, CalendarDays, RefreshCw, ClipboardList } from 'lucide-react'
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
  return Number.isInteger(factor.score) ? factor.score : factor.score.toFixed(1)
}

function readingValue(value, unit) {
  return value == null ? '—' : `${value} ${unit}`
}

function factorResult(factor, legacyPhoto = false) {
  if (factor.source === 'context') return factor.average == null ? 'No soil temperature reading' : 'Waiting for the updated scoring service'
  if (factor.score == null) return factor.source === 'image' ? `Cannot assess from ${legacyPhoto ? 'photo' : 'inspection'}` : 'No valid readings'
  if (factor.source === 'image') {
    if (factor.count > 1) return `Average of ${factor.count} ${legacyPhoto ? 'photo analyses' : 'inspections'}`
    const severity = factor.rating?.severity
    if (severity === 'none') return 'No visible signs'
    if (['mild', 'moderate', 'severe', 'extensive'].includes(severity)) {
      return `${severity[0].toUpperCase()}${severity.slice(1)} visible signs`
    }
    return 'Scored photo finding'
  }
  if (factor.score >= 85) return 'Mostly favorable readings'
  if (factor.score >= 70) return 'Mixed readings'
  if (factor.score >= 50) return 'Readings need attention'
  return 'Unfavorable readings'
}

function imageTime(value) {
  return new Date(value).toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit',
  })
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
    const saved = assessment?.inspectionSource === 'gemini-diagnosis' ? [] : assessment?.image?.recommendations || []
    setRecommendations(saved)
    setGuidanceSource(saved.length ? 'Saved inspection rules' : '')
    const hasEvidence = assessment?.image || assessment?.factors?.some((factor) => factor.count > 0)
      || assessment?.context?.soilTemperature?.count > 0
    if (!hasEvidence) {
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
        setGuidanceSource('Rule-based field guidance')
      })
      .catch((caught) => {
        if (!active) return
        setGuidanceError(caught.message.length > 180 ? 'Field guidance is unavailable.' : caught.message)
      })
      .finally(() => { if (active) setGuidanceLoading(false) })
    return () => { active = false }
  }, [assessment, field, date, guidanceVersion])

  const hasEvidence = assessment?.image || assessment?.factors?.some((factor) => factor.count > 0)
    || assessment?.context?.soilTemperature?.count > 0
  const score = assessment?.cropHealthScore
  const legacyPhoto = assessment?.inspectionSource === 'gemini-diagnosis'
  const imageScore = assessment?.visualScore
  const missingImageFactors = assessment?.factors?.filter((factor) => factor.source === 'image' && factor.score == null) || []
  const missingReadings = assessment?.factors?.some((factor) => factor.source === 'sensor' && factor.count === 0)
  const moistureFactor = assessment?.factors?.find((factor) => factor.key === 'moisture')
  const hasScoredSoilTemperature = assessment?.factors?.some((factor) => factor.key === 'soilTemperature')
  const displayFactors = assessment ? [
    ...assessment.factors,
    ...(!hasScoredSoilTemperature ? [{
      key: 'soilTemperature', label: 'Soil temperature', source: 'context', score: null,
      average: assessment.context?.soilTemperature?.average ?? null,
      count: assessment.context?.soilTemperature?.count ?? 0,
    }] : []),
  ] : []
  const missingDetails = [
    missingImageFactors.length > 0 && (assessment?.image
      ? `${missingImageFactors.map((factor) => factor.label).join(', ')} inspection score missing`
      : 'No scored inspection or photo analysis saved for this field and date'),
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
                  {score == null ? 'Incomplete' : `${assessment.classification}${assessment.isPartial ? ' · Partial' : ''}`}
                </div>
              </div>
              <div className="crop-assessment-track is-overall"><span style={{ width: `${score || 0}%` }} /></div>
              {!loading && assessment && !hasScoredSoilTemperature && <p className="crop-assessment-missing" role="status">
                Soil temperature is shown below in °C, but this assessment response does not include its /100 score. The scoring service needs the soil temperature update.
              </p>}
              {legacyPhoto && <p className="crop-assessment-scope" role="status">
                Showing saved AI photo findings for this date. Visual ratings came from AI; score calculations and field guidance follow fixed rules.
              </p>}
              {assessment?.isPartial && <p className="crop-assessment-scope">
                Combined visual inspection and sensor score based on {assessment.scoreCoverage}% of the weighted factors.
              </p>}
              {(score == null || assessment?.isPartial) && !loading && assessment && <p className="crop-assessment-missing">
                {missingDetails.length ? `Not scored: ${missingDetails.join(' · ')}` : 'No combined image and sensor score for this date'}
              </p>}
              {!loading && assessment && !assessment.image && missingImageFactors.length === 4 && (
                <p className="crop-assessment-missing">
                  {date === manilaToday()
                    ? <>Check the selected field, or <a href="/admin/monitoring/crop-health">record today’s checklist in Crop Health Monitoring</a>. </>
                    : <>Choose a date with a saved inspection or scored photo analysis. </>}
                </p>
              )}
              {assessment && <details className="crop-assessment-details" key={`${field}-${date}`}>
                <summary>View score details</summary>
                {assessment?.image && <p className="crop-assessment-image-source">
                  Latest {legacyPhoto ? 'photo analysis' : 'visual inspection'}: {imageTime(assessment.image.analyzedAt)}
                  {assessment.image.analysisCount > 1 && ` · ${assessment.image.analysisCount} ${legacyPhoto ? 'photo analyses' : 'inspections'} on this date`}
                </p>}
                {imageScore != null && (
                  <div className="crop-assessment-image-source">
                    <strong>Daily visual {legacyPhoto ? 'photo analysis' : 'inspection'} score: {imageScore} / 100</strong>
                    {assessment.image.scoringMethod === 'visible-crop-area-v3' && <span> (assessable crop in the photo only)</span>}
                    {assessment.image.regions?.length > 0 && (
                      <ul>
                        {assessment.image.regions.map((region, index) => (
                          <li key={index}>{region.severity} severity across {region.sharePercent}% of assessable crop area — {region.evidence}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <p className="crop-assessment-score-explanation">
                  Each visual factor averages all valid {legacyPhoto ? 'saved photo analyses' : 'rule-based inspections'} on this date. Each available sensor reading is scored first; then its scores are averaged. The displayed measurement average is separate from that score. Each scored factor's weight is its share of the combined score.
                </p>
                <div className="crop-assessment-factors">
                  {displayFactors.map((factor) => (
                    <div className="crop-assessment-factor" key={factor.key}>
                      <div className="crop-assessment-factor-label">
                        <span>{factor.label} <small>{factor.source === 'context' ? 'Score unavailable' : `Weight: ${Math.round(factor.weight * 100)}%`}</small></span>
                        <span className="crop-assessment-factor-measure">
                          {factor.average != null && <small>Avg: {readingValue(factor.average, ['temperature', 'soilTemperature'].includes(factor.key) ? '°C' : '%')}</small>}
                          <strong>{factor.source === 'context' ? readingValue(factor.average, '°C') : factor.score == null ? 'No score' : `${factorValue(factor)} / 100`}</strong>
                        </span>
                      </div>
                      {factor.source !== 'context' && <div className="crop-assessment-track" role="progressbar" aria-label={`${factor.label} score`}
                        aria-valuemin="0" aria-valuemax="100" aria-valuenow={factor.score ?? undefined}
                        aria-valuetext={factor.score == null ? 'No score available' : `${factorValue(factor)} out of 100`}>
                        <span style={{ width: `${factor.score || 0}%` }} />
                      </div>}
                      <small className="crop-assessment-factor-result">Result: {factorResult(factor, legacyPhoto)}{factor.source === 'sensor' && factor.count > 0 ? ` · ${factor.count} reading${factor.count === 1 ? '' : 's'}` : ''}</small>
                      {factor.source === 'image' && (factor.rating?.evidence || (factor.key === 'nutrient' && factor.score == null && assessment?.image?.nutrientRating?.evidence)) && (
                        <small>{factor.count > 1 ? 'Latest recorded description: ' : ''}{factor.rating?.evidence || assessment.image.nutrientRating.evidence}</small>
                      )}
                      {factor.analyzedAt && factor.analyzedAt !== assessment?.image?.analyzedAt && (
                        <small>Latest valid description from an earlier {legacyPhoto ? 'photo analysis' : 'inspection'} at {imageTime(factor.analyzedAt)}</small>
                      )}
                    </div>
                  ))}
                </div>
              </details>}
            </section>

              <section className="crop-assessment-card crop-assessment-guidance" aria-label="Rule-based recommendations">
                <h2><ClipboardList size={18} aria-hidden="true" /> Rule-Based Recommendations</h2>
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
                  <RefreshCw size={15} aria-hidden="true" /> {recommendations.length ? 'Refresh guidance' : 'Show guidance'}
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
