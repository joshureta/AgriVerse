import { supabase } from '../lib/supabase.js'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

export async function fetchSensorRows(table, options = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')
  const params = new URLSearchParams()
  for (const key of ['start', 'end', 'limit', 'offset']) {
    if (options[key] != null) params.set(key, String(options[key]))
  }
  const response = await fetch(`${API_URL}/api/sensors/${table}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Sensor readings are unavailable.')
  return body.data || []
}

export async function fetchSensorDay(table, bounds) {
  const rows = []
  for (let offset = 0; ;) {
    const page = await fetchSensorRows(table, {
      start: new Date(bounds.start).toISOString(),
      end: new Date(bounds.end).toISOString(),
      offset,
      limit: 1000,
    })
    rows.push(...page)
    if (page.length < 1000) break
    offset += page.length
  }
  return rows
}

// Loads each sensor device's send interval (admin only).
export async function fetchSensorSettings() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')
  const response = await fetch(`${API_URL}/api/sensors/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Sensor settings are unavailable.')
  return body.devices || []
}
