import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, Camera, Check, ChevronDown, ClipboardPlus, Clock, Eye, Info, MapPin, Package, Pencil, Phone, Printer, RotateCcw, Send, Truck, User, X, ZoomIn } from 'lucide-react'
import completedTaskIcon from '../../assets/task-completed-icon-white.png'
import progressTaskIcon from '../../assets/task-progress-icon-white.png'
import totalTaskIcon from '../../assets/task-total-icon-white.png'
import workersTaskIcon from '../../assets/task-workers-icon-white.png'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/task-schedule-management.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const PAGE_SIZE = 10
const emptyForm = {
  assigned_worker_id: '', worker_category: '', category_id: '', field_id: '', priority_id: '', status_id: '',
  start_date: '', start_time: '07:00', end_time: '08:00', estimated_duration_minutes: '60', description: '',
}
const emptyOptions = {
  workers: [], categories: [], fields: [], priorities: [], statuses: [], scheduleStatuses: [],
}
const emptyDeliveryForm = { order_id: '', delivery_date: '', start_time: '07:00', end_time: '08:00' }
const emptyVehicleForm = { vehicle_name: '', plate_number: '', status: 'available' }
const vehicleStatusLabels = { available: 'Available', in_use: 'In Use', maintenance: 'Maintenance', inactive: 'Inactive' }
const workerCategoryLabels = {
  crop_management_worker: 'Crop Management Worker',
  driver: 'Driver',
}
const driverDeliveryStatuses = [
  { code: 'delivery:assigned', status_name: 'Assigned' },
  { code: 'delivery:accepted', status_name: 'Accepted' },
  { code: 'delivery:picked_up', status_name: 'Picked Up' },
  { code: 'delivery:out_for_delivery', status_name: 'Out for Delivery' },
  { code: 'delivery:delivered', status_name: 'Delivered' },
]

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

function formatDeliveryWindow(start, end) {
  if (!start || !end) return 'Schedule pending'
  const formatter = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const timeFormatter = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' })
  return `${formatter.format(new Date(start))} – ${timeFormatter.format(new Date(end))}`
}

function deliveryLocation(order) {
  return [order.delivery_full_name, order.delivery_barangay, order.delivery_city_municipality].filter(Boolean).join(' · ')
}

function deliveryAddressSummary(order) {
  return [order.delivery_barangay, order.delivery_city_municipality, order.delivery_province].filter(Boolean).join(' · ') || 'Delivery address'
}

function formatDeliveryDuration(startTime, endTime) {
  if (!startTime || !endTime) return null
  const [sh, sm] = String(startTime).split(':').map(Number)
  const [eh, em] = String(endTime).split(':').map(Number)
  if (!Number.isFinite(sh) || !Number.isFinite(sm) || !Number.isFinite(eh) || !Number.isFinite(em)) return null
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  if (diff <= 0) return 'Invalid range'
  const hours = Math.floor(diff / 60)
  const minutes = diff % 60
  const parts = []
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`)
  if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`)
  return parts.join(' ') || '0 mins'
}

function formatTime12(timeStr) {
  if (!timeStr) return ''
  const [h, m] = String(timeStr).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return String(timeStr)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function formatTaskDuration(minutes) {
  const mins = Number(minutes)
  if (!Number.isFinite(mins) || mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0 && m > 0) return `${h}h ${m}m (${mins} mins)`
  if (h > 0) return `${h} Hour${h > 1 ? 's' : ''}`
  return `${mins} Minutes`
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

function isCropWorkerSchedule(workerCategory, startTime, endTime) {
  if (workerCategory !== 'crop_management_worker') return true
  const toMinutes = (time) => {
    const [hour, minute] = String(time || '').split(':').map(Number)
    return hour * 60 + minute
  }
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  return (start >= 480 && end <= 710) || (start >= 780 && end <= 960)
}

function parseDisputeReason(reason) {
  if (!reason) return { resolutionLabel: 'Refund Only', itemBreakdownText: '', userDescription: '' }
  let resolutionLabel = 'Refund Only'
  let itemBreakdownText = ''
  let userDescription = reason

  const resMatch = reason.match(/\[Requested Resolution:\s*([^\]]+)\]/)
  if (resMatch) {
    resolutionLabel = resMatch[1].trim()
    userDescription = userDescription.replace(resMatch[0], '').trim()
  }

  const itemsMatch = reason.match(/\[Affected Items:\s*([^\]]+)\]/)
  if (itemsMatch) {
    itemBreakdownText = itemsMatch[1].trim()
    userDescription = userDescription.replace(itemsMatch[0], '').trim()
  }

  return { resolutionLabel, itemBreakdownText, userDescription }
}

function formatCropTime(minutes) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return { value: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, label: `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}` }
}

function cropTimeOptions(kind, startTime) {
  const startMinutes = Number(String(startTime || '').slice(0, 2)) * 60 + Number(String(startTime || '').slice(3, 5))
  const ranges = kind === 'start'
    ? [[480, 705], [780, 955]]
    : startMinutes < 710 ? [[startMinutes + 5, 710]] : [[startMinutes + 5, 960]]
  const options = []
  for (const [first, last] of ranges) {
    for (let minute = first; minute <= last; minute += 5) options.push(formatCropTime(minute))
  }
  return options
}

