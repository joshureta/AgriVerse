import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/task-schedule-management.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const PAGE_SIZE = 10

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

function TaskModalHeader({ title }) {
  return <header className="task-dialog-header"><div><p>Farm records</p><h2>{title}</h2></div></header>
}

// Mock data generators — these fields aren't tracked in the database yet.
// They're deterministic per task/order id so the mockup looks realistic on reload.
function pick(seed, options) { return options[Math.abs(seed) % options.length] }
const FERTILIZER_TYPES = ['Organic Compost', 'Urea 46-0-0', 'Complete 14-14-14', 'Potassium Sulfate']
const APPLICATION_METHODS = ['Foliar Spray', 'Soil Application', 'Fertigation']
const CROP_CONDITIONS = ['Healthy', 'Mild nutrient stress', 'Recovering', 'Healthy']
const PEST_OBSERVATIONS = ['None observed', 'Mealybug wilt (early stage)', 'Minor leaf spot', 'None observed']
const RECOMMENDED_ACTIONS = ['Continue routine monitoring', 'Apply targeted pesticide next visit', 'Improve field drainage', 'Continue routine monitoring']
const GRADES = ['Grade A', 'Grade B', 'Grade A', 'Grade C']
const MAINTENANCE_TYPES = ['Sucker Removal', 'Leaf Pruning', 'Mulching', 'Staking / Support']
const POST_HARVEST_PROCESSES = ['Sorting & Grading', 'Washing', 'Packing', 'Cold Storage']
const INSIGHT_NOTES = [
  'Task completed without issues.',
  'Minor delay due to weather, otherwise smooth.',
  'Required extra hands to finish on time.',
  'Everything went as planned.',
]
const DELIVERY_INSIGHTS = [
  'Delivered on time, customer satisfied.',
  'Slight delay due to traffic.',
  'Left with neighbor per customer instructions.',
  'Smooth delivery, no issues.',
]

function mockNumberOfPlants(task) { return 80 + (Math.abs(task.id * 37) % 420) }
function mockFertilizerType(task) { return pick(task.id, FERTILIZER_TYPES) }
function mockQuantityApplied(task) { return `${5 + (Math.abs(task.id * 3) % 40)} kg` }
function mockApplicationMethod(task) { return pick(task.id + 3, APPLICATION_METHODS) }

// Sample fertilization records — shown only when no real Fertilization tasks exist yet,
// so the layout can be reviewed before any real task uses this category.
const FERTILIZATION_SAMPLES = [
  { id: -101, field: 'Field A', assigned_worker: { full_name: 'batman' }, schedule_start: '2026-08-18T07:00:00+08:00', status: 'completed', status_label: 'Completed', category: 'Fertilization', description: null, started_at: '2026-08-18T07:05:00+08:00', completed_at: '2026-08-18T08:10:00+08:00' },
  { id: -102, field: 'Field B', assigned_worker: { full_name: 'Aldrich Kawaguchi' }, schedule_start: '2026-08-21T07:30:00+08:00', status: 'completed', status_label: 'Completed', category: 'Fertilization', description: null, started_at: '2026-08-21T07:32:00+08:00', completed_at: '2026-08-21T08:40:00+08:00' },
  { id: -103, field: 'Field C', assigned_worker: { full_name: 'spiderman' }, schedule_start: '2026-08-24T08:00:00+08:00', status: 'pending', status_label: 'Pending', category: 'Fertilization', description: null, started_at: null, completed_at: null },
]
function mockCropCondition(task) { return pick(task.id, CROP_CONDITIONS) }
function mockPestObserved(task) { return pick(task.id + 1, PEST_OBSERVATIONS) }
function mockRecommendedAction(task) { return pick(task.id + 2, RECOMMENDED_ACTIONS) }
function mockGrade(task) { return pick(task.id, GRADES) }
function mockMaintenanceType(task) { return pick(task.id, MAINTENANCE_TYPES) }
function mockPlantsCovered(task) { return 40 + (Math.abs(task.id * 11) % 260) }
function mockProcessType(task) { return pick(task.id, POST_HARVEST_PROCESSES) }
function mockQuantityProcessed(task) { return `${20 + (Math.abs(task.id * 13) % 180)} pcs` }
function mockHarvestSizes(task) {
  const base = 10 + (Math.abs(task.id * 7) % 40)
  return { small: base, medium: base + 12, large: Math.max(0, base - 4), damaged: Math.abs(task.id) % 5 }
}
function mockInsight(task) { return pick(task.id, INSIGHT_NOTES) }
function mockDeliveryInsight(order) { return pick(order.id, DELIVERY_INSIGHTS) }

