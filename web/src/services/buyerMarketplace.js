import { supabase } from '../lib/supabase.js'
import { isCheckoutTransportError, retryCheckoutTransport } from './checkoutTransport.js'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const CART_STORAGE_KEY = 'agriverseBuyerCart'

async function readAccessToken(refresh = false) {
  const result = refresh
    ? await supabase.auth.refreshSession()
    : await supabase.auth.getSession()
  if (result.error) throw new Error(result.error.message)
  const token = result.data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')
  return token
}

export async function loadBuyerNotifications({ offset = 0, limit = 100 } = {}) {
  const token = await readAccessToken()
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
  const response = await fetch(`${API_URL}/api/notifications?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to load notifications')
  return body
}

export async function loadPineappleProducts(retry = true) {
  const token = await readAccessToken()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(`${API_URL}/api/buyer/products/pineapples`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.status === 401 && retry) {
      await readAccessToken(true)
      return loadPineappleProducts(false)
    }
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || `Unable to load pineapple inventory (${response.status})`)
    return body.products || []
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Products are temporarily unavailable. Please try again.')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function loadBuyerReviews() {
  const token = await readAccessToken()
  const response = await fetch(`${API_URL}/api/buyer/products/reviews`, { headers: { Authorization: `Bearer ${token}` } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to load customer reviews')
  return body.reviews || []
}

export async function loadFeaturedBuyerReviews() {
  const token = await readAccessToken()
  const response = await fetch(`${API_URL}/api/buyer/products/reviews/featured`, { headers: { Authorization: `Bearer ${token}` } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to load featured customer reviews')
  return body.reviews || []
}

export async function placeBuyerOrder(order, retry = true) {
  const orderBody = JSON.stringify(order)
  async function sendOrder() {
    const token = await readAccessToken()
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    try {
      return await fetch(`${API_URL}/api/buyer/orders`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: orderBody,
      })
    } finally {
      window.clearTimeout(timeout)
    }
  }
  try {
    const response = order.idempotency_key
      ? await retryCheckoutTransport(sendOrder)
      : await sendOrder()
    if (response.status === 401 && retry) {
      await readAccessToken(true)
      return placeBuyerOrder(order, false)
    }
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || `Unable to place order (${response.status})`)
    return body.order
  } catch (error) {
    if (isCheckoutTransportError(error)) {
      const uncertainError = new Error('Order status could not be confirmed. Check your orders before submitting again.')
      uncertainError.code = 'CHECKOUT_CONNECTION_UNCERTAIN'
      throw uncertainError
    }
    throw error
  }
}

export async function createGcashCheckout(orderId, retry = true) {
  const token = await readAccessToken()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(`${API_URL}/api/buyer/payments/${orderId}/gcash-checkout`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.status === 401 && retry) {
      await readAccessToken(true)
      return createGcashCheckout(orderId, false)
    }
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || `Unable to start GCash payment (${response.status})`)
    return body.checkout_url
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('PayMongo did not respond. Please try again.')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

async function requestBuyerAddress(path, options = {}, retry = true) {
  const token = await readAccessToken()
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  })
  if (response.status === 401 && retry) {
    await readAccessToken(true)
    return requestBuyerAddress(path, options, false)
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Unable to load delivery information (${response.status})`)
  return body
}

export async function loadBuyerDeliveryAddresses() {
  const body = await requestBuyerAddress('/api/buyer/orders/addresses')
  return {
    addresses: body.addresses || [],
    defaultAddressId: body.default_address_id || null,
    addressConfirmedAt: body.address_confirmed_at || null,
  }
}

export async function createBuyerDeliveryAddress(address) {
  const body = await requestBuyerAddress('/api/buyer/orders/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(address),
  })
  return body.address
}

export async function saveDefaultBuyerDeliveryAddress(addressId) {
  return requestBuyerAddress('/api/buyer/orders/addresses/default', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address_id: addressId }),
  })
}

export async function deleteBuyerDeliveryAddress(addressId) {
  await requestBuyerAddress(`/api/buyer/orders/addresses/${encodeURIComponent(addressId)}`, {
    method: 'DELETE',
  })
}

export async function loadBuyerOrders(retry = true) {
  const token = await readAccessToken()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(`${API_URL}/api/buyer/orders`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.status === 401 && retry) {
      await readAccessToken(true)
      return loadBuyerOrders(false)
    }
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || `Unable to load orders (${response.status})`)
    return body.orders || []
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The order server did not respond. Please try again.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function loadBuyerOrder(orderId, retry = true) {
  const token = await readAccessToken()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(`${API_URL}/api/buyer/orders/${orderId}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.status === 401 && retry) {
      await readAccessToken(true)
      return loadBuyerOrder(orderId, false)
    }
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || `Unable to load order (${response.status})`)
    return body.order
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The order server did not respond. Please try again.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function confirmBuyerOrderReceipt(orderId) {
  const token = await readAccessToken()
  const response = await fetch(`${API_URL}/api/buyer/orders/${orderId}/confirm-receipt`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to confirm this delivery')
  return body.order
}

export async function cancelBuyerOrder(orderId, { category, note = '' } = {}) {
  const token = await readAccessToken()
  const response = await fetch(`${API_URL}/api/buyer/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ category, note }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to cancel this order')
  return body.order
}

export async function reportBuyerOrderDispute(orderId, { category, itemId, affectedQuantity, reason, photos }) {
  const token = await readAccessToken()
  const response = await fetch(`${API_URL}/api/buyer/orders/${orderId}/dispute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      category,
      item_id: itemId,
      affected_quantity: affectedQuantity,
      reason,
      photos,
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to submit this report')
  return body.order
}

export async function rateBuyerOrder(orderId, rating, comment = '') {
  const token = await readAccessToken()
  const response = await fetch(`${API_URL}/api/buyer/orders/${orderId}/rating`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ rating, comment }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to submit this rating')
  return body.order
}

// Reads a File into a base64 string (no data: prefix) the backend upload helper expects.
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]+;base64,/, ''))
    reader.onerror = () => reject(new Error('Could not read that file'))
    reader.readAsDataURL(file)
  })
}

export function readBuyerCart() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

export function buyerCartQuantity(items = readBuyerCart()) {
  return items.reduce(
    (total, item) => total + Math.max(0, Number(item.quantity) || 0),
    0,
  )
}

export function writeBuyerCart(items) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
}
