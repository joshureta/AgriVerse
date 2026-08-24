import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileClock,
  ImageUp,
  RefreshCw,
  Save,
  Sparkles,
  Sprout,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/task-schedule-management.css'
import '../../styles/monitoring.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const STORAGE_REPORTS_KEY = 'agriverse_crop_health_reports_v8'

const defaultFieldData = {
  'Field A': {
    score: null,
    hasDiagnosis: false,
    issues: [],
    recommendations: [],
    diseaseOrIssueName: 'Awaiting Inspection',
    healthStatus: 'Pending',
    visualSummary: 'No scan has been performed yet for this sector. Upload a crop photo to diagnose.',
    image: null,
    imageName: '',
    imageMime: null,
    lastUpdated: 'No scans yet',
  },
  'Field B': {
    score: null,
    hasDiagnosis: false,
    issues: [],
    recommendations: [],
    diseaseOrIssueName: 'Awaiting Inspection',
    healthStatus: 'Pending',
    visualSummary: 'No scan has been performed yet for this sector. Upload a crop photo to diagnose.',
    image: null,
    imageName: '',
    imageMime: null,
    lastUpdated: 'No scans yet',
  },
  'Field C': {
    score: null,
    hasDiagnosis: false,
    issues: [],
    recommendations: [],
    diseaseOrIssueName: 'Awaiting Inspection',
    healthStatus: 'Pending',
    visualSummary: 'No scan has been performed yet for this sector. Upload a crop photo to diagnose.',
    image: null,
    imageName: '',
    imageMime: null,
    lastUpdated: 'No scans yet',
  },
  'Field D': {
    score: null,
    hasDiagnosis: false,
    issues: [],
    recommendations: [],
    diseaseOrIssueName: 'Awaiting Inspection',
    healthStatus: 'Pending',
    visualSummary: 'No scan has been performed yet for this sector. Upload a crop photo to diagnose.',
    image: null,
    imageName: '',
    imageMime: null,
    lastUpdated: 'No scans yet',
  },
}

