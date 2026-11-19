import { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/crop-health-assessment.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const FIELDS = ['Field A', 'Field B', 'Field C', 'Field D']
const ASSESSMENT_HOURS = 24

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

export default function CropHealthAssessment() {
  const [field, setField] = useState('Field A')
  const [assessment, setAssessment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recommendations, setRecommendations] = useState([])
  const [guidanceLoading, setGuidanceLoading] = useState(false)
  const [guidanceError, setGuidanceError] = useState('')
  const [guidanceVersion, setGuidanceVersion] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setAssessment(null)
    setError('')
    assessmentRequest(`?${new URLSearchParams({ field, hours: String(ASSESSMENT_HOURS) })}`)
      .then((result) => { if (active) setAssessment(result) })
      .catch((caught) => { if (active) setError(caught.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [field])

  useEffect(() => {
    let active = true
    setRecommendations([])
    setGuidanceError('')
    const hasEvidence = assessment?.image || assessment?.factors?.some((factor) => factor.count > 0)
      || assessment?.context?.soilTemperature?.count > 0
    if (!hasEvidence) {
      setGuidanceLoading(false)
      return () => { active = false }
    }
    setGuidanceLoading(true)
    assessmentRequest('/recommendations', {
      method: 'POST', body: JSON.stringify({ field, hours: ASSESSMENT_HOURS }),
    })
      .then((result) => { if (active) setRecommendations(result.recommendations || []) })
      .catch((caught) => { if (active) setGuidanceError(caught.message) })
      .finally(() => { if (active) setGuidanceLoading(false) })
    return () => { active = false }
  }, [assessment, field, guidanceVersion])

  const hasSensorData = assessment?.factors?.some((factor) => factor.source === 'sensor' && factor.count > 0)
    || assessment?.context?.soilTemperature?.count > 0
  const score = assessment?.cropHealthScore
  const environment = assessment?.environmentalScore
  const missingImage = assessment?.factors?.some((factor) => factor.source === 'image' && factor.score == null)
  const missingSensor = assessment?.factors?.some((factor) => factor.source === 'sensor' && factor.score == null)
  const moistureFactor = assessment?.factors?.find((factor) => factor.key === 'moisture')
  const soilTemperature = assessment?.context?.soilTemperature

  function changeField(nextField) {
    if (nextField === field) return
    setAssessment(null)
    setRecommendations([])
    setLoading(true)
    setField(nextField)
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
            </nav>
            <div className="crop-assessment-tab-content">
              {error && <div className="crop-assessment-error" role="alert"><AlertCircle size={17} />{error}</div>}
              {assessment?.sensorError && <div className="crop-assessment-error" role="status"><AlertCircle size={17} />{assessment.sensorError}</div>}

              <div className="crop-assessment-grid">
            <section className="crop-assessment-card crop-assessment-main" aria-label="Crop health score and factors">
              <div className="crop-assessment-card-heading">Calculated Crop Health Score</div>
              <div className="crop-assessment-score-row">
                <div className="crop-assessment-score">{loading ? '…' : score == null ? '—' : score}<small> / 100</small></div>
                <div className={`crop-assessment-classification${score == null ? ' is-pending' : ''}`}>
                  {score == null ? 'Incomplete' : assessment.classification}
                </div>
              </div>
              <div className="crop-assessment-track is-overall"><span style={{ width: `${score || 0}%` }} /></div>
              {score == null && !loading && <p className="crop-assessment-missing">
                {missingImage && missingSensor ? 'Image and sensor scores are needed.'
                  : missingImage ? 'A scored crop image is needed.'
                    : moistureFactor?.average != null && moistureFactor.score == null ? 'Field soil thresholds are needed.'
                      : missingSensor ? 'Recent sensor readings are needed.' : 'No assessment data yet.'}
              </p>}
              <div className="crop-assessment-factors">
                {(assessment?.factors || []).map((factor) => (
                  <div className="crop-assessment-factor" key={factor.key}>
                    <div className="crop-assessment-factor-label">
                      <span>{factor.label} ({Math.round(factor.weight * 100)}%)</span>
                      <strong>{factorValue(factor)}</strong>
                    </div>
                    <div className="crop-assessment-track"><span style={{ width: `${factor.score || 0}%` }} /></div>
                    {factor.average != null && <small>{factor.average}{factor.key === 'temperature' ? '°C' : '%'} average</small>}
                  </div>
                ))}
                {loading && <p className="crop-assessment-empty">Loading assessment…</p>}
              </div>
            </section>

            <div className="crop-assessment-side">
              <section className="crop-assessment-card crop-assessment-environment" aria-label="Environmental suitability">
                <h2>Environmental Suitability</h2>
                <div>{loading ? '…' : environment == null ? '—' : environment}<small> / 100</small></div>
                {environment == null && !loading && <p>Air, humidity and moisture scores needed</p>}
                <div className="crop-assessment-soil-context">
                  <span>Soil temperature <small>(context)</small></span>
                  <strong>{soilTemperature?.average == null ? '—' : `${soilTemperature.average}°C`}</strong>
                </div>
              </section>
              <section className="crop-assessment-card crop-assessment-guidance" aria-label="Gemini recommendations">
                <h2><Sparkles size={20} aria-hidden="true" /> Gemini Recommendations</h2>
                <p className="crop-assessment-source">{assessment?.image && hasSensorData ? 'Image findings + sensor readings'
                  : assessment?.image ? 'Image findings' : hasSensorData ? 'Sensor readings' : 'No field data yet'}</p>
                {guidanceLoading && <p className="crop-assessment-empty">Generating guidance…</p>}
                {!guidanceLoading && guidanceError && <p className="crop-assessment-guidance-error" role="alert">{guidanceError}</p>}
                {!guidanceLoading && !guidanceError && recommendations.length > 0 && (
                  <ol className="crop-assessment-recommendations">
                    {recommendations.map((recommendation, index) => <li key={`${index}-${recommendation}`}>{recommendation}</li>)}
                  </ol>
                )}
                {!guidanceLoading && !guidanceError && recommendations.length === 0 && <p className="crop-assessment-empty">No guidance available.</p>}
                <button type="button" className="crop-assessment-regenerate" disabled={guidanceLoading || loading || !assessment || (!assessment.image && !hasSensorData)} onClick={() => setGuidanceVersion((version) => version + 1)}>
                  <RefreshCw size={15} aria-hidden="true" /> Regenerate guidance
                </button>
                <small>Verify in the field before treatment.</small>
              </section>
            </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
