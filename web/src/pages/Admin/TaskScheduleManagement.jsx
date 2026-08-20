import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardPlus, Send } from 'lucide-react'
import completedTaskIcon from '../../assets/task-completed-icon-white.png'
import progressTaskIcon from '../../assets/task-progress-icon-white.png'
import totalTaskIcon from '../../assets/task-total-icon-white.png'
import workersTaskIcon from '../../assets/task-workers-icon-white.png'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/task-schedule-management.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const PAGE_SIZE = 4
const emptyForm = {
  assigned_worker_id: '', worker_category: '', category_id: '', field_id: '', priority_id: '', status_id: '',
  start_date: '', start_time: '07:00', end_time: '08:00', estimated_duration_minutes: '60', description: '',
}
const emptyOptions = {
  workers: [], categories: [], fields: [], priorities: [], statuses: [], scheduleStatuses: [],
}
const emptyDeliveryForm = { order_id: '', delivery_date: '', start_time: '07:00', end_time: '08:00' }
const workerCategoryLabels = {
  crop_management_worker: 'Crop Management Worker',
  driver: 'Driver',
}

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

function formatSchedule(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date)
}

function localDateParts(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { start_date: '', start_time: '' }
  const offset = date.getTimezoneOffset() * 60000
  const local = new Date(date.getTime() - offset).toISOString()
  return { start_date: local.slice(0, 10), start_time: local.slice(11, 16) }
}

function durationLabel(minutes) {
  if (minutes % 60 === 0) return `${minutes / 60} Hour${minutes === 60 ? '' : 's'}`
  return `${minutes} Minutes`
}

function minutesInWindow(startTime, endTime) {
  const [startHour, startMinute] = String(startTime || '').split(':').map(Number)
  const [endHour, endMinute] = String(endTime || '').split(':').map(Number)
  const start = startHour * 60 + startMinute
  const end = endHour * 60 + endMinute
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 420 || end > 1080 || end <= start) {
    throw new Error('Select a schedule between 7:00 AM and 6:00 PM, with an end time after the start time.')
  }
  return end - start
}

function ChecklistIcon() { return <ClipboardPlus aria-hidden="true" /> }

function SummaryCard({ label, value, icon, className = '' }) {
  return <article className={`task-summary-card ${className}`}><div><span>{label}</span><strong>{value}</strong></div><i aria-hidden="true">{icon}</i></article>
}

function TaskModalHeader({ title }) {
  return <header className="task-dialog-header"><div><p>Task scheduling</p><h2>{title}</h2></div></header>
}