function categoryKind(categoryName) {
  const key = String(categoryName || '').trim().toLowerCase()
  if (key === 'planting') return 'planting'
  if (key === 'fertilization') return 'fertilization'
  if (key === 'irrigation') return 'irrigation'
  if (key === 'monitoring' || key === 'pest & disease') return 'inspection'
  if (key === 'harvesting') return 'harvesting'
  if (key === 'weeding') return 'weeding'
  if (key === 'crop maintenance') return 'maintenance'
  if (key === 'post-harvest' || key === 'post harvest') return 'postharvest'
  return 'generic'
}

function recordRow(task, kind) {
  const worker = task.assigned_worker?.full_name || 'Unassigned worker'
  const date = formatDate(task.schedule_start)
  if (kind === 'planting') return [task.field, worker, date, mockNumberOfPlants(task), mockInsight(task)]
  if (kind === 'fertilization') return [task.field, worker, date, mockFertilizerType(task), mockQuantityApplied(task), mockApplicationMethod(task), mockInsight(task)]
  if (kind === 'irrigation') return [task.field, worker, date, mockInsight(task)]
  if (kind === 'inspection') return [task.field, worker, date, mockCropCondition(task), mockPestObserved(task), mockRecommendedAction(task), mockInsight(task)]
  if (kind === 'harvesting') { const sizes = mockHarvestSizes(task); return [task.field, worker, date, sizes.small, sizes.medium, sizes.large, sizes.damaged, mockGrade(task), mockInsight(task)] }
  if (kind === 'weeding') return [task.field, worker, date, mockInsight(task)]
  if (kind === 'maintenance') return [task.field, worker, date, mockMaintenanceType(task), mockPlantsCovered(task), mockInsight(task)]
  if (kind === 'postharvest') return [task.field, worker, date, mockProcessType(task), mockQuantityProcessed(task), mockInsight(task)]
  return [task.field, worker, formatDate(task.started_at), formatDate(task.completed_at), mockInsight(task)]
}

const RECORD_COLUMNS = {
  planting: ['FIELD', 'FARM WORKER', 'PLANTING DATE', 'NUMBER OF PLANTS', 'INSIGHTS', 'ACTIONS'],
  fertilization: ['FIELD', 'FARM WORKER', 'APPLICATION DATE', 'FERTILIZER TYPE', 'QUANTITY APPLIED', 'METHOD', 'INSIGHTS', 'ACTIONS'],
  irrigation: ['FIELD', 'FARM WORKER', 'DATE & TIME', 'INSIGHTS', 'ACTIONS'],
  inspection: ['FIELD', 'ASSIGNED INSPECTOR', 'INSPECTION DATE', 'CROP CONDITION', 'PEST/DISEASE OBSERVED', 'RECOMMENDED ACTION', 'INSIGHTS', 'ACTIONS'],
  harvesting: ['FIELD', 'FARM WORKER', 'HARVEST DATE', 'SMALL', 'MEDIUM', 'LARGE', 'DAMAGED', 'GRADE', 'INSIGHTS', 'ACTIONS'],
  weeding: ['FIELD', 'FARM WORKER', 'DATE & TIME', 'INSIGHTS', 'ACTIONS'],
  maintenance: ['FIELD', 'FARM WORKER', 'MAINTENANCE DATE', 'MAINTENANCE TYPE', 'PLANTS COVERED', 'INSIGHTS', 'ACTIONS'],
  postharvest: ['FIELD', 'FARM WORKER', 'PROCESS DATE', 'PROCESS TYPE', 'QUANTITY PROCESSED', 'INSIGHTS', 'ACTIONS'],
  generic: ['FIELD', 'FARM WORKER', 'DATE STARTED', 'DATE COMPLETED', 'INSIGHTS', 'ACTIONS'],
}

