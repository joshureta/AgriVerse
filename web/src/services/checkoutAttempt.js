const STORAGE_KEY = 'agriverseCheckoutAttempt'

let currentAttempt = null

function getStorage() {
  try {
    return globalThis.sessionStorage
  } catch {
    return null
  }
}

function createRequestKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function getCheckoutRequestKey(order, storage = getStorage(), makeKey = createRequestKey) {
  const payload = JSON.stringify(order)
  if (!currentAttempt) {
    try {
      currentAttempt = JSON.parse(storage.getItem(STORAGE_KEY) || 'null')
    } catch {
      currentAttempt = null
    }
  }
  if (currentAttempt?.payload === payload && currentAttempt.key) return currentAttempt.key

  currentAttempt = { payload, key: makeKey() }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(currentAttempt))
  } catch {
    // A private browsing storage failure still allows retries within this page.
  }
  return currentAttempt.key
}

export function clearCheckoutRequestKey(storage = getStorage()) {
  currentAttempt = null
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // The order response has already been received.
  }
}
