import { supabase } from '../lib/supabase.js'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

async function accessToken(refresh = false) {
  const result = refresh ? await supabase.auth.refreshSession() : await supabase.auth.getSession()
  if (result.error) throw new Error(result.error.message)
  const token = result.data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')
  return token
}

async function sellerRequest(path, options = {}, retry = true) {
  const token = await accessToken()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(`${API_URL}/api/seller/orders${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    })
    if (response.status === 401 && retry) {
      await accessToken(true)
      return sellerRequest(path, options, false)
    }
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || `Order request failed (${response.status})`)
    return body
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The order server did not respond. Make sure the Express backend is running.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function loadSellerOrders() {
  const body = await sellerRequest('')
  return body.orders || []
}

export async function changeSellerOrderStatus(orderId, status, note = '') {
  const body = await sellerRequest(`/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  })
  return body.order
}