export default function RecordsManagement() {
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('')
  const [tasks, setTasks] = useState([])
  const [deliveryOrders, setDeliveryOrders] = useState([])
  const [statuses, setStatuses] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)

  const isDeliveryTab = activeCategory === 'delivery'

  const loadOptions = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/tasks/options')
      const allCategories = Array.isArray(data.categories) ? data.categories : []
      const visibleCategories = allCategories.filter((category) => category.category_name !== 'Post-Harvest')
      setCategories(visibleCategories)
      setActiveCategory((current) => current === '' && visibleCategories.length ? visibleCategories[0].id : current)
      setStatuses(Array.isArray(data.statuses) ? data.statuses : [])
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [])

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [taskData, deliveryData] = await Promise.all([
        apiRequest('/api/admin/tasks?pageSize=100'),
        apiRequest('/api/admin/deliveries/assigned-orders'),
      ])
      setTasks(Array.isArray(taskData.tasks) ? taskData.tasks : [])
      setDeliveryOrders(Array.isArray(deliveryData.orders) ? deliveryData.orders : [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadOptions() }, [loadOptions])
  useEffect(() => { loadRecords() }, [loadRecords])
  useEffect(() => { setPage(1) }, [activeCategory, statusFilter, search])

  const fertilizationCategoryId = useMemo(
    () => categories.find((category) => category.category_name === 'Fertilization')?.id,
    [categories],
  )

  const filteredTasks = useMemo(() => {
    if (isDeliveryTab) return []
    const term = search.trim().toLowerCase()
    const isFertilizationTab = fertilizationCategoryId != null && String(activeCategory) === String(fertilizationCategoryId)
    const sourceTasks = isFertilizationTab && !tasks.some((task) => String(task.category_id) === String(fertilizationCategoryId))
      ? FERTILIZATION_SAMPLES
      : tasks
    return sourceTasks
      .filter((task) => !activeCategory || isFertilizationTab || String(task.category_id) === String(activeCategory))
      .filter((task) => !statusFilter || task.status === statusFilter)
      .filter((task) => !term || `${task.field} ${task.assigned_worker?.full_name || ''} ${task.category}`.toLowerCase().includes(term))
      .sort((first, second) => new Date(second.schedule_start || second.created_at) - new Date(first.schedule_start || first.created_at))
  }, [tasks, activeCategory, statusFilter, search, isDeliveryTab, fertilizationCategoryId])

  const filteredDeliveries = useMemo(() => {
    if (!isDeliveryTab) return []
    const term = search.trim().toLowerCase()
    return deliveryOrders
      .filter((order) => !term || `${order.order_number} ${order.assigned_driver?.full_name || ''} ${order.delivery_full_name || ''}`.toLowerCase().includes(term))
      .sort((first, second) => new Date(second.delivery_scheduled_at || 0) - new Date(first.delivery_scheduled_at || 0))
  }, [deliveryOrders, search, isDeliveryTab])

  const records = isDeliveryTab ? filteredDeliveries : filteredTasks
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE))
  const paginated = useMemo(() => records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [records, page])

  const activeCategoryName = useMemo(
    () => categories.find((category) => String(category.id) === String(activeCategory))?.category_name || '',
    [categories, activeCategory],
  )
  const kind = activeCategory === '' ? 'generic' : categoryKind(activeCategoryName)
  const columns = RECORD_COLUMNS[kind]

  function generateReport() {
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
          mockDeliveryInsight(order),
        ]),
      ])
      return
    }
    downloadCsv('farm-records.csv', [columns.slice(0, -1), ...filteredTasks.map((task) => recordRow(task, kind))])
  }

  return (
    <main className="admin-dashboard task-schedule-page">
      <AdminSidebar active="records" />
      <section className="admin-workspace">
        <AdminTopbar />
        <div className="task-schedule-content">
          <header className="task-page-heading">
            <div>
              <h1>Farm Records Management</h1>
              <p style={{ margin: '3px 0 0', color: '#667568', fontSize: '13px', fontFamily: 'var(--sans)' }}>
                Review completed and ongoing farm activity and delivery history
              </p>
            </div>
            <button type="button" onClick={generateReport} disabled={loading || !records.length}>
              <FileText aria-hidden="true" size={15} /> Generate Report
            </button>
          </header>

          <section className="tasks-panel">
            <nav className="task-management-tabs" aria-label="Record category">
              {categories.map((category) => (
                <button
                  className={String(activeCategory) === String(category.id) ? 'is-active' : ''}
                  type="button"
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.category_name}
                </button>
              ))}
              <button className={isDeliveryTab ? 'is-active' : ''} type="button" onClick={() => setActiveCategory('delivery')}>Delivery</button>
            </nav>

            <div className="tasks-toolbar">
              <div className="task-filter">
                <button type="button" onClick={() => setFilterOpen((open) => !open)} aria-haspopup="listbox" aria-expanded={filterOpen} disabled={isDeliveryTab}>
                  <span>Filter by</span><i aria-hidden="true" />
                </button>
                {filterOpen && !isDeliveryTab && (
                  <div className="task-filter-menu" role="listbox" aria-label="Filter records by status">
                    <p>Filter by status</p>
                    {[{ id: 'all', code: '', status_name: 'All statuses' }, ...statuses].map((status) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={statusFilter === status.code}
                        className={statusFilter === status.code ? 'is-selected' : ''}
                        key={status.id}
                        onClick={() => { setStatusFilter(status.code); setFilterOpen(false) }}
                      >
                        <span>{status.status_name}</span>
                        {statusFilter === status.code && <i aria-hidden="true">✓</i>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <label className="task-search">
                <span className="sr-only">Search records</span>
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records" />
                <span aria-hidden="true" />
              </label>
            </div>

            {error && <div className="tasks-error" role="alert">{error}</div>}
            {!error && (
              <div className="tasks-error" role="status" style={{ color: '#8a6d1d', background: '#fff8e6', borderTopColor: '#f3dfa0' }}>
                Preview mode: Field/worker/dates are real. The category-specific columns (plant counts, fertilizer, inspection notes, harvest sizes, grade, insights) are mock sample data — this data isn't captured by the app yet.
              </div>
            )}

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
                          <td><small>{mockDeliveryInsight(order)}</small></td>
                          <td><div className="task-actions"><button type="button" onClick={() => setModal({ mode: 'view-delivery', order })}>View</button></div></td>
                        </tr>
                      ))
                      : paginated.map((task) => {
                        const row = recordRow(task, kind)
                        return (
                          <tr key={`task-${task.id}`}>
                            {row.map((cell, index) => <td key={index}>{index === row.length - 1 ? <small>{cell}</small> : cell}</td>)}
                            <td><div className="task-actions"><button type="button" onClick={() => setModal({ mode: 'view-task', task, kind })}>View</button></div></td>
                          </tr>
                        )
                      })}
                  </>}
                </tbody>
              </table>
            </div>

            <footer className="task-pagination">
              <span>{records.length} record{records.length === 1 ? '' : 's'}</span>
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
          <TaskModalHeader title="View Record" />
          <div className="task-reference-body task-view-body">
            <div className="task-dialog-grid">
              <div className="task-dialog-main task-view-section">
                <div className="task-view-item"><span>Category</span><strong>{modal.task.category}</strong></div>
                <div className="task-view-item"><span>{modal.kind === 'inspection' ? 'Assigned Inspector' : 'Farm Worker'}</span><strong>{modal.task.assigned_worker?.full_name || 'Unassigned worker'}</strong></div>
                <div className="task-view-item"><span>Field</span><strong>{modal.task.field}</strong></div>
                {modal.kind === 'planting' && <div className="task-view-item"><span>Number of Plants</span><strong>{mockNumberOfPlants(modal.task)}</strong></div>}
                {modal.kind === 'fertilization' && <><div className="task-view-item"><span>Fertilizer Type</span><strong>{mockFertilizerType(modal.task)}</strong></div><div className="task-view-item"><span>Quantity Applied</span><strong>{mockQuantityApplied(modal.task)}</strong></div><div className="task-view-item"><span>Application Method</span><strong>{mockApplicationMethod(modal.task)}</strong></div></>}
                {modal.kind === 'inspection' && <><div className="task-view-item"><span>Crop Condition</span><strong>{mockCropCondition(modal.task)}</strong></div><div className="task-view-item"><span>Pest/Disease Observed</span><strong>{mockPestObserved(modal.task)}</strong></div><div className="task-view-item"><span>Recommended Action</span><strong>{mockRecommendedAction(modal.task)}</strong></div></>}
                {modal.kind === 'harvesting' && <><div className="task-view-item"><span>Small / Medium / Large</span><strong>{mockHarvestSizes(modal.task).small} / {mockHarvestSizes(modal.task).medium} / {mockHarvestSizes(modal.task).large}</strong></div><div className="task-view-item"><span>Damaged</span><strong>{mockHarvestSizes(modal.task).damaged}</strong></div><div className="task-view-item"><span>Grade</span><strong>{mockGrade(modal.task)}</strong></div></>}
                {modal.kind === 'maintenance' && <><div className="task-view-item"><span>Maintenance Type</span><strong>{mockMaintenanceType(modal.task)}</strong></div><div className="task-view-item"><span>Plants Covered</span><strong>{mockPlantsCovered(modal.task)}</strong></div></>}
                {modal.kind === 'postharvest' && <><div className="task-view-item"><span>Process Type</span><strong>{mockProcessType(modal.task)}</strong></div><div className="task-view-item"><span>Quantity Processed</span><strong>{mockQuantityProcessed(modal.task)}</strong></div></>}
              </div>
              <div className="task-dialog-side task-view-section">
                <div className="task-view-item"><span>Status</span><strong className={`task-view-status status-${modal.task.status}`}>{modal.task.status_label}</strong></div>
                <div className="task-view-item"><span>Date Started</span><strong>{formatDate(modal.task.started_at)}</strong></div>
                <div className="task-view-item"><span>Date Completed</span><strong>{formatDate(modal.task.completed_at)}</strong></div>
              </div>
            </div>
            <section className="task-view-description"><span>Insights</span><p>{mockInsight(modal.task)}</p></section>
            <footer><button type="button" onClick={() => setModal(null)}>Close</button></footer>
          </div>
        </section>
      </div>}

      {modal?.mode === 'view-delivery' && <div className="task-modal-backdrop">
        <section className="task-reference-modal view-task-modal" role="dialog" aria-modal="true" aria-labelledby="view-delivery-record-title">
          <TaskModalHeader title="View Delivery Record" />
          <div className="task-reference-body task-view-body">
            <div className="task-dialog-grid">
              <div className="task-dialog-main task-view-section">
                <div className="task-view-item"><span>Order Number</span><strong>{modal.order.order_number}</strong></div>
                <div className="task-view-item"><span>Driver</span><strong>{modal.order.assigned_driver?.full_name || 'Unassigned driver'}</strong></div>
                <div className="task-view-item"><span>Customer</span><strong>{modal.order.delivery_full_name || 'Not provided'}</strong></div>
              </div>
              <div className="task-dialog-side task-view-section">
                <div className="task-view-item"><span>Delivery Window</span><strong>{formatDeliveryWindow(modal.order.delivery_scheduled_at, modal.order.delivery_window_end_at)}</strong></div>
                <div className="task-view-item"><span>Delivery Status</span><strong className={`task-view-status status-${modal.order.delivery_assignment_status || 'assigned'}`}>{(modal.order.delivery_assignment_status || 'assigned').replaceAll('_', ' ')}</strong></div>
              </div>
            </div>
            <section className="task-view-description"><span>Delivery Address</span><p>{[modal.order.delivery_barangay, modal.order.delivery_city_municipality, modal.order.delivery_province, modal.order.delivery_region].filter(Boolean).join(', ') || 'No delivery address provided.'}</p></section>
            <section className="task-view-description"><span>Insights</span><p>{mockDeliveryInsight(modal.order)}</p></section>
            <footer><button type="button" onClick={() => setModal(null)}>Close</button></footer>
          </div>
        </section>
      </div>}
    </main>
  )
}