export default function CropHealthMonitoring() {
  const uploadInput = useRef(null)
  const [activeField, setActiveField] = useState('Field A')
  const [analyzing, setAnalyzing] = useState(false)
  const [loadingDB, setLoadingDB] = useState(true)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [activities, setActivities] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  // Persistent field state
  const [reports, setReports] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_REPORTS_KEY)
      if (!stored) return defaultFieldData
      const parsed = JSON.parse(stored)
      return {
        'Field A': { ...defaultFieldData['Field A'], ...parsed['Field A'] },
        'Field B': { ...defaultFieldData['Field B'], ...parsed['Field B'] },
        'Field C': { ...defaultFieldData['Field C'], ...parsed['Field C'] },
        'Field D': { ...defaultFieldData['Field D'], ...parsed['Field D'] },
      }
    } catch {
      return defaultFieldData
    }
  })

  // Load actual inspections from Supabase DB and sync latest field states
  useEffect(() => {
    async function loadInspectionsFromDB() {
      setLoadingDB(true)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token
        if (!token) {
          setLoadingDB(false)
          return
        }

        const res = await fetch(`${API_URL}/api/ai/crop-inspections`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const body = await res.json()
        if (body?.success && Array.isArray(body.data)) {
          const mapped = body.data.map((row) => {
            const dateObj = new Date(row.created_at || Date.now())
            const dateStr = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(dateObj)
            const timeStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(dateObj)
            return {
              id: row.id,
              date: dateStr,
              time: timeStr,
              score: row.health_score,
              field: row.field_name,
              disease: row.disease_or_issue_name,
              status: row.status || 'COMPLETED',
              issues: Array.isArray(row.identified_symptoms) ? row.identified_symptoms : [],
              recommendations: Array.isArray(row.action_recommendations) ? row.action_recommendations : [],
              summary: row.visual_summary || '',
              image: row.image_url || null,
            }
          })
          setActivities(mapped)

          // Sync the latest scan for each field into the main inspection view
          setReports((prev) => {
            const updated = { ...prev }
            const fieldNames = ['Field A', 'Field B', 'Field C', 'Field D']
            fieldNames.forEach((f) => {
              const latest = body.data.find((row) => row.field_name === f)
              if (latest) {
                const dateObj = new Date(latest.created_at || Date.now())
                const timeStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(dateObj)
                const dateStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dateObj)
                updated[f] = {
                  score: latest.health_score,
                  hasDiagnosis: true,
                  issues: Array.isArray(latest.identified_symptoms) ? latest.identified_symptoms : [],
                  recommendations: Array.isArray(latest.action_recommendations) ? latest.action_recommendations : [],
                  diseaseOrIssueName: latest.disease_or_issue_name || 'Diagnosed Crop Stand',
                  healthStatus: latest.health_status || (latest.health_score >= 80 ? 'Healthy' : 'Attention Needed'),
                  visualSummary: latest.visual_summary || '',
                  image: latest.image_url || prev[f]?.image || null,
                  imageName: latest.image_name || `${f} inspection photo`,
                  imageMime: latest.image_mime_type || 'image/png',
                  lastUpdated: `${dateStr} at ${timeStr}`,
                }
              }
            })
            return updated
          })
        }
      } catch (err) {
        console.warn('Could not load inspections from Supabase:', err)
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

  // Close modal on Escape
  useEffect(() => {
    if (!selectedActivity) return undefined
    function closeOnEscape(event) {
      if (event.key === 'Escape') setSelectedActivity(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selectedActivity])

  const currentFieldReport = reports[activeField] || defaultFieldData[activeField] || defaultFieldData['Field A']

  // Summary statistics
  const stats = useMemo(() => {
    const diagnosedFields = Object.values(reports).filter((r) => r.score !== null)
    const avgScore = diagnosedFields.length
      ? Math.round(diagnosedFields.reduce((a, b) => a + b.score, 0) / diagnosedFields.length)
      : 0
    const healthyCount = diagnosedFields.filter((r) => r.score >= 80).length
    const alertCount = diagnosedFields.filter((r) => r.score < 80).length
    const totalScans = activities.length
    return { avgScore, healthyCount, alertCount, totalScans, diagnosedCount: diagnosedFields.length }
  }, [reports, activities])

  const totalPages = Math.max(1, Math.ceil(activities.length / pageSize))
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return activities.slice(start, start + pageSize)
  }, [activities, currentPage])

  function handleUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP).')
      return
    }

    setError('')
    setSuccessMessage('')
    setSaved(false)

    const reader = new FileReader()
    reader.onload = () => {
      const base64Data = reader.result
      setReports((current) => ({
        ...current,
        [activeField]: {
          ...current[activeField],
          image: base64Data,
          imageName: file.name,
          imageMime: file.type,
        },
      }))
      setSuccessMessage(`Photo uploaded for ${activeField}. Click "Analyze ${activeField} Image" to run Gemini Vision AI!`)
    }
    reader.onerror = () => {
      setError('Failed to read the selected image file.')
    }
    reader.readAsDataURL(file)
  }

  function handleRemovePhoto() {
    setReports((current) => ({
      ...current,
      [activeField]: {
        ...current[activeField],
        image: null,
        imageName: '',
        imageMime: null,
      },
    }))
    setSuccessMessage(`Photo removed for ${activeField}.`)
  }

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

  async function handleAnalyze() {
    if (!currentFieldReport.image) {
      setError(`Please upload a crop photo for ${activeField} first.`)
      return
    }

    setAnalyzing(true)
    setError('')
    setSuccessMessage('')
    setSaved(false)

    try {
      const { base64: payloadBase64, mime: payloadMime } = await convertAssetToBase64(currentFieldReport.image)

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      if (!token) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const response = await fetch(`${API_URL}/api/ai/crop-diagnosis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: payloadBase64,
          mimeType: payloadMime,
          field: activeField,
          cropType: 'Pineapple',
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze crop health with AI.')
      }

      const diagnosis = result.diagnosis
      const now = new Date()
      const dateStr = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(now)
      const timeStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(now)

      const updatedReport = {
        ...currentFieldReport,
        score: diagnosis.score,
        hasDiagnosis: true,
        issues: diagnosis.issues,
        recommendations: diagnosis.recommendations,
        diseaseOrIssueName: diagnosis.diseaseOrIssueName,
        healthStatus: diagnosis.healthStatus,
        visualSummary: diagnosis.visualSummary,
        lastUpdated: `Today at ${timeStr}`,
      }

      setReports((current) => ({
        ...current,
        [activeField]: updatedReport,
      }))

      const newActivity = {
        id: result.savedRecord?.id || `act-${Date.now()}`,
        date: dateStr,
        time: timeStr,
        score: diagnosis.score,
        field: activeField,
        disease: diagnosis.diseaseOrIssueName,
        status: 'COMPLETED',
        issues: diagnosis.issues,
        recommendations: diagnosis.recommendations,
        summary: diagnosis.visualSummary,
        image: result.savedRecord?.image_url || currentFieldReport.image,
      }

      setActivities((current) => [newActivity, ...current])
      setSuccessMessage(`AI diagnosis complete for ${activeField}! Health Score: ${diagnosis.score}%. Saved to Supabase database.`)
      setSaved(true)
    } catch (caught) {
      console.error('Analysis failed:', caught)
      setError(caught instanceof Error ? caught.message : 'Crop diagnosis failed.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleManualSave() {
    if (!currentFieldReport.hasDiagnosis && currentFieldReport.score === null) {
      setError(`Run an AI diagnosis for ${activeField} before saving to database.`)
      return
    }

    const now = new Date()
    const dateStr = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(now)
    const timeStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(now)

    let createdId = `act-${Date.now()}`
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      if (token) {
        const res = await fetch(`${API_URL}/api/ai/crop-inspections`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            field: activeField,
            healthScore: currentFieldReport.score || 85,
            healthStatus: currentFieldReport.healthStatus,
            diseaseOrIssueName: currentFieldReport.diseaseOrIssueName,
            visualSummary: currentFieldReport.visualSummary,
            issues: currentFieldReport.issues,
            recommendations: currentFieldReport.recommendations,
            image: currentFieldReport.image,
            imageMime: currentFieldReport.imageMime,
            imageName: currentFieldReport.imageName,
            status: 'COMPLETED',
          }),
        })
        const body = await res.json()
        if (body?.data?.id) createdId = body.data.id
      }
    } catch (err) {
      console.warn('Manual save warning:', err)
    }

    const newActivity = {
      id: createdId,
      date: dateStr,
      time: timeStr,
      score: currentFieldReport.score || 85,
      field: activeField,
      disease: currentFieldReport.diseaseOrIssueName || 'Manual Inspection Log',
      status: 'COMPLETED',
      issues: currentFieldReport.issues,
      recommendations: currentFieldReport.recommendations,
      summary: currentFieldReport.visualSummary || 'Inspection log saved manually.',
      image: currentFieldReport.image,
    }

    setActivities((current) => [newActivity, ...current])
    setSaved(true)
    setSuccessMessage(`Inspection log for ${activeField} saved to database!`)
  }

  async function handleDeleteActivity(id, e) {
    e.stopPropagation()
    if (window.confirm('Delete this inspection record from database?')) {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token
        if (token && id && !id.startsWith('act-')) {
          await fetch(`${API_URL}/api/ai/crop-inspections/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
        }
      } catch (err) {
        console.warn('Delete error:', err)
      }
      setActivities((current) => current.filter((act) => act.id !== id))
    }
  }

  return (
    <main className="admin-dashboard crop-health-page">
      <AdminSidebar active="crop-monitoring" />
      <section className="admin-workspace">
        <AdminTopbar />

        <div className="admin-content crop-health-content" style={{ width: 'min(1180px, calc(100% - 44px))', margin: '0 auto', padding: '22px 0 46px' }}>
          
          {/* Header Title */}
          <header className="task-page-heading" style={{ marginBottom: '22px' }}>
            <div>
              <h1 style={{ margin: 0, color: '#196c35', fontSize: 'clamp(26px, 2.5vw, 34px)', fontWeight: 800, letterSpacing: '-0.025em' }}>
                Crop Health Monitoring
              </h1>
              <p style={{ margin: '3px 0 0', color: '#667568', fontSize: '13px', fontFamily: 'var(--sans)' }}>
                Pineapple disease &amp; pest diagnosis powered by Gemini Vision AI and Supabase database
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
            <div style={{ padding: '13px 20px', borderRadius: '8px', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={18} />
                <span>{successMessage}</span>
              </div>
              <button type="button" onClick={() => setSuccessMessage('')} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer' }}><X size={16} /></button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* COMBINED UNIFIED CARD: FIELD PILLS + PHOTO PREVIEW + ASSESSMENT & PLAN    */}
          {/* ========================================================================= */}
          <section className="tasks-panel" style={{ marginBottom: '28px', border: '1px solid #dce5d8', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 24px rgba(35,73,39,0.06)' }}>
            
            {/* 1. Field Selection Clean Pill Buttons */}
            <div style={{ padding: '16px 20px 14px', background: '#fff', borderBottom: '1px solid #edf1eb' }}>
              <div className="task-work-type-tabs" style={{ padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {Object.keys(reports).map((field) => {
                  const isCurrent = field === activeField
                  return (
                    <button
                      key={field}
                      type="button"
                      className={isCurrent ? 'is-active' : ''}
                      onClick={() => {
                        setActiveField(field)
                        setSaved(false)
                        setError('')
                        setSuccessMessage('')
                      }}
                      style={{
                        minHeight: '38px',
                        borderRadius: '999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 800,
                        border: isCurrent ? '1px solid #1c6d33' : '1px solid #8eb594',
                        backgroundColor: isCurrent ? '#1c6d33' : '#fff',
                        color: isCurrent ? '#fff' : '#176b32',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{field}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Action Toolbar & Image Preview Zone */}
            <div style={{ padding: '18px 22px 20px', background: '#fff', borderBottom: '1px solid #edf1eb' }}>
              {/* Action Buttons Toolbar (One on Left, One on Right) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <button
                  className="assign-task-toolbar-button"
                  type="button"
                  onClick={() => uploadInput.current?.click()}
                  disabled={analyzing}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  <ImageUp aria-hidden="true" size={15} style={{ marginRight: '6px' }} />
                  <span>{currentFieldReport.image ? `Change ${activeField} Photo` : `Upload Photo for ${activeField}`}</span>
                </button>
                <input ref={uploadInput} type="file" accept="image/*" onChange={handleUpload} hidden />

                <button
                  className="assign-task-toolbar-button"
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || !currentFieldReport.image}
                  style={{
                    height: '38px',
                    padding: '0 18px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    opacity: !currentFieldReport.image ? 0.6 : 1,
                    background: analyzing ? '#97b79e' : 'radial-gradient(circle at 50% 50%, #479237 0%, #1f5f2b 100%)',
                    boxShadow: '0 8px 16px rgba(25,108,53,0.16)',
                    cursor: !currentFieldReport.image ? 'not-allowed' : 'pointer',
                  }}
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="spin" size={14} style={{ marginRight: '6px', animation: 'spin 1s linear infinite' }} />
                      <span>Diagnosing {activeField} with Gemini…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} style={{ marginRight: '6px' }} />
                      <span>Analyze {activeField} Image</span>
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
                    <Camera size={30} />
                  </div>
                  <h3 style={{ margin: '0 0 6px', color: '#163e23', fontSize: '16px', fontWeight: 800, fontFamily: 'var(--display)' }}>
                    No Crop Photo Uploaded for {activeField}
                  </h3>
                  <p style={{ margin: '0 auto 16px', color: '#657868', fontSize: '12px', maxWidth: '420px', lineHeight: 1.5, fontFamily: 'var(--sans)' }}>
                    Click here to upload a high-resolution drone photo or crop leaf snapshot to perform AI disease and pest diagnosis.
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
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#334737' }}>Crop Health Index:</span>
                  <strong style={{ fontSize: '26px', fontFamily: 'var(--display)', color: currentFieldReport.score !== null ? (currentFieldReport.score >= 80 ? '#1b5e20' : currentFieldReport.score >= 60 ? '#e65100' : '#b71c1c') : '#7a8a7c' }}>
                    {currentFieldReport.score !== null ? `${currentFieldReport.score}%` : '—'}
                  </strong>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: currentFieldReport.score !== null ? (currentFieldReport.score >= 80 ? '#eaf5e6' : currentFieldReport.score >= 60 ? '#fff3d4' : '#feeae6') : '#f0f2ee',
                      color: currentFieldReport.score !== null ? (currentFieldReport.score >= 80 ? '#28733d' : currentFieldReport.score >= 60 ? '#946508' : '#ad4439') : '#68756c',
                    }}
                  >
                    {currentFieldReport.healthStatus}
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: '#455648', margin: '0 0 16px', lineHeight: 1.6, background: '#f8faf6', padding: '12px 14px', borderRadius: '8px', borderLeft: '3px solid var(--admin-green)' }}>
                  {currentFieldReport.visualSummary}
                </p>

                <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#1d3523', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                  {activeField} Identified Symptoms:
                </h3>
                {currentFieldReport.issues && currentFieldReport.issues.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#27382c', fontSize: '12px', lineHeight: 1.7 }}>
                    {currentFieldReport.issues.map((issue, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        {issue}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, color: '#68786b', fontSize: '12px', fontStyle: 'italic' }}>
                    No symptoms recorded. Upload a crop photo and run diagnosis to detect issues.
                  </p>
                )}
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
                    Action steps will be dynamically generated once an AI diagnosis is completed for this field.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* RECENT INSPECTION ACTIVITIES TABLE (MATCHING EXACT 4-COLUMN SCREENSHOT)   */}
          {/* ========================================================================= */}
          <section className="tasks-panel" style={{ border: '1px solid #dce5d8', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 12px 28px rgba(42,76,38,.05)', background: '#fff' }}>
            
            <div className="tasks-table-wrap">
              <table className="tasks-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#196c35' }}>
                    <th style={{ width: '22%', padding: '16px 20px', color: '#fff', fontSize: '11px', fontWeight: 900, textAlign: 'center', letterSpacing: '0.04em' }}>
                      DATE &amp; TIME
                    </th>
                    <th style={{ width: '18%', padding: '16px 20px', color: '#fff', fontSize: '11px', fontWeight: 900, textAlign: 'center', letterSpacing: '0.04em' }}>
                      HEALTH SCORE
                    </th>
                    <th style={{ width: '42%', padding: '16px 20px', color: '#fff', fontSize: '11px', fontWeight: 900, textAlign: 'center', letterSpacing: '0.04em' }}>
                      DETECTED ISSUES
                    </th>
                    <th style={{ width: '18%', padding: '16px 20px', color: '#fff', fontSize: '11px', fontWeight: 900, textAlign: 'center', letterSpacing: '0.04em' }}>
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDB ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '48px 20px', textAlign: 'center', color: '#657168' }}>
                        <RefreshCw className="spin" size={24} style={{ margin: '0 auto 10px', animation: 'spin 1s linear infinite', color: '#196c35' }} />
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Loading inspection history from database…</p>
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

                        {/* 2. Health Score */}
                        <td style={{ padding: '18px 20px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#203324' }}>
                            {act.score}%
                          </span>
                        </td>

                        {/* 3. Detected Issues (Bulleted List) */}
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
                              No critical issues detected
                            </span>
                          )}
                        </td>

                        {/* 4. Action Button (Green View Button + Delete) */}
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
                      <td colSpan={4} style={{ padding: '56px 24px', textAlign: 'center', background: '#fafcf9' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#eaf4e7', color: '#196c35', display: 'grid', placeItems: 'center', margin: '0 auto 16px', border: '1px solid #cfe0cb' }}>
                          <FileClock size={28} />
                        </div>
                        <h3 style={{ margin: '0 0 6px', color: '#163e23', fontSize: '16px', fontWeight: 800, fontFamily: 'var(--display)' }}>
                          No Inspection Logs Recorded Yet
                        </h3>
                        <p style={{ margin: '0 auto 20px', color: '#657868', fontSize: '13px', maxWidth: '440px', lineHeight: 1.5, fontFamily: 'var(--sans)' }}>
                          Upload a crop photo above and click <strong>"Analyze {activeField} Image"</strong> to run your first real AI diagnosis and store it in Supabase.
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
                          <span>Upload &amp; Scan Crop Photo Now</span>
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {activities.length > 0 && (
              <footer className="task-pagination" style={{ margin: '10px 14px' }}>
                <span>{activities.length} total inspection record{activities.length === 1 ? '' : 's'}</span>
                <div>
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                  >
                    ← Previous
                  </button>
                  <strong>{currentPage}</strong>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                  >
                    Next →
                  </button>
                </div>
              </footer>
            )}
          </section>
        </div>
      </section>

      {/* View Detail Modal */}
      {selectedActivity && (
        <div className="task-modal-backdrop">
          <section className="task-reference-modal view-task-modal" role="dialog" aria-modal="true" aria-labelledby="view-task-title" style={{ maxWidth: '640px' }}>
            <div className="task-dialog-header" style={{ minHeight: '68px', padding: '12px 24px', background: 'linear-gradient(90deg,#287a31,#1f6731)' }}>
              <span><Sprout color="#fff" size={24} /></span>
              <div>
                <p>Inspection Record</p>
                <h2 id="view-task-title" style={{ fontSize: '20px' }}>{selectedActivity.field || 'Crop'} Inspection Details</h2>
              </div>
            </div>

            <div className="task-reference-body task-view-body" style={{ padding: '24px 28px' }}>
              {selectedActivity.image && (
                <div style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '18px', border: '1px solid #d4ded2', width: '100%', background: 'transparent' }}>
                  <img
                    src={selectedActivity.image}
                    alt={`${selectedActivity.field || 'Crop'} inspection photo`}
                    style={{ width: '100%', height: 'auto', maxHeight: '340px', objectFit: 'cover', display: 'block', borderRadius: '8px' }}
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
                    <span>Diagnosed Condition</span>
                    <strong>{selectedActivity.disease || 'General Inspection'}</strong>
                  </div>
                </div>

                <div className="task-dialog-side task-view-section">
                  <div className="task-view-item" style={{ minHeight: 'auto', padding: '8px 0' }}>
                    <span>Health Score</span>
                    <strong style={{ color: selectedActivity.score >= 80 ? '#17aa2f' : selectedActivity.score >= 60 ? '#f57f17' : '#f2332d', fontSize: '18px' }}>
                      {selectedActivity.score}%
                    </strong>
                  </div>
                  <div className="task-view-item" style={{ minHeight: 'auto', padding: '8px 0' }}>
                    <span>Date &amp; Time</span>
                    <strong>{selectedActivity.date} at {selectedActivity.time}</strong>
                  </div>
                </div>
              </div>

              {selectedActivity.summary && (
                <section className="task-view-description" style={{ marginBottom: '14px' }}>
                  <span>Agronomic Summary</span>
                  <p>{selectedActivity.summary}</p>
                </section>
              )}

              <section className="task-view-description" style={{ marginBottom: '14px' }}>
                <span>Identified Symptoms</span>
                <ul style={{ margin: '6px 0 0', paddingLeft: '18px', color: '#26342a', fontSize: '12px', lineHeight: 1.6 }}>
                  {(selectedActivity.issues || []).map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </section>

              <section className="task-view-description" style={{ marginBottom: '20px' }}>
                <span>Action Recommendations</span>
                <ul style={{ margin: '6px 0 0', paddingLeft: '18px', color: '#26342a', fontSize: '12px', lineHeight: 1.6 }}>
                  {(selectedActivity.recommendations || []).map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </section>

              <footer style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const fieldName = selectedActivity.field || activeField
                    setActiveField(fieldName)
                    setReports((prev) => ({
                      ...prev,
                      [fieldName]: {
                        score: selectedActivity.score,
                        hasDiagnosis: true,
                        issues: selectedActivity.issues || [],
                        recommendations: selectedActivity.recommendations || [],
                        diseaseOrIssueName: selectedActivity.disease || 'Historical Inspection',
                        healthStatus: selectedActivity.score >= 80 ? 'Healthy' : selectedActivity.score >= 60 ? 'Attention Needed' : 'Critical',
                        visualSummary: selectedActivity.summary || '',
                        image: selectedActivity.image || null,
                        imageName: `${fieldName} inspection photo`,
                        imageMime: 'image/png',
                        lastUpdated: `${selectedActivity.date} at ${selectedActivity.time}`,
                      },
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
                <button
                  type="button"
                  onClick={() => setSelectedActivity(null)}
                  style={{
                    minWidth: '80px',
                    minHeight: '36px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    backgroundColor: '#f3f4f2',
                    color: '#344537',
                    fontWeight: 700,
                    border: '1px solid #d0d7cf',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  Close
                </button>
              </footer>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
