import { supabase } from '../lib/supabase.js'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

async function request(path, options = {}, retry = true) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
  const token = data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  })
  if (response.status === 401 && retry) {
    const refreshed = await supabase.auth.refreshSession()
    if (refreshed.error) throw new Error(refreshed.error.message)
    return request(path, options, false)
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to update notifications')
  return body
}

export function loadAdminNotifications() {
  return request('/api/notifications')
}

export function markAdminNotificationRead(id) {
  return request(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' })
}

export function markAllAdminNotificationsRead() {
  return request('/api/notifications/read-all', { method: 'POST' })
}
