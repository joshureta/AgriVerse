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
