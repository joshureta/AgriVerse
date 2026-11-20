import { useEffect, useRef, useState } from 'react'
import { ChevronDown, FileDown, FileText } from 'lucide-react'
import { downloadDashboardReportPdf } from '../lib/dashboardReportPdf.js'
import { loadDashboardReport, loadReportFields } from '../services/adminDashboard.js'

const reportTypes = [
  { value: 'harvest', label: 'Harvest & Yield', fields: true },
  { value: 'sales', label: 'Sales & Orders' },
  { value: 'inventory', label: 'Inventory & Stock' },
  { value: 'environment', label: 'Environmental Monitoring', fields: true },
  { value: 'delivery', label: 'Delivery Performance' },
  { value: 'history', label: 'Historical Farm Trends', fields: true },
]

export default function DashboardReportMenu() {
  const menuRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('harvest')
  const [period, setPeriod] = useState('month')
  const [field, setField] = useState('all')
  const [fields, setFields] = useState([])
  const [fieldsError, setFieldsError] = useState('')
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const fieldReport = reportTypes.find((report) => report.value === type)?.fields

  useEffect(() => {
    if (!open) return undefined
    function closeOnOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open || fields.length || fieldsError) return
    let cancelled = false
    loadReportFields().then((items) => {
      if (!cancelled) setFields(items)
    }).catch((requestError) => {
      if (!cancelled) setFieldsError(requestError.message)
    })
    return () => { cancelled = true }
  }, [open, fields.length, fieldsError])

  async function generateReport(event) {
    event.preventDefault()
    setError('')
    setGenerating(true)
    try {
      const report = await loadDashboardReport({ type, period, field: fieldReport ? field : 'all' })
      await downloadDashboardReportPdf(report)
      setOpen(false)
    } catch (requestError) {
      setError(requestError.message || 'Unable to generate the PDF report.')
    } finally {
      setGenerating(false)
    }
  }

  return <div className="dashboard-report-menu" ref={menuRef}>
    <button
      type="button"
      className="dashboard-report-trigger"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="dashboard-report-popover"
      onClick={() => { setOpen((value) => !value); setError('') }}
    >
      <span className="dashboard-report-trigger-main">
        <span className="dashboard-report-trigger-icon"><FileText size={19} aria-hidden="true" /></span>
        <span>Generate Report</span>
      </span>
      <ChevronDown className="dashboard-report-trigger-chevron" size={18} aria-hidden="true" />
    </button>
    {open && <section className="dashboard-report-popover" id="dashboard-report-popover" role="dialog" aria-label="Generate report">
      <form onSubmit={generateReport}>
        <label htmlFor="dashboard-report-type">Report type</label>
        <select id="dashboard-report-type" value={type} onChange={(event) => {
          setType(event.target.value)
          setPeriod(event.target.value === 'history' ? 'last6' : 'month')
          setField('all')
          setError('')
        }}>
          {reportTypes.map((report) => <option value={report.value} key={report.value}>{report.label}</option>)}
        </select>
        <label htmlFor="dashboard-report-period">Date range</label>
        <select id="dashboard-report-period" value={period} onChange={(event) => setPeriod(event.target.value)}>
          {type === 'history' ? <>
            <option value="last3">Last 3 months</option>
            <option value="last6">Last 6 months</option>
            <option value="last12">Last 12 months</option>
          </> : <>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </>}
        </select>
        {fieldReport && <>
          <label htmlFor="dashboard-report-field">Field</label>
          <select id="dashboard-report-field" value={field} onChange={(event) => setField(event.target.value)}>
            <option value="all">All fields</option>
            {fields.map((item) => <option value={item.field_name} key={item.id}>{item.field_name}</option>)}
          </select>
          {fieldsError && <small className="dashboard-report-help">Field choices unavailable. You can still report on all fields.</small>}
        </>}
        {error && <p className="dashboard-report-error" role="alert">{error}</p>}
        <button type="submit" className="dashboard-report-submit" disabled={generating}>
          <FileDown size={16} aria-hidden="true" /> {generating ? 'Generating…' : 'Generate PDF'}
        </button>
      </form>
    </section>}
  </div>
}
