import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ClipboardPlus, Eye, Pencil, Printer, X } from 'lucide-react'
import completedTaskIcon from '../../assets/task-completed-icon-white.png'
import progressTaskIcon from '../../assets/task-progress-icon-white.png'
import totalTaskIcon from '../../assets/task-total-icon-white.png'
import workersTaskIcon from '../../assets/task-workers-icon-white.png'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { WoField, WoList, WoRadios, WoRow, WoSection, WoSteps, WorkOrderDialog } from '../../components/WorkOrderDialog.jsx'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/task-schedule-management.css'
import '../../styles/work-order-dialogs.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const PAGE_SIZE = 10
const emptyForm = {
  assigned_worker_id: '', worker_category: '', category_id: '', activity_type: '', field_id: '', priority_id: '', status_id: '',
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

function formatLongDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)
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
  const [harvestDecision, setHarvestDecision] = useState('approve')
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
  const isPestAndDisease = options.categories.find((category) => String(category.id) === String(form.category_id))?.category_name === 'Pest & Disease'
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
    setHarvestDecision('approve')
    setModal({ mode: 'review-harvest', task })
  }

  async function approveTask() {
    setSaving(true)
    setError('')
    const isHarvest = modal.task.category === 'Harvesting'
    try {
      // Harvesting is approved with its (editable) counts, which are added to inventory.
      await apiRequest(`/api/admin/tasks/${modal.task.id}/${isHarvest ? 'approve-harvest' : 'approve'}`, {
        method: 'POST',
        body: JSON.stringify(isHarvest ? harvestApprovalForm : {}),
      })
      setModal(null)
      setRefreshKey((key) => key + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function rejectTask() {
    setSaving(true)
    setError('')
    try {
      await apiRequest(`/api/admin/tasks/${modal.task.id}/reject`, {
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
      activity_type: task.activity_type || '',
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
      if (isPestAndDisease && !form.activity_type) throw new Error('Choose Inspection or Action for Pest & Disease tasks.')
      await apiRequest(editing ? `/api/admin/tasks/${modal.task.id}` : '/api/admin/tasks', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({
          assigned_worker_id: form.assigned_worker_id,
          category_id: Number(form.category_id),
          activity_type: isPestAndDisease ? form.activity_type : '',
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
            {activeTab === 'tasks' && harvestApprovalCount > 0 && (
              <div className="harvest-approval-banner" role="status">
                <span>Task Awaiting to Review</span>
              </div>
            )}
            {activeTab === 'disputes' ? <>
            {error && !modal && <div className="tasks-error" role="alert">{error}</div>}
            <nav className="dispute-status-filter" aria-label="Filter disputes by status">
              {[{ id: 'all', label: 'All', count: disputeOrders.length }, { id: 'open', label: 'Open', count: openDisputeCount }, { id: 'resolved', label: 'Resolved', count: resolvedDisputeCount }].map((option) => (
                <button key={option.id} type="button" className={disputeFilter === option.id ? 'is-active' : ''} aria-pressed={disputeFilter === option.id} onClick={() => setDisputeFilter(option.id)}>{option.label} <span>{option.count}</span></button>
              ))}
            </nav>
            <div className="tasks-table-wrap">
              <table className="tasks-table dispute-table">
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
                  const parsedReason = parseDisputeReason(order.delivery_dispute_reason)
                  const reasonSummary = parsedReason.userDescription || (order.delivery_dispute_category ? order.delivery_dispute_category.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Delivery issue report')
                  const reasonDetail = [`Requested: ${parsedReason.resolutionLabel}`, parsedReason.itemBreakdownText].filter(Boolean).join(' · ')
                  return (
                  <tr key={`dispute-${order.id}`}>
                    <td><strong>{order.order_number}</strong></td>
                    <td>{order.delivery_full_name}</td>
                    <td>{responsibleLabel} · {responsibleName}</td>
                    <td>{formatSchedule(order.delivery_dispute_created_at)}</td>
                    <td className="dispute-reason-cell" title={`${reasonSummary} (${reasonDetail})`}>
                      <strong>{reasonSummary}</strong>
                      <small>{reasonDetail}</small>
                    </td>
                    <td><span className={`task-status-badge ${isResolved ? 'status-resolved' : 'status-open-dispute'}`}>{isResolved ? 'Resolved' : 'Open'}</span>{isResolved && (outcome || order.delivery_dispute_resolved_at) && <small className="dispute-outcome" title={order.delivery_dispute_resolution_notes || undefined}>{outcome}{outcome && order.delivery_dispute_resolved_at ? <br /> : null}{order.delivery_dispute_resolved_at ? formatSchedule(order.delivery_dispute_resolved_at) : null}</small>}</td>
                    <td>
                      <div className="task-actions">
                        {isResolved ? (
                          <button className="task-view" type="button" onClick={() => { setDisputeActivePhoto(null); setModal({ mode: 'review-dispute', order }) }} aria-label={`View resolved dispute ${order.order_number}`}><Eye aria-hidden="true" size={14} /> View</button>
                        ) : (
                          <button type="button" onClick={() => { setDisputeResolutionNotes(''); setDisputeRefundAmount(suggestedAmount); setDisputeRefundReference(''); setDisputeDecision('refunded'); setDisputeActivePhoto(null); setModal({ mode: 'review-dispute', order }) }}>Review</button>
                        )}
                      </div>
                    </td>
                  </tr>
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
              <div className="task-filter" ref={filterRef}><button type="button" onClick={() => setFilterOpen((open) => !open)} aria-haspopup="listbox" aria-expanded={filterOpen}><span>Filter by</span><i aria-hidden="true" /></button>{filterOpen && <div className="task-filter-menu" role="listbox" aria-label="Filter work by status"><p>Filter crop tasks</p>{[{ id: 'all', code: '', status_name: 'All statuses' }, ...options.statuses].map((status) => { const isAwaitingReview = status.code === 'awaiting_approval'; return <button type="button" role="option" aria-selected={filter === status.code} className={`${filter === status.code ? 'is-selected ' : ''}${isAwaitingReview ? 'is-awaiting-review' : ''}`} key={status.id} onClick={() => { setFilter(status.code); setPage(1); setFilterOpen(false) }}><span>{status.status_name}{isAwaitingReview && harvestApprovalCount > 0 ? ` (${harvestApprovalCount})` : ''}</span>{filter === status.code && <i aria-hidden="true">✓</i>}</button> })}<p className="task-filter-group">Filter delivery status</p>{driverDeliveryStatuses.map((status) => <button type="button" role="option" aria-selected={filter === status.code} className={filter === status.code ? 'is-selected' : ''} key={status.code} onClick={() => { setFilter(status.code); setPage(1); setFilterOpen(false) }}><span>{status.status_name}</span>{filter === status.code && <i aria-hidden="true">✓</i>}</button>)}</div>}</div>
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
                     ? <tr key={`task-${task.id}`}><td>{task.assigned_worker?.full_name || 'Unknown worker'}</td><td><strong>{task.category}</strong><small>{task.description || 'No description added'}</small></td><td>{task.field}</td><td>{formatSchedule(task.schedule_start)}</td><td><span className={`task-priority priority-${task.priority}`}>{task.priority_label}</span></td><td><span className={`task-status status-${task.status}`}>{task.status_label || statusLabels[task.status]}</span></td><td><div className="task-actions">{task.status === 'awaiting_approval' ? <button className="task-review" type="button" onClick={() => openReviewHarvest(task)}>Review</button> : <><button className="task-view" type="button" onClick={() => setModal({ mode: 'view', task })} aria-label={`View task assigned to ${task.assigned_worker?.full_name}`}><Eye aria-hidden="true" size={14} /> View</button><button className="task-edit" type="button" onClick={() => openEditTask(task)} aria-label={`Edit task assigned to ${task.assigned_worker?.full_name}`}>✎</button></>}</div></td></tr>
                     : <tr key={`task-${task.id}`}><td><span className="task-work-type is-crop">Crop Task</span></td><td>{task.assigned_worker?.full_name || 'Unknown worker'}</td><td><strong>{task.category}</strong><small>{task.description || 'No description added'}</small></td><td>{task.field}</td><td>{formatSchedule(task.schedule_start)}</td><td><span className={`task-status status-${task.status}`}>{task.status_label || statusLabels[task.status]}</span></td><td><div className="task-actions">{task.status === 'awaiting_approval' ? <button className="task-review" type="button" onClick={() => openReviewHarvest(task)}>Review</button> : <><button type="button" onClick={() => setModal({ mode: 'view', task })}>View</button><button className="task-edit" type="button" onClick={() => openEditTask(task)} aria-label={`Edit task assigned to ${task.assigned_worker?.full_name}`}>✎</button></>}</div></td></tr>)}
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
        const isHarvest = task.category?.toLowerCase().includes('harvest')
        const hasHarvestYield = task.harvest_small_count != null || task.harvest_medium_count != null || task.harvest_large_count != null || task.harvest_damaged_count != null
        const isCompleted = task.status === 'completed'
        const isInProgress = task.status === 'in_progress'
        const isAwaitingApproval = task.status === 'awaiting_approval'
        const isScheduled = task.status === 'pending' || task.status === 'scheduled'
        const timeWindow = task.schedule?.start_time && task.schedule?.end_time
          ? `${formatTime12(task.schedule.start_time)} – ${formatTime12(task.schedule.end_time)}`
          : formatSchedule(task.schedule_start)
        const [smallCount, mediumCount, largeCount, damagedCount] = [task.harvest_small_count, task.harvest_medium_count, task.harvest_large_count, task.harvest_damaged_count].map((count) => Number(count) || 0)
        const steps = [
          { label: 'Scheduled', note: task.created_at ? formatSchedule(task.created_at) : 'Scheduled', state: isScheduled ? 'is-now' : 'is-done' },
          { label: 'In progress', note: task.started_at ? `Started ${formatSchedule(task.started_at)}` : isInProgress ? 'In progress' : 'Not started', state: isInProgress ? 'is-now' : isAwaitingApproval || isCompleted ? 'is-done' : '' },
          {
            label: isAwaitingApproval ? 'Approval needed' : 'Completed',
            note: isCompleted ? (task.approved_at ? `Approved ${formatSchedule(task.approved_at)}` : task.completed_at ? formatSchedule(task.completed_at) : 'Completed') : isAwaitingApproval ? 'Waiting for review' : task.schedule?.end_time ? `Expected ${formatTime12(task.schedule.end_time)}` : 'Pending',
            state: isCompleted ? 'is-done' : isAwaitingApproval ? 'is-now' : '',
          },
        ]

        return (
          <WorkOrderDialog
            eyebrow="Work order"
            id={`#TASK-${String(task.id).padStart(4, '0')}`}
            title={task.category || 'Farm Operations'}
            titleId="view-crop-task-title"
            sub={task.created_at ? `Created ${formatSchedule(task.created_at)}` : null}
            steps={<WoSteps items={steps} />}
            onClose={() => setModal(null)}
            footerNote={<button type="button" className="wo-btn is-link" onClick={() => window.print()}><Printer size={15} aria-hidden="true" />Print slip</button>}
            footer={<>
              <button type="button" className="wo-btn" onClick={() => setModal(null)}>Close</button>
              {isAwaitingApproval && (
                <button type="button" className="wo-btn is-primary" onClick={() => { const taskToReview = modal.task; setModal(null); openReviewHarvest(taskToReview) }}>
                  <Check size={15} aria-hidden="true" />Review harvest
                </button>
              )}
              <button type="button" className="wo-btn is-primary" onClick={() => { const taskToEdit = modal.task; setModal(null); openEditTask(taskToEdit) }}>
                <Pencil size={14} aria-hidden="true" />Edit task
              </button>
            </>}
          >
            <div className="wo-two is-even">
              <WoSection title="Assignment">
                <WoList>
                  <WoRow label="Assigned to">{worker?.full_name || 'Unassigned worker'}</WoRow>
                  <WoRow label="Role">{workerCategoryLabels[worker?.worker_category] || 'Crop Management Worker'}</WoRow>
                  <WoRow label="Category">{task.category || 'Farm Operations'}</WoRow>
                  {task.activity_type && <WoRow label="Activity">{task.activity_type === 'action' ? 'Action' : 'Inspection'}</WoRow>}
                  <WoRow label="Field">{task.field || 'General Farm Plot'}</WoRow>
                  <WoRow label="Location">{task.schedule?.location || 'Pineapple Plantation · Designated Block'}</WoRow>
                </WoList>
              </WoSection>
              <WoSection title="Schedule">
                <WoList>
                  <WoRow label="Date">{task.schedule_start ? formatLongDate(task.schedule_start) : 'Date pending'}</WoRow>
                  <WoRow label="Time">{timeWindow}</WoRow>
                  <WoRow label="Duration">{formatTaskDuration(task.estimated_duration_minutes)}</WoRow>
                  <WoRow label="Priority"><span className={`wo-priority is-${task.priority || 'medium'}`}>{task.priority_label || 'Normal'}</span></WoRow>
                  <WoRow label="Created">{task.created_at ? formatSchedule(task.created_at) : '—'}</WoRow>
                </WoList>
              </WoSection>
            </div>

            {(isHarvest || hasHarvestYield) && (
              <WoSection title="Harvest output">
                <WoList>
                  <WoRow label="Small">{smallCount} pcs</WoRow>
                  <WoRow label="Medium">{mediumCount} pcs</WoRow>
                  <WoRow label="Large">{largeCount} pcs</WoRow>
                  <WoRow label="Damaged"><span className="wo-high">{damagedCount} pcs</span></WoRow>
                  <WoRow label="Total"><strong>{smallCount + mediumCount + largeCount + damagedCount} pcs</strong></WoRow>
                </WoList>
                {task.harvest_proof_image_url && (
                  <p className="wo-fine">
                    Proof photo submitted by the worker{' '}
                    <button
                      type="button"
                      onClick={() => setDisputeActivePhoto({
                        url: task.harvest_proof_image_url,
                        title: 'Harvest Proof Photo',
                        subtitle: `Submitted by ${worker?.full_name || 'Worker'} for ${task.field || 'the field'}`,
                      })}
                    >
                      View photo
                    </button>
                  </p>
                )}
              </WoSection>
            )}

            <WoSection title="Instructions">
              <p className="wo-prose">{task.description || 'No additional instructions provided for this task.'}</p>
            </WoSection>

            {task.completion_notes && (
              <WoSection title="Worker completion notes">
                <p className="wo-prose">{task.completion_notes}</p>
              </WoSection>
            )}
          </WorkOrderDialog>
        )
      })()}

      {modal?.mode === 'view-delivery' && (() => {
        const order = modal.order
        const isDelivered = order.delivery_assignment_status === 'delivered' || order.order_status === 'delivered' || order.order_status === 'completed'
        const isPickedUp = isDelivered || order.delivery_assignment_status === 'picked_up' || order.delivery_assignment_status === 'out_for_delivery'
        const isAccepted = isPickedUp || order.delivery_assignment_status === 'accepted'
        const isGcash = order.payment_method === 'gcash'
        const items = Array.isArray(order.items) ? order.items : []
        const reached = [true, isAccepted, isPickedUp, isDelivered]
        const firstOpen = reached.findIndex((done) => !done)
        const stepState = (index) => (reached[index] ? 'is-done' : index === firstOpen ? 'is-now' : '')
        const steps = [
          { label: 'Assigned', note: order.driver_assigned_at ? formatSchedule(order.driver_assigned_at) : (order.delivery_scheduled_at ? formatSchedule(order.delivery_scheduled_at) : 'Dispatched'), state: stepState(0) },
          { label: 'Accepted', note: order.delivery_accepted_at ? formatSchedule(order.delivery_accepted_at) : (isAccepted ? 'Accepted' : 'Pending'), state: stepState(1) },
          { label: 'Picked up', note: order.delivery_picked_up_at ? formatSchedule(order.delivery_picked_up_at) : (isPickedUp ? 'In transit' : 'Pending'), state: stepState(2) },
          { label: 'Delivered', note: order.delivered_at ? formatSchedule(order.delivered_at) : order.delivery_proof_submitted_at ? formatSchedule(order.delivery_proof_submitted_at) : (isDelivered ? 'Delivered' : 'Pending'), state: stepState(3) },
        ]
        const address = [order.delivery_barangay, order.delivery_city_municipality, order.delivery_province, order.delivery_region].filter(Boolean).join(', ') || 'No delivery address provided.'
        const canEdit = order.order_status === 'ready_for_delivery' && order.delivery_assignment_status === 'assigned'

        return (
          <WorkOrderDialog
            eyebrow="Delivery order"
            id={`#${order.order_number}`}
            title="Delivery Order Details"
            titleId="view-delivery-title"
            sub={isDelivered && order.delivered_at ? `Delivered ${formatSchedule(order.delivered_at)}` : order.driver_assigned_at ? `Assigned ${formatSchedule(order.driver_assigned_at)}` : null}
            steps={<WoSteps items={steps} />}
            onClose={() => setModal(null)}
            footerNote={<button type="button" className="wo-btn is-link" onClick={() => window.print()}><Printer size={15} aria-hidden="true" />Print slip</button>}
            footer={<>
              <button type="button" className="wo-btn" onClick={() => setModal(null)}>Close</button>
              {canEdit && (
                <button type="button" className="wo-btn is-primary" onClick={() => { const orderToEdit = order; setModal(null); openEditDelivery(orderToEdit) }}>
                  <Pencil size={14} aria-hidden="true" />Edit schedule
                </button>
              )}
            </>}
          >
            <div className="wo-two is-even">
              <div>
                <WoSection title="Recipient">
                  <WoList>
                    <WoRow label="Name">{order.delivery_full_name || 'Customer'}</WoRow>
                    <WoRow label="Mobile">{order.delivery_mobile_number || 'Not provided'}</WoRow>
                    <WoRow label="Address">{address}</WoRow>
                  </WoList>
                </WoSection>
                <WoSection title="Driver and vehicle">
                  <WoList>
                    <WoRow label="Driver">{order.assigned_driver?.full_name || 'Unassigned driver'}</WoRow>
                    <WoRow label="Vehicle">{order.assigned_vehicle ? `${order.assigned_vehicle.vehicle_name} · ${order.assigned_vehicle.plate_number}` : 'No vehicle assigned'}</WoRow>
                  </WoList>
                </WoSection>
              </div>
              <div>
                <WoSection title="Schedule">
                  <WoList>
                    <WoRow label="Window">{formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at)}</WoRow>
                  </WoList>
                </WoSection>
                <WoSection title="Payment">
                  <WoList>
                    <WoRow label="Method">{isGcash ? 'GCash' : (order.payment_method || 'Cash').toUpperCase()}</WoRow>
                    <WoRow label="Status">{order.payment_status ? order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1) : (isGcash ? 'Paid' : 'COD / settled')}</WoRow>
                    <WoRow label="Total"><strong>₱{Number(order.total_amount || 0).toFixed(2)}</strong></WoRow>
                  </WoList>
                </WoSection>
              </div>
            </div>

            <WoSection title="Items">
              <table className="wo-table">
                <thead><tr><th>Item</th><th>Size</th><th className="r">Qty</th><th className="r">Unit price</th><th className="r">Total</th></tr></thead>
                <tbody>
                  {items.length > 0 ? items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>{item.product_name}</td>
                      <td>{item.weight_label || '—'}</td>
                      <td className="r">{item.quantity}</td>
                      <td className="r">{item.unit_price ? `₱${Number(item.unit_price).toFixed(2)}` : '—'}</td>
                      <td className="r"><strong>₱{Number(item.line_total || (Number(item.unit_price || 0) * Number(item.quantity || 1))).toFixed(2)}</strong></td>
                    </tr>
                  )) : (
                    <tr>
                      <td>Fresh Produce Order</td><td>—</td><td className="r">—</td><td className="r">—</td>
                      <td className="r"><strong>₱{Number(order.total_amount || 0).toFixed(2)}</strong></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </WoSection>

            {(order.delivery_proof_image_url || isDelivered) && (
              <WoSection title="Proof of delivery">
                {order.delivery_proof_image_url ? (
                  <div className="wo-proof">
                    <button
                      type="button"
                      className="wo-photo is-thumb"
                      aria-label="View proof of delivery full size"
                      onClick={() => setDisputeActivePhoto({
                        url: order.delivery_proof_image_url,
                        title: 'Proof of Delivery',
                        subtitle: `Order #${order.order_number} · Driver: ${order.assigned_driver?.full_name || 'Assigned Driver'}${order.delivery_proof_submitted_at ? ` · ${formatSchedule(order.delivery_proof_submitted_at)}` : ''}`,
                      })}
                    >
                      <img src={order.delivery_proof_image_url} alt="Proof of delivery" />
                    </button>
                    <div>
                      <p className="wo-prose">{order.delivery_proof_notes || 'No additional note added by the driver.'}</p>
                      {order.delivery_proof_submitted_at && (
                        <p className="wo-fine">Submitted {formatSchedule(order.delivery_proof_submitted_at)}{order.assigned_driver?.full_name ? ` by ${order.assigned_driver.full_name}` : ''}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="wo-empty">Delivery marked completed. No drop-off photo was attached by the driver.</p>
                )}
              </WoSection>
            )}
          </WorkOrderDialog>
        )
      })()}

      {modal?.mode === 'review-dispute' && (() => {
        const order = modal.order
        const parsedReport = parseDisputeReason(order.delivery_dispute_reason)
        const suggestedVal = order.disputed_item
          ? (Number(order.disputed_item.unit_price) * Number(order.delivery_dispute_affected_quantity || 0)).toFixed(2)
          : null
        const buyerPhotos = Array.isArray(order.delivery_dispute_photo_urls) ? order.delivery_dispute_photo_urls : []
        const isGcash = order.payment_method === 'gcash'
        const isSeller = order.delivery_dispute_responsible_role === 'seller'
        const responsibleName = isSeller
          ? order.responsible_seller?.full_name || 'Seller (unidentified)'
          : order.assigned_driver?.full_name || 'Unassigned driver'
        const claimTitle = order.delivery_dispute_category
          ? order.delivery_dispute_category.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
          : 'Delivery issue report'
        const refunding = disputeDecision === 'refunded'
        const resolved = order.delivery_dispute_status === 'resolved'
        const resolutionOutcome = order.delivery_dispute_resolution === 'refunded'
          ? `Refunded${order.refund_amount != null ? ` ₱${Number(order.refund_amount).toFixed(2)}` : ''}`
          : order.delivery_dispute_resolution === 'dismissed' ? 'Claim dismissed' : 'Resolved'
        const chooseDecision = (decision) => {
          setDisputeDecision(decision)
          if (decision === 'refunded' && (!disputeResolutionNotes || disputeResolutionNotes.includes('Claim dismissed'))) {
            setDisputeResolutionNotes('Produce damaged in transit. Approved partial refund of item cost.')
          }
          if (decision === 'dismissed' && (!disputeResolutionNotes || disputeResolutionNotes.includes('Approved partial refund'))) {
            setDisputeResolutionNotes('Driver delivery proof confirms produce arrived intact and accepted in good order. Claim dismissed.')
          }
        }
        const refundInvalid = saving
          || !disputeResolutionNotes.trim()
          || !disputeRefundAmount
          || Number(disputeRefundAmount) <= 0
          || Number(disputeRefundAmount) > Number(order.total_amount)
          || (!isGcash && !disputeRefundReference.trim())
        const presets = refunding
          ? [
            ['Damage approved', 'Produce damaged in transit. Approved partial refund of item cost.'],
            ['Spoiled or damaged', 'Item confirmed spoiled or damaged upon delivery inspection. Full refund approved.'],
          ]
          : [
            ['Proof intact', 'Driver delivery proof confirms produce arrived intact and accepted in good order. Claim dismissed.'],
            ['Unsubstantiated', 'Dispute evidence does not substantiate product defect or delivery fault. Claim dismissed.'],
          ]

        return (
          <WorkOrderDialog
            size="wide"
            eyebrow="Dispute resolution"
            id={`#${order.order_number}`}
            title={resolved ? 'Dispute Details' : 'Review Delivery Dispute'}
            titleId="review-dispute-title"
            sub={`Reported ${formatSchedule(order.delivery_dispute_created_at)}${order.delivery_full_name ? ` by ${order.delivery_full_name}` : ''}${resolved && order.delivery_dispute_resolved_at ? ` · Resolved ${formatSchedule(order.delivery_dispute_resolved_at)}` : ''}`}
            onClose={() => setModal(null)}
            footerNote={resolved ? 'This dispute is closed.' : 'The customer is notified of the decision.'}
            footer={resolved ? (
              <button type="button" className="wo-btn" onClick={() => setModal(null)}>Close</button>
            ) : (<>
              <button type="button" className="wo-btn" disabled={saving} onClick={() => setModal(null)}>Cancel</button>
              {refunding ? (
                <button type="button" className="wo-btn is-primary" disabled={refundInvalid} onClick={() => resolveDispute('refunded')}>
                  {saving ? 'Processing refund…' : `Confirm refund ₱${Number(disputeRefundAmount || 0).toFixed(2)}`}
                </button>
              ) : (
                <button type="button" className="wo-btn is-danger" disabled={saving || !disputeResolutionNotes.trim()} onClick={() => resolveDispute('dismissed')}>
                  {saving ? 'Dismissing…' : 'Dismiss claim'}
                </button>
              )}
            </>)}
          >
            <div className="wo-two">
              <div>
                <WoSection title="Order">
                  <WoList>
                    <WoRow label="Customer">{order.delivery_full_name || 'Not provided'}</WoRow>
                    <WoRow label={isSeller ? 'Seller' : 'Driver'}>{responsibleName}</WoRow>
                    <WoRow label="Payment">{isGcash ? 'GCash' : (order.payment_method || 'Cash').toUpperCase()}{order.payment_status ? `, ${order.payment_status}` : ''}</WoRow>
                    <WoRow label="Reported">{formatSchedule(order.delivery_dispute_created_at)}</WoRow>
                  </WoList>
                </WoSection>

                <WoSection title="Customer's claim">
                  <WoList>
                    <WoRow label="Issue">{claimTitle}</WoRow>
                    <WoRow label="Requested">{parsedReport.resolutionLabel}</WoRow>
                    {order.disputed_item ? (
                      <>
                        <WoRow label="Item">
                          {order.disputed_item.product_name}, {order.delivery_dispute_affected_quantity || 1} of {order.disputed_item.quantity} flagged{order.disputed_item.unit_price ? ` at ₱${Number(order.disputed_item.unit_price).toFixed(2)} each` : ''}
                        </WoRow>
                        {suggestedVal && <WoRow label="Item value"><strong>₱{suggestedVal}</strong></WoRow>}
                      </>
                    ) : parsedReport.itemBreakdownText ? (
                      <WoRow label="Flagged items">{parsedReport.itemBreakdownText}</WoRow>
                    ) : null}
                  </WoList>
                  <p className="wo-quote">{parsedReport.userDescription ? `“${parsedReport.userDescription}”` : 'No additional text remarks provided by the customer.'}</p>
                </WoSection>

                <WoSection title="Evidence">
                  <p className="wo-hint">Customer's photos{buyerPhotos.length > 0 ? ` (${buyerPhotos.length})` : ''}</p>
                  {buyerPhotos.length > 0 ? (
                    <div className="wo-thumbs">
                      {buyerPhotos.map((url, index) => (
                        <button
                          type="button"
                          className="wo-photo is-thumb"
                          key={url || index}
                          aria-label={`View buyer evidence photo ${index + 1} full size`}
                          onClick={() => setDisputeActivePhoto({
                            url,
                            title: `Buyer Evidence (Photo ${index + 1} of ${buyerPhotos.length})`,
                            subtitle: `Order #${order.order_number} · Submitted ${formatSchedule(order.delivery_dispute_created_at)}`,
                          })}
                        >
                          <img src={url} alt={`Buyer evidence ${index + 1}`} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="wo-empty">No buyer photos submitted.</p>
                  )}

                  <p className="wo-hint" style={{ marginTop: 12 }}>Driver's delivery proof</p>
                  {order.delivery_proof_image_url ? (
                    <div className="wo-proof">
                      <button
                        type="button"
                        className="wo-photo is-thumb"
                        aria-label="View driver proof of delivery full size"
                        onClick={() => setDisputeActivePhoto({
                          url: order.delivery_proof_image_url,
                          title: "Driver's Delivery Proof",
                          subtitle: `Order #${order.order_number} · ${order.assigned_driver?.full_name ? `Driver: ${order.assigned_driver.full_name}` : 'Drop-off photo'}`,
                        })}
                      >
                        <img src={order.delivery_proof_image_url} alt="Driver proof of delivery" />
                      </button>
                      <p className="wo-prose">{order.delivery_proof_notes || 'Captured upon delivery.'}</p>
                    </div>
                  ) : (
                    <p className="wo-empty">No driver proof photo recorded.</p>
                  )}

                  {order.delivery_dispute_response && (
                    <>
                      <p className="wo-hint" style={{ marginTop: 12 }}>
                        {isSeller ? "Seller's explanation" : "Driver's explanation"}
                        {order.delivery_dispute_response_at ? ` · ${formatSchedule(order.delivery_dispute_response_at)}` : ''}
                      </p>
                      <p className="wo-prose">{order.delivery_dispute_response}</p>
                    </>
                  )}
                </WoSection>
              </div>

              <div>
                {resolved ? (
                  <WoSection title="Resolution">
                    <WoList>
                      <WoRow label="Outcome"><strong>{resolutionOutcome}</strong></WoRow>
                      <WoRow label="Resolved">{order.delivery_dispute_resolved_at ? formatSchedule(order.delivery_dispute_resolved_at) : '—'}</WoRow>
                    </WoList>
                    <p className="wo-hint" style={{ marginTop: 12 }}>Resolution note</p>
                    <p className="wo-prose">{order.delivery_dispute_resolution_notes || 'No note was recorded.'}</p>
                  </WoSection>
                ) : (
                <WoSection title="Decision">
                  <WoRadios
                    label="Resolution decision"
                    options={[{ value: 'refunded', label: 'Approve refund' }, { value: 'dismissed', label: 'Dismiss claim' }]}
                    value={disputeDecision}
                    onChange={chooseDecision}
                  />

                  {refunding ? (
                    <div className="wo-grid is-one">
                      <WoField label="Refund amount" htmlFor="dispute-refund-amount" hint={suggestedVal ? `Flagged item ₱${suggestedVal} · Order total ₱${Number(order.total_amount).toFixed(2)}` : null}>
                        <div className="wo-money">
                          <span aria-hidden="true">₱</span>
                          <input
                            id="dispute-refund-amount"
                            className="wo-input"
                            type="number"
                            min="0"
                            max={Number(order.total_amount) || undefined}
                            step="0.01"
                            value={disputeRefundAmount}
                            onChange={(event) => setDisputeRefundAmount(event.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </WoField>
                      {isGcash ? (
                        <p className="wo-note">
                          Paid with GCash. A refund of ₱{Number(disputeRefundAmount || 0).toFixed(2)} will be recorded in the dispute record for audit (PayMongo automated disbursement is pending integration).
                        </p>
                      ) : (
                        <WoField label={`Manual transfer reference (required for ${order.payment_method || 'cash'})`} htmlFor="dispute-refund-reference">
                          <input
                            id="dispute-refund-reference"
                            className="wo-input"
                            type="text"
                            value={disputeRefundReference}
                            onChange={(event) => setDisputeRefundReference(event.target.value)}
                            maxLength={300}
                            placeholder="e.g. Cash returned on inspection, or GCash ref #123456"
                          />
                        </WoField>
                      )}
                    </div>
                  ) : (
                    <p className="wo-note">No refund will be credited. The order will be finalized as completed. State the dismissal reason below.</p>
                  )}

                  <div className="wo-grid is-one">
                    <WoField label="Resolution note (required, visible to the customer and records)" htmlFor="dispute-resolution-notes">
                      <textarea
                        id="dispute-resolution-notes"
                        className="wo-input"
                        value={disputeResolutionNotes}
                        onChange={(event) => setDisputeResolutionNotes(event.target.value)}
                        rows={3}
                        maxLength={1000}
                        placeholder="Explain your decision…"
                      />
                    </WoField>
                  </div>
                  <p className="wo-links">
                    <span>Presets</span>
                    {presets.map(([label, text]) => (
                      <button type="button" key={label} onClick={() => setDisputeResolutionNotes(text)}>{label}</button>
                    ))}
                  </p>
                  {error && <p className="wo-error" role="alert">{error}</p>}
                </WoSection>
                )}
              </div>
            </div>
          </WorkOrderDialog>
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

      {modal?.mode === 'review-harvest' && (() => {
        const task = modal.task
        const isHarvestReview = task.category === 'Harvesting'
        const proofUrl = task.harvest_proof_image_url || task.completion_proof_image_url
        // What the worker entered besides the photo and notes: inspection answers, or the supplies taken at Start.
        const enteredRows = [
          ...(task.details ? [
            ['Crop condition', task.details.crop_condition],
            ['Pest or disease observed', task.details.pest_observed],
            ['Recommended action', task.details.recommended_action],
          ] : []),
          ...(task.inventory_item ? [
            [task.category === 'Fertilization' ? 'Fertilizer' : 'Pesticide', task.inventory_item.item_name],
            ['Amount used', `${task.inventory_quantity} ${task.inventory_item.unit?.abbreviation || ''}`.trim()],
          ] : []),
        ]
        const counts = {
          small: Number(harvestApprovalForm.harvest_small_count) || 0,
          medium: Number(harvestApprovalForm.harvest_medium_count) || 0,
          large: Number(harvestApprovalForm.harvest_large_count) || 0,
          damaged: Number(harvestApprovalForm.harvest_damaged_count) || 0,
        }
        const sellable = counts.small + counts.medium + counts.large
        const total = sellable + counts.damaged
        const damagedShare = total > 0 ? ((counts.damaged / total) * 100).toFixed(1) : '0.0'
        const rejecting = harvestDecision === 'reject'
        const worker = task.assigned_worker
        const countField = (key, label) => (
          <WoField label={label} htmlFor={`harvest-${key}`} key={key}>
            <input
              id={`harvest-${key}`}
              className="wo-input"
              type="number"
              min="0"
              value={harvestApprovalForm[`harvest_${key}_count`]}
              onChange={(event) => setHarvestApprovalForm({ ...harvestApprovalForm, [`harvest_${key}_count`]: event.target.value })}
            />
          </WoField>
        )
        const rejectionPresets = isHarvestReview ? [
          ['Recount needed', 'Please recount the harvest and submit the report again.'],
          ['Photo unclear', 'The proof photo is unclear. Please retake it and submit the report again.'],
          ['Wrong field', 'The proof photo does not match this field. Please check and submit again.'],
        ] : [
          ['Photo unclear', 'The proof photo is unclear. Please retake it and submit the task again.'],
          ['Wrong field', 'The proof photo does not match this field. Please check and submit again.'],
          ['More detail needed', 'Please add more detail to your notes and submit the task again.'],
        ]

        return (
          <WorkOrderDialog
            size="wide"
            eyebrow={isHarvestReview ? 'Harvest approval' : 'Task approval'}
            id={`#TASK-${String(task.id).padStart(4, '0')}`}
            title={isHarvestReview ? 'Review Harvest Report' : 'Review Task'}
            titleId="review-harvest-title"
            sub={task.completed_at ? `Submitted ${formatSchedule(task.completed_at)}${worker?.full_name ? ` by ${worker.full_name}` : ''}` : null}
            onClose={() => setModal(null)}
            footerNote={isHarvestReview
              ? (rejecting ? 'Nothing is added to Inventory.' : `Adds ${sellable} pcs to Inventory.`)
              : (rejecting ? 'The task returns to In Progress.' : 'The task is marked Completed and appears in Records.')}
            footer={<>
              <button type="button" className="wo-btn" disabled={saving} onClick={() => setModal(null)}>Cancel</button>
              {rejecting ? (
                <button type="button" className="wo-btn is-danger" disabled={saving || !harvestRejectionReason.trim()} onClick={rejectTask}>
                  {saving ? 'Saving…' : 'Send back to worker'}
                </button>
              ) : (
                <button type="button" className="wo-btn is-primary" disabled={saving} onClick={approveTask}>
                  <Check size={15} aria-hidden="true" />{saving ? 'Saving…' : (isHarvestReview ? 'Approve & Add to Inventory' : 'Approve')}
                </button>
              )}
            </>}
          >
            <div className="wo-two">
              <div>
                <WoSection title="Task">
                  <WoList>
                    <WoRow label="Farm worker">{worker?.full_name || 'Unassigned worker'}</WoRow>
                    <WoRow label="Field">{task.field || '—'}</WoRow>
                    <WoRow label="Category">{task.category || '—'}</WoRow>
                    {task.activity_type && <WoRow label="Activity">{task.activity_type === 'action' ? 'Action' : 'Inspection'}</WoRow>}
                    <WoRow label="Priority"><span className={`wo-priority is-${task.priority || 'medium'}`}>{task.priority_label || 'Normal'}</span></WoRow>
                    <WoRow label="Scheduled">{task.schedule?.start_time && task.schedule?.end_time ? `${formatSchedule(task.schedule_start)} – ${formatTime12(task.schedule.end_time)}` : formatSchedule(task.schedule_start)}</WoRow>
                    <WoRow label="Finished">{formatSchedule(task.completed_at)}</WoRow>
                  </WoList>
                </WoSection>
                {proofUrl && (
                  <WoSection title="Worker's proof photo">
                    <button
                      type="button"
                      className="wo-photo is-tall"
                      aria-label="View proof photo full size"
                      onClick={() => setDisputeActivePhoto({
                        url: proofUrl,
                        title: isHarvestReview ? 'Harvest Proof Photo' : 'Task Proof Photo',
                        subtitle: `Submitted by ${worker?.full_name || 'Worker'} for ${task.field || 'the field'}`,
                      })}
                    >
                      <img src={proofUrl} alt="Proof submitted by the worker" />
                    </button>
                  </WoSection>
                )}
                {task.completion_notes && (
                  <WoSection title="Worker's notes">
                    <p className="wo-prose">{task.completion_notes}</p>
                  </WoSection>
                )}
              </div>

              <div>
                {isHarvestReview ? (
                <WoSection title="Harvest counts">
                  <p className="wo-hint">Editable before you decide.</p>
                  <div className="wo-grid">
                    {countField('small', 'Small')}
                    {countField('medium', 'Medium')}
                    {countField('large', 'Large')}
                    {countField('damaged', 'Damaged')}
                  </div>
                  <WoList>
                    <WoRow label="Total harvested">{total} pcs</WoRow>
                    <WoRow label="Added to Inventory">{sellable} pcs (Small {counts.small}, Medium {counts.medium}, Large {counts.large})</WoRow>
                    <WoRow label="Damaged">{counts.damaged} pcs, {damagedShare}%, recorded but not added</WoRow>
                  </WoList>
                </WoSection>
                ) : (
                  <WoSection title="What the worker entered">
                    {enteredRows.length ? (
                      <WoList>
                        {enteredRows.map(([label, value]) => <WoRow label={label} key={label}>{value || '—'}</WoRow>)}
                      </WoList>
                    ) : (
                      <p className="wo-hint">Nothing extra is collected for this category. Check the photo and notes.</p>
                    )}
                  </WoSection>
                )}
                <WoSection title="Decision">
                  <WoRadios
                    label="Harvest decision"
                    options={[{ value: 'approve', label: 'Approve' }, { value: 'reject', label: 'Send back' }]}
                    value={harvestDecision}
                    onChange={setHarvestDecision}
                  />
                  {rejecting ? (
                    <>
                      <div className="wo-grid is-one">
                        <WoField label="Reason for sending back (required)" htmlFor="harvest-rejection-reason">
                          <textarea
                            id="harvest-rejection-reason"
                            className="wo-input"
                            value={harvestRejectionReason}
                            onChange={(event) => setHarvestRejectionReason(event.target.value)}
                            rows={3}
                            maxLength={1000}
                            placeholder="Explain what needs to be corrected…"
                          />
                        </WoField>
                      </div>
                      <p className="wo-links">
                        <span>Presets</span>
                        {rejectionPresets.map(([label, text]) => (
                          <button type="button" key={label} onClick={() => setHarvestRejectionReason(text)}>{label}</button>
                        ))}
                      </p>
                      <p className="wo-note">The task returns to In Progress and the worker sees your reason.</p>
                    </>
                  ) : (
                    <p className="wo-note">{isHarvestReview ? 'Approving adds the counts to Inventory and marks the task Completed.' : 'Approving marks the task Completed and adds it to Records.'}</p>
                  )}
                  {error && <p className="wo-error" role="alert">{error}</p>}
                </WoSection>
              </div>
            </div>
          </WorkOrderDialog>
        )
      })()}

      {modal?.mode === 'edit-delivery' && (() => {
        const order = modal.order
        const drivers = options.workers.filter((worker) => worker.worker_category === 'driver')
        const currentDriver = drivers.find((driver) => String(driver.id) === String(deliveryEditForm.driver_id))
        const fullAddress = [order.delivery_barangay, order.delivery_city_municipality, order.delivery_province, order.delivery_region].filter(Boolean).join(', ')
        const itemsCount = order.items?.length || 1
        const durationText = formatDeliveryDuration(deliveryEditForm.start_time, deliveryEditForm.end_time)
        const isMorningActive = deliveryEditForm.start_time === '08:00' && deliveryEditForm.end_time === '12:00'
        const isAfternoonActive = deliveryEditForm.start_time === '13:00' && deliveryEditForm.end_time === '17:00'
        const isFullDayActive = deliveryEditForm.start_time === '08:00' && deliveryEditForm.end_time === '17:00'
        const presetValue = isMorningActive ? 'morning' : isAfternoonActive ? 'afternoon' : isFullDayActive ? 'full' : 'custom'
        const presetTimes = { morning: ['08:00', '12:00'], afternoon: ['13:00', '17:00'], full: ['08:00', '17:00'] }

        return (
          <WorkOrderDialog
            size="form"
            eyebrow="Edit delivery"
            id={`#${order.order_number}`}
            title="Edit Delivery Order"
            titleId="edit-delivery-title"
            sub={order.driver_assigned_at ? `Assigned ${formatSchedule(order.driver_assigned_at)}` : null}
            onClose={() => setModal(null)}
            onSubmit={saveDeliveryAssignment}
            footerNote="Changing the driver notifies them of the updated schedule."
            footer={<>
              <button type="button" className="wo-btn" disabled={saving} onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="wo-btn is-primary" disabled={saving || !deliveryEditForm.driver_id || !deliveryEditForm.delivery_date}>
                {saving ? 'Saving changes…' : 'Save delivery'}
              </button>
            </>}
          >
            {error && <p className="wo-error" role="alert">{error}</p>}
            <WoSection title="Order">
              <WoList>
                <WoRow label="Recipient">{order.delivery_full_name || 'Valued customer'}{order.delivery_mobile_number ? ` · ${order.delivery_mobile_number}` : ''}</WoRow>
                <WoRow label="Address">{fullAddress || 'Destination address on file'}</WoRow>
                <WoRow label="Order">
                  {itemsCount} {itemsCount === 1 ? 'item' : 'items'} · ₱{Number(order.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · {(order.payment_method || 'cod').toUpperCase()}{order.payment_status ? `, ${order.payment_status}` : ''}
                </WoRow>
              </WoList>
            </WoSection>

            <WoSection title="Driver">
              <div className="wo-grid">
                <WoField label="Courier driver" htmlFor="edit-driver-select" hint={currentDriver ? 'Verified fleet driver' : null}>
                  <select
                    id="edit-driver-select"
                    className="wo-input"
                    value={deliveryEditForm.driver_id}
                    onChange={(event) => setDeliveryEditForm({ ...deliveryEditForm, driver_id: event.target.value })}
                    required
                  >
                    <option value="" disabled>Select a driver</option>
                    {drivers.map((driver) => (
                      <option value={driver.id} key={driver.id}>{driver.full_name}</option>
                    ))}
                  </select>
                </WoField>
              </div>
            </WoSection>

            <WoSection title="Schedule">
              <div className="wo-grid">
                <WoField label="Delivery date" htmlFor="edit-delivery-date">
                  <input
                    type="date"
                    id="edit-delivery-date"
                    className="wo-input"
                    value={deliveryEditForm.delivery_date}
                    onChange={(event) => setDeliveryEditForm({ ...deliveryEditForm, delivery_date: event.target.value })}
                    required
                  />
                </WoField>
                <WoField label="Delivery window" hint="Operating hours: 7:00 AM to 6:00 PM.">
                  <div className="wo-time">
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
                    <em>to</em>
                    <DeliveryTimeSelect
                      kind="end"
                      startTime={deliveryEditForm.start_time}
                      value={deliveryEditForm.end_time}
                      onChange={(event) => setDeliveryEditForm({ ...deliveryEditForm, end_time: event.target.value })}
                    />
                  </div>
                </WoField>
                <WoField label="Quick presets" wide>
                  <WoRadios
                    label="Quick presets"
                    options={[{ value: 'morning', label: 'Morning 8–12' }, { value: 'afternoon', label: 'Afternoon 1–5' }, { value: 'full', label: 'Full day 8–5' }, { value: 'custom', label: 'Custom' }]}
                    value={presetValue}
                    onChange={(value) => {
                      if (presetTimes[value]) setDeliveryEditForm((previous) => ({ ...previous, start_time: presetTimes[value][0], end_time: presetTimes[value][1] }))
                    }}
                  />
                </WoField>
              </div>
              <p className="wo-summary">Calculated window: {durationText || 'Custom window'}</p>
            </WoSection>
          </WorkOrderDialog>
        )
      })()}

      {(modal?.mode === 'add' || modal?.mode === 'edit') && (() => {
        const editingTask = modal.mode === 'edit'
        const isCropWorker = form.worker_category === 'crop_management_worker'
        const summaryDate = assigningDriver ? deliveryForm.delivery_date : form.start_date
        const summaryStart = assigningDriver ? deliveryForm.start_time : form.start_time
        const summaryEnd = assigningDriver ? deliveryForm.end_time : form.end_time
        const summaryDuration = formatDeliveryDuration(summaryStart, summaryEnd)
        const summaryLine = summaryDate
          ? [formatLongDate(`${summaryDate}T12:00:00`), summaryStart && summaryEnd ? `${formatTime12(summaryStart)} – ${formatTime12(summaryEnd)}` : null, summaryDuration].filter(Boolean).join(' · ')
          : ''
        const selectedReadyOrder = readyOrders.find((order) => String(order.id) === String(deliveryForm.order_id))

        return (
          <WorkOrderDialog
            size={assigningDriver ? 'form' : undefined}
            eyebrow={assigningDriver ? 'New delivery assignment' : editingTask ? 'Edit work order' : 'New work order'}
            id={editingTask ? `#TASK-${String(modal.task.id).padStart(4, '0')}` : null}
            title={assigningDriver ? 'Assign Delivery Order' : editingTask ? 'Edit Task' : 'Assign New Task'}
            titleId="assign-task-title"
            sub={editingTask ? [modal.task.category, modal.task.field].filter(Boolean).join(', ') : assigningDriver ? 'Choose a driver and a ready order, then set the delivery window' : 'Issue a work order to a farm worker'}
            onClose={() => setModal(null)}
            onSubmit={saveTask}
            footerNote={editingTask && modal.task.updated_at ? `Last updated ${formatSchedule(modal.task.updated_at)}` : assigningDriver ? 'Deliveries run from 7:00 AM to 6:00 PM' : 'All fields except description are required'}
            footer={<>
              <button type="button" className="wo-btn" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="wo-btn is-primary" disabled={saving || (assigningDriver && (!deliveryForm.order_id || !deliveryForm.delivery_date))}>
                {saving ? 'Saving…' : assigningDriver ? 'Assign order' : editingTask ? 'Save task' : 'Assign task'}
              </button>
            </>}
          >
            {error && <p className="wo-error" role="alert">{error}</p>}

            <WoSection title={assigningDriver ? 'Driver' : 'Assignee'}>
              <div className="wo-grid">
                <WoField label="Farm worker category" htmlFor="task-worker-category">
                  <select
                    id="task-worker-category"
                    className="wo-input"
                    value={form.worker_category}
                    onChange={(event) => {
                      const workerCategory = event.target.value
                      const firstWorker = options.workers.find((worker) => worker.worker_category === workerCategory)
                      setForm({ ...form, worker_category: workerCategory, assigned_worker_id: firstWorker?.id || '', ...(workerCategory === 'crop_management_worker' ? { start_time: '08:00', end_time: '09:00' } : {}) })
                    }}
                    required
                  >
                    <option value="" disabled>Select worker category</option>
                    {availableWorkerCategories.map((category) => <option value={category} key={category}>{workerCategoryLabels[category] || category}</option>)}
                  </select>
                </WoField>
                <WoField label={assigningDriver ? 'Select driver' : 'Worker'} htmlFor="task-worker">
                  <select
                    id="task-worker"
                    className="wo-input"
                    value={form.assigned_worker_id}
                    onChange={(event) => setForm({ ...form, assigned_worker_id: event.target.value })}
                    required
                  >
                    <option value="" disabled>{assigningDriver ? 'Select driver' : 'Select worker'}</option>
                    {visibleWorkers.map((worker) => <option value={worker.id} key={worker.id}>{worker.full_name}</option>)}
                  </select>
                </WoField>
              </div>
            </WoSection>

            {assigningDriver ? (
              <WoSection title="Order">
                <div className="wo-grid">
                  <WoField
                    label="Ready order"
                    htmlFor="task-ready-order"
                    wide
                    hint={!readyOrders.length ? 'No ready delivery orders are available.' : selectedReadyOrder ? [selectedReadyOrder.delivery_barangay, selectedReadyOrder.delivery_city_municipality].filter(Boolean).join(', ') : null}
                  >
                    <select
                      id="task-ready-order"
                      className="wo-input"
                      value={deliveryForm.order_id}
                      onChange={(event) => setDeliveryForm({ ...deliveryForm, order_id: event.target.value })}
                      required
                    >
                      <option value="" disabled>Select order</option>
                      {readyOrders.map((order) => <option value={order.id} key={order.id}>{order.order_number} — {order.delivery_full_name}</option>)}
                    </select>
                  </WoField>
                </div>
              </WoSection>
            ) : (
              <WoSection title="Task">
                <div className="wo-grid">
                  <WoField label="Task category" htmlFor="task-category">
                    <select id="task-category" className="wo-input" value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value, activity_type: '' })} required>
                      <option value="" disabled>Select task category</option>
                      {options.categories.map((category) => <option value={category.id} key={category.id}>{category.category_name}</option>)}
                    </select>
                  </WoField>
                  {isPestAndDisease && (
                    <WoField label="Activity" wide>
                      {editingTask && modal.task.status !== 'pending' ? (
                        <>
                          <p className="wo-prose">{form.activity_type === 'action' ? 'Action' : 'Inspection'}</p>
                          <p className="wo-fine">Locked because the worker already started this task.</p>
                        </>
                      ) : (
                        <WoRadios
                          label="Activity"
                          options={[{ value: 'inspection', label: 'Inspection' }, { value: 'action', label: 'Action' }]}
                          value={form.activity_type}
                          onChange={(value) => setForm({ ...form, activity_type: value })}
                        />
                      )}
                    </WoField>
                  )}
                  <WoField label="Field / location" htmlFor="task-field">
                    <select id="task-field" className="wo-input" value={form.field_id} onChange={(event) => setForm({ ...form, field_id: event.target.value })} required>
                      <option value="" disabled>Select field</option>
                      {options.fields.map((field) => <option value={field.id} key={field.id}>{field.field_name}</option>)}
                    </select>
                  </WoField>
                  <WoField label="Priority" wide={!editingTask}>
                    <WoRadios
                      label="Priority"
                      options={options.priorities.map((priority) => ({ value: priority.id, label: priority.priority_name }))}
                      value={form.priority_id}
                      onChange={(value) => setForm({ ...form, priority_id: value })}
                    />
                  </WoField>
                  {editingTask && (
                    <WoField label="Status" htmlFor="task-status">
                      <select id="task-status" className="wo-input" value={form.status_id} onChange={(event) => setForm({ ...form, status_id: event.target.value })}>
                        {options.statuses.map((status) => <option value={status.id} key={status.id}>{status.status_name}</option>)}
                      </select>
                    </WoField>
                  )}
                </div>
              </WoSection>
            )}

            <WoSection title="Schedule">
              <div className="wo-grid">
                {assigningDriver ? (
                  <>
                    <WoField label="Delivery date" htmlFor="task-delivery-date">
                      <input id="task-delivery-date" className="wo-input" type="date" value={deliveryForm.delivery_date} onChange={(event) => setDeliveryForm({ ...deliveryForm, delivery_date: event.target.value })} required />
                    </WoField>
                    <WoField label="Delivery window" hint="Schedule deliveries only from 7:00 AM to 6:00 PM.">
                      <div className="wo-time">
                        <DeliveryTimeSelect
                          kind="start"
                          value={deliveryForm.start_time}
                          onChange={(event) => {
                            const startTime = event.target.value
                            const endOptions = deliveryTimeOptions('end', startTime)
                            setDeliveryForm({ ...deliveryForm, start_time: startTime, end_time: endOptions.some((option) => option.value === deliveryForm.end_time) ? deliveryForm.end_time : endOptions[0]?.value || '' })
                          }}
                        />
                        <em>to</em>
                        <DeliveryTimeSelect kind="end" startTime={deliveryForm.start_time} value={deliveryForm.end_time} onChange={(event) => setDeliveryForm({ ...deliveryForm, end_time: event.target.value })} />
                      </div>
                    </WoField>
                  </>
                ) : (
                  <>
                    <WoField label="Task date" htmlFor="task-date">
                      <input id="task-date" className="wo-input" type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} required />
                    </WoField>
                    <WoField label="Task window" hint={isCropWorker ? 'Crop work hours: 8:00 AM – 11:50 AM and 1:00 PM – 4:00 PM. Lunch break: 11:50 AM – 1:00 PM.' : null}>
                      <div className="wo-time">
                        {isCropWorker ? (
                          <>
                            <CropTaskTimeSelect
                              kind="start"
                              value={form.start_time}
                              onChange={(event) => {
                                const startTime = event.target.value
                                const endOptions = cropTimeOptions('end', startTime)
                                setForm({ ...form, start_time: startTime, end_time: endOptions.some((option) => option.value === form.end_time) ? form.end_time : endOptions[0]?.value || '' })
                              }}
                            />
                            <em>to</em>
                            <CropTaskTimeSelect kind="end" startTime={form.start_time} value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} />
                          </>
                        ) : (
                          <>
                            <input className="wo-input" type="time" aria-label="Start time" min="07:00" max="17:59" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} required />
                            <em>to</em>
                            <input className="wo-input" type="time" aria-label="End time" min="07:01" max="18:00" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} required />
                          </>
                        )}
                      </div>
                    </WoField>
                  </>
                )}
              </div>
              {summaryLine && <p className="wo-summary">{summaryLine}</p>}
            </WoSection>

            {!assigningDriver && (
              <WoSection title="Instructions">
                <div className="wo-grid is-one">
                  <WoField label="Description (optional)" htmlFor="task-description">
                    <textarea
                      id="task-description"
                      className="wo-input"
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                      placeholder="Add task instructions, objectives, or notes"
                      maxLength="2000"
                      rows={3}
                    />
                  </WoField>
                </div>
              </WoSection>
            )}
          </WorkOrderDialog>
        )
      })()}

      {modal?.mode === 'setting' && (
        <WorkOrderDialog
          size="narrow"
          eyebrow="Settings"
          title={`${modal.value ? 'Edit' : 'Add'} ${modal.type === 'categories' ? 'Task Category' : 'Field / Location'}`}
          titleId="setting-dialog-title"
          onClose={() => setModal(null)}
          onSubmit={saveSetting}
          footerNote={null}
          footer={<>
            <button type="button" className="wo-btn" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="wo-btn is-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>}
        >
          {error && <p className="wo-error" role="alert">{error}</p>}
          <div className="wo-grid is-one">
            <WoField label={modal.type === 'categories' ? 'Category name' : 'Field or location name'} htmlFor="setting-name">
              <input id="setting-name" className="wo-input" autoFocus value={settingsForm.name} onChange={(event) => setSettingsForm({ ...settingsForm, name: event.target.value })} maxLength="120" required />
            </WoField>
            {modal.type === 'categories' && (
              <WoField label="Description (optional)" htmlFor="setting-description">
                <textarea id="setting-description" className="wo-input" value={settingsForm.description} onChange={(event) => setSettingsForm({ ...settingsForm, description: event.target.value })} placeholder="What kind of tasks belong in this category?" maxLength="500" rows={3} />
              </WoField>
            )}
          </div>
        </WorkOrderDialog>
      )}

      {modal?.mode === 'vehicle' && (
        <WorkOrderDialog
          size="narrow"
          eyebrow="Fleet management"
          title={modal.vehicle ? 'Edit Vehicle' : 'Add Vehicle'}
          titleId="vehicle-dialog-title"
          onClose={() => setModal(null)}
          onSubmit={saveVehicle}
          footerNote={null}
          footer={<>
            <button type="button" className="wo-btn" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="wo-btn is-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>}
        >
          {error && <p className="wo-error" role="alert">{error}</p>}
          <div className="wo-grid is-one">
            <WoField label="Vehicle name" htmlFor="vehicle-name">
              <input id="vehicle-name" className="wo-input" autoFocus value={vehicleForm.vehicle_name} onChange={(event) => setVehicleForm({ ...vehicleForm, vehicle_name: event.target.value })} maxLength="120" required />
            </WoField>
            <WoField label="Plate number" htmlFor="vehicle-plate">
              <input id="vehicle-plate" className="wo-input" value={vehicleForm.plate_number} onChange={(event) => setVehicleForm({ ...vehicleForm, plate_number: event.target.value })} maxLength="30" required />
            </WoField>
            <WoField label="Status">
              <WoRadios
                label="Vehicle status"
                options={Object.entries(vehicleStatusLabels).map(([code, label]) => ({ value: code, label }))}
                value={vehicleForm.status}
                onChange={(value) => setVehicleForm({ ...vehicleForm, status: value })}
              />
            </WoField>
          </div>
        </WorkOrderDialog>
      )}
    </main>
  )
}
