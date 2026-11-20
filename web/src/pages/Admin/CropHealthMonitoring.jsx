import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileClock,
  Image as ImageIcon,
  ImageUp,
  RefreshCw,
  ScanSearch,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import Pagination from '../../components/Pagination.jsx'
import { CropInspection, FIELDS } from '../../features/cropHealth/CropInspection.js'
import { CropInspectionApi } from '../../features/cropHealth/CropInspectionApi.js'
import '../../styles/admin-dashboard.css'
import '../../styles/task-schedule-management.css'
import '../../styles/monitoring.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const STORAGE_REPORTS_KEY = 'agriverse_crop_health_reports_v8'

const inspectionApi = new CropInspectionApi(API_URL)

const IMAGE_FACTORS = [
  ['cropCondition', 'Crop Condition'],
  ['pest', 'Pest Infestation'],
  ['nutrient', 'Nutrient Deficiency'],
  ['disease', 'Plant Diseases'],
]

const OVERALL_COLOR = { HEALTHY: '#15803d', 'NEEDS ATTENTION': '#a15c07', CRITICAL: '#b42318', INCONCLUSIVE: '#475467' }
const SEVERITY_COLOR = { LOW: '#15803d', MODERATE: '#a15c07', HIGH: '#b42318' }

// Decision-tree assessments (pineapple-decision-tree-v1) carry a detection status per dimension.
function isDecisionTree(factorRatings) {
  return Boolean(factorRatings && IMAGE_FACTORS.some(([key]) => factorRatings[key]?.status))
}

// Overall status value (prompt Part 6 B), colored by status.
function OverallStatus({ status }) {
  return <strong style={{ color: OVERALL_COLOR[status] || '#475467' }}>{status}</strong>
}

// Records saved before mainFindings existed only have the joined text; split it back into entries.
function mainFindingsOf(overall) {
  if (Array.isArray(overall?.mainFindings)) return overall.mainFindings
  if (!overall?.mainFinding) return []
  return overall.mainFinding.split('; ').map((part) => {
    const match = part.match(/^(.+?): (.*) \((issue detected|issue suspected), (\w+) severity\)$/i)
    if (match) return { dimension: match[1], condition: match[2], status: match[3].toUpperCase(), severity: match[4].toUpperCase() }
    const [dimension, ...rest] = part.split(': ')
    return rest.length ? { dimension, condition: rest.join(': ') } : { condition: part }
  })
}

const STATUS_TEXT = { 'ISSUE DETECTED': 'Issue detected', 'ISSUE SUSPECTED': 'Issue suspected', INCONCLUSIVE: 'Inconclusive' }

// Summary and main finding (prompt Part 6 B), shown inside the existing summary box.
function OverallSummary({ overall, summary }) {
  if (!overall) return summary || null
  const findings = mainFindingsOf(overall)
  return (
    <>
      {(overall.summary || summary) && <><strong>Summary:</strong> {overall.summary || summary}</>}
      {findings.length > 0 && (
        <span style={{ display: 'block', marginTop: '8px' }}>
          <strong>Main finding:</strong>
          {findings.map((finding, index) => (
            <span key={index} style={{ display: 'block', marginTop: '4px', paddingLeft: '10px' }}>
              {finding.dimension && <strong style={{ color: '#1d3523' }}>{finding.dimension}</strong>}
              {['LOW', 'MODERATE', 'HIGH'].includes(finding.severity) && (
                <> · <strong style={{ color: SEVERITY_COLOR[finding.severity] }}>{finding.severity} severity</strong></>
              )}
              {STATUS_TEXT[finding.status] && <> · {STATUS_TEXT[finding.status]}</>}
              <span style={{ display: 'block' }}>{finding.condition}</span>
            </span>
          ))}
        </span>
      )}
    </>
  )
}

