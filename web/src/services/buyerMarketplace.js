import { supabase } from '../lib/supabase.js'

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
      throw new Error('The inventory server did not respond. Make sure the Express backend is running on port 5000.')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function placeBuyerOrder(order, retry = true) {
  const token = await readAccessToken()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(`${API_URL}/api/buyer/orders`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(order),
    })
    if (response.status === 401 && retry) {
      await readAccessToken(true)
      return placeBuyerOrder(order, false)
    }
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || `Unable to place order (${response.status})`)
    return body.order
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Checkout timed out. Please verify your connection and try again.')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
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

export async function loadBuyerDeliveryAddresses() {
  const token = await readAccessToken()
  const response = await fetch(`${API_URL}/api/buyer/orders/addresses`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to load delivery addresses')
  return {
    addresses: body.addresses || [],
    defaultAddressId: body.default_address_id || null,
    addressConfirmedAt: body.address_confirmed_at || null,
  }
}

export async function createBuyerDeliveryAddress(address) {
  const token = await readAccessToken()
  const response = await fetch(`${API_URL}/api/buyer/orders/addresses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(address),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to save the delivery address')
  return body.address
}

export async function saveDefaultBuyerDeliveryAddress(addressId) {
  const token = await readAccessToken()
  const response = await fetch(`${API_URL}/api/buyer/orders/addresses/default`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ address_id: addressId }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to save the default delivery address')
  return body
}

export async function deleteBuyerDeliveryAddress(addressId) {
  const token = await readAccessToken()
  const response = await fetch(`${API_URL}/api/buyer/orders/addresses/${encodeURIComponent(addressId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'Unable to delete the delivery address')
  }
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
