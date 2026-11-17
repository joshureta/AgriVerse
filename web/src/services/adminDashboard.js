import { supabase } from '../lib/supabase.js'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

async function accessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
  const token = data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')
  return token
}

export async function loadAdminActivities(limit = 10) {
  const token = await accessToken()
  const response = await fetch(`${API_URL}/api/admin/dashboard/activities?limit=${encodeURIComponent(limit)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to load recent activities')
  return { completed: body.activities || [], ongoing: body.ongoing || [] }
}

export async function loadAdminRevenue(period = 'month') {
  const token = await accessToken()
  const response = await fetch(`${API_URL}/api/admin/dashboard/revenue?period=${encodeURIComponent(period)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to load revenue data')
  return body
}

export async function loadAdminInventory() {
  const token = await accessToken()
  const response = await fetch(`${API_URL}/api/admin/dashboard/inventory`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to load inventory statistics')
  return body.inventory || []
}

export async function loadAdminSummary() {
  const token = await accessToken()
  const response = await fetch(`${API_URL}/api/admin/dashboard/summary`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to load dashboard summary')
  return body
}

export async function loadAdminProductivity() {
  const token = await accessToken()
  const response = await fetch(`${API_URL}/api/admin/dashboard/productivity`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to load productivity data')
  return body
}

export async function loadAdminAnalytics({ months = 6, field = 'all' } = {}) {
  const token = await accessToken()
  const params = new URLSearchParams({ months: String(months), field })
  const response = await fetch(`${API_URL}/api/admin/dashboard/analytics?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to load historical analytics')
  return body
}

export async function loadReportFields() {
  const token = await accessToken()
  const response = await fetch(`${API_URL}/api/admin/reports/options`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to load report fields')
  return body.fields || []
}

export async function loadDashboardReport({ type, period, field }) {
  const token = await accessToken()
  const params = new URLSearchParams({ type, period, field })
  const response = await fetch(`${API_URL}/api/admin/reports?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to generate report')
  return body
}
