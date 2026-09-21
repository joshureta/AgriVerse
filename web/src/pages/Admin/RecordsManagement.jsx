import { useEffect, useMemo, useState } from 'react'
import { Download, Eye, Search, X } from 'lucide-react'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/task-schedule-management.css'
import '../../styles/records-management.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const PAGE_SIZE = 10
const EXPORT_PAGE_SIZE = 200
const SEARCH_DELAY_MS = 300

async function readAccessToken(refresh = false) {
  const result = refresh ? await supabase.auth.refreshSession() : await supabase.auth.getSession()
  if (result.error) throw new Error(result.error.message)
  const token = result.data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')
  return token
}

async function apiRequest(path, options = {}, retry = true) {
  const token = await readAccessToken()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    })
    if (response.status === 401 && retry) {
      await readAccessToken(true)
      return apiRequest(path, options, false)
    }
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`)
    return body
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The backend did not respond. Make sure it is running on port 5000.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

function requestKeyOf(categoryId, search, page, activity) {
  return `${categoryId}|${search}|${page}|${activity}`
}

function recordsPath({ categoryId, search, page, pageSize, activity }) {
  const params = new URLSearchParams({ category_id: String(categoryId), search, page: String(page), pageSize: String(pageSize) })
  if (activity) params.set('activity_type', activity)
  return `/api/admin/tasks/records?${params}`
}

// Export CSV needs every matching record, not just the visible page, so walk all pages.
async function loadAllRecordTasks(categoryId, search, activity) {
  const tasks = []
  let page = 1
  let totalPages = 1
  do {
    const data = await apiRequest(recordsPath({ categoryId, search, page, pageSize: EXPORT_PAGE_SIZE, activity }))
    tasks.push(...(Array.isArray(data.tasks) ? data.tasks : []))
    totalPages = data.pagination?.totalPages || 1
    page += 1
  } while (page <= totalPages)
  return tasks
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function formatDeliveryWindow(start, end) {
  if (!start || !end) return 'Schedule pending'
  const formatter = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const timeFormatter = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' })
  return `${formatter.format(new Date(start))} – ${timeFormatter.format(new Date(end))}`
}

function insightText(value, empty = '—') {
  return String(value ?? '').trim() || empty
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function ProofPhoto({ url, alt }) {
  if (!url) return <p>No photo proof was attached.</p>
  return (
    <a className="records-proof" href={url} target="_blank" rel="noreferrer" aria-label={`Open ${alt} full size`}>
      <img src={url} alt={alt} loading="lazy" />
    </a>
  )
}

function TaskModalHeader({ title, onClose, tag = 'Farm records' }) {
  return (
    <header className="task-dialog-header">
      <div>
        <p>{tag}</p>
        <h2>{title}</h2>
      </div>
      {onClose && (
        <button className="task-modal-header-close" type="button" onClick={onClose} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </header>
  )
}

// Real harvest counts, reported by the worker and approved by admin (worker-tasks.js / admin-tasks.js).
function harvestCounts(task) {
  const orDash = (value) => (value === null || value === undefined ? '—' : value)
  return {
    small: orDash(task.harvest_small_count),
    medium: orDash(task.harvest_medium_count),
    large: orDash(task.harvest_large_count),
    damaged: orDash(task.harvest_damaged_count),
  }
}

// What the worker entered: inspection answers on completion, supplies taken when the task started.
function detailText(task, key) { return task.details?.[key] || '—' }
function suppliesName(task) { return task.inventory_item?.item_name || '—' }
function suppliesAmount(task) {
  if (!task.inventory_quantity) return '—'
  return `${task.inventory_quantity} ${task.inventory_item?.unit?.abbreviation || ''}`.trim()
}

function categoryKind(categoryName, activityType) {
  const key = String(categoryName || '').trim().toLowerCase()
  if (key === 'planting') return 'planting'
  if (key === 'fertilization') return 'fertilization'
  if (key === 'irrigation') return 'irrigation'
  if (key === 'monitoring') return 'inspection'
  if (key === 'pest & disease') return activityType === 'action' ? 'pestaction' : 'inspection'
  if (key === 'harvesting') return 'harvesting'
  if (key === 'weeding') return 'weeding'
  return 'generic'
}

function recordRow(task, kind) {
  const worker = task.assigned_worker?.full_name || 'Unassigned worker'
  const date = formatDate(task.completed_at)
  const insight = insightText(task.completion_notes)
  if (kind === 'planting') return [task.field, worker, date, insight]
  if (kind === 'fertilization') return [task.field, worker, date, suppliesName(task), suppliesAmount(task), insight]
  if (kind === 'irrigation') return [task.field, worker, date, insight]
  if (kind === 'inspection') return [task.field, worker, date, detailText(task, 'crop_condition'), detailText(task, 'pest_observed'), detailText(task, 'recommended_action'), insight]
  if (kind === 'pestaction') return [task.field, worker, date, suppliesName(task), suppliesAmount(task), insight]
  if (kind === 'harvesting') { const sizes = harvestCounts(task); return [task.field, worker, date, sizes.small, sizes.medium, sizes.large, sizes.damaged, insight] }
  if (kind === 'weeding') return [task.field, worker, date, insight]
  return [task.field, worker, formatDate(task.started_at), date, insight]
}

const RECORD_COLUMNS = {
  planting: ['FIELD', 'FARM WORKER', 'PLANTING DATE', 'INSIGHTS', 'ACTIONS'],
  fertilization: ['FIELD', 'FARM WORKER', 'APPLICATION DATE', 'FERTILIZER', 'AMOUNT USED', 'INSIGHTS', 'ACTIONS'],
  irrigation: ['FIELD', 'FARM WORKER', 'DATE & TIME', 'INSIGHTS', 'ACTIONS'],
  inspection: ['FIELD', 'ASSIGNED INSPECTOR', 'INSPECTION DATE', 'CROP CONDITION', 'PEST/DISEASE OBSERVED', 'RECOMMENDED ACTION', 'INSIGHTS', 'ACTIONS'],
  pestaction: ['FIELD', 'FARM WORKER', 'ACTION DATE', 'PESTICIDE', 'AMOUNT USED', 'INSIGHTS', 'ACTIONS'],
  harvesting: ['FIELD', 'FARM WORKER', 'HARVEST DATE', 'SMALL', 'MEDIUM', 'LARGE', 'DAMAGED', 'INSIGHTS', 'ACTIONS'],
  weeding: ['FIELD', 'FARM WORKER', 'DATE & TIME', 'INSIGHTS', 'ACTIONS'],
  generic: ['FIELD', 'FARM WORKER', 'DATE STARTED', 'DATE COMPLETED', 'INSIGHTS', 'ACTIONS'],
}

export default function RecordsManagement() {
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('')
  const [activityTab, setActivityTab] = useState('inspection')
  const [optionsState, setOptionsState] = useState({ loaded: false, error: '' })
  const [result, setResult] = useState({ key: '', tasks: [], total: 0, pages: 1, error: '' })
  const [deliveryOrders, setDeliveryOrders] = useState([])
  const [deliveryLoading, setDeliveryLoading] = useState(true)
  const [deliveryError, setDeliveryError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [modal, setModal] = useState(null)

  const isDeliveryTab = activeCategory === 'delivery'
  const activeCategoryName = useMemo(
    () => categories.find((category) => String(category.id) === String(activeCategory))?.category_name || '',
    [categories, activeCategory],
  )
  // Pest & Disease splits into Inspection and Action records, each with its own columns.
  const isPestAndDiseaseTab = activeCategoryName === 'Pest & Disease'
  const activityFilter = isPestAndDiseaseTab ? activityTab : ''
  // The loaded page is only valid for the category, search, and page it was requested with.
  const requestKey = requestKeyOf(activeCategory, debouncedSearch, page, activityFilter)

  useEffect(() => {
    let cancelled = false
    apiRequest('/api/admin/tasks/options')
      .then((data) => {
        if (cancelled) return
        const allCategories = Array.isArray(data.categories) ? data.categories : []
        setCategories(allCategories)
        setActiveCategory((current) => current === '' && allCategories.length ? allCategories[0].id : current)
        setOptionsState({ loaded: true, error: '' })
      })
      .catch((requestError) => { if (!cancelled) setOptionsState({ loaded: true, error: requestError.message }) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    apiRequest('/api/admin/deliveries/assigned-orders')
      .then((data) => { if (!cancelled) setDeliveryOrders(Array.isArray(data.orders) ? data.orders : []) })
      .catch((requestError) => { if (!cancelled) setDeliveryError(requestError.message) })
      .finally(() => { if (!cancelled) setDeliveryLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (isDeliveryTab || activeCategory === '') return undefined
    let cancelled = false
    const key = requestKeyOf(activeCategory, debouncedSearch, page, activityFilter)
    apiRequest(recordsPath({ categoryId: activeCategory, search: debouncedSearch, page, pageSize: PAGE_SIZE, activity: activityFilter }))
      .then((data) => {
        if (cancelled) return
        const total = data.pagination?.total || 0
        const pages = data.pagination?.totalPages || 1
        // The page no longer exists (records were removed), so step back to the last one.
        if (page > 1 && total > 0 && page > pages) {
          setPage(pages)
          return
        }
        setResult({ key, tasks: Array.isArray(data.tasks) ? data.tasks : [], total, pages, error: '' })
      })
      .catch((requestError) => { if (!cancelled) setResult({ key, tasks: [], total: 0, pages: 1, error: requestError.message }) })
    return () => { cancelled = true }
  }, [activeCategory, debouncedSearch, page, activityFilter, isDeliveryTab])

  function selectCategory(id) {
    setActiveCategory(id)
    setPage(1)
    setExportError('')
  }

  function selectActivity(value) {
    setActivityTab(value)
    setPage(1)
    setExportError('')
  }

  function changeSearch(value) {
    setSearch(value)
    setPage(1)
  }

  const taskLoading = activeCategory === '' ? !optionsState.loaded : result.key !== requestKey
  const loading = isDeliveryTab ? deliveryLoading : taskLoading
  const error = isDeliveryTab ? deliveryError : (optionsState.error || (taskLoading ? '' : result.error) || exportError)

  const filteredDeliveries = useMemo(() => {
    if (!isDeliveryTab) return []
    const term = search.trim().toLowerCase()
    return deliveryOrders
      .filter((order) => !term || `${order.order_number} ${order.assigned_driver?.full_name || ''} ${order.delivery_full_name || ''}`.toLowerCase().includes(term))
      .sort((first, second) => new Date(second.delivery_scheduled_at || 0) - new Date(first.delivery_scheduled_at || 0))
  }, [deliveryOrders, search, isDeliveryTab])

  const recordCount = isDeliveryTab ? filteredDeliveries.length : result.total
  const totalPages = isDeliveryTab ? Math.max(1, Math.ceil(filteredDeliveries.length / PAGE_SIZE)) : result.pages
  const paginated = isDeliveryTab ? filteredDeliveries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : result.tasks

  const kind = activeCategory === '' ? 'generic' : categoryKind(activeCategoryName, activityFilter)
  const columns = RECORD_COLUMNS[kind]
  const firstVisibleRecord = recordCount ? (page - 1) * PAGE_SIZE + 1 : 0
  const lastVisibleRecord = Math.min(page * PAGE_SIZE, recordCount)

  async function generateReport() {
    if (isDeliveryTab) {
      downloadCsv('delivery-records.csv', [
        ['Driver', 'Order Number', 'Customer', 'Delivery Address', 'Delivery Window', 'Status', 'Insights'],
        ...filteredDeliveries.map((order) => [
          order.assigned_driver?.full_name || 'Unassigned driver',
          order.order_number,
          order.delivery_full_name || '',
          [order.delivery_barangay, order.delivery_city_municipality, order.delivery_province, order.delivery_region].filter(Boolean).join(', '),
          formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at),
          (order.delivery_assignment_status || 'assigned').replaceAll('_', ' '),
          insightText(order.delivery_proof_notes),
        ]),
      ])
      return
    }
    setExporting(true)
    setExportError('')
    try {
      const exportTasks = await loadAllRecordTasks(activeCategory, search.trim(), activityFilter)
      downloadCsv('farm-records.csv', [columns.slice(0, -1), ...exportTasks.map((task) => recordRow(task, kind))])
    } catch (requestError) {
      setExportError(requestError.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="admin-dashboard task-schedule-page records-page">
      <AdminSidebar active="records" />
      <section className="admin-workspace">
        <AdminTopbar />
        <div className="task-schedule-content records-content">
          <header className="task-page-heading records-page-heading">
            <div>
              <h1>Farm records</h1>
              <p>Review farm activities and delivery history in one place.</p>
            </div>
            <button type="button" onClick={generateReport} disabled={loading || exporting || !recordCount}>
              <Download aria-hidden="true" size={16} /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </header>

          <section className="tasks-panel records-panel">
            <div className="records-category-section">
              <nav className="task-management-tabs records-tabs" aria-label="Record category">
                {categories.map((category) => (
                  <button
                    className={String(activeCategory) === String(category.id) ? 'is-active' : ''}
                    type="button"
                    key={category.id}
                    onClick={() => selectCategory(category.id)}
                  >
                    {category.category_name}
                  </button>
                ))}
                <button className={isDeliveryTab ? 'is-active' : ''} type="button" onClick={() => selectCategory('delivery')}>Delivery</button>
              </nav>
              {isPestAndDiseaseTab && (
                <div className="records-subtabs" role="tablist" aria-label="Pest and disease activity">
                  {[['inspection', 'Inspection'], ['action', 'Action']].map(([value, label]) => (
                    <button type="button" role="tab" aria-selected={activityTab === value} className={activityTab === value ? 'is-active' : ''} key={value} onClick={() => selectActivity(value)}>{label}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="tasks-toolbar records-toolbar">
              <label className="task-search records-search">
                <Search aria-hidden="true" size={17} />
                <span className="sr-only">Search records</span>
                <input type="search" value={search} onChange={(event) => changeSearch(event.target.value)} placeholder="Search field, worker, order, or customer…" />
                {search && <button type="button" onClick={() => changeSearch('')} aria-label="Clear search"><X aria-hidden="true" size={15} /></button>}
              </label>
            </div>

            {error && <div className="tasks-error" role="alert">{error}</div>}
            <div className="tasks-table-wrap">
              <table className="tasks-table" style={{ tableLayout: 'auto' }}>
                <thead>
                  {isDeliveryTab
                    ? <tr><th>DRIVER</th><th>ORDER NUMBER</th><th>CUSTOMER</th><th>DELIVERY ADDRESS</th><th>DELIVERY WINDOW</th><th>STATUS</th><th>INSIGHTS</th><th>ACTIONS</th></tr>
                    : <tr>{columns.map((label) => <th key={label}>{label}</th>)}</tr>}
                </thead>
                <tbody>
                  {loading ? <tr><td className="tasks-empty" colSpan={isDeliveryTab ? 8 : columns.length}>Loading records…</td></tr> : <>
                    {!paginated.length && <tr><td className="tasks-empty" colSpan={isDeliveryTab ? 8 : columns.length}>No records found.</td></tr>}
                    {isDeliveryTab
                      ? paginated.map((order) => (
                        <tr key={`delivery-${order.id}`}>
                          <td>{order.assigned_driver?.full_name || 'Unassigned driver'}</td>
                          <td><strong>{order.order_number}</strong></td>
                          <td>{order.delivery_full_name}</td>
                          <td>{[order.delivery_barangay, order.delivery_city_municipality, order.delivery_province, order.delivery_region].filter(Boolean).join(', ')}</td>
                          <td>{formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at)}</td>
                          <td><span className={`task-status status-${order.delivery_assignment_status || 'assigned'}`}>{(order.delivery_assignment_status || 'assigned').replaceAll('_', ' ')}</span></td>
                          <td><small className="records-insight" title={insightText(order.delivery_proof_notes, '')}>{insightText(order.delivery_proof_notes)}</small></td>
                          <td><div className="task-actions"><button className="task-view" type="button" onClick={() => setModal({ mode: 'view-delivery', order })} aria-label={`View delivery ${order.order_number}`}><Eye aria-hidden="true" size={14} /> View</button></div></td>
                        </tr>
                      ))
                      : paginated.map((task) => {
                        const row = recordRow(task, kind)
                        return (
                          <tr key={`task-${task.id}`}>
                            {row.map((cell, index) => <td key={index}>{index === row.length - 1 ? <small className="records-insight" title={cell === '—' ? undefined : cell}>{cell}</small> : cell}</td>)}
                            <td><div className="task-actions"><button className="task-view" type="button" onClick={() => setModal({ mode: 'view-task', task, kind })} aria-label={`View ${kind} record`}><Eye aria-hidden="true" size={14} /> View</button></div></td>
                          </tr>
                        )
                      })}
                  </>}
                </tbody>
              </table>
            </div>

            <footer className="task-pagination">
              <span>Showing {firstVisibleRecord}–{lastVisibleRecord} of {recordCount}</span>
              <div>
                <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>← Previous</button>
                <strong>{page} / {totalPages}</strong>
                <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next →</button>
              </div>
            </footer>
          </section>
        </div>
      </section>

      {modal?.mode === 'view-task' && <div className="task-modal-backdrop">
        <section className="task-reference-modal view-task-modal" role="dialog" aria-modal="true" aria-labelledby="view-record-title">
          <TaskModalHeader title="View Record" onClose={() => setModal(null)} />
          <div className="task-reference-body task-view-body">
            <div className="task-view-grid">
              <div className="task-view-tile">
                <span className="task-view-tile-label">Category</span>
                <strong className="task-view-tile-value">{modal.task.category}</strong>
              </div>
              <div className="task-view-tile">
                <span className="task-view-tile-label">Status</span>
                <div>
                  <span className={`task-status-badge status-${modal.task.status}`}>{modal.task.status_label}</span>
                </div>
              </div>
              <div className="task-view-tile">
                <span className="task-view-tile-label">{modal.kind === 'inspection' ? 'Assigned Inspector' : 'Farm Worker'}</span>
                <strong className="task-view-tile-value">{modal.task.assigned_worker?.full_name || 'Unassigned worker'}</strong>
              </div>
              <div className="task-view-tile">
                <span className="task-view-tile-label">Field</span>
                <strong className="task-view-tile-value">{modal.task.field}</strong>
              </div>
              {modal.task.activity_type && <div className="task-view-tile"><span className="task-view-tile-label">Activity</span><strong className="task-view-tile-value">{modal.task.activity_type === 'action' ? 'Action' : 'Inspection'}</strong></div>}
              {modal.kind === 'fertilization' && <><div className="task-view-tile"><span className="task-view-tile-label">Fertilizer</span><strong className="task-view-tile-value">{suppliesName(modal.task)}</strong></div><div className="task-view-tile"><span className="task-view-tile-label">Amount Used</span><strong className="task-view-tile-value">{suppliesAmount(modal.task)}</strong></div></>}
              {modal.kind === 'pestaction' && <><div className="task-view-tile"><span className="task-view-tile-label">Pesticide</span><strong className="task-view-tile-value">{suppliesName(modal.task)}</strong></div><div className="task-view-tile"><span className="task-view-tile-label">Amount Used</span><strong className="task-view-tile-value">{suppliesAmount(modal.task)}</strong></div></>}
              {modal.kind === 'inspection' && <><div className="task-view-tile"><span className="task-view-tile-label">Crop Condition</span><strong className="task-view-tile-value">{detailText(modal.task, 'crop_condition')}</strong></div><div className="task-view-tile"><span className="task-view-tile-label">Pest/Disease Observed</span><strong className="task-view-tile-value">{detailText(modal.task, 'pest_observed')}</strong></div><div className="task-view-tile task-view-tile-full"><span className="task-view-tile-label">Recommended Action</span><strong className="task-view-tile-value">{detailText(modal.task, 'recommended_action')}</strong></div></>}
              {modal.kind === 'harvesting' && <><div className="task-view-tile"><span className="task-view-tile-label">Small / Medium / Large</span><strong className="task-view-tile-value">{harvestCounts(modal.task).small} / {harvestCounts(modal.task).medium} / {harvestCounts(modal.task).large}</strong></div><div className="task-view-tile"><span className="task-view-tile-label">Damaged</span><strong className="task-view-tile-value">{harvestCounts(modal.task).damaged} damaged</strong></div></>}
              <div className="task-view-tile">
                <span className="task-view-tile-label">Date Started</span>
                <strong className="task-view-tile-value">{formatDate(modal.task.started_at)}</strong>
              </div>
              <div className="task-view-tile">
                <span className="task-view-tile-label">Date Completed</span>
                <strong className="task-view-tile-value">{formatDate(modal.task.completed_at)}</strong>
              </div>
            </div>
            <section className="task-view-description"><span>Insights</span><p>{insightText(modal.task.completion_notes, 'No insights were added.')}</p></section>
            <section className="task-view-description"><span>Photo proof</span><ProofPhoto url={modal.task.harvest_proof_image_url || modal.task.completion_proof_image_url} alt="Photo proof of completed work" /></section>
          </div>
        </section>
      </div>}

      {modal?.mode === 'view-delivery' && <div className="task-modal-backdrop">
        <section className="task-reference-modal view-task-modal" role="dialog" aria-modal="true" aria-labelledby="view-delivery-record-title">
          <TaskModalHeader title="View Delivery Record" tag="Delivery records" onClose={() => setModal(null)} />
          <div className="task-reference-body task-view-body">
            <div className="task-view-grid">
              <div className="task-view-tile">
                <span className="task-view-tile-label">Order Number</span>
                <strong className="task-view-tile-value">{modal.order.order_number}</strong>
              </div>
              <div className="task-view-tile">
                <span className="task-view-tile-label">Delivery Status</span>
                <div>
                  <span className={`task-status-badge status-${modal.order.delivery_assignment_status || 'assigned'}`}>{(modal.order.delivery_assignment_status || 'assigned').replaceAll('_', ' ')}</span>
                </div>
              </div>
              <div className="task-view-tile">
                <span className="task-view-tile-label">Driver</span>
                <strong className="task-view-tile-value">{modal.order.assigned_driver?.full_name || 'Unassigned driver'}</strong>
              </div>
              <div className="task-view-tile">
                <span className="task-view-tile-label">Customer</span>
                <strong className="task-view-tile-value">{modal.order.delivery_full_name || 'Not provided'}</strong>
              </div>
              <div className="task-view-tile task-view-tile-full">
                <span className="task-view-tile-label">Delivery Window</span>
                <strong className="task-view-tile-value">{formatDeliveryWindow(modal.order.delivery_scheduled_at, modal.order.delivery_window_end_at)}</strong>
              </div>
            </div>
            <section className="task-view-description"><span>Delivery Address</span><p>{[modal.order.delivery_barangay, modal.order.delivery_city_municipality, modal.order.delivery_province, modal.order.delivery_region].filter(Boolean).join(', ') || 'No delivery address provided.'}</p></section>
            <section className="task-view-description"><span>Insights</span><p>{insightText(modal.order.delivery_proof_notes, 'No insights were added.')}</p></section>
            <section className="task-view-description"><span>Photo proof</span><ProofPhoto url={modal.order.delivery_proof_image_url} alt="Proof of delivery" /></section>
          </div>
        </section>
      </div>}
    </main>
  )
}