function CropTaskTimeSelect({ kind, startTime, value, onChange }) {
  const options = cropTimeOptions(kind, startTime)
  const selectedValue = options.some((option) => option.value === value) ? value : options[0]?.value || ''
  const [open, setOpen] = useState(false)
  const selectedOption = options.find((option) => option.value === selectedValue)
  return (
    <div className="crop-task-time-picker">
      <button
        type="button"
        className="crop-task-time-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={kind === 'start' ? 'Crop task start time' : 'Crop task end time'}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedOption?.label || 'Select time'}</span><ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="crop-task-time-menu" role="listbox" aria-label={kind === 'start' ? 'Start time options' : 'End time options'}>
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === selectedValue}
              className={option.value === selectedValue ? 'is-selected' : ''}
              key={option.value}
              onClick={() => { onChange({ target: { value: option.value } }); setOpen(false) }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function deliveryTimeOptions(kind, startTime) {
  const startMinutes = Number(String(startTime || '').slice(0, 2)) * 60 + Number(String(startTime || '').slice(3, 5))
  const first = kind === 'start' ? 420 : startMinutes + 5
  const last = kind === 'start' ? 1075 : 1080
  const options = []
  for (let minute = first; minute <= last; minute += 5) options.push(formatCropTime(minute))
  return options
}

function DeliveryTimeSelect({ kind, startTime, value, onChange }) {
  const options = deliveryTimeOptions(kind, startTime)
  const selectedValue = options.some((option) => option.value === value) ? value : options[0]?.value || ''
  const selectedOption = options.find((option) => option.value === selectedValue)
  const [open, setOpen] = useState(false)
  return (
    <div className="crop-task-time-picker">
      <button type="button" className="crop-task-time-trigger" aria-expanded={open} aria-haspopup="listbox" aria-label={kind === 'start' ? 'Delivery start time' : 'Delivery end time'} onClick={() => setOpen((current) => !current)}>
        <span>{selectedOption?.label || 'Select time'}</span><ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && <div className="crop-task-time-menu" role="listbox" aria-label={kind === 'start' ? 'Delivery start time options' : 'Delivery end time options'}>{options.map((option) => <button type="button" role="option" aria-selected={option.value === selectedValue} className={option.value === selectedValue ? 'is-selected' : ''} key={option.value} onClick={() => { onChange({ target: { value: option.value } }); setOpen(false) }}>{option.label}</button>)}</div>}
    </div>
  )
}

function ChecklistIcon() { return <ClipboardPlus aria-hidden="true" /> }

function SummaryCard({ label, value, icon, className = '' }) {
  return <article className={`task-summary-card ${className}`}><div><span>{label}</span><strong>{value}</strong></div><i aria-hidden="true">{icon}</i></article>
}

function TaskModalHeader({ title, onClose, tag = 'Task scheduling' }) {
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

export default function TaskScheduleManagement() {
  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [deliveryOrders, setDeliveryOrders] = useState([])
  const [workView, setWorkView] = useState('crop')
  const [settingsValues, setSettingsValues] = useState({ categories: [], fields: [] })
  const [archivedSettings, setArchivedSettings] = useState({ categories: [], fields: [] })
  const [archiveType, setArchiveType] = useState('fields')
  const [options, setOptions] = useState(emptyOptions)
  const [summary, setSummary] = useState({ total: 0, inProgress: 0, completed: 0, availableWorkers: 0 })
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [settingsForm, setSettingsForm] = useState({ name: '', description: '' })
  const [form, setForm] = useState(emptyForm)
  const [deliveryForm, setDeliveryForm] = useState(emptyDeliveryForm)
  const [deliveryEditForm, setDeliveryEditForm] = useState({ driver_id: '', delivery_date: '', start_time: '07:00', end_time: '08:00' })
  const [readyOrders, setReadyOrders] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm)
  const [disputeOrders, setDisputeOrders] = useState([])
  const [disputeFilter, setDisputeFilter] = useState('all')
  const [disputeResolutionNotes, setDisputeResolutionNotes] = useState('')
  const [disputeRefundAmount, setDisputeRefundAmount] = useState('')
  const [disputeRefundReference, setDisputeRefundReference] = useState('')
  const [disputeDecision, setDisputeDecision] = useState('refunded')
  const [disputeActivePhoto, setDisputeActivePhoto] = useState(null)
  const [harvestApprovalForm, setHarvestApprovalForm] = useState({ harvest_small_count: '0', harvest_medium_count: '0', harvest_large_count: '0', harvest_damaged_count: '0' })
  const [harvestRejectionReason, setHarvestRejectionReason] = useState('')
  const [harvestApprovalCount, setHarvestApprovalCount] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const filterRef = useRef(null)
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
  const isDriverStatusFilter = filter.startsWith('delivery:')

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (search.trim()) params.set('search', search.trim())
    if (filter && !filter.startsWith('delivery:')) params.set('status', filter)
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

  useEffect(() => {
    if (!filterOpen) return undefined
    function closeFilter(event) {
      if (event.key === 'Escape' || !filterRef.current?.contains(event.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', closeFilter)
    document.addEventListener('keydown', closeFilter)
    return () => { document.removeEventListener('mousedown', closeFilter); document.removeEventListener('keydown', closeFilter) }
  }, [filterOpen])

  const loadAssignedDeliveryOrders = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/deliveries/assigned-orders')
      setDeliveryOrders(data.orders || [])
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [])

  useEffect(() => { loadAssignedDeliveryOrders() }, [loadAssignedDeliveryOrders, refreshKey])

  const loadDisputeOrders = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/deliveries/disputes')
      setDisputeOrders(data.orders || [])
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [])

  useEffect(() => {
    loadDisputeOrders()
  }, [loadDisputeOrders, refreshKey])

  const openDisputeCount = disputeOrders.filter((order) => order.delivery_dispute_status === 'open').length
  const resolvedDisputeCount = disputeOrders.length - openDisputeCount
  const visibleDisputes = disputeFilter === 'all' ? disputeOrders : disputeOrders.filter((order) => order.delivery_dispute_status === disputeFilter)

  const loadHarvestApprovalCount = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/tasks/harvest-approvals/count')
      setHarvestApprovalCount(data.count || 0)
    } catch {
      // Non-critical — just skip showing the count this refresh.
    }
  }, [])

  useEffect(() => { loadHarvestApprovalCount() }, [loadHarvestApprovalCount, refreshKey])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && disputeActivePhoto) {
        setDisputeActivePhoto(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disputeActivePhoto])

  function openReviewHarvest(task) {
    setError('')
    setHarvestApprovalForm({
      harvest_small_count: String(task.harvest_small_count ?? 0),
      harvest_medium_count: String(task.harvest_medium_count ?? 0),
      harvest_large_count: String(task.harvest_large_count ?? 0),
      harvest_damaged_count: String(task.harvest_damaged_count ?? 0),
    })
    setHarvestRejectionReason('')
    setModal({ mode: 'review-harvest', task })
  }

  async function approveHarvest() {
    setSaving(true)
    setError('')
    try {
      await apiRequest(`/api/admin/tasks/${modal.task.id}/approve-harvest`, {
        method: 'POST',
        body: JSON.stringify(harvestApprovalForm),
      })
      setModal(null)
      setRefreshKey((key) => key + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function rejectHarvest() {
    setSaving(true)
    setError('')
    try {
      await apiRequest(`/api/admin/tasks/${modal.task.id}/reject-harvest`, {
        method: 'POST',
        body: JSON.stringify({ reason: harvestRejectionReason.trim() }),
      })
      setModal(null)
      setRefreshKey((key) => key + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function resolveDispute(resolution) {
    setSaving(true)
    setError('')
    try {
      const body = { resolution, notes: disputeResolutionNotes.trim() }
      if (resolution === 'refunded') {
        body.refund_amount = disputeRefundAmount.trim() || undefined
        if (modal.order.payment_method !== 'gcash') body.refund_reference = disputeRefundReference.trim()
      }
      await apiRequest(`/api/admin/deliveries/${modal.order.id}/resolve-dispute`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setModal(null)
      setDisputeResolutionNotes('')
      setDisputeRefundAmount('')
      setDisputeRefundReference('')
      setDisputeDecision('refunded')
      setDisputeActivePhoto(null)
      setRefreshKey((key) => key + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

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

  const loadVehicles = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/deliveries/vehicles')
      setVehicles(data.vehicles || [])
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'archive') loadArchivedSettings()
    else if (activeTab === 'fleet') loadVehicles()
    else if (activeTab !== 'tasks' && activeTab !== 'disputes') loadSettings()
  }, [activeTab, loadArchivedSettings, loadSettings, loadVehicles])

  function openVehicleModal(vehicle = null) {
    setError('')
    setVehicleForm(vehicle ? { vehicle_name: vehicle.vehicle_name, plate_number: vehicle.plate_number, status: vehicle.status } : emptyVehicleForm)
    setModal({ mode: 'vehicle', vehicle })
  }

  async function saveVehicle(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await apiRequest(`/api/admin/deliveries/vehicles${modal.vehicle ? `/${modal.vehicle.id}` : ''}`, {
        method: modal.vehicle ? 'PATCH' : 'POST',
        body: JSON.stringify(vehicleForm),
      })
      setModal(null)
      await loadVehicles()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

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
      ...(initialWorker?.worker_category === 'crop_management_worker' ? { start_time: '08:00', end_time: '09:00' } : {}),
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

  function openEditDelivery(order) {
    const start = localDateParts(order.delivery_scheduled_at)
    const end = localDateParts(order.delivery_window_end_at)
    setError('')
    setDeliveryEditForm({
      driver_id: order.assigned_driver_id || '',
      delivery_date: start.start_date,
      start_time: start.start_time || '07:00',
      end_time: end.start_time || '08:00',
    })
    setModal({ mode: 'edit-delivery', order })
  }

  async function saveDeliveryAssignment(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await apiRequest(`/api/admin/deliveries/${modal.order.id}/assignment`, {
        method: 'PATCH',
        body: JSON.stringify(deliveryEditForm),
      })
      setModal(null)
      await loadAssignedDeliveryOrders()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
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
      if (!isCropWorkerSchedule(form.worker_category, form.start_time, form.end_time)) {
        throw new Error('Crop-management tasks must be scheduled entirely from 8:00 AM–11:50 AM or 1:00 PM–4:00 PM. Lunch break is 11:50 AM–1:00 PM.')
      }
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
  const visibleSettings = activeTab === 'tasks' || activeTab === 'disputes' ? [] : settingsSource[settingsConfig.resource].filter((value) => !settingsSearch || `${value[settingsConfig.nameKey]} ${value.description || ''}`.toLowerCase().includes(settingsSearch))
  const visibleVehicles = vehicles.filter((vehicle) => !settingsSearch || `${vehicle.vehicle_name} ${vehicle.plate_number}`.toLowerCase().includes(settingsSearch))
  const visibleDeliveryOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    const requestedStatus = filter.startsWith('delivery:') ? filter.slice('delivery:'.length) : ''
    return [...deliveryOrders].sort((a, b) => new Date(b.delivery_scheduled_at || 0) - new Date(a.delivery_scheduled_at || 0)).filter((order) => (!filter || requestedStatus) && (!requestedStatus || order.delivery_assignment_status === requestedStatus) && (!query || `${order.order_number} ${order.assigned_driver?.full_name || ''} ${deliveryLocation(order)}`.toLowerCase().includes(query)))
  }, [deliveryOrders, filter, search])

  const PAGE_SIZE = 10
  const deliveryTotalPages = Math.max(1, Math.ceil(visibleDeliveryOrders.length / PAGE_SIZE))
  const paginatedDeliveryOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return visibleDeliveryOrders.slice(start, start + PAGE_SIZE)
  }, [page, visibleDeliveryOrders])

  const settingsTotalPages = Math.max(1, Math.ceil(visibleSettings.length / PAGE_SIZE))
  const paginatedSettings = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return visibleSettings.slice(start, start + PAGE_SIZE)
  }, [page, visibleSettings])

  return (
    <main className="admin-dashboard task-schedule-page">
      <AdminSidebar active="tasks" />
      <section className="admin-workspace">
        <AdminTopbar />
        <div className="task-schedule-content">
          <header className="task-page-heading">
            <div>
              <h1>Task Assignment &amp; Scheduling</h1>
              <p style={{ margin: '3px 0 0', color: '#667568', fontSize: '13px', fontFamily: 'var(--sans)' }}>
                Organize crop maintenance, assign workers to field sectors, and track farm operations
              </p>
            </div>
          </header>

          {harvestApprovalCount > 0 && (
            <div className="harvest-approval-banner" role="status">
              🍍 {harvestApprovalCount} harvest report{harvestApprovalCount === 1 ? '' : 's'} awaiting review
            </div>
          )}

          <section className="task-summary-grid" aria-label="Task summary">
            <SummaryCard label="Total Task" value={summary.total} icon={<img src={totalTaskIcon} alt="" />} />
            <SummaryCard label="In Progress" value={summary.inProgress} icon={<img src={progressTaskIcon} alt="" />} />
            <SummaryCard label="Completed" value={summary.completed} icon={<img src={completedTaskIcon} alt="" />} />
            <SummaryCard label={<>Available<br />Workers</>} value={summary.availableWorkers} icon={<img src={workersTaskIcon} alt="" />} />
          </section>

          <section className="tasks-panel">
            <nav className="task-management-tabs" aria-label="Task management sections">
              <button className={activeTab === 'tasks' ? 'is-active' : ''} type="button" onClick={() => { setActiveTab('tasks'); setSearch(''); setPage(1) }}>All Tasks</button>
              <button className={activeTab === 'fields' ? 'is-active' : ''} type="button" onClick={() => { setActiveTab('fields'); setSearch(''); setPage(1) }}>Fields &amp; Locations</button>
              <button className={activeTab === 'categories' ? 'is-active' : ''} type="button" onClick={() => { setActiveTab('categories'); setSearch(''); setPage(1) }}>Task Categories</button>
              <button className={activeTab === 'fleet' ? 'is-active' : ''} type="button" onClick={() => { setActiveTab('fleet'); setSearch(''); setPage(1) }}>Fleet</button>
              <button className={activeTab === 'disputes' ? 'is-active' : ''} type="button" onClick={() => { setActiveTab('disputes'); setSearch(''); setPage(1) }}>Disputes{openDisputeCount > 0 ? ` (${openDisputeCount})` : ''}</button>
              <button className={activeTab === 'archive' ? 'is-active' : ''} type="button" onClick={() => { setActiveTab('archive'); setSearch(''); setPage(1) }}>Archived Items</button>
            </nav>
            {activeTab === 'disputes' ? <>
            {error && !modal && <div className="tasks-error" role="alert">{error}</div>}
            <nav className="dispute-status-filter" aria-label="Filter disputes by status">
              {[{ id: 'all', label: 'All', count: disputeOrders.length }, { id: 'open', label: 'Open', count: openDisputeCount }, { id: 'resolved', label: 'Resolved', count: resolvedDisputeCount }].map((option) => (
                <button key={option.id} type="button" className={disputeFilter === option.id ? 'is-active' : ''} aria-pressed={disputeFilter === option.id} onClick={() => setDisputeFilter(option.id)}>{option.label} <span>{option.count}</span></button>
              ))}
            </nav>
            <div className="tasks-table-wrap">
              <table className="tasks-table">
                <thead><tr><th>ORDER NUMBER</th><th>CUSTOMER</th><th>RESPONSIBLE</th><th>REPORTED</th><th>REASON</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
                <tbody>{visibleDisputes.length ? visibleDisputes.map((order) => {
                  const isResolved = order.delivery_dispute_status === 'resolved'
                  const outcome = order.delivery_dispute_resolution === 'refunded'
                    ? `Refunded${order.refund_amount != null ? ` ₱${Number(order.refund_amount).toFixed(2)}` : ''}`
                    : order.delivery_dispute_resolution === 'dismissed' ? 'Claim dismissed' : ''
                  const responsibleName = order.delivery_dispute_responsible_role === 'seller'
                    ? (order.responsible_seller?.full_name || 'Seller (unidentified)')
                    : (order.assigned_driver?.full_name || 'Unassigned driver')
                  const responsibleLabel = order.delivery_dispute_responsible_role === 'seller' ? 'Seller' : 'Driver'
                  const suggestedAmount = order.disputed_item ? (Number(order.disputed_item.unit_price) * Number(order.delivery_dispute_affected_quantity || 0)).toFixed(2) : ''
                  return (
                  <tr key={`dispute-${order.id}`}><td><strong>{order.order_number}</strong></td><td>{order.delivery_full_name}</td><td>{responsibleLabel} · {responsibleName}</td><td>{formatSchedule(order.delivery_dispute_created_at)}</td><td>{order.delivery_dispute_reason}</td>
                    <td><span className={`task-status-badge ${isResolved ? 'status-resolved' : 'status-open-dispute'}`}>{isResolved ? 'Resolved' : 'Open'}</span>{isResolved && (outcome || order.delivery_dispute_resolved_at) && <small className="dispute-outcome" title={order.delivery_dispute_resolution_notes || undefined}>{[outcome, order.delivery_dispute_resolved_at && formatSchedule(order.delivery_dispute_resolved_at)].filter(Boolean).join(' · ')}</small>}</td>
                    <td>{isResolved ? <span className="dispute-no-action">—</span> : <div className="task-actions"><button type="button" onClick={() => { setDisputeResolutionNotes(''); setDisputeRefundAmount(suggestedAmount); setDisputeRefundReference(''); setDisputeDecision('refunded'); setDisputeActivePhoto(null); setModal({ mode: 'review-dispute', order }) }}>Review</button></div>}</td></tr>
                  )
                }) : <tr><td className="tasks-empty" colSpan="7">{disputeFilter === 'resolved' ? 'No resolved disputes yet.' : disputeFilter === 'open' ? 'No open disputes.' : 'No disputes.'}</td></tr>}</tbody>
              </table>
            </div>
            <footer className="task-pagination">
              <span>{openDisputeCount} open · {resolvedDisputeCount} resolved</span>
            </footer>
            </> : activeTab === 'tasks' ? <>
            <nav className="task-work-type-tabs" aria-label="Work type view">
              <button className={workView === 'crop' ? 'is-active' : ''} type="button" onClick={() => { setWorkView('crop'); setPage(1) }}>Crop Management</button>
              <button className={workView === 'deliveries' ? 'is-active' : ''} type="button" onClick={() => { setWorkView('deliveries'); setPage(1) }}>Driver Deliveries</button>
            </nav>
            <div className="tasks-toolbar">
              <div className="task-filter" ref={filterRef}><button type="button" onClick={() => setFilterOpen((open) => !open)} aria-haspopup="listbox" aria-expanded={filterOpen}><span>Filter by</span><i aria-hidden="true" /></button>{filterOpen && <div className="task-filter-menu" role="listbox" aria-label="Filter work by status"><p>Filter crop tasks</p>{[{ id: 'all', code: '', status_name: 'All statuses' }, ...options.statuses].map((status) => <button type="button" role="option" aria-selected={filter === status.code} className={filter === status.code ? 'is-selected' : ''} key={status.id} onClick={() => { setFilter(status.code); setPage(1); setFilterOpen(false) }}><span>{status.status_name}</span>{filter === status.code && <i aria-hidden="true">✓</i>}</button>)}<p className="task-filter-group">Filter delivery status</p>{driverDeliveryStatuses.map((status) => <button type="button" role="option" aria-selected={filter === status.code} className={filter === status.code ? 'is-selected' : ''} key={status.code} onClick={() => { setFilter(status.code); setPage(1); setFilterOpen(false) }}><span>{status.status_name}</span>{filter === status.code && <i aria-hidden="true">✓</i>}</button>)}</div>}</div>
              <label className="task-search"><span className="sr-only">Search tasks</span><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search tasks" /><span aria-hidden="true" /></label>
              <button className="assign-task-toolbar-button" type="button" onClick={openNewTask} disabled={!options.workers.length}><span>＋</span>Assign New Task</button>
            </div>
            {error && !modal && <div className="tasks-error" role="alert">{error}</div>}
            <div className="tasks-table-wrap">
              <table className="tasks-table work-list-table">
                <thead>{workView === 'deliveries'
                  ? <tr><th>DRIVER</th><th>ORDER NUMBER</th><th>CUSTOMER</th><th>DELIVERY ADDRESS</th><th>DELIVERY WINDOW</th><th>STATUS</th><th>ACTIONS</th></tr>
                  : workView === 'crop'
                    ? <tr><th>WORKER</th><th>TASK</th><th>FIELD</th><th>SCHEDULE</th><th>PRIORITY</th><th>STATUS</th><th>ACTIONS</th></tr>
                    : <tr><th>TYPE</th><th>ASSIGNED TO</th><th>ASSIGNMENT</th><th>LOCATION</th><th>SCHEDULE</th><th>STATUS</th><th>ACTIONS</th></tr>
                }</thead>
                <tbody>{loading && workView !== 'deliveries' ? <tr><td className="tasks-empty" colSpan="7">Loading work assignments…</td></tr> : <>
                  {workView !== 'deliveries' && !isDriverStatusFilter && tasks.map((task) => workView === 'crop'
                    ? <tr key={`task-${task.id}`}><td>{task.assigned_worker?.full_name || 'Unknown worker'}</td><td><strong>{task.category}</strong><small>{task.description || 'No description added'}</small></td><td>{task.field}</td><td>{formatSchedule(task.schedule_start)}</td><td><span className={`task-priority priority-${task.priority}`}>{task.priority_label}</span></td><td><span className={`task-status status-${task.status}`}>{task.status_label || statusLabels[task.status]}</span></td><td><div className="task-actions">{task.status === 'awaiting_approval' ? <button type="button" onClick={() => openReviewHarvest(task)}>Review</button> : <><button className="task-view" type="button" onClick={() => setModal({ mode: 'view', task })} aria-label={`View task assigned to ${task.assigned_worker?.full_name}`}><Eye aria-hidden="true" size={14} /> View</button><button className="task-edit" type="button" onClick={() => openEditTask(task)} aria-label={`Edit task assigned to ${task.assigned_worker?.full_name}`}>✎</button></>}</div></td></tr>
                    : <tr key={`task-${task.id}`}><td><span className="task-work-type is-crop">Crop Task</span></td><td>{task.assigned_worker?.full_name || 'Unknown worker'}</td><td><strong>{task.category}</strong><small>{task.description || 'No description added'}</small></td><td>{task.field}</td><td>{formatSchedule(task.schedule_start)}</td><td><span className={`task-status status-${task.status}`}>{task.status_label || statusLabels[task.status]}</span></td><td><div className="task-actions">{task.status === 'awaiting_approval' ? <button type="button" onClick={() => openReviewHarvest(task)}>Review</button> : <><button type="button" onClick={() => setModal({ mode: 'view', task })}>View</button><button className="task-edit" type="button" onClick={() => openEditTask(task)} aria-label={`Edit task assigned to ${task.assigned_worker?.full_name}`}>✎</button></>}</div></td></tr>)}
                  {workView !== 'crop' && paginatedDeliveryOrders.map((order) => workView === 'deliveries'
                    ? <tr key={`delivery-${order.id}`}><td>{order.assigned_driver?.full_name || 'Unassigned driver'}</td><td><strong>{order.order_number}</strong></td><td>{order.delivery_full_name}</td><td>{[order.delivery_barangay, order.delivery_city_municipality, order.delivery_province, order.delivery_region].filter(Boolean).join(', ')}</td><td>{formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at)}</td><td><span className={`task-status status-${order.delivery_assignment_status || 'assigned'}`}>{(order.delivery_assignment_status || 'assigned').replaceAll('_', ' ')}</span></td><td><div className="task-actions"><button className="task-view" type="button" onClick={() => setModal({ mode: 'view-delivery', order })} aria-label={`View delivery ${order.order_number}`}><Eye aria-hidden="true" size={14} /> View</button>{order.order_status === 'ready_for_delivery' && order.delivery_assignment_status === 'assigned' && <button className="task-edit" type="button" onClick={() => openEditDelivery(order)} aria-label={`Edit delivery ${order.order_number}`}>✎</button>}</div></td></tr>
                    : <tr key={`delivery-${order.id}`}><td><span className="task-work-type is-delivery">Delivery</span></td><td>{order.assigned_driver?.full_name || 'Unassigned driver'}</td><td><strong>{order.order_number}</strong></td><td>{deliveryAddressSummary(order)}</td><td>{formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at)}</td><td><span className={`task-status status-${order.delivery_assignment_status || 'assigned'}`}>{(order.delivery_assignment_status || 'assigned').replaceAll('_', ' ')}</span></td><td><div className="task-actions"><button type="button" onClick={() => setModal({ mode: 'view-delivery', order })}>View</button>{order.order_status === 'ready_for_delivery' && order.delivery_assignment_status === 'assigned' && <button className="task-edit" type="button" onClick={() => openEditDelivery(order)} aria-label={`Edit delivery ${order.order_number}`}>✎</button>}</div></td></tr>)}
                  {((workView === 'crop' && !tasks.length) || (workView === 'deliveries' && !visibleDeliveryOrders.length) || (workView === 'all' && !tasks.length && !visibleDeliveryOrders.length)) && <tr><td className="tasks-empty" colSpan="7">No work assignments found.</td></tr>}
                </>}</tbody>
              </table>
            </div>
            <footer className="task-pagination">
              <span>{workView === 'deliveries' ? `${visibleDeliveryOrders.length} assigned delivery order${visibleDeliveryOrders.length === 1 ? '' : 's'}` : `${pagination.total} crop task${pagination.total === 1 ? '' : 's'}${workView === 'all' ? ` · ${visibleDeliveryOrders.length} delivery order${visibleDeliveryOrders.length === 1 ? '' : 's'}` : ''}`}</span>
              <div>
                <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((v) => v - 1)}>← Previous</button>
                <strong>{page} / {workView === 'deliveries' ? deliveryTotalPages : pagination.totalPages || 1}</strong>
                <button type="button" disabled={(workView === 'deliveries' ? page >= deliveryTotalPages : page >= (pagination.totalPages || 1)) || loading} onClick={() => setPage((v) => v + 1)}>Next →</button>
              </div>
            </footer>
            </> : activeTab === 'fleet' ? <>
              <div className="task-settings-toolbar">
                <label className="task-search"><span className="sr-only">Search fleet vehicles</span><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search fleet vehicles" /><span aria-hidden="true" /></label>
                <button type="button" onClick={() => openVehicleModal()}><span>＋</span>Add Vehicle</button>
              </div>
              {error && !modal && <div className="tasks-error" role="alert">{error}</div>}
              <div className="tasks-table-wrap">
                <table className="tasks-table">
                  <thead><tr><th>VEHICLE</th><th>PLATE NUMBER</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
                  <tbody>{visibleVehicles.length ? visibleVehicles.map((vehicle) => <tr key={vehicle.id}><td><strong>{vehicle.vehicle_name}</strong></td><td>{vehicle.plate_number}</td><td><span className={`task-status status-${vehicle.status}`}>{vehicleStatusLabels[vehicle.status] || vehicle.status}</span></td><td><div className="task-actions"><button type="button" onClick={() => openVehicleModal(vehicle)}>Edit</button></div></td></tr>) : <tr><td className="tasks-empty" colSpan="4">No vehicles in the fleet yet.</td></tr>}</tbody>
                </table>
              </div>
              <footer className="task-pagination">
                <span>{visibleVehicles.length} vehicle{visibleVehicles.length === 1 ? '' : 's'}</span>
              </footer>
            </> : <>
              <div className="task-settings-toolbar">
                <label className="task-search"><span className="sr-only">{settingsConfig.searchLabel}</span><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder={settingsConfig.searchLabel} /><span aria-hidden="true" /></label>
                {activeTab === 'archive' ? <label className="task-archive-filter"><span>Show</span><select value={archiveType} onChange={(event) => { setArchiveType(event.target.value); setSearch(''); setPage(1) }}><option value="fields">Archived Fields &amp; Locations</option><option value="categories">Archived Task Categories</option></select></label> : <button type="button" onClick={() => openSettingModal(settingsConfig.resource)}><span>＋</span>Add {settingsConfig.itemLabel}</button>}
              </div>
              {error && !modal && <div className="tasks-error" role="alert">{error}</div>}
              <div className="tasks-table-wrap">
                <table className={`tasks-table task-settings-table ${settingsResource === 'fields' ? 'field-settings-table' : ''}`}>
                  <thead><tr><th>{settingsConfig.itemLabel.toUpperCase()}</th>{settingsResource === 'categories' && <th>DESCRIPTION</th>}<th>STATUS</th><th>ACTIONS</th></tr></thead>
                  <tbody>{paginatedSettings.length ? paginatedSettings.map((value) => <tr key={value.id}><td><strong>{value[settingsConfig.nameKey]}</strong></td>{settingsResource === 'categories' && <td>{value.description || 'No description added'}</td>}<td><span className="task-status status-pending">{activeTab === 'archive' ? 'Archived' : 'Active'}</span></td><td><div className="task-actions">{activeTab === 'archive' ? <button type="button" onClick={() => restoreSetting(settingsConfig.resource, value)}>Restore</button> : <><button type="button" onClick={() => openSettingModal(settingsConfig.resource, value)}>Edit</button><button className="task-archive" type="button" onClick={() => archiveSetting(settingsConfig.resource, value)}>Archive</button></>}</div></td></tr>) : <tr><td className="tasks-empty" colSpan={settingsResource === 'categories' ? 4 : 3}>{activeTab === 'archive' ? `No archived ${settingsConfig.itemLabel.toLowerCase()}s found.` : settingsConfig.empty}</td></tr>}</tbody>
                </table>
              </div>
              <footer className="task-pagination">
                <span>{visibleSettings.length} {activeTab === 'archive' ? 'archived' : 'active'} {settingsConfig.itemLabel.toLowerCase()}{visibleSettings.length === 1 ? '' : 's'}</span>
                {settingsTotalPages > 1 && (
                  <div>
                    <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>← Previous</button>
                    <strong>{page} / {settingsTotalPages}</strong>
                    <button type="button" disabled={page >= settingsTotalPages} onClick={() => setPage((value) => value + 1)}>Next →</button>
                  </div>
                )}
              </footer>
            </>}
          </section>
        </div>
      </section>

      {modal?.mode === 'view' && (() => {
        const task = modal.task
        const worker = task.assigned_worker
        const workerInitials = (worker?.full_name || 'Worker')
          .split(' ')
          .filter(Boolean)
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()

        const scheduleDateFormatted = task.schedule_start
          ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(task.schedule_start))
          : 'Date pending'

        const timeWindowFormatted = task.schedule?.start_time && task.schedule?.end_time
          ? `${formatTime12(task.schedule.start_time)} – ${formatTime12(task.schedule.end_time)}`
          : formatSchedule(task.schedule_start)

        const durationFormatted = formatTaskDuration(task.estimated_duration_minutes)
        const isHarvest = task.category?.toLowerCase().includes('harvest')
        const hasHarvestYield = task.harvest_small_count != null || task.harvest_medium_count != null || task.harvest_large_count != null || task.harvest_damaged_count != null

        const isCompleted = task.status === 'completed'
        const isInProgress = task.status === 'in_progress'
        const isAwaitingApproval = task.status === 'awaiting_approval'
        const isScheduled = task.status === 'pending' || task.status === 'scheduled'

        return (
          <div className="task-modal-backdrop">
            <section
              className="task-reference-modal crop-task-details-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="view-crop-task-title"
            >
              <TaskModalHeader
                title={
                  <span className="delivery-header-title">
                    <span id="view-crop-task-title">Crop Task Details</span>
                    <span className="delivery-order-badge">#TASK-{String(task.id).padStart(4, '0')}</span>
                  </span>
                }
                tag="Crop Management & Operations"
                onClose={() => setModal(null)}
              />

              <div className="crop-task-details-body">
                {/* Stepper & Status Bar */}
                <div className="crop-task-stepper-card">
                  <div className="crop-task-stepper-track">
                    <div className={`crop-step-item ${isScheduled || isInProgress || isAwaitingApproval || isCompleted ? 'is-done' : ''}`}>
                      <div className="crop-step-circle">
                        <Check size={12} aria-hidden="true" />
                      </div>
                      <span className="crop-step-label">Scheduled</span>
                    </div>
                    <div className={`crop-step-line ${isInProgress || isAwaitingApproval || isCompleted ? 'is-done' : ''}`} />
                    <div className={`crop-step-item ${isInProgress ? 'is-active' : isAwaitingApproval || isCompleted ? 'is-done' : ''}`}>
                      <div className="crop-step-circle">
                        {isAwaitingApproval || isCompleted ? <Check size={12} aria-hidden="true" /> : '2'}
                      </div>
                      <span className="crop-step-label">In Progress</span>
                    </div>
                    <div className={`crop-step-line ${isAwaitingApproval || isCompleted ? 'is-done' : ''}`} />
                    <div className={`crop-step-item ${isAwaitingApproval ? 'is-awaiting' : isCompleted ? 'is-done' : ''}`}>
                      <div className="crop-step-circle">
                        {isCompleted ? <Check size={12} aria-hidden="true" /> : isAwaitingApproval ? '!' : '3'}
                      </div>
                      <span className="crop-step-label">{isAwaitingApproval ? 'Approval Needed' : 'Completed'}</span>
                    </div>
                  </div>

                  <div className="crop-task-status-pills">
                    <span className={`task-priority-pill priority-${task.priority || 'medium'}`}>
                      {task.priority_label || 'Normal Priority'}
                    </span>
                    <span className={`task-status-pill status-${task.status || 'pending'}`}>
                      {task.status_label || statusLabels[task.status] || task.status}
                    </span>
                  </div>
                </div>

                {/* 2-Column Information Grid */}
                <div className="crop-task-grid">
                  {/* Left Column: Field & Worker */}
                  <div className="crop-task-panel-left">
                    {/* Field Location Card */}
                    <div className="crop-task-card">
                      <div className="crop-card-header">
                        <MapPin size={15} className="crop-card-icon" aria-hidden="true" />
                        <h4>Field &amp; Farm Plot</h4>
                      </div>
                      <div className="crop-location-box">
                        <div className="crop-location-pin">
                          <MapPin size={17} aria-hidden="true" />
                        </div>
                        <div className="crop-location-meta">
                          <strong className="crop-field-name">{task.field || 'General Farm Plot'}</strong>
                          <span className="crop-field-desc">
                            {task.schedule?.location || 'Pineapple Plantation · Designated Block'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Worker Card */}
                    <div className="crop-task-card">
                      <div className="crop-card-header">
                        <User size={15} className="crop-card-icon" aria-hidden="true" />
                        <h4>Assigned Farm Worker</h4>
                      </div>
                      <div className="crop-worker-profile">
                        <div className="crop-worker-avatar" aria-hidden="true">
                          {workerInitials}
                        </div>
                        <div className="crop-worker-meta">
                          <strong className="crop-worker-name">{worker?.full_name || 'Unassigned Worker'}</strong>
                          <span className="crop-worker-role">
                            {workerCategoryLabels[worker?.worker_category] || 'Crop Management Specialist'}
                          </span>
                        </div>
                        <span className="crop-worker-badge">Assigned</span>
                      </div>
                    </div>

                    {/* Category & Task Activity */}
                    <div className="crop-task-card">
                      <div className="crop-card-header">
                        <Package size={15} className="crop-card-icon" aria-hidden="true" />
                        <h4>Task Activity &amp; Category</h4>
                      </div>
                      <div className="crop-category-badge-box">
                        <span className="crop-category-chip">
                          {task.category || 'Farm Operations'}
                        </span>
                        {task.schedule?.notes && (
                          <span className="crop-category-subnote">{task.schedule.notes}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Schedule & Output */}
                  <div className="crop-task-panel-right">
                    {/* Schedule & Timing Card */}
                    <div className="crop-task-card">
                      <div className="crop-card-header">
                        <Clock size={15} className="crop-card-icon" aria-hidden="true" />
                        <h4>Schedule &amp; Timing</h4>
                      </div>
                      <div className="crop-schedule-box">
                        <div className="crop-schedule-line">
                          <Calendar size={14} className="crop-sched-icon" aria-hidden="true" />
                          <span className="crop-sched-date">{scheduleDateFormatted}</span>
                        </div>
                        <div className="crop-schedule-line">
                          <Clock size={14} className="crop-sched-icon" aria-hidden="true" />
                          <span className="crop-sched-time">{timeWindowFormatted}</span>
                        </div>
                        <div className="crop-duration-strip">
                          <span>Estimated Duration:</span>
                          <span className="crop-duration-pill">{durationFormatted}</span>
                        </div>
                      </div>
                    </div>

                    {/* Harvest Yield Breakdown (when applicable) */}
                    {(isHarvest || hasHarvestYield) && (
                      <div className="crop-task-card">
                        <div className="crop-card-header">
                          <Package size={15} className="crop-card-icon" aria-hidden="true" />
                          <h4>Harvest Yield Output</h4>
                        </div>
                        <div className="crop-harvest-grid">
                          <div className="crop-harvest-tile">
                            <span className="crop-yield-label">Small</span>
                            <strong className="crop-yield-val">{task.harvest_small_count ?? 0} pcs</strong>
                          </div>
                          <div className="crop-harvest-tile">
                            <span className="crop-yield-label">Medium</span>
                            <strong className="crop-yield-val">{task.harvest_medium_count ?? 0} pcs</strong>
                          </div>
                          <div className="crop-harvest-tile">
                            <span className="crop-yield-label">Large</span>
                            <strong className="crop-yield-val">{task.harvest_large_count ?? 0} pcs</strong>
                          </div>
                          <div className="crop-harvest-tile is-damaged">
                            <span className="crop-yield-label">Damaged</span>
                            <strong className="crop-yield-val">{task.harvest_damaged_count ?? 0} pcs</strong>
                          </div>
                        </div>

                        {task.harvest_proof_image_url && (
                          <div className="crop-proof-preview">
                            <span className="crop-proof-label">Submitted Harvest Proof</span>
                            <div
                              className="crop-proof-img-wrap"
                              onClick={() => setDisputeActivePhoto({
                                url: task.harvest_proof_image_url,
                                title: 'Harvest Proof Photo',
                                subtitle: `Submitted by ${worker?.full_name || 'Worker'} for Field ${task.field || ''}`,
                              })}
                              role="button"
                              tabIndex={0}
                              title="Click to zoom full image"
                            >
                              <img src={task.harvest_proof_image_url} alt="Harvest Proof" />
                              <div className="crop-zoom-hint">
                                <ZoomIn size={14} aria-hidden="true" />
                                <span>Zoom</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Description & Instructions */}
                    <div className="crop-task-card">
                      <div className="crop-card-header">
                        <ClipboardPlus size={15} className="crop-card-icon" aria-hidden="true" />
                        <h4>Instructions &amp; Description</h4>
                      </div>
                      <div className="crop-description-box">
                        <p>{task.description || 'No additional instructions provided for this task.'}</p>
                      </div>
                    </div>

                    {/* Worker Completion Notes (if recorded) */}
                    {task.completion_notes && (
                      <div className="crop-task-card">
                        <div className="crop-card-header">
                          <Info size={15} className="crop-card-icon" aria-hidden="true" />
                          <h4>Worker Completion Notes</h4>
                        </div>
                        <div className="crop-completion-notes-box">
                          <p>{task.completion_notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="crop-task-footer">
                  <div className="crop-footer-left">
                    {task.status === 'awaiting_approval' && (
                      <button
                        type="button"
                        className="crop-footer-btn is-review"
                        onClick={() => {
                          const taskToReview = modal.task
                          setModal(null)
                          openReviewHarvest(taskToReview)
                        }}
                      >
                        <Check size={14} aria-hidden="true" />
                        <span>Review Harvest</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="crop-footer-btn is-edit"
                      onClick={() => {
                        const taskToEdit = modal.task
                        setModal(null)
                        openEditTask(taskToEdit)
                      }}
                    >
                      <Pencil size={14} aria-hidden="true" />
                      <span>Edit Task</span>
                    </button>
                  </div>
                  <div className="crop-footer-right">
                    <button
                      type="button"
                      className="crop-footer-btn is-print"
                      onClick={() => window.print()}
                    >
                      <Printer size={14} aria-hidden="true" />
                      <span>Print Slip</span>
                    </button>
                    <button
                      type="button"
                      className="crop-footer-btn is-close"
                      onClick={() => setModal(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )
      })()}

      {modal?.mode === 'view-delivery' && (() => {
        const isDelivered = modal.order.delivery_assignment_status === 'delivered' || modal.order.order_status === 'delivered' || modal.order.order_status === 'completed'
        const isPickedUp = isDelivered || modal.order.delivery_assignment_status === 'picked_up' || modal.order.delivery_assignment_status === 'out_for_delivery'
        const isAccepted = isPickedUp || modal.order.delivery_assignment_status === 'accepted'
        const isGcash = modal.order.payment_method === 'gcash'
        const items = Array.isArray(modal.order.items) ? modal.order.items : []
        const totalItemsCount = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0)

        return (
          <div className="task-modal-backdrop">
            <section
              className="task-reference-modal delivery-details-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="view-delivery-title"
            >
              <TaskModalHeader
                title={
                  <span className="dispute-header-title">
                    <span id="view-delivery-title">Delivery Order Details</span>
                    <span className="dispute-order-pill">#{modal.order.order_number}</span>
                  </span>
                }
                tag="Delivery dispatch &amp; scheduling"
                onClose={() => setModal(null)}
              />

              {/* Milestone Progress Stepper */}
              <div className="delivery-stepper-bar">
                <div className="delivery-stepper-inner">
                  {/* Step 1: Assigned */}
                  <div className="delivery-step is-complete">
                    <div className="delivery-step-dot">✓</div>
                    <div className="delivery-step-text">
                      <strong>Assigned</strong>
                      <span>{modal.order.driver_assigned_at ? formatSchedule(modal.order.driver_assigned_at) : (modal.order.delivery_scheduled_at ? formatSchedule(modal.order.delivery_scheduled_at) : 'Dispatched')}</span>
                    </div>
                  </div>
                  <div className={`delivery-step-connector ${isAccepted ? 'is-complete' : ''}`} />

                  {/* Step 2: Accepted */}
                  <div className={`delivery-step ${isAccepted ? 'is-complete' : ''}`}>
                    <div className="delivery-step-dot">{isAccepted ? '✓' : '2'}</div>
                    <div className="delivery-step-text">
                      <strong>Accepted</strong>
                      <span>{modal.order.delivery_accepted_at ? formatSchedule(modal.order.delivery_accepted_at) : (isAccepted ? 'Accepted' : 'Pending')}</span>
                    </div>
                  </div>
                  <div className={`delivery-step-connector ${isPickedUp ? 'is-complete' : ''}`} />

                  {/* Step 3: Picked Up */}
                  <div className={`delivery-step ${isPickedUp ? 'is-complete' : ''}`}>
                    <div className="delivery-step-dot">{isPickedUp ? '✓' : '3'}</div>
                    <div className="delivery-step-text">
                      <strong>Picked Up</strong>
                      <span>{modal.order.delivery_picked_up_at ? formatSchedule(modal.order.delivery_picked_up_at) : (isPickedUp ? 'In Transit' : 'Pending')}</span>
                    </div>
                  </div>
                  <div className={`delivery-step-connector ${isDelivered ? 'is-complete' : ''}`} />

                  {/* Step 4: Delivered */}
                  <div className={`delivery-step ${isDelivered ? 'is-complete' : ''}`}>
                    <div className="delivery-step-dot">{isDelivered ? '✓' : '4'}</div>
                    <div className="delivery-step-text">
                      <strong>Delivered</strong>
                      <span>{modal.order.delivered_at ? formatSchedule(modal.order.delivered_at) : modal.order.delivery_proof_submitted_at ? formatSchedule(modal.order.delivery_proof_submitted_at) : (isDelivered ? 'Delivered' : 'Pending')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Column Responsive Body */}
              <div className="delivery-modal-grid custom-scrollbar">
                
                {/* LEFT COLUMN: Route, Schedule, Driver & Proof */}
                <div className="delivery-panel-left">
                  
                  {/* Delivery Window Card */}
                  <div className="delivery-card">
                    <div className="delivery-card-header">
                      <span className="delivery-card-title">
                        <Clock size={14} className="delivery-title-icon" aria-hidden="true" />
                        Scheduled Delivery Window
                      </span>
                      {isDelivered ? (
                        <span className="delivery-status-pill is-delivered">
                          <span className="delivery-status-dot" />
                          Delivered On Time
                        </span>
                      ) : modal.order.delivery_assignment_status === 'out_for_delivery' || modal.order.delivery_assignment_status === 'picked_up' ? (
                        <span className="delivery-status-pill is-transit">
                          <span className="delivery-status-dot is-pulse" />
                          Out for Delivery
                        </span>
                      ) : modal.order.delivery_assignment_status === 'accepted' ? (
                        <span className="delivery-status-pill is-accepted">
                          <span className="delivery-status-dot" />
                          Driver Accepted
                        </span>
                      ) : (
                        <span className="delivery-status-pill is-assigned">
                          <span className="delivery-status-dot" />
                          Scheduled
                        </span>
                      )}
                    </div>
                    <div className="delivery-window-display">
                      <strong>{formatDeliveryWindow(modal.order.delivery_scheduled_at, modal.order.delivery_window_end_at)}</strong>
                      <span>Driver dispatched on designated farm delivery route</span>
                    </div>
                  </div>

                  {/* Customer & Driver 2-Grid */}
                  <div className="delivery-two-cards">
                    {/* Customer */}
                    <div className="delivery-card">
                      <span className="delivery-card-subtitle">Customer Information</span>
                      <div className="delivery-actor-row">
                        <div className="delivery-actor-avatar is-buyer">
                          {(modal.order.delivery_full_name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="delivery-actor-meta">
                          <strong title={modal.order.delivery_full_name}>{modal.order.delivery_full_name || 'Customer'}</strong>
                          <span>Buyer Account</span>
                        </div>
                      </div>
                      <div className="delivery-actor-footer">
                        <span>Contact:</span>
                        <strong>{modal.order.delivery_mobile_number || 'Not provided'}</strong>
                      </div>
                    </div>

                    {/* Driver & Vehicle */}
                    <div className="delivery-card">
                      <span className="delivery-card-subtitle">Assigned Driver &amp; Vehicle</span>
                      <div className="delivery-actor-row">
                        <div className="delivery-actor-avatar is-driver">
                          <Truck size={18} aria-hidden="true" />
                        </div>
                        <div className="delivery-actor-meta">
                          <strong title={modal.order.assigned_driver?.full_name}>{modal.order.assigned_driver?.full_name || 'Unassigned driver'}</strong>
                          <span>Farm Logistics Driver</span>
                        </div>
                      </div>
                      <div className="delivery-actor-footer">
                        <span>Vehicle:</span>
                        <strong className="delivery-vehicle-tag">
                          {modal.order.assigned_vehicle
                            ? `${modal.order.assigned_vehicle.vehicle_name} · ${modal.order.assigned_vehicle.plate_number}`
                            : 'No vehicle assigned'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Destination Address Card */}
                  <div className="delivery-card">
                    <span className="delivery-card-title">
                      <MapPin size={14} className="delivery-title-icon" aria-hidden="true" />
                      Delivery Destination
                    </span>
                    <p className="delivery-address-text">
                      {[modal.order.delivery_barangay, modal.order.delivery_city_municipality, modal.order.delivery_province, modal.order.delivery_region].filter(Boolean).join(', ') || 'No delivery address provided.'}
                    </p>
                  </div>

                  {/* Proof of Delivery Card (when Delivered or has Photo) */}
                  {(modal.order.delivery_proof_image_url || isDelivered) && (
                    <div className="delivery-card delivery-proof-box">
                      <div className="delivery-card-header">
                        <span className="delivery-card-title">
                          <Camera size={14} className="delivery-title-icon" aria-hidden="true" />
                          Driver's Proof of Delivery
                        </span>
                        {modal.order.delivery_proof_submitted_at && (
                          <span className="delivery-card-meta">
                            Submitted {formatSchedule(modal.order.delivery_proof_submitted_at)}
                          </span>
                        )}
                      </div>

                      {modal.order.delivery_proof_image_url ? (
                        <div className="delivery-proof-layout">
                          <div
                            className="delivery-proof-thumbnail-wrap"
                            onClick={() =>
                              setDisputeActivePhoto({
                                url: modal.order.delivery_proof_image_url,
                                title: "Proof of Delivery — Doorstep Drop-off",
                                subtitle: `Order #${modal.order.order_number} · Driver: ${modal.order.assigned_driver?.full_name || 'Assigned Driver'}${modal.order.delivery_proof_submitted_at ? ` · ${formatSchedule(modal.order.delivery_proof_submitted_at)}` : ''}`,
                              })
                            }
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && setDisputeActivePhoto({ url: modal.order.delivery_proof_image_url, title: "Proof of Delivery" })}
                            title="Click to view full size"
                          >
                            <img src={modal.order.delivery_proof_image_url} alt="Proof of delivery" className="delivery-proof-thumbnail" />
                            <div className="delivery-proof-thumbnail-overlay">
                              <ZoomIn size={15} /> <span>Enlarge</span>
                            </div>
                          </div>

                          <div className="delivery-proof-details">
                            <span className="delivery-proof-note-label">Driver Drop-off Note:</span>
                            <p className="delivery-proof-note-text">
                              {modal.order.delivery_proof_notes ? `"${modal.order.delivery_proof_notes}"` : 'No additional note added by driver.'}
                            </p>
                            <div className="delivery-proof-badges">
                              <span className="delivery-proof-badge-verified">✓ Doorstep Drop-off Verified</span>
                              <span>·</span>
                              <span>Logged to tracking history</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="delivery-proof-empty-notice">
                          <span>Delivery marked completed. Drop-off photo was not attached by driver.</span>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* RIGHT COLUMN: Order Items & Financials */}
                <div className="delivery-panel-right">
                  <div className="delivery-right-inner">
                    
                    {/* Financial Summary Box */}
                    <div className="delivery-financial-card">
                      <div className="delivery-financial-top">
                        <span className="delivery-financial-kicker">Total Order Amount</span>
                        <span className="delivery-payment-method-badge">
                          <span className="delivery-payment-dot" />
                          {isGcash ? 'GCash Paid' : (modal.order.payment_method || 'Cash').toUpperCase()}
                        </span>
                      </div>
                      <div className="delivery-financial-amount">
                        ₱{Number(modal.order.total_amount || 0).toFixed(2)}
                      </div>
                      <div className="delivery-financial-meta">
                        <span>Payment Status:</span>
                        <strong>{modal.order.payment_status ? modal.order.payment_status.toUpperCase() : (isGcash ? 'PAID' : 'COD / SETTLED')}</strong>
                      </div>
                    </div>

                    {/* Order Items Manifest List */}
                    <div className="delivery-manifest-section">
                      <div className="delivery-manifest-header">
                        <span className="delivery-manifest-title">Order Items Manifest</span>
                        <span className="delivery-manifest-count">
                          {items.length > 0 ? `${items.length} product${items.length === 1 ? '' : 's'} · ${totalItemsCount} units` : 'Produce Manifest'}
                        </span>
                      </div>

                      {items.length > 0 ? (
                        <div className="delivery-manifest-list">
                          {items.map((item, idx) => (
                            <div key={item.id || idx} className="delivery-manifest-row">
                              <div className="delivery-manifest-item-main">
                                <span className="delivery-manifest-emoji" aria-hidden="true">🍍</span>
                                <div className="delivery-manifest-item-meta">
                                  <strong>{item.product_name}</strong>
                                  <span>
                                    Qty: {item.quantity} {item.weight_label ? `(${item.weight_label})` : 'pcs'}
                                    {item.unit_price && ` · ₱${Number(item.unit_price).toFixed(2)} each`}
                                  </span>
                                </div>
                              </div>
                              <strong className="delivery-manifest-item-total">
                                ₱{Number(item.line_total || (Number(item.unit_price || 0) * Number(item.quantity || 1))).toFixed(2)}
                              </strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="delivery-manifest-fallback">
                          <div className="delivery-manifest-row">
                            <div className="delivery-manifest-item-main">
                              <span className="delivery-manifest-emoji" aria-hidden="true">📦</span>
                              <div className="delivery-manifest-item-meta">
                                <strong>Fresh Produce Order</strong>
                                <span>Prepared farm produce package</span>
                              </div>
                            </div>
                            <strong className="delivery-manifest-item-total">
                              ₱{Number(modal.order.total_amount || 0).toFixed(2)}
                            </strong>
                          </div>
                        </div>
                      )}

                      <div className="delivery-breakdown-card">
                        <div className="delivery-breakdown-row">
                          <span>Produce Subtotal</span>
                          <strong>₱{Number(modal.order.total_amount || 0).toFixed(2)}</strong>
                        </div>
                        <div className="delivery-breakdown-row">
                          <span>Delivery Fee</span>
                          <span className="is-free">FREE (Farm Dispatch)</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="delivery-modal-footer">
                    {modal.order.order_status === 'ready_for_delivery' && modal.order.delivery_assignment_status === 'assigned' && (
                      <button
                        type="button"
                        className="delivery-footer-btn is-edit"
                        onClick={() => {
                          const orderToEdit = modal.order
                          setModal(null)
                          openEditDelivery(orderToEdit)
                        }}
                      >
                        <Pencil size={14} aria-hidden="true" />
                        <span>Edit Schedule</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="delivery-footer-btn is-print"
                      onClick={() => window.print()}
                    >
                      <Printer size={14} aria-hidden="true" />
                      <span>Print Slip</span>
                    </button>
                    <button
                      type="button"
                      className="delivery-footer-btn is-close"
                      onClick={() => setModal(null)}
                    >
                      Close
                    </button>
                  </div>

                </div>

              </div>

            </section>
          </div>
        )
      })()}

      {modal?.mode === 'review-dispute' && (() => {
        const parsedReport = parseDisputeReason(modal.order.delivery_dispute_reason)
        const suggestedVal = modal.order.disputed_item
          ? (Number(modal.order.disputed_item.unit_price) * Number(modal.order.delivery_dispute_affected_quantity || 0)).toFixed(2)
          : null
        const buyerPhotos = Array.isArray(modal.order.delivery_dispute_photo_urls) ? modal.order.delivery_dispute_photo_urls : []
        const isGcash = modal.order.payment_method === 'gcash'

        return (
          <div className="task-modal-backdrop">
            <section
              className="task-reference-modal dispute-review-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="review-dispute-title"
            >
              <TaskModalHeader
                title={
                  <span className="dispute-header-title">
                    <span id="review-dispute-title">Review Delivery Dispute</span>
                    <span className="dispute-order-pill">#{modal.order.order_number}</span>
                  </span>
                }
                tag="Dispute resolution"
                onClose={() => setModal(null)}
              />

              <div className="dispute-modal-body custom-scrollbar">
                {/* LEFT COLUMN: Case Context & Evidence */}
                <div className="dispute-panel-left">
                  {/* Order & Customer Overview */}
                  <div>
                    <span className="dispute-section-kicker">Order &amp; Customer Overview</span>
                    <div className="dispute-overview-grid">
                      <div className="dispute-overview-tile">
                        <span>Customer</span>
                        <strong title={modal.order.delivery_full_name || 'Not provided'}>
                          {modal.order.delivery_full_name || 'Not provided'}
                        </strong>
                      </div>
                      <div className="dispute-overview-tile">
                        <span>{modal.order.delivery_dispute_responsible_role === 'seller' ? 'Seller' : 'Driver'}</span>
                        <strong
                          title={
                            modal.order.delivery_dispute_responsible_role === 'seller'
                              ? modal.order.responsible_seller?.full_name || 'Seller (unidentified)'
                              : modal.order.assigned_driver?.full_name || 'Unassigned driver'
                          }
                        >
                          {modal.order.delivery_dispute_responsible_role === 'seller'
                            ? modal.order.responsible_seller?.full_name || 'Seller (unidentified)'
                            : modal.order.assigned_driver?.full_name || 'Unassigned driver'}
                        </strong>
                      </div>
                      <div className="dispute-overview-tile">
                        <span>Payment</span>
                        <span className="dispute-payment-pill">
                          <span className="dispute-payment-dot" />
                          {isGcash ? 'GCash' : (modal.order.payment_method || 'Cash').toUpperCase()}
                        </span>
                      </div>
                      <div className="dispute-overview-tile">
                        <span>Reported</span>
                        <strong title={formatSchedule(modal.order.delivery_dispute_created_at)}>
                          {formatSchedule(modal.order.delivery_dispute_created_at)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Structured Buyer's Claim Card */}
                  <div className="dispute-claim-card">
                    <div className="dispute-claim-top">
                      <div className="dispute-claim-title-wrap">
                        <span>Customer's Claim</span>
                        <h4>
                          {modal.order.delivery_dispute_category
                            ? modal.order.delivery_dispute_category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                            : 'Delivery Issue Report'}
                        </h4>
                      </div>
                      <span className="dispute-resolution-badge">
                        <RotateCcw size={13} aria-hidden="true" />
                        Requested: {parsedReport.resolutionLabel}
                      </span>
                    </div>

                    {modal.order.disputed_item ? (
                      <div className="dispute-item-row">
                        <div className="dispute-item-info">
                          <div className="dispute-item-icon" aria-hidden="true">🍍</div>
                          <div>
                            <strong className="dispute-item-name">{modal.order.disputed_item.product_name}</strong>
                            <span className="dispute-item-qty">
                              {modal.order.delivery_dispute_affected_quantity || 1} of {modal.order.disputed_item.quantity} flagged
                              {modal.order.disputed_item.unit_price && ` · ₱${Number(modal.order.disputed_item.unit_price).toFixed(2)}/unit`}
                            </span>
                          </div>
                        </div>
                        {suggestedVal && (
                          <div className="dispute-item-val">
                            <span>Item Value</span>
                            <strong>₱{suggestedVal}</strong>
                          </div>
                        )}
                      </div>
                    ) : parsedReport.itemBreakdownText ? (
                      <div className="dispute-item-row">
                        <div className="dispute-item-info">
                          <div className="dispute-item-icon" aria-hidden="true">📦</div>
                          <div>
                            <strong className="dispute-item-name">Flagged Items</strong>
                            <span className="dispute-item-qty">{parsedReport.itemBreakdownText}</span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="dispute-buyer-comment-wrap">
                      <span>Buyer's Description</span>
                      <p className="dispute-buyer-comment">
                        {parsedReport.userDescription ? `"${parsedReport.userDescription}"` : 'No additional text remarks provided by customer.'}
                      </p>
                    </div>
                  </div>

                  {/* Side-by-Side Photographic Evidence Comparison */}
                  <div className="dispute-evidence-section">
                    <div className="dispute-evidence-header">
                      <span>Photographic Evidence Comparison</span>
                      <small>Click image to enlarge</small>
                    </div>

                    <div className="dispute-evidence-compare-grid">
                      {/* Left: Buyer Evidence */}
                      <div className="dispute-evidence-box">
                        <div className="dispute-evidence-box-header">
                          <span className="dispute-evidence-tag">
                            <span className="dispute-dot-buyer" />
                            Buyer Evidence
                          </span>
                          <span className="dispute-evidence-meta">
                            {buyerPhotos.length} photo{buyerPhotos.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {buyerPhotos.length > 0 ? (
                          <div className="dispute-evidence-thumbs-list">
                            {buyerPhotos.map((url, index) => (
                              <div
                                key={url || index}
                                className="dispute-evidence-thumb-wrap"
                                onClick={() =>
                                  setDisputeActivePhoto({
                                    url,
                                    title: `Buyer Evidence (Photo ${index + 1} of ${buyerPhotos.length})`,
                                    subtitle: `Order #${modal.order.order_number} · Submitted ${formatSchedule(modal.order.delivery_dispute_created_at)}`,
                                  })
                                }
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && setDisputeActivePhoto({ url, title: `Buyer Evidence (Photo ${index + 1})` })}
                                title="Click to view full size"
                              >
                                <img src={url} alt={`Buyer evidence ${index + 1}`} className="dispute-evidence-thumb" />
                                <div className="dispute-evidence-thumb-hover">
                                  <ZoomIn size={15} /> <span>Zoom</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="dispute-evidence-empty">
                            <span>No buyer photos submitted</span>
                          </div>
                        )}

                        <span className="dispute-evidence-subtext">
                          Submitted {formatSchedule(modal.order.delivery_dispute_created_at)}
                        </span>
                      </div>

                      {/* Right: Driver Delivery Proof */}
                      <div className="dispute-evidence-box">
                        <div className="dispute-evidence-box-header">
                          <span className="dispute-evidence-tag">
                            <span className="dispute-dot-driver" />
                            Driver Proof
                          </span>
                          <span className="dispute-evidence-meta">Doorstep</span>
                        </div>

                        {modal.order.delivery_proof_image_url ? (
                          <div
                            className="dispute-evidence-thumb-wrap"
                            onClick={() =>
                              setDisputeActivePhoto({
                                url: modal.order.delivery_proof_image_url,
                                title: "Driver's Delivery Proof",
                                subtitle: `Order #${modal.order.order_number} · ${modal.order.assigned_driver?.full_name ? `Driver: ${modal.order.assigned_driver.full_name}` : 'Drop-off Photo'}`,
                              })
                            }
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && setDisputeActivePhoto({ url: modal.order.delivery_proof_image_url, title: "Driver's Delivery Proof" })}
                            title="Click to view full size"
                          >
                            <img src={modal.order.delivery_proof_image_url} alt="Driver proof of delivery" className="dispute-evidence-thumb" />
                            <div className="dispute-evidence-thumb-hover">
                              <ZoomIn size={15} /> <span>Zoom</span>
                            </div>
                          </div>
                        ) : (
                          <div className="dispute-evidence-empty">
                            <span>No driver proof photo recorded</span>
                          </div>
                        )}

                        <span className="dispute-evidence-subtext" title={modal.order.delivery_proof_notes || 'Captured upon delivery'}>
                          {modal.order.delivery_proof_notes ? `Note: "${modal.order.delivery_proof_notes}"` : 'Captured upon delivery'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Responsible party response (if provided) */}
                  {modal.order.delivery_dispute_response && (
                    <div className="dispute-response-card">
                      <div className="dispute-response-header">
                        <span className="dispute-response-role-badge">
                          {modal.order.delivery_dispute_responsible_role === 'seller' ? "Seller's Explanation" : "Driver's Explanation"}
                        </span>
                        {modal.order.delivery_dispute_response_at && (
                          <span className="dispute-response-time">{formatSchedule(modal.order.delivery_dispute_response_at)}</span>
                        )}
                      </div>
                      <p className="dispute-response-text">{modal.order.delivery_dispute_response}</p>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Adjudication Decision Panel */}
                <div className="dispute-panel-right">
                  <div className="dispute-decision-inner">
                    <div className="dispute-adjudication-header">
                      <span className="dispute-section-kicker">Resolution Decision</span>
                      <h3 className="dispute-section-title">Select Action to Resolve Dispute</h3>
                    </div>

                    {/* Decision Switcher Tabs */}
                    <div className="dispute-decision-switcher" role="radiogroup" aria-label="Resolution decision">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={disputeDecision === 'refunded'}
                        className={`dispute-decision-tab ${disputeDecision === 'refunded' ? 'is-active is-refund' : ''}`}
                        onClick={() => {
                          setDisputeDecision('refunded')
                          if (!disputeResolutionNotes || disputeResolutionNotes.includes('Claim dismissed')) {
                            setDisputeResolutionNotes('Produce damaged in transit. Approved partial refund of item cost.')
                          }
                        }}
                      >
                        <Check size={16} aria-hidden="true" />
                        <span>Approve Refund</span>
                      </button>

                      <button
                        type="button"
                        role="radio"
                        aria-checked={disputeDecision === 'dismissed'}
                        className={`dispute-decision-tab ${disputeDecision === 'dismissed' ? 'is-active is-dismiss' : ''}`}
                        onClick={() => {
                          setDisputeDecision('dismissed')
                          if (!disputeResolutionNotes || disputeResolutionNotes.includes('Approved partial refund')) {
                            setDisputeResolutionNotes('Driver delivery proof confirms produce arrived intact and accepted in good order. Claim dismissed.')
                          }
                        }}
                      >
                        <X size={16} aria-hidden="true" />
                        <span>Dismiss Dispute</span>
                      </button>
                    </div>

                    {/* Decision Form Content */}
                    {disputeDecision === 'refunded' ? (
                      <div className="dispute-form-fields">
                        <label className="dispute-form-label">
                          <div className="dispute-label-row">
                            <span>Refund Amount (₱)</span>
                            {suggestedVal && <small>Flagged Item: ₱{suggestedVal} · Order total: ₱{Number(modal.order.total_amount).toFixed(2)}</small>}
                          </div>
                          <div className="dispute-input-prefix-wrap">
                            <span className="dispute-input-prefix">₱</span>
                            <input
                              type="number"
                              min="0"
                              max={Number(modal.order.total_amount) || undefined}
                              step="0.01"
                              value={disputeRefundAmount}
                              onChange={(event) => setDisputeRefundAmount(event.target.value)}
                              placeholder="0.00"
                              className="dispute-number-input"
                            />
                          </div>
                        </label>

                        {isGcash ? (
                          <div className="dispute-payment-info-box">
                            <strong>Payment Method: GCash</strong>
                            <p>
                              A refund amount of ₱{Number(disputeRefundAmount || 0).toFixed(2)} will be marked in the dispute record.
                              (PayMongo automated disbursement pending integration; recorded for audit).
                            </p>
                          </div>
                        ) : (
                          <label className="dispute-form-label">
                            <div className="dispute-label-row">
                              <span>Manual Transfer Reference</span>
                              <small className="is-required">(Required for {modal.order.payment_method || 'Cash'})</small>
                            </div>
                            <input
                              type="text"
                              value={disputeRefundReference}
                              onChange={(event) => setDisputeRefundReference(event.target.value)}
                              maxLength={300}
                              placeholder="e.g. Cash returned on inspection, or GCash ref #123456"
                              className="dispute-text-input"
                            />
                          </label>
                        )}
                      </div>
                    ) : (
                      <div className="dispute-dismiss-notice">
                        <strong>Dismissing Claim:</strong>
                        <p>No refund will be credited. The order will be finalized as completed. Please state the dismissal reason below.</p>
                      </div>
                    )}

                    {/* Resolution Note & Quick Presets */}
                    <div className="dispute-notes-field">
                      <div className="dispute-label-row">
                        <span className="dispute-field-label">Resolution Note (Required)</span>
                        <small>Visible to customer &amp; records</small>
                      </div>
                      <textarea
                        className="dispute-resolution-textarea"
                        value={disputeResolutionNotes}
                        onChange={(event) => setDisputeResolutionNotes(event.target.value)}
                        rows={3}
                        maxLength={1000}
                        placeholder="Explain your decision…"
                      />

                      <div className="dispute-presets-bar">
                        <span className="dispute-presets-title">Presets:</span>
                        {disputeDecision === 'refunded' ? (
                          <>
                            <button
                              type="button"
                              className="dispute-preset-chip"
                              onClick={() => setDisputeResolutionNotes('Produce damaged in transit. Approved partial refund of item cost.')}
                            >
                              Damage approved
                            </button>
                            <button
                              type="button"
                              className="dispute-preset-chip"
                              onClick={() => setDisputeResolutionNotes('Item confirmed spoiled or damaged upon delivery inspection. Full refund approved.')}
                            >
                              Spoiled / Damaged
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="dispute-preset-chip"
                              onClick={() => setDisputeResolutionNotes('Driver delivery proof confirms produce arrived intact and accepted in good order. Claim dismissed.')}
                            >
                              Proof intact
                            </button>
                            <button
                              type="button"
                              className="dispute-preset-chip"
                              onClick={() => setDisputeResolutionNotes('Dispute evidence does not substantiate product defect or delivery fault. Claim dismissed.')}
                            >
                              Unsubstantiated
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {error && <div className="tasks-error" role="alert" style={{ marginTop: '12px', borderRadius: '8px' }}>{error}</div>}
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="dispute-footer-actions">
                    {disputeDecision === 'refunded' ? (
                      <button
                        type="button"
                        className="dispute-submit-btn is-refund"
                        disabled={
                          saving ||
                          !disputeResolutionNotes.trim() ||
                          !disputeRefundAmount ||
                          Number(disputeRefundAmount) <= 0 ||
                          Number(disputeRefundAmount) > Number(modal.order.total_amount) ||
                          (!isGcash && !disputeRefundReference.trim())
                        }
                        onClick={() => resolveDispute('refunded')}
                      >
                        {saving
                          ? 'Processing Refund…'
                          : `Confirm Refund ₱${Number(disputeRefundAmount || 0).toFixed(2)}`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="dispute-submit-btn is-dismiss"
                        disabled={saving || !disputeResolutionNotes.trim()}
                        onClick={() => resolveDispute('dismissed')}
                      >
                        {saving ? 'Dismissing Dispute…' : 'Dismiss Dispute (Reject Claim)'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="dispute-cancel-btn"
                      disabled={saving}
                      onClick={() => setModal(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )
      })()}

      {disputeActivePhoto && (
        <div
          className="dispute-lightbox-overlay"
          onClick={() => setDisputeActivePhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged evidence photo"
        >
          <div className="dispute-lightbox-dialog" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="dispute-lightbox-close"
              onClick={() => setDisputeActivePhoto(null)}
              aria-label="Close enlarged photo"
            >
              <X size={20} />
            </button>
            <div className="dispute-lightbox-image-wrap">
              <img src={disputeActivePhoto.url} alt={disputeActivePhoto.title || 'Evidence photo'} className="dispute-lightbox-img" />
            </div>
            <div className="dispute-lightbox-footer">
              <strong>{disputeActivePhoto.title}</strong>
              {disputeActivePhoto.subtitle && <p>{disputeActivePhoto.subtitle}</p>}
            </div>
          </div>
        </div>
      )}

      {modal?.mode === 'review-harvest' && <div className="task-modal-backdrop">
        <section className="task-reference-modal view-task-modal" role="dialog" aria-modal="true" aria-labelledby="review-harvest-title">
          <TaskModalHeader title="Review Harvest Report" tag="Harvest approval" onClose={() => setModal(null)} />
          <div className="task-reference-body task-view-body">
            <div className="task-view-grid">
              <div className="task-view-tile">
                <span className="task-view-tile-label">Field</span>
                <strong className="task-view-tile-value">{modal.task.field}</strong>
              </div>
              <div className="task-view-tile">
                <span className="task-view-tile-label">Farm Worker</span>
                <strong className="task-view-tile-value">{modal.task.assigned_worker?.full_name || 'Unassigned worker'}</strong>
              </div>
              <div className="task-view-tile task-view-tile-full">
                <span className="task-view-tile-label">Finished</span>
                <strong className="task-view-tile-value">{formatSchedule(modal.task.completed_at)}</strong>
              </div>
            </div>
            {modal.task.harvest_proof_image_url && (
              <section className="task-view-description">
                <span>Worker's Proof Photo</span>
                <img className="dispute-proof-photo" src={modal.task.harvest_proof_image_url} alt="Harvest proof submitted by the worker" />
              </section>
            )}
            {modal.task.completion_notes && (
              <section className="task-view-description">
                <span>Worker's Notes</span>
                <p>{modal.task.completion_notes}</p>
              </section>
            )}
            <section className="task-view-description">
              <span>Reported Counts (editable before approving)</span>
              <div className="harvest-approval-counts">
                <label><span>Small</span><input type="number" min="0" value={harvestApprovalForm.harvest_small_count} onChange={(event) => setHarvestApprovalForm({ ...harvestApprovalForm, harvest_small_count: event.target.value })} /></label>
                <label><span>Medium</span><input type="number" min="0" value={harvestApprovalForm.harvest_medium_count} onChange={(event) => setHarvestApprovalForm({ ...harvestApprovalForm, harvest_medium_count: event.target.value })} /></label>
                <label><span>Large</span><input type="number" min="0" value={harvestApprovalForm.harvest_large_count} onChange={(event) => setHarvestApprovalForm({ ...harvestApprovalForm, harvest_large_count: event.target.value })} /></label>
                <label><span>Damaged</span><input type="number" min="0" value={harvestApprovalForm.harvest_damaged_count} onChange={(event) => setHarvestApprovalForm({ ...harvestApprovalForm, harvest_damaged_count: event.target.value })} /></label>
              </div>
            </section>
            <section className="task-view-description">
              <span>Rejection Reason (required only to reject)</span>
              <textarea
                className="dispute-resolution-notes"
                value={harvestRejectionReason}
                onChange={(event) => setHarvestRejectionReason(event.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Explain what needs to be corrected…"
              />
            </section>
            {error && <div className="tasks-error" role="alert">{error}</div>}
            <div className="dispute-resolve-actions">
              <button type="button" className="is-primary" disabled={saving} onClick={approveHarvest}>
                {saving ? 'Saving…' : 'Approve & Add to Inventory'}
              </button>
              <button type="button" className="is-secondary" disabled={saving || !harvestRejectionReason.trim()} onClick={rejectHarvest}>
                {saving ? 'Saving…' : 'Reject'}
              </button>
            </div>
          </div>
        </section>
      </div>}

      {modal?.mode === 'edit-delivery' && (() => {
        const order = modal.order
        const drivers = options.workers.filter((worker) => worker.worker_category === 'driver')
        const currentDriver = drivers.find((d) => String(d.id) === String(deliveryEditForm.driver_id))
        const buyerInitials = (order.delivery_full_name || 'Buyer')
          .split(' ')
          .filter(Boolean)
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
        const fullAddress = [
          order.delivery_barangay,
          order.delivery_city_municipality,
          order.delivery_province,
          order.delivery_region,
        ].filter(Boolean).join(', ')
        const itemsCount = order.items?.length || 1
        const durationText = formatDeliveryDuration(deliveryEditForm.start_time, deliveryEditForm.end_time)
        const isMorningActive = deliveryEditForm.start_time === '08:00' && deliveryEditForm.end_time === '12:00'
        const isAfternoonActive = deliveryEditForm.start_time === '13:00' && deliveryEditForm.end_time === '17:00'
        const isFullDayActive = deliveryEditForm.start_time === '08:00' && deliveryEditForm.end_time === '17:00'

        return (
          <div className="task-modal-backdrop">
            <section
              className="task-reference-modal edit-delivery-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-delivery-title"
            >
              <TaskModalHeader
                title={
                  <span className="delivery-header-title">
                    <span id="edit-delivery-title">Edit Delivery Order</span>
                    <span className="delivery-order-badge">#{order.order_number}</span>
                  </span>
                }
                tag="Logistics & Dispatch Management"
                onClose={() => setModal(null)}
              />

              <form className="edit-delivery-form" onSubmit={saveDeliveryAssignment}>
                {error && <div className="task-modal-error" role="alert">{error}</div>}

                {/* Top Context Overview Card */}
                <div className="edit-delivery-context-card">
                  <div className="context-card-buyer">
                    <div className="context-avatar-circle" aria-hidden="true">
                      {buyerInitials}
                    </div>
                    <div className="context-buyer-info">
                      <span className="context-meta-label">Buyer / Recipient</span>
                      <strong className="context-buyer-name">{order.delivery_full_name || 'Valued Customer'}</strong>
                      {order.delivery_mobile_number ? (
                        <a href={`tel:${order.delivery_mobile_number}`} className="context-phone-link">
                          <Phone size={12} aria-hidden="true" />
                          <span>{order.delivery_mobile_number}</span>
                        </a>
                      ) : (
                        <span className="context-no-phone">No phone recorded</span>
                      )}
                    </div>
                  </div>

                  <div className="context-card-divider" />

                  <div className="context-card-dest">
                    <span className="context-meta-label">Destination Address</span>
                    <div className="context-dest-content">
                      <MapPin size={14} className="context-pin-icon" aria-hidden="true" />
                      <span>{fullAddress || 'Destination address on file'}</span>
                    </div>
                  </div>

                  <div className="context-card-divider" />

                  <div className="context-card-order">
                    <span className="context-meta-label">Order & Payment</span>
                    <div className="context-order-pills">
                      <span className="context-order-tag">
                        <Package size={12} aria-hidden="true" />
                        {itemsCount} {itemsCount === 1 ? 'item' : 'items'} · ₱{Number(order.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className={`context-pay-tag is-${order.payment_method || 'cod'}`}>
                        {(order.payment_method || 'cod').toUpperCase()} {order.payment_status ? `(${order.payment_status})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main 2-Column Form Grid */}
                <div className="edit-delivery-grid">
                  {/* Left: Driver Assignment Card */}
                  <div className="edit-delivery-card driver-card">
                    <div className="edit-card-heading">
                      <Truck size={17} className="edit-heading-icon" aria-hidden="true" />
                      <h3>Assigned Driver</h3>
                    </div>

                    <div className="edit-field-block">
                      <label htmlFor="edit-driver-select" className="edit-field-label">
                        Select Courier Driver
                      </label>
                      <div className="edit-select-wrapper">
                        <select
                          id="edit-driver-select"
                          className="edit-form-select"
                          value={deliveryEditForm.driver_id}
                          onChange={(e) => setDeliveryEditForm({ ...deliveryEditForm, driver_id: e.target.value })}
                          required
                        >
                          <option value="" disabled>Select a driver</option>
                          {drivers.map((driver) => (
                            <option value={driver.id} key={driver.id}>
                              {driver.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {currentDriver && (
                      <div className="edit-driver-meta-box">
                        <div className="edit-driver-avatar">
                          <User size={15} aria-hidden="true" />
                        </div>
                        <div className="edit-driver-details">
                          <strong>{currentDriver.full_name}</strong>
                          <span>Verified Fleet Driver</span>
                        </div>
                        <span className="edit-driver-status-badge">Active</span>
                      </div>
                    )}

                    <div className="edit-driver-reassurance-note">
                      <Info size={15} className="edit-note-icon" aria-hidden="true" />
                      <span>
                        Updating the driver will automatically dispatch a push notification to their device with the updated schedule.
                      </span>
                    </div>
                  </div>

                  {/* Right: Schedule Card */}
                  <div className="edit-delivery-card schedule-card">
                    <div className="edit-card-heading">
                      <Clock size={17} className="edit-heading-icon" aria-hidden="true" />
                      <h3>Delivery Schedule</h3>
                    </div>

                    <div className="edit-field-block">
                      <label htmlFor="edit-delivery-date" className="edit-field-label">
                        <Calendar size={13} aria-hidden="true" />
                        <span>Delivery Date</span>
                      </label>
                      <input
                        type="date"
                        id="edit-delivery-date"
                        className="edit-form-input"
                        value={deliveryEditForm.delivery_date}
                        onChange={(e) => setDeliveryEditForm({ ...deliveryEditForm, delivery_date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="edit-field-block">
                      <label className="edit-field-label">
                        <Clock size={13} aria-hidden="true" />
                        <span>Delivery Window</span>
                      </label>
                      <div className="date-time-pair delivery-time-pair">
                        <DeliveryTimeSelect
                          kind="start"
                          value={deliveryEditForm.start_time}
                          onChange={(event) => {
                            const startTime = event.target.value
                            const endOptions = deliveryTimeOptions('end', startTime)
                            setDeliveryEditForm({
                              ...deliveryEditForm,
                              start_time: startTime,
                              end_time: endOptions.some((option) => option.value === deliveryEditForm.end_time)
                                ? deliveryEditForm.end_time
                                : endOptions[0]?.value || '',
                            })
                          }}
                        />
                        <DeliveryTimeSelect
                          kind="end"
                          startTime={deliveryEditForm.start_time}
                          value={deliveryEditForm.end_time}
                          onChange={(event) => setDeliveryEditForm({ ...deliveryEditForm, end_time: event.target.value })}
                        />
                      </div>

                      {/* Quick Shift Presets */}
                      <div className="edit-shift-presets">
                        <span className="presets-label">Quick Presets:</span>
                        <div className="preset-buttons-wrap">
                          <button
                            type="button"
                            className={`preset-btn ${isMorningActive ? 'is-active' : ''}`}
                            onClick={() => setDeliveryEditForm((prev) => ({ ...prev, start_time: '08:00', end_time: '12:00' }))}
                          >
                            🌅 Morning (8–12)
                          </button>
                          <button
                            type="button"
                            className={`preset-btn ${isAfternoonActive ? 'is-active' : ''}`}
                            onClick={() => setDeliveryEditForm((prev) => ({ ...prev, start_time: '13:00', end_time: '17:00' }))}
                          >
                            ☀️ Afternoon (1–5)
                          </button>
                          <button
                            type="button"
                            className={`preset-btn ${isFullDayActive ? 'is-active' : ''}`}
                            onClick={() => setDeliveryEditForm((prev) => ({ ...prev, start_time: '08:00', end_time: '17:00' }))}
                          >
                            📦 Full Day (8–5)
                          </button>
                        </div>
                      </div>

                      {/* Duration Info */}
                      <div className="edit-duration-strip">
                        <span className="duration-label">Calculated Window:</span>
                        <span className="duration-value-pill">{durationText || 'Custom Window'}</span>
                      </div>
                      <small className="edit-schedule-notice">Operating hours: 7:00 AM to 6:00 PM (PST).</small>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <footer className="edit-delivery-footer">
                  <button
                    type="button"
                    className="edit-footer-btn is-cancel"
                    onClick={() => setModal(null)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="edit-footer-btn is-submit"
                    disabled={saving || !deliveryEditForm.driver_id || !deliveryEditForm.delivery_date}
                  >
                    <Send size={15} aria-hidden="true" />
                    <span>{saving ? 'Saving Changes…' : 'Save Delivery'}</span>
                  </button>
                </footer>
              </form>
            </section>
          </div>
        )
      })()}

      {(modal?.mode === 'add' || modal?.mode === 'edit') && <div className="task-modal-backdrop">
        <section className="task-reference-modal assign-task-modal" role="dialog" aria-modal="true" aria-labelledby="assign-task-title">
          <TaskModalHeader title={assigningDriver ? 'Assign Delivery Order' : modal.mode === 'add' ? 'Assign New Task' : 'Edit Task'} tag={assigningDriver ? 'Delivery assignment' : 'Task scheduling'} onClose={() => setModal(null)} />
          <form className="task-reference-body" onSubmit={saveTask}>
            {error && <div className="task-modal-error" role="alert">{error}</div>}
            <div className="task-dialog-grid">
              <div className="task-dialog-main">
                <label><span>Farm Worker Category</span><select value={form.worker_category} onChange={(event) => { const workerCategory = event.target.value; const firstWorker = options.workers.find((worker) => worker.worker_category === workerCategory); setForm({ ...form, worker_category: workerCategory, assigned_worker_id: firstWorker?.id || '', ...(workerCategory === 'crop_management_worker' ? { start_time: '08:00', end_time: '09:00' } : {}) }) }} required><option value="" disabled>Select Worker Category</option>{availableWorkerCategories.map((category) => <option value={category} key={category}>{workerCategoryLabels[category] || category}</option>)}</select></label>
                <label><span>{assigningDriver ? 'Select Driver' : 'Select Worker'}</span><select value={form.assigned_worker_id} onChange={(event) => setForm({ ...form, assigned_worker_id: event.target.value })} required><option value="" disabled>{assigningDriver ? 'Select Driver' : 'Select Worker'}</option>{visibleWorkers.map((worker) => <option value={worker.id} key={worker.id}>{worker.full_name}</option>)}</select></label>
                {!assigningDriver && <label><span>Select Task Category</span><select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} required><option value="" disabled>Select Task Category</option>{options.categories.map((category) => <option value={category.id} key={category.id}>{category.category_name}</option>)}</select></label>}
                {assigningDriver ? <label><span>Select Ready Order</span><select value={deliveryForm.order_id} onChange={(event) => setDeliveryForm({ ...deliveryForm, order_id: event.target.value })} required><option value="" disabled>Select Order</option>{readyOrders.map((order) => <option value={order.id} key={order.id}>{order.order_number} — {order.delivery_full_name}</option>)}</select>{!readyOrders.length && <small>No ready delivery orders are available.</small>}</label> : <label><span>Select Field</span><select value={form.field_id} onChange={(event) => setForm({ ...form, field_id: event.target.value })} required><option value="" disabled>Select Field</option>{options.fields.map((field) => <option value={field.id} key={field.id}>{field.field_name}</option>)}</select></label>}
              </div>
              <div className="task-dialog-side">
                {assigningDriver ? <><label><span>Delivery Date</span><input type="date" value={deliveryForm.delivery_date} onChange={(event) => setDeliveryForm({ ...deliveryForm, delivery_date: event.target.value })} required /></label><label><span>Delivery Window</span><div className="date-time-pair delivery-time-pair"><DeliveryTimeSelect kind="start" value={deliveryForm.start_time} onChange={(event) => { const startTime = event.target.value; const endOptions = deliveryTimeOptions('end', startTime); setDeliveryForm({ ...deliveryForm, start_time: startTime, end_time: endOptions.some((option) => option.value === deliveryForm.end_time) ? deliveryForm.end_time : endOptions[0]?.value || '' }) }} /><DeliveryTimeSelect kind="end" startTime={deliveryForm.start_time} value={deliveryForm.end_time} onChange={(event) => setDeliveryForm({ ...deliveryForm, end_time: event.target.value })} /></div><small>Schedule deliveries only from 7:00 AM to 6:00 PM.</small></label></> : <><label><span>Priority Level</span><select value={form.priority_id} onChange={(event) => setForm({ ...form, priority_id: event.target.value })} required><option value="" disabled>Select Level</option>{options.priorities.map((priority) => <option value={priority.id} key={priority.id}>{priority.priority_name}</option>)}</select></label>
                {modal.mode === 'edit' && <label><span>Status Level</span><select value={form.status_id} onChange={(event) => setForm({ ...form, status_id: event.target.value })}>{options.statuses.map((status) => <option value={status.id} key={status.id}>{status.status_name}</option>)}</select></label>}
                <label><span>Task Date</span><input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} required /></label>
                <label><span>Task Window</span><div className="date-time-pair">{form.worker_category === 'crop_management_worker' ? <><CropTaskTimeSelect kind="start" value={form.start_time} onChange={(event) => { const startTime = event.target.value; const endOptions = cropTimeOptions('end', startTime); setForm({ ...form, start_time: startTime, end_time: endOptions.some((option) => option.value === form.end_time) ? form.end_time : endOptions[0]?.value || '' }) }} /><CropTaskTimeSelect kind="end" startTime={form.start_time} value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} /></> : <><input type="time" min="07:00" max="17:59" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} required /><input type="time" min="07:01" max="18:00" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} required /></>}</div>{form.worker_category === 'crop_management_worker' && <small>Crop-management work: 8:00 AM–11:50 AM and 1:00 PM–4:00 PM. Lunch break: 11:50 AM–1:00 PM.</small>}</label></>}
              </div>
            </div>
            {!assigningDriver && <label className="task-description"><span>Description <em>(optional)</em></span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Add task instructions, objectives, or notes (optional)" maxLength="2000" /></label>}
            <footer><button type="button" onClick={() => setModal(null)}>Cancel</button><button className="assign-task-submit" type="submit" disabled={saving || (assigningDriver && (!deliveryForm.order_id || !deliveryForm.delivery_date))}><Send aria-hidden="true" />{saving ? 'Saving…' : assigningDriver ? 'Assign Order' : modal.mode === 'add' ? 'Assign Task' : 'Save Task'}</button></footer>
          </form>
        </section>
      </div>}

      {modal?.mode === 'setting' && <div className="task-modal-backdrop">
        <section className="task-reference-modal task-setting-modal" role="dialog" aria-modal="true">
          <TaskModalHeader title={`${modal.value ? 'Edit' : 'Add'} ${modal.type === 'categories' ? 'Task Category' : 'Field / Location'}`} tag="Settings setup" onClose={() => setModal(null)} />
          <form className="task-reference-body" onSubmit={saveSetting}>
            {error && <div className="task-modal-error" role="alert">{error}</div>}
            <label><span>{modal.type === 'categories' ? 'Category name' : 'Field or location name'}</span><input autoFocus value={settingsForm.name} onChange={(event) => setSettingsForm({ ...settingsForm, name: event.target.value })} maxLength="120" required /></label>
            {modal.type === 'categories' && <label className="task-description"><span>Description <em>(optional)</em></span><textarea value={settingsForm.description} onChange={(event) => setSettingsForm({ ...settingsForm, description: event.target.value })} placeholder="What kind of tasks belong in this category?" maxLength="500" /></label>}
            <footer><button type="button" onClick={() => setModal(null)}>Cancel</button><button className="assign-task-submit" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></footer>
          </form>
        </section>
      </div>}

      {modal?.mode === 'vehicle' && <div className="task-modal-backdrop">
        <section className="task-reference-modal task-setting-modal" role="dialog" aria-modal="true">
          <TaskModalHeader title={modal.vehicle ? 'Edit Vehicle' : 'Add Vehicle'} tag="Fleet management" onClose={() => setModal(null)} />
          <form className="task-reference-body" onSubmit={saveVehicle}>
            {error && <div className="task-modal-error" role="alert">{error}</div>}
            <label><span>Vehicle name</span><input autoFocus value={vehicleForm.vehicle_name} onChange={(event) => setVehicleForm({ ...vehicleForm, vehicle_name: event.target.value })} maxLength="120" required /></label>
            <label><span>Plate number</span><input value={vehicleForm.plate_number} onChange={(event) => setVehicleForm({ ...vehicleForm, plate_number: event.target.value })} maxLength="30" required /></label>
            <label><span>Status</span><select value={vehicleForm.status} onChange={(event) => setVehicleForm({ ...vehicleForm, status: event.target.value })}>{Object.entries(vehicleStatusLabels).map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></label>
            <footer><button type="button" onClick={() => setModal(null)}>Cancel</button><button className="assign-task-submit" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></footer>
          </form>
        </section>
      </div>}
    </main>
  )
}
