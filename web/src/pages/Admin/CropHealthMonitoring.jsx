import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ClipboardList,
  FileClock,
  ImageUp,
  Save,
  ScanSearch,
  Sprout,
} from 'lucide-react'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import pineappleFieldImage from '../../assets/buyer/pineapple-farm-story.png'
import '../../styles/admin-dashboard.css'
import '../../styles/monitoring.css'

const fieldReports = {
  'Field A': { score: 82, issues: ['Mealy bugs on left side', 'Yellow leaves (nutrient deficiency)'] },
  'Field B': { score: 91, issues: ['Minor leaf spotting'] },
  'Field C': { score: 76, issues: ['Low soil moisture', 'Early yellowing'] },
  'Field D': { score: 88, issues: ['No critical issues detected'] },
}

const initialActivities = [
  { date: 'June 12, 2026', time: '8:00 PM', score: 85 },
  { date: 'June 12, 2026', time: '8:00 PM', score: 82 },
  { date: 'June 12, 2026', time: '8:00 PM', score: 90 },
  { date: 'June 12, 2026', time: '8:00 PM', score: 50 },
]

export default function CropHealthMonitoring() {
  const uploadInput = useRef(null)
  const [activeField, setActiveField] = useState('Field A')
  const [previewUrl, setPreviewUrl] = useState(pineappleFieldImage)
  const [previewName, setPreviewName] = useState('Field A pineapple crop image')
  const [analyzing, setAnalyzing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activities, setActivities] = useState(initialActivities)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const report = fieldReports[activeField]

  useEffect(() => {
    if (!selectedActivity) return undefined

    function closeOnEscape(event) {
      if (event.key === 'Escape') setSelectedActivity(null)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selectedActivity])

  function handleUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
    setPreviewName(file.name)
    setSaved(false)
  }

  function handleAnalyze() {
    setAnalyzing(true)
    setSaved(false)
    window.setTimeout(() => setAnalyzing(false), 700)
  }

  function handleSave() {
    const now = new Date()
    setActivities((current) => [
      {
        date: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(now),
        time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(now),
        score: report.score,
      },
      ...current,
    ])
    setSaved(true)
  }

  return (
    <main className="admin-dashboard crop-health-page">
      <AdminSidebar active="crop-monitoring" />
      <section className="admin-workspace">
        <AdminTopbar />

        <div className="admin-content crop-health-content">
          <header className="crop-health-title">
            <span aria-hidden="true"><Sprout /></span>
            <h1>Crop Health Monitoring</h1>
          </header>

          <nav className="crop-field-tabs" aria-label="Select farm field">
            {Object.keys(fieldReports).map((field) => (
              <button
                className={field === activeField ? 'is-active' : ''}
                type="button"
                key={field}
                onClick={() => {
                  setActiveField(field)
                  setSaved(false)
                }}
                aria-pressed={field === activeField}
              >
                {field}
              </button>
            ))}
          </nav>

          <section className="crop-analysis-card">
            <div className="crop-analysis-actions">
              <div>
                <button className="crop-button is-primary" type="button" onClick={() => uploadInput.current?.click()}>
                  <ImageUp aria-hidden="true" /> Upload Image
                </button>
                <input ref={uploadInput} type="file" accept="image/*" onChange={handleUpload} hidden />
                <button className="crop-button" type="button" onClick={handleAnalyze} disabled={analyzing}>
                  <ScanSearch aria-hidden="true" /> {analyzing ? 'Analyzing…' : 'Analyze Image'}
                </button>
              </div>
              <button className="crop-button is-save" type="button" onClick={handleSave}>
                <Save aria-hidden="true" /> {saved ? 'Saved' : 'Save'}
              </button>
            </div>

            <div className="crop-preview">
              <strong>Image Preview</strong>
              <img src={previewUrl} alt={previewName} />
            </div>
          </section>

          <section className="crop-insight-grid">
            <article className="crop-info-card">
              <header><Activity aria-hidden="true" /><h2>Results</h2></header>
              <p className="crop-score">Health Score: <strong>{report.score}%</strong></p>
              <h3>Detected:</h3>
              <ul>{report.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
            </article>

            <article className="crop-info-card">
              <header><ClipboardList aria-hidden="true" /><h2>Recommendation</h2></header>
              <ul>
                <li>Apply pesticide to affected plants</li>
                <li>Add nitrogen-rich organic fiber</li>
              </ul>
            </article>
          </section>

          <section className="crop-activities-card">
            <header><FileClock aria-hidden="true" /><h2>Recent Activities</h2></header>
            <div className="crop-table-wrap">
              <table>
                <thead><tr><th>Date &amp; Time</th><th>Health Score</th><th>Detected Issues</th><th>Actions</th></tr></thead>
                <tbody>
                  {activities.slice(0, 4).map((activity, index) => (
                    <tr key={`${activity.date}-${activity.time}-${index}`}>
                      <td><strong>{activity.date}</strong><span>{activity.time}</span></td>
                      <td>{activity.score}%</td>
                      <td><ul>{report.issues.slice(0, 2).map((issue) => <li key={issue}>{issue}</li>)}</ul></td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedActivity({ ...activity, field: activeField })}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="crop-pagination">
            <span>Page 1</span>
            <nav aria-label="Activity pages">
              <button type="button">← Previous</button>
              <button className="is-current" type="button" aria-current="page">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">Next →</button>
            </nav>
          </footer>
        </div>
      </section>

      {selectedActivity && (
        <div
          className="crop-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedActivity(null)
          }}
        >
          <section
            className="crop-activity-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crop-activity-modal-title"
          >
            <header>
              <h2 id="crop-activity-modal-title">{selectedActivity.field}</h2>
              <p><strong>{selectedActivity.date}</strong><span>{selectedActivity.time}</span></p>
            </header>
            <div className="crop-modal-body">
              <img src={previewUrl} alt={`${selectedActivity.field} crop inspection`} />
              <p className="crop-modal-score">Health Score: <strong>{selectedActivity.score}%</strong></p>

              <h3>Detected:</h3>
              <div className="crop-modal-list-box">
                <ul>{report.issues.slice(0, 2).map((issue) => <li key={issue}>{issue}</li>)}</ul>
              </div>

              <h3>Recommendation:</h3>
              <div className="crop-modal-list-box">
                <ul>
                  <li>Apply pesticide</li>
                  <li>Add nitrogen fiber</li>
                </ul>
              </div>

              <button className="crop-modal-close" type="button" onClick={() => setSelectedActivity(null)} autoFocus>
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