// Individual Crop Health Assessment (Part 6 A) and Assessment Limitations (Part 6 D).
function DecisionTreeFindings({ factorRatings, limitations }) {
  return (
    <div style={{ color: '#27382c', fontSize: '12px', lineHeight: 1.7 }}>
      <ul style={{ margin: 0, paddingLeft: '18px' }}>
        {IMAGE_FACTORS.map(([key, label]) => {
          const rating = factorRatings?.[key]
          if (!rating) return <li key={key} style={{ marginBottom: '4px' }}><strong>{label}:</strong> Not recorded</li>
          return (
            <li key={key} style={{ marginBottom: '8px' }}>
              <strong>{label}:</strong> {rating.status}
              <div><strong>Identified or suspected condition:</strong> {rating.condition}</div>
              <div>
                <strong>Observed symptoms:</strong>{' '}
                {rating.symptoms?.length ? rating.symptoms.join('; ')
                  : rating.status === 'NO ISSUE DETECTED' ? 'No significant visible symptoms were observed.' : 'None observed.'}
              </div>
              <div>
                <strong>Severity level:</strong>{' '}
                <strong style={{ color: SEVERITY_COLOR[rating.severity] || '#475467' }}>{rating.severity}</strong>
              </div>
              {rating.severityExplanation && <div><strong>Explanation:</strong> {rating.severityExplanation}</div>}
            </li>
          )
        })}
      </ul>
      {limitations?.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <strong>Assessment limitations:</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            {limitations.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

// Displays current decision-tree findings or earlier visual ratings.
// Displays current decision-tree findings or earlier visual ratings.
function VisualFindings({ factorRatings, issues, limitations }) {
  if (isDecisionTree(factorRatings)) {
    return <DecisionTreeFindings factorRatings={factorRatings} limitations={limitations} />
  }
  const hasRatings = factorRatings && IMAGE_FACTORS.some(([key]) => factorRatings[key])
  return (
    <div style={{ color: '#27382c', fontSize: '12px', lineHeight: 1.7 }}>
      {hasRatings && (
        <p style={{ margin: '0 0 8px', color: '#a15c07' }}>
          This record was saved before the four-dimension assessment. Analyze the photo again to get the detection status, severity level, and overall status.
        </p>
      )}
      <ul style={{ margin: 0, paddingLeft: '18px' }}>
        {IMAGE_FACTORS.map(([key, label]) => {
          const rating = factorRatings?.[key]
          const severity = rating?.severity === 'none' ? 'No visible signs'
            : rating?.severity && rating.severity !== 'unknown' ? `${rating.severity[0].toUpperCase()}${rating.severity.slice(1)} signs detected`
              : hasRatings ? 'Cannot assess from this inspection' : 'Not recorded'
          return <li key={key} style={{ marginBottom: '4px' }}><strong>{label}:</strong> {severity}{rating?.evidence && <> — {rating.evidence}</>}</li>
        })}
      </ul>
      {!hasRatings && issues?.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <strong>Recorded symptoms:</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            {issues.map((issue, index) => <li key={index}>{issue}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

// Displays crop inspections and field health reports.
export default function CropHealthMonitoring() {
  const uploadInput = useRef(null)
  const [activeField, setActiveField] = useState('Field A')
  const [analyzing, setAnalyzing] = useState(false)
  const [loadingDB, setLoadingDB] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isPoorHealthNotice, setIsPoorHealthNotice] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [activityToDelete, setActivityToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [activities, setActivities] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Persistent field state
  const [reports, setReports] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_REPORTS_KEY)
      return CropInspection.createReports(stored ? JSON.parse(stored) : {})
    } catch {
      return CropInspection.createReports()
    }
  })

  // Load actual inspections from Supabase DB and sync latest field states
  useEffect(() => {
    // Loads saved inspections and updates each field's latest report.
    async function loadInspectionsFromDB() {
      setLoadingDB(true)
      try {
        const body = await inspectionApi.list()
        if (body?.success && Array.isArray(body.data)) {
          setActivities(body.data.map((row) => CropInspection.activityFromDatabase(row)))

          // Sync the latest scan for each field into the main inspection view
          setReports((prev) => {
            const updated = { ...prev }
            FIELDS.forEach((f) => {
              const latest = body.data.find((row) => row.field_name === f)
              if (latest) {
                const serverReport = CropInspection.reportFromDatabase(latest)
                // Keep a photo that the user has just selected. Loading history must not erase a draft.
                updated[f] = prev[f]?.image
                  ? { ...serverReport, image: prev[f].image, imageName: prev[f].imageName, imageMime: prev[f].imageMime }
                  : serverReport
              }
            })
            return updated
          })
        } else {
          setError('Inspection history could not be loaded. Please refresh the page and try again.')
        }
      } catch (err) {
        console.warn('Could not load inspections from Supabase:', err)
        setError(err instanceof Error ? err.message : 'Inspection history could not be loaded.')
      } finally {
        setLoadingDB(false)
      }
    }
    loadInspectionsFromDB()
  }, [])

  // Sync reports to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(reports))
    } catch (e) {
      console.warn('Failed to save reports', e)
    }
  }, [reports])

  // Close the inspection detail modal on Escape.
  useEffect(() => {
    if (!selectedActivity) return undefined
    // Closes the inspection dialog when Escape is pressed.
    function closeOnEscape(event) {
      if (event.key === 'Escape') setSelectedActivity(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selectedActivity])

  const currentFieldReport = reports[activeField] || CropInspection.createDefaultReport()

  // Selects inspection history for the active field.
  const fieldActivities = useMemo(
    () => activities.filter((activity) => activity.field === activeField),
    [activities, activeField],
  )
  const totalPages = Math.max(1, Math.ceil(fieldActivities.length / pageSize))

  // Keeps the history page within the available pages.
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  // Shows inspection history for the current page.
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return fieldActivities.slice(start, start + pageSize)
  }, [fieldActivities, currentPage])

  // Reads an uploaded crop photo for the selected field.
  function handleUpload(event) {
    const file = event.target.files?.[0]
    // Allow the same file to be selected again after it is removed.
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP).')
      return
    }

    setError('')
    setSuccessMessage('')
    setIsPoorHealthNotice(false)

    const reader = new FileReader()
    reader.onload = () => {
      const base64Data = reader.result
      setReports((current) => ({
        ...current,
        [activeField]: {
          ...CropInspection.withImage(current[activeField], file, base64Data),
        },
      }))
      setSuccessMessage(`Photo uploaded for ${activeField}. Click Analyze Photo to assess it.`)
    }
    reader.onerror = () => {
      setError('Failed to read the selected image file.')
    }
    reader.readAsDataURL(file)
  }

  // Removes the selected field's draft photo.
  function handleRemovePhoto() {
    setReports((current) => ({
      ...current,
      [activeField]: {
        ...CropInspection.withoutImage(current[activeField]),
      },
    }))
    setIsPoorHealthNotice(false)
    setSuccessMessage(`Photo removed for ${activeField}.`)
  }

  // Converts a crop image into data for analysis.
  async function convertAssetToBase64(url) {
    if (typeof url === 'string' && url.startsWith('data:image/')) {
      const match = url.match(/^data:([^;]+);base64,/)
      return { base64: url, mime: match ? match[1] : 'image/png' }
    }
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve({ base64: reader.result, mime: blob.type || 'image/png' })
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch {
      throw new Error(`Could not process crop image for ${activeField}.`)
    }
  }

  // The AI assesses four visible dimensions; the server decision tree sets the overall status.
  async function handleAnalyze() {
    if (!currentFieldReport.image) {
      setError('Upload a crop photo first.')
      return
    }

    setAnalyzing(true)
    setError('')
    setSuccessMessage('')

    try {
      const photo = await convertAssetToBase64(currentFieldReport.image)
      const result = await inspectionApi.diagnose({
        image: photo.base64,
        mimeType: photo.mime,
        field: activeField,
        cropType: 'Pineapple',
      })

      const diagnosis = result.diagnosis
      const { date, time } = CropInspection.formatDateTime(Date.now())
      const updatedReport = CropInspection.reportFromDiagnosis(currentFieldReport, diagnosis, time)

      setReports((current) => ({
        ...current,
        [activeField]: updatedReport,
      }))

      const newActivity = CropInspection.activityFromDiagnosis({
        id: result.savedRecord?.id || `act-${Date.now()}`,
        field: activeField,
        image: result.savedRecord?.image_url || currentFieldReport.image,
        diagnosis,
        date,
        time,
      })

      setActivities((current) => [newActivity, ...current])
      setIsPoorHealthNotice(diagnosis.overallStatus !== 'HEALTHY')
      if (result.saveWarning) setError(result.saveWarning)
      else setSuccessMessage(`${activeField}: ${diagnosis.overallStatus || 'photo analysis'} — assessment saved. Review the findings below.`)
    } catch (caught) {
      console.error('Analysis failed:', caught)
      setError(caught instanceof Error ? caught.message : 'Crop diagnosis failed.')
    } finally {
      setAnalyzing(false)
    }
  }

  // Opens confirmation for deleting an inspection.
  async function handleDeleteActivity(id, e) {
    e.stopPropagation()
    const activity = activities.find((item) => item.id === id)
    if (activity) setActivityToDelete(activity)
  }

  // Deletes the selected inspection record.
  async function confirmDeleteActivity() {
    if (!activityToDelete) return

    setDeleting(true)
    setError('')
    try {
      if (!activityToDelete.id.startsWith('act-')) await inspectionApi.delete(activityToDelete.id)
      setActivities((current) => current.filter((activity) => activity.id !== activityToDelete.id))
      setIsPoorHealthNotice(false)
      setSuccessMessage(`Inspection record for ${activityToDelete.field} was deleted.`)
      setActivityToDelete(null)
    } catch (err) {
      console.warn('Delete error:', err)
      setError(err instanceof Error ? err.message : 'Unable to delete this inspection record.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className="admin-dashboard crop-health-page">
      {/* Admin navigation and page header. */}
      <AdminSidebar active="crop-monitoring" />
      <section className="admin-workspace">
        <AdminTopbar />

        <div className="admin-content crop-health-content" style={{ width: 'min(1180px, calc(100% - 44px))', margin: '0 auto', padding: '22px 0 46px' }}>
          
          {/* Header Title */}
          {/* Page title and field overview. */}
          <header className="task-page-heading" style={{ marginBottom: '22px' }}>
            <div>
              <h1 style={{ margin: 0, color: '#196c35', fontSize: 'clamp(26px, 2.5vw, 34px)', fontWeight: 800, letterSpacing: '-0.025em' }}>
                Crop Health Monitoring
              </h1>
              <p style={{ margin: '3px 0 0', color: '#667568', fontSize: '13px', fontFamily: 'var(--sans)' }}>
                 Upload a pineapple photo to check crop condition, pests, nutrients, and diseases
              </p>
            </div>
          </header>

          {/* Error & Success Feedback Alerts */}
          {error && (
            <div className="tasks-error" role="alert" style={{ marginBottom: '18px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
              <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#b42318', cursor: 'pointer' }}><X size={16} /></button>
            </div>
          )}

          {successMessage && (
            <div role="status" style={{ padding: '13px 20px', borderRadius: '8px', color: isPoorHealthNotice ? '#b42318' : '#15803d', background: isPoorHealthNotice ? '#fff1f0' : '#f0fdf4', border: `1px solid ${isPoorHealthNotice ? '#fecdca' : '#bbf7d0'}`, marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isPoorHealthNotice ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                <span>{successMessage}</span>
              </div>
              <button type="button" onClick={() => setSuccessMessage('')} style={{ background: 'none', border: 'none', color: isPoorHealthNotice ? '#b42318' : '#15803d', cursor: 'pointer' }}><X size={16} /></button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* COMBINED UNIFIED CARD: TOP FIELD TABS + PHOTO PREVIEW + ASSESSMENT & PLAN */}
          {/* ========================================================================= */}
          {/* Field selection and photo analysis. */}
          <section className="tasks-panel" style={{ marginBottom: '28px', border: '1px solid #dce5d8', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 12px 28px rgba(42,76,38,.05)', background: '#fff' }}>
            
            {/* 1. Field Selection Top Tabs */}
            <nav className="task-management-tabs" aria-label="Field selection tabs">
              {FIELDS.map((field) => {
                const isCurrent = field === activeField
                return (
                  <button
                    key={field}
                    type="button"
                    className={isCurrent ? 'is-active' : ''}
                    disabled={analyzing}
                    onClick={() => {
                      if (field === activeField) return
                      setReports((current) => ({
                        ...current,
                        [activeField]: CropInspection.withoutImage(current[activeField]),
                      }))
                      setActiveField(field)
                      setCurrentPage(1)
                      setError('')
                      setSuccessMessage('')
                    }}
                  >
                    <span>{field}</span>
                  </button>
                )
              })}
            </nav>

            {/* 2. Action Toolbar & Image Preview Zone */}
            <div style={{ padding: '18px 22px 20px', background: '#fff', borderBottom: '1px solid #edf1eb' }}>
              {/* Inspection actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <button
                  className="admin-btn-secondary"
                  type="button"
                  onClick={() => uploadInput.current?.click()}
                  disabled={analyzing}
                >
                  <ImageUp aria-hidden="true" size={15} />
                  <span>{currentFieldReport.image ? 'Change Photo' : 'Upload Image'}</span>
                </button>
                <input ref={uploadInput} type="file" accept="image/*" onChange={handleUpload} hidden />

                <button
                  className="admin-btn-primary"
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || !currentFieldReport.image}
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="spin" size={14} style={{ animation: 'spin 1s linear infinite' }} />
                       <span>Analyzing Photo…</span>
                    </>
                  ) : (
                    <>
                       <ScanSearch size={14} />
                       <span>Analyze Photo</span>
                    </>
                  )}
                </button>
              </div>

              {/* Photo Inspection Area: Shows Image OR Modern Empty Upload Dropzone */}
              {currentFieldReport.image ? (
                <div style={{ background: '#f8faf6', border: '1px solid #e2e8df', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#1a3321', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {activeField} PHOTO INSPECTION
                      </span>
                      <small style={{ color: '#667568', fontSize: '11px' }}>({currentFieldReport.imageName || `${activeField} image`})</small>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={analyzing}
                      aria-label={`Remove photo from ${activeField}`}
                      title="Remove photo"
                      style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #f2c9c9', background: '#fff5f5', color: '#b42318', cursor: analyzing ? 'not-allowed' : 'pointer', display: 'grid', placeItems: 'center' }}
                    >
                      <X aria-hidden="true" size={15} />
                    </button>
                  </div>

                  <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #d4ded2', width: '100%', background: 'transparent' }}>
                    <img
                      key={activeField}
                      src={currentFieldReport.image}
                      alt={`${activeField} crop photo`}
                      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
                    />
                  </div>
                </div>
              ) : (
                /* ========================================================= */
                /* MODERN EMPTY PHOTO DROPZONE (WHEN NO IMAGE IS UPLOADED)   */
                /* ========================================================= */
                <div
                  onClick={() => uploadInput.current?.click()}
                  style={{
                    border: '2px dashed #c0d3be',
                    borderRadius: '12px',
                    padding: '48px 24px',
                    textAlign: 'center',
                    background: '#f9fbf8',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') uploadInput.current?.click(); }}
                >
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#eaf4e7', color: '#196c35', display: 'grid', placeItems: 'center', margin: '0 auto 14px', border: '1px solid #c8dbc4' }}>
                    <ImageIcon aria-hidden="true" size={30} />
                  </div>
                  <h3 style={{ margin: '0 0 6px', color: '#163e23', fontSize: '16px', fontWeight: 800, fontFamily: 'var(--display)' }}>
                    No Crop Photo Uploaded for {activeField}
                  </h3>
                  <p style={{ margin: '0 auto 16px', color: '#657868', fontSize: '12px', maxWidth: '420px', lineHeight: 1.5, fontFamily: 'var(--sans)' }}>
                     Upload a clear pineapple photo, then click Analyze Photo. The AI assesses what it sees, and a fixed decision tree sets the overall status.
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', backgroundColor: '#e6f0e4', color: '#1a5c2e', fontSize: '11px', fontWeight: 700 }}>
                    <UploadCloud size={14} />
                    <span>Supports JPEG, PNG, WebP up to 10MB</span>
                  </div>
                </div>
              )}
            </div>

             {/* 3. Diagnostic Results & Agronomic Action Plan */}
            <div style={{ padding: '16px 22px 14px', background: '#f9fbf8', borderBottom: '1px solid #edf1eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity style={{ color: 'var(--admin-green)' }} size={18} />
                <strong style={{ fontSize: '14px', color: '#163e23', fontFamily: 'var(--display)' }}>
                  {activeField} Diagnostic Assessment &amp; Action Plan
                </strong>
              </div>
              <span style={{ fontSize: '11px', color: '#667568', fontWeight: 600 }}>{currentFieldReport.lastUpdated}</span>
            </div>


            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0', background: '#fff' }}>
              {/* Left Column: Diagnostic Results */}
              <div style={{ padding: '22px 24px', borderRight: '1px solid #edf1eb' }}>
                {currentFieldReport.hasDiagnosis && currentFieldReport.overall && (
                  <p style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'baseline', margin: '0 0 8px', fontSize: '12px', color: '#334737' }}>
                    <span style={{ fontWeight: 700 }}>Overall status:</span>
                    <OverallStatus status={currentFieldReport.overall.status} />
                  </p>
                )}
                {currentFieldReport.hasDiagnosis && (
                  <p style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'baseline', margin: '0 0 14px', fontSize: '12px', color: '#334737' }}>
                     <span style={{ fontWeight: 700 }}>Recorded issue / method:</span>
                    <strong style={{ color: '#1d3523' }}>
                      {currentFieldReport.diseaseOrIssueName || 'Not identified'}
                    </strong>
                  </p>
                )}

                <p style={{ fontSize: '12px', color: '#455648', margin: '0 0 16px', lineHeight: 1.6, background: '#f8faf6', padding: '12px 14px', borderRadius: '8px', borderLeft: '3px solid var(--admin-green)' }}>
                  <OverallSummary overall={currentFieldReport.overall} summary={currentFieldReport.visualSummary} />
                </p>

                <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#1d3523', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                  {activeField} Visual Findings:
                </h3>
                <VisualFindings factorRatings={currentFieldReport.factorRatings} issues={currentFieldReport.issues} limitations={currentFieldReport.limitations} />
              </div>

              {/* Right Column: Agronomic Action Plan */}
              <div style={{ padding: '22px 24px', background: '#fcfdfb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <ClipboardList size={17} style={{ color: 'var(--admin-green)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#163e23' }}>
                    Targeted Treatment &amp; Action Steps
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: '#657168', margin: '0 0 14px' }}>
                  Specific agronomic guidelines for {activeField}:
                </p>

                {currentFieldReport.recommendations && currentFieldReport.recommendations.length > 0 ? (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {currentFieldReport.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          gap: '14px',
                          alignItems: 'flex-start',
                          padding: '13px 16px',
                          backgroundColor: '#fff',
                          borderRadius: '10px',
                          border: '1px solid #e0e7dc',
                          boxShadow: '0 2px 6px rgba(35,73,39,0.03)',
                        }}
                      >
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            minWidth: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#196c35',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 800,
                            lineHeight: 1,
                            flexShrink: 0,
                            marginTop: '1px',
                            textAlign: 'center',
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '12px', color: '#203323', lineHeight: 1.6, fontWeight: 500, flex: 1 }}>
                          {rec}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: '#68786b', fontSize: '12px', fontStyle: 'italic' }}>
                     Action steps appear after the photo is analyzed.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* RECENT INSPECTION ACTIVITIES TABLE (MATCHING EXACT 4-COLUMN SCREENSHOT)   */}
          {/* ========================================================================= */}
          {/* Saved inspection history for the selected field. */}
          <section className="tasks-panel" style={{ border: '1px solid #dce5d8', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 12px 28px rgba(42,76,38,.05)', background: '#fff' }}>
            
            <div className="tasks-table-wrap">
              <table className="tasks-table" aria-label={`${activeField} inspection history`} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#196c35' }}>
                    <th style={{ width: '25%', padding: '16px 20px', color: '#fff', fontSize: '11px', fontWeight: 900, textAlign: 'center', letterSpacing: '0.04em' }}>
                      DATE &amp; TIME
                    </th>
                    <th style={{ width: '55%', padding: '16px 20px', color: '#fff', fontSize: '11px', fontWeight: 900, textAlign: 'center', letterSpacing: '0.04em' }}>
                      DETECTED ISSUES
                    </th>
                    <th style={{ width: '20%', padding: '16px 20px', color: '#fff', fontSize: '11px', fontWeight: 900, textAlign: 'center', letterSpacing: '0.04em' }}>
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDB ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '48px 20px', textAlign: 'center', color: '#657168' }}>
                        <RefreshCw className="spin" size={24} style={{ margin: '0 auto 10px', animation: 'spin 1s linear infinite', color: '#196c35' }} />
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Loading inspection history…</p>
                      </td>
                    </tr>
                  ) : paginatedActivities.length > 0 ? (
                    paginatedActivities.map((act) => (
                      <tr key={act.id} style={{ borderBottom: '1px solid #edf1e9' }}>
                        {/* 1. Date & Time */}
                        <td style={{ padding: '18px 20px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <strong style={{ display: 'block', color: '#203324', fontSize: '12px', fontWeight: 700 }}>
                            {act.date}
                          </strong>
                          <span style={{ display: 'block', color: '#4a5b4e', fontSize: '11px', fontWeight: 600, marginTop: '3px' }}>
                            {act.time}
                          </span>
                        </td>

                        {/* Detected Issues (Bulleted List) */}
                        <td style={{ padding: '18px 20px', textAlign: 'left', verticalAlign: 'middle' }}>
                          {act.issues && act.issues.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '24px', listStyleType: 'disc', color: '#203324', fontSize: '12px', lineHeight: 1.7 }}>
                              {act.issues.map((issue, idx) => (
                                <li key={idx} style={{ fontWeight: 500 }}>
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ color: '#6d7c71', fontSize: '12px', fontStyle: 'italic', paddingLeft: '20px' }}>
                               No visible issues recorded
                            </span>
                          )}
                        </td>

                        {/* Action Button (Green View Button + Delete) */}
                        <td style={{ padding: '18px 20px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedActivity(act)}
                              style={{
                                minWidth: '68px',
                                height: '32px',
                                borderRadius: '6px',
                                backgroundColor: '#196c35',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '11px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(25, 108, 53, 0.2)',
                              }}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteActivity(act.id, e)}
                              title="Delete record"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                backgroundColor: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    /* ========================================================= */
                    /* BEAUTIFUL EMPTY STATE DESIGN (WHEN NO DATA IN DATABASE)   */
                    /* ========================================================= */
                    <tr>
                      <td colSpan={3} style={{ padding: '56px 24px', textAlign: 'center', background: '#fafcf9' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#eaf4e7', color: '#196c35', display: 'grid', placeItems: 'center', margin: '0 auto 16px', border: '1px solid #cfe0cb' }}>
                          <FileClock size={28} />
                        </div>
                        <h3 style={{ margin: '0 0 6px', color: '#163e23', fontSize: '16px', fontWeight: 800, fontFamily: 'var(--display)' }}>
                          No Inspection Logs Recorded for {activeField}
                        </h3>
                        <p style={{ margin: '0 auto 20px', color: '#657868', fontSize: '13px', maxWidth: '440px', lineHeight: 1.5, fontFamily: 'var(--sans)' }}>
                           Upload a crop photo above and click <strong>Analyze Photo</strong> to save a record.
                        </p>
                        <button
                          type="button"
                          onClick={() => uploadInput.current?.click()}
                          style={{
                            height: '38px',
                            padding: '0 20px',
                            borderRadius: '8px',
                            backgroundColor: '#196c35',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(25, 108, 53, 0.25)',
                          }}
                        >
                          <ImageUp size={16} />
                           <span>Attach Optional Photo</span>
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {fieldActivities.length > 0 && (
              <footer className="pagination-footer" style={{ margin: '10px 14px' }}>
                <span>{activeField}: {fieldActivities.length} inspection record{fieldActivities.length === 1 ? '' : 's'}</span>
                <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} ariaLabel="Inspection record pages" />
              </footer>
            )}
          </section>
        </div>
      </section>

      {/* Confirmation dialog for deleting an inspection. */}
      {activityToDelete && (
        <div className="task-modal-backdrop">
          <section className="task-reference-modal view-task-modal" role="dialog" aria-modal="true" aria-labelledby="delete-inspection-title" style={{ maxWidth: '440px' }}>
            <div className="task-dialog-header" style={{ minHeight: '68px', padding: '12px 24px', background: 'linear-gradient(90deg,#287a31,#1f6731)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Trash2 color="#fff" size={21} />
                <div>
                  <p>Inspection History</p>
                  <h2 id="delete-inspection-title" style={{ fontSize: '19px' }}>Delete inspection record?</h2>
                </div>
              </div>
              <button className="task-modal-header-close" type="button" onClick={() => setActivityToDelete(null)} disabled={deleting} aria-label="Close">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="task-reference-body" style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '14px', borderRadius: '8px', background: '#fff7f7', border: '1px solid #fecaca' }}>
                <AlertCircle size={21} style={{ color: '#b91c1c', flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <strong style={{ display: 'block', color: '#7f1d1d', fontSize: '13px', marginBottom: '4px' }}>{activityToDelete.field} inspection</strong>
                  <p style={{ margin: 0, color: '#8f3030', fontSize: '12px', lineHeight: 1.5 }}>
                    This will permanently delete the record from the inspection history.
                  </p>
                </div>
              </div>

              <p style={{ margin: '18px 0 22px', color: '#536257', fontSize: '13px', lineHeight: 1.5 }}>
                Are you sure you want to continue?
              </p>

              <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActivityToDelete(null)}
                  disabled={deleting}
                  style={{ minHeight: '36px', padding: '0 16px', borderRadius: '6px', background: '#f3f4f2', color: '#344537', fontWeight: 700, border: '1px solid #d0d7cf', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '11px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteActivity}
                  disabled={deleting}
                  style={{ minHeight: '36px', padding: '0 16px', borderRadius: '6px', background: '#b91c1c', color: '#fff', fontWeight: 800, border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                >
                  <Trash2 size={14} />
                  {deleting ? 'Deleting…' : 'Delete Record'}
                </button>
              </footer>
            </div>
          </section>
        </div>
      )}

      {/* View Detail Modal */}
      {/* Details dialog for a saved inspection. */}
      {selectedActivity && (
        <div className="task-modal-backdrop">
          <section className="task-reference-modal view-task-modal" role="dialog" aria-modal="true" aria-labelledby="view-task-title" style={{ maxWidth: '640px' }}>
            <div className="task-dialog-header" style={{ minHeight: '68px', padding: '12px 24px', background: 'linear-gradient(90deg,#287a31,#1f6731)' }}>
              <div>
                <div>
                  <p>Inspection Record</p>
                  <h2 id="view-task-title" style={{ fontSize: '20px' }}>{selectedActivity.field || 'Crop'} Inspection Details</h2>
                </div>
              </div>
              <button className="task-modal-header-close" type="button" onClick={() => setSelectedActivity(null)} aria-label="Close">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="task-reference-body task-view-body" style={{ padding: '24px 28px' }}>
              {selectedActivity.image && (
                <div style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '18px', border: '1px solid #d4ded2', width: '100%', background: 'transparent' }}>
                  <img
                    src={selectedActivity.image}
                    alt={`${selectedActivity.field || 'Crop'} inspection photo`}
                    style={{ width: '100%', height: 'auto', maxHeight: '340px', objectFit: 'contain', display: 'block', borderRadius: '8px' }}
                  />
                </div>
              )}

              <div className="task-dialog-grid" style={{ marginBottom: '18px', gap: '16px' }}>
                <div className="task-dialog-main task-view-section">
                  <div className="task-view-item" style={{ minHeight: 'auto', padding: '8px 0' }}>
                    <span>Field Location</span>
                    <strong>{selectedActivity.field || 'Field Sector'}</strong>
                  </div>
                  <div className="task-view-item" style={{ minHeight: 'auto', padding: '8px 0' }}>
                     <span>Recorded issue / method</span>
                    <strong>{selectedActivity.disease || 'General Inspection'}</strong>
                  </div>
                  {selectedActivity.overall && (
                    <div className="task-view-item" style={{ minHeight: 'auto', padding: '8px 0' }}>
                      <span>Overall status</span>
                      <OverallStatus status={selectedActivity.overall.status} />
                    </div>
                  )}
                </div>

                <div className="task-dialog-side task-view-section">
                  <div className="task-view-item" style={{ minHeight: 'auto', padding: '8px 0' }}>
                    <span>Date &amp; Time</span>
                    <strong>{selectedActivity.date} at {selectedActivity.time}</strong>
                  </div>
                </div>
              </div>

              {(selectedActivity.summary || selectedActivity.overall) && (
                <section className="task-view-description" style={{ marginBottom: '14px' }}>
                  <span>Agronomic Summary</span>
                  <p><OverallSummary overall={selectedActivity.overall} summary={selectedActivity.summary} /></p>
                </section>
              )}

              <section className="task-view-description" style={{ marginBottom: '14px' }}>
                <span>Visual Findings</span>
                <VisualFindings factorRatings={selectedActivity.factorRatings} issues={selectedActivity.issues} limitations={selectedActivity.limitations} />
              </section>

              <section className="task-view-description" style={{ marginBottom: '20px' }}>
                <span>Action Recommendations</span>
                <ol style={{ margin: '6px 0 0', paddingLeft: '18px', color: '#26342a', fontSize: '12px', lineHeight: 1.6 }}>
                  {(selectedActivity.recommendations || []).map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ol>
              </section>

              <footer style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const fieldName = selectedActivity.field || activeField
                    setActiveField(fieldName)
                    setReports((prev) => ({
                      ...prev,
                      [fieldName]: CropInspection.reportFromActivity(selectedActivity),
                    }))
                    setSelectedActivity(null)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  style={{
                    minHeight: '36px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    backgroundColor: '#196c35',
                    color: '#fff',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  Load into Main Inspector
                </button>
              </footer>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