export default function TaskScheduleManagement() {
  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [settingsValues, setSettingsValues] = useState({ categories: [], fields: [] })
  const [archivedSettings, setArchivedSettings] = useState({ categories: [], fields: [] })
  const [archiveType, setArchiveType] = useState('fields')
  const [options, setOptions] = useState(emptyOptions)
  const [summary, setSummary] = useState({ total: 0, inProgress: 0, completed: 0, availableWorkers: 0 })
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [settingsForm, setSettingsForm] = useState({ name: '', description: '' })
  const [form, setForm] = useState(emptyForm)
  const [deliveryForm, setDeliveryForm] = useState(emptyDeliveryForm)
  const [readyOrders, setReadyOrders] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const statusLabels = useMemo(
    () => Object.fromEntries((options.statuses || []).map((status) => [status.code, status.status_name])),
    [options.statuses],
  )
  const selectedWorker = useMemo(
    () => options.workers.find((worker) => worker.id === form.assigned_worker_id),
    [form.assigned_worker_id, options.workers],
  )
  const availableWorkerCategories = useMemo(
    () => [...new Set(options.workers.map((worker) => worker.worker_category).filter((category) => category && category !== 'seller'))],
    [options.workers],
  )
  const visibleWorkers = useMemo(
    () => options.workers.filter((worker) => !form.worker_category || worker.worker_category === form.worker_category),
    [form.worker_category, options.workers],
  )
  const assigningDriver = modal?.mode === 'add' && selectedWorker?.worker_category === 'driver'

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (search.trim()) params.set('search', search.trim())
    if (filter) params.set('status', filter)
    try {
      const data = await apiRequest(`/api/admin/tasks?${params}`)
      setTasks(Array.isArray(data.tasks) ? data.tasks : [])
      setSummary(data.summary || { total: 0, inProgress: 0, completed: 0, availableWorkers: 0 })
      setPagination(data.pagination || { total: 0, totalPages: 1 })
    } catch (requestError) {
      setTasks([])
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [filter, page, search])

  useEffect(() => {
    apiRequest('/api/admin/tasks/options')
      .then((data) => setOptions(Object.fromEntries(
        Object.keys(emptyOptions).map((key) => [key, Array.isArray(data?.[key]) ? data[key] : []]),
      )))
      .catch((requestError) => setError(requestError.message))
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const [categories, fields] = await Promise.all([
        apiRequest('/api/admin/lookups/task-categories'),
        apiRequest('/api/admin/lookups/fields'),
      ])
      setSettingsValues({ categories: categories.values || [], fields: fields.values || [] })
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [])

  const loadArchivedSettings = useCallback(async () => {
    try {
      const [categories, fields] = await Promise.all([
        apiRequest('/api/admin/lookups/task-categories?includeInactive=true'),
        apiRequest('/api/admin/lookups/fields?includeInactive=true'),
      ])
      setArchivedSettings({
        categories: (categories.values || []).filter((value) => !value.status),
        fields: (fields.values || []).filter((value) => !value.status),
      })
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'archive') loadArchivedSettings()
    else if (activeTab !== 'tasks') loadSettings()
  }, [activeTab, loadArchivedSettings, loadSettings])

  useEffect(() => {
    const delay = window.setTimeout(loadTasks, search ? 300 : 0)
    return () => window.clearTimeout(delay)
  }, [loadTasks, refreshKey, search])

  function openNewTask() {
    setError('')
    const initialWorker = options.workers.find((worker) => worker.worker_category !== 'driver') || options.workers[0]
    setForm({
      ...emptyForm,
      assigned_worker_id: initialWorker?.id || '',
      worker_category: initialWorker?.worker_category || '',
      category_id: options.categories[0]?.id || '',
      field_id: options.fields[0]?.id || '',
      priority_id: options.priorities[0]?.id || '',
      status_id: options.statuses.find((status) => status.code === 'pending')?.id || options.statuses[0]?.id || '',
    })
    setDeliveryForm(emptyDeliveryForm)
    apiRequest('/api/admin/deliveries/ready-orders')
      .then((data) => setReadyOrders(data.orders || []))
      .catch((requestError) => setError(requestError.message))
    setModal({ mode: 'add' })
  }

  function openEditTask(task) {
    setError('')
    setForm({
      assigned_worker_id: task.assigned_worker_id,
      worker_category: task.assigned_worker?.worker_category || '',
      category_id: task.category_id,
      field_id: task.field_id,
      priority_id: task.priority_id,
      status_id: task.status_id,
      ...localDateParts(task.schedule_start),
      end_time: String(task.schedule?.end_time || '').slice(0, 5) || '08:00',
      estimated_duration_minutes: String(task.estimated_duration_minutes),
      description: task.description || '',
    })
    setModal({ mode: 'edit', task })
  }

  async function saveTask(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const editing = modal.mode === 'edit'
    try {
      if (assigningDriver) {
        await apiRequest(`/api/admin/deliveries/${encodeURIComponent(deliveryForm.order_id)}/assign`, {
          method: 'POST',
          body: JSON.stringify({ driver_id: form.assigned_worker_id, ...deliveryForm }),
        })
        setModal(null)
        return
      }
      const estimatedDuration = minutesInWindow(form.start_time, form.end_time)
      await apiRequest(editing ? `/api/admin/tasks/${modal.task.id}` : '/api/admin/tasks', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({
          assigned_worker_id: form.assigned_worker_id,
          category_id: Number(form.category_id),
          field_id: Number(form.field_id),
          priority_id: Number(form.priority_id),
          status_id: Number(form.status_id),
          schedule_date: form.start_date,
          start_time: form.start_time,
          end_time: form.end_time,
          estimated_duration_minutes: estimatedDuration,
          description: form.description,
        }),
      })
      setModal(null)
      setPage(1)
      setRefreshKey((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  function openSettingModal(type, value = null) {
    setError('')
    setSettingsForm({ name: value?.[type === 'categories' ? 'category_name' : 'field_name'] || '', description: value?.description || '' })
    setModal({ mode: 'setting', type, value })
  }

  async function saveSetting(event) {
    event.preventDefault()
    const resource = modal.type === 'categories' ? 'task-categories' : 'fields'
    const nameKey = modal.type === 'categories' ? 'category_name' : 'field_name'
    setSaving(true)
    setError('')
    try {
      await apiRequest(`/api/admin/lookups/${resource}${modal.value ? `/${modal.value.id}` : ''}`, {
        method: modal.value ? 'PATCH' : 'POST',
        body: JSON.stringify({ [nameKey]: settingsForm.name, description: settingsForm.description }),
      })
      setModal(null)
      await loadSettings()
      apiRequest('/api/admin/tasks/options').then((data) => setOptions(Object.fromEntries(
        Object.keys(emptyOptions).map((key) => [key, Array.isArray(data?.[key]) ? data[key] : []]),
      ))).catch(() => {})
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function archiveSetting(type, value) {
    const resource = type === 'categories' ? 'task-categories' : 'fields'
    if (!window.confirm(`Archive ${value[type === 'categories' ? 'category_name' : 'field_name']}? Existing tasks will remain unchanged.`)) return
    setError('')
    try {
      await apiRequest(`/api/admin/lookups/${resource}/${value.id}`, { method: 'PATCH', body: JSON.stringify({ status: false }) })
      await Promise.all([loadSettings(), loadArchivedSettings()])
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function restoreSetting(type, value) {
    const resource = type === 'categories' ? 'task-categories' : 'fields'
    setError('')
    try {
      await apiRequest(`/api/admin/lookups/${resource}/${value.id}`, { method: 'PATCH', body: JSON.stringify({ status: true }) })
      await Promise.all([loadSettings(), loadArchivedSettings()])
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const settingsResource = activeTab === 'archive' ? archiveType : activeTab
  const settingsConfig = settingsResource === 'categories'
    ? { title: 'Task Categories', itemLabel: 'Category', resource: 'categories', nameKey: 'category_name', searchLabel: 'Search task categories', empty: 'No task categories found.' }
    : { title: 'Fields & Locations', itemLabel: 'Location', resource: 'fields', nameKey: 'field_name', searchLabel: 'Search fields and locations', empty: 'No fields or locations found.' }
  const settingsSearch = search.trim().toLowerCase()
  const settingsSource = activeTab === 'archive' ? archivedSettings : settingsValues
  const visibleSettings = activeTab === 'tasks' ? [] : settingsSource[settingsConfig.resource].filter((value) => !settingsSearch || `${value[settingsConfig.nameKey]} ${value.description || ''}`.toLowerCase().includes(settingsSearch))

  return (
    <main className="admin-dashboard task-schedule-page">
      <AdminSidebar active="tasks" />
      <section className="admin-workspace">
        <AdminTopbar />
        <div className="task-schedule-content">
          <header className="task-page-heading">
            <div><span className="task-heading-icon"><ChecklistIcon /></span><h1>Task Assignment &amp; Scheduling</h1></div>
          </header>

          <section className="task-summary-grid" aria-label="Task summary">
            <SummaryCard label="Total Task" value={summary.total} icon={<img src={totalTaskIcon} alt="" />} />
            <SummaryCard label="In Progress" value={summary.inProgress} icon={<img src={progressTaskIcon} alt="" />} />
            <SummaryCard label="Completed" value={summary.completed} icon={<img src={completedTaskIcon} alt="" />} />
            <SummaryCard label={<>Available<br />Workers</>} value={summary.availableWorkers} icon={<img src={workersTaskIcon} alt="" />} />
          </section>

          <section className="tasks-panel">
            <nav className="task-management-tabs" aria-label="Task management sections">
              <button className={activeTab === 'tasks' ? 'is-active' : ''} type="button" onClick={() => { setActiveTab('tasks'); setSearch(''); setPage(1) }}>All Tasks</button>
              <button className={activeTab === 'fields' ? 'is-active' : ''} type="button" onClick={() => { setActiveTab('fields'); setSearch('') }}>Fields &amp; Locations</button>
              <button className={activeTab === 'categories' ? 'is-active' : ''} type="button" onClick={() => { setActiveTab('categories'); setSearch('') }}>Task Categories</button>
              <button className={activeTab === 'archive' ? 'is-active' : ''} type="button" onClick={() => { setActiveTab('archive'); setSearch('') }}>Archived Items</button>
            </nav>
            {activeTab === 'tasks' ? <>
            <div className="tasks-toolbar">
              <label className="task-filter"><span className="sr-only">Filter tasks by status</span><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1) }}><option value="">Filter by</option>{options.statuses.map((status) => <option value={status.code} key={status.id}>{status.status_name}</option>)}</select><i aria-hidden="true" /></label>
              <label className="task-search"><span className="sr-only">Search tasks</span><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search tasks" /><span aria-hidden="true" /></label>
              <button className="assign-task-toolbar-button" type="button" onClick={openNewTask} disabled={!options.workers.length}><span>＋</span>Assign New Task</button>
            </div>
            {error && !modal && <div className="tasks-error" role="alert">{error}</div>}
            <div className="tasks-table-wrap">
              <table className="tasks-table">
                <thead><tr><th>ASSIGNED<br />WORKER</th><th>CATEGORY</th><th>FIELD</th><th>SCHEDULE</th><th>PRIORITY</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
                <tbody>{loading ? <tr><td className="tasks-empty" colSpan="7">Loading tasks…</td></tr> : tasks.length ? tasks.map((task) => <tr key={task.id}><td>{task.assigned_worker?.full_name || 'Unknown worker'}</td><td>{task.category}</td><td>{task.field}</td><td>{formatSchedule(task.schedule_start)}</td><td><span className={`task-priority priority-${task.priority}`}>{task.priority_label}</span></td><td><span className={`task-status status-${task.status}`}>{task.status_label || statusLabels[task.status]}</span></td><td><div className="task-actions"><button type="button" onClick={() => setModal({ mode: 'view', task })}>View</button><button className="task-edit" type="button" onClick={() => openEditTask(task)} aria-label={`Edit task assigned to ${task.assigned_worker?.full_name}`}>✎</button></div></td></tr>) : <tr><td className="tasks-empty" colSpan="7">No tasks found.</td></tr>}</tbody>
              </table>
            </div>
            <footer className="task-pagination"><span>{pagination.total} total task{pagination.total === 1 ? '' : 's'}</span><div><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>← Previous</button><strong>{page}</strong><button type="button" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next →</button></div></footer>
            </> : <>
              <div className="task-settings-toolbar">
                <label className="task-search"><span className="sr-only">{settingsConfig.searchLabel}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={settingsConfig.searchLabel} /><span aria-hidden="true" /></label>
                {activeTab === 'archive' ? <label className="task-archive-filter"><span>Show</span><select value={archiveType} onChange={(event) => { setArchiveType(event.target.value); setSearch('') }}><option value="fields">Archived Fields &amp; Locations</option><option value="categories">Archived Task Categories</option></select></label> : <button type="button" onClick={() => openSettingModal(settingsConfig.resource)}><span>＋</span>Add {settingsConfig.itemLabel}</button>}
              </div>
              {error && !modal && <div className="tasks-error" role="alert">{error}</div>}
              <div className="tasks-table-wrap">
                <table className={`tasks-table task-settings-table ${settingsResource === 'fields' ? 'field-settings-table' : ''}`}>
                  <thead><tr><th>{settingsConfig.itemLabel.toUpperCase()}</th>{settingsResource === 'categories' && <th>DESCRIPTION</th>}<th>STATUS</th><th>ACTIONS</th></tr></thead>
                  <tbody>{visibleSettings.length ? visibleSettings.map((value) => <tr key={value.id}><td><strong>{value[settingsConfig.nameKey]}</strong></td>{settingsResource === 'categories' && <td>{value.description || 'No description added'}</td>}<td><span className="task-status status-pending">{activeTab === 'archive' ? 'Archived' : 'Active'}</span></td><td><div className="task-actions">{activeTab === 'archive' ? <button type="button" onClick={() => restoreSetting(settingsConfig.resource, value)}>Restore</button> : <><button type="button" onClick={() => openSettingModal(settingsConfig.resource, value)}>Edit</button><button className="task-archive" type="button" onClick={() => archiveSetting(settingsConfig.resource, value)}>Archive</button></>}</div></td></tr>) : <tr><td className="tasks-empty" colSpan={settingsResource === 'categories' ? 4 : 3}>{activeTab === 'archive' ? `No archived ${settingsConfig.itemLabel.toLowerCase()}s found.` : settingsConfig.empty}</td></tr>}</tbody>
                </table>
              </div>
              <footer className="task-pagination"><span>{visibleSettings.length} {activeTab === 'archive' ? 'archived' : 'active'} {settingsConfig.itemLabel.toLowerCase()}{visibleSettings.length === 1 ? '' : 's'}</span></footer>
            </>}
          </section>
        </div>
      </section>

      {modal?.mode === 'view' && <div className="task-modal-backdrop">
        <section className="task-reference-modal view-task-modal" role="dialog" aria-modal="true" aria-labelledby="view-task-title">
          <TaskModalHeader title="View Task" />
          <div className="task-reference-body">
            <div className="task-dialog-grid">
              <div className="task-dialog-main">
                <label><span>Category</span><input value={modal.task.category} readOnly /></label>
                <label><span>Worker</span><input value={modal.task.assigned_worker?.full_name || ''} readOnly /></label>
                <label><span>Field</span><input value={modal.task.field} readOnly /></label>
              </div>
              <div className="task-dialog-side">
                <label><span>Priority Level</span><input value={modal.task.priority_label} readOnly /></label>
                <label><span>Status Level</span><input value={modal.task.status_label || statusLabels[modal.task.status]} readOnly /></label>
                <label><span>Start Date &amp; Time</span><div className="date-time-pair"><input value={localDateParts(modal.task.schedule_start).start_date} readOnly /><input value={localDateParts(modal.task.schedule_start).start_time} readOnly /></div></label>
                <label><span>Estimated Duration</span><input value={durationLabel(modal.task.estimated_duration_minutes)} readOnly /></label>
              </div>
            </div>
            <label className="task-description"><span>Description</span><textarea value={modal.task.description || ''} readOnly /></label>
            <footer><button type="button" onClick={() => setModal(null)}>Close</button></footer>
          </div>
        </section>
      </div>}

      {(modal?.mode === 'add' || modal?.mode === 'edit') && <div className="task-modal-backdrop">
        <section className="task-reference-modal assign-task-modal" role="dialog" aria-modal="true" aria-labelledby="assign-task-title">
          <TaskModalHeader title={assigningDriver ? 'Assign Delivery Order' : modal.mode === 'add' ? 'Assign New Task' : 'Edit Task'} />
          <form className="task-reference-body" onSubmit={saveTask}>
            {error && <div className="task-modal-error" role="alert">{error}</div>}
            <div className="task-dialog-grid">
              <div className="task-dialog-main">
                <label><span>Farm Worker Category</span><select value={form.worker_category} onChange={(event) => { const workerCategory = event.target.value; const firstWorker = options.workers.find((worker) => worker.worker_category === workerCategory); setForm({ ...form, worker_category: workerCategory, assigned_worker_id: firstWorker?.id || '' }) }} required><option value="" disabled>Select Worker Category</option>{availableWorkerCategories.map((category) => <option value={category} key={category}>{workerCategoryLabels[category] || category}</option>)}</select></label>
                <label><span>{assigningDriver ? 'Select Driver' : 'Select Worker'}</span><select value={form.assigned_worker_id} onChange={(event) => setForm({ ...form, assigned_worker_id: event.target.value })} required><option value="" disabled>{assigningDriver ? 'Select Driver' : 'Select Worker'}</option>{visibleWorkers.map((worker) => <option value={worker.id} key={worker.id}>{worker.full_name}</option>)}</select></label>
                {!assigningDriver && <label><span>Select Task Category</span><select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} required><option value="" disabled>Select Task Category</option>{options.categories.map((category) => <option value={category.id} key={category.id}>{category.category_name}</option>)}</select></label>}
                {assigningDriver ? <label><span>Select Ready Order</span><select value={deliveryForm.order_id} onChange={(event) => setDeliveryForm({ ...deliveryForm, order_id: event.target.value })} required><option value="" disabled>Select Order</option>{readyOrders.map((order) => <option value={order.id} key={order.id}>{order.order_number} — {order.delivery_full_name}</option>)}</select><small>{readyOrders.length ? 'Only preparing delivery orders without a driver are shown.' : 'No ready delivery orders are available.'}</small></label> : <label><span>Select Field</span><select value={form.field_id} onChange={(event) => setForm({ ...form, field_id: event.target.value })} required><option value="" disabled>Select Field</option>{options.fields.map((field) => <option value={field.id} key={field.id}>{field.field_name}</option>)}</select></label>}
              </div>
              <div className="task-dialog-side">
                {assigningDriver ? <><label><span>Delivery Date</span><input type="date" value={deliveryForm.delivery_date} onChange={(event) => setDeliveryForm({ ...deliveryForm, delivery_date: event.target.value })} required /></label><label><span>Delivery Window</span><div className="date-time-pair"><input type="time" min="07:00" max="17:59" value={deliveryForm.start_time} onChange={(event) => setDeliveryForm({ ...deliveryForm, start_time: event.target.value })} required /><input type="time" min="07:01" max="18:00" value={deliveryForm.end_time} onChange={(event) => setDeliveryForm({ ...deliveryForm, end_time: event.target.value })} required /></div><small>Schedule deliveries only from 7:00 AM to 6:00 PM.</small></label></> : <><label><span>Priority Level</span><select value={form.priority_id} onChange={(event) => setForm({ ...form, priority_id: event.target.value })} required><option value="" disabled>Select Level</option>{options.priorities.map((priority) => <option value={priority.id} key={priority.id}>{priority.priority_name}</option>)}</select></label>
                {modal.mode === 'edit' && <label><span>Status Level</span><select value={form.status_id} onChange={(event) => setForm({ ...form, status_id: event.target.value })}>{options.statuses.map((status) => <option value={status.id} key={status.id}>{status.status_name}</option>)}</select></label>}
                <label><span>Task Date</span><input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} required /></label>
                <label><span>Task Window</span><div className="date-time-pair"><input type="time" min="07:00" max="17:59" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} required /><input type="time" min="07:01" max="18:00" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} required /></div></label></>}
              </div>
            </div>
            {!assigningDriver && <label className="task-description"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength="2000" /></label>}
            <footer><button type="button" onClick={() => setModal(null)}>Cancel</button><button className="assign-task-submit" type="submit" disabled={saving || (assigningDriver && (!deliveryForm.order_id || !deliveryForm.delivery_date))}><Send aria-hidden="true" />{saving ? 'Saving…' : assigningDriver ? 'Assign Order' : modal.mode === 'add' ? 'Assign Task' : 'Save Task'}</button></footer>
          </form>
        </section>
      </div>}

      {modal?.mode === 'setting' && <div className="task-modal-backdrop">
        <section className="task-reference-modal task-setting-modal" role="dialog" aria-modal="true">
          <TaskModalHeader title={`${modal.value ? 'Edit' : 'Add'} ${modal.type === 'categories' ? 'Task Category' : 'Field / Location'}`} />
          <form className="task-reference-body" onSubmit={saveSetting}>
            {error && <div className="task-modal-error" role="alert">{error}</div>}
            <label><span>{modal.type === 'categories' ? 'Category name' : 'Field or location name'}</span><input autoFocus value={settingsForm.name} onChange={(event) => setSettingsForm({ ...settingsForm, name: event.target.value })} maxLength="120" required /></label>
            {modal.type === 'categories' && <label className="task-description"><span>Description <em>(optional)</em></span><textarea value={settingsForm.description} onChange={(event) => setSettingsForm({ ...settingsForm, description: event.target.value })} maxLength="500" /></label>}
            <footer><button type="button" onClick={() => setModal(null)}>Cancel</button><button className="assign-task-submit" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></footer>
          </form>
        </section>
      </div>}
    </main>
  )
}
