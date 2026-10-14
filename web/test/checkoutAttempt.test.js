import assert from 'node:assert/strict'
import test from 'node:test'
import { clearCheckoutRequestKey, getCheckoutRequestKey } from '../src/services/checkoutAttempt.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

test('a timed out checkout reuses its request key, including after a page reload', async () => {
  const storage = memoryStorage()
  const order = { delivery_method: 'delivery', items: [{ product_id: 3, quantity: 2 }] }
  const firstKey = getCheckoutRequestKey(order, storage, () => 'first-key')
  assert.equal(getCheckoutRequestKey(order, storage, () => 'unused-key'), firstKey)

  const reloaded = await import('../src/services/checkoutAttempt.js?after-reload')
  assert.equal(reloaded.getCheckoutRequestKey(order, storage, () => 'unused-key'), firstKey)

  assert.equal(getCheckoutRequestKey({ ...order, customer_note: 'new' }, storage, () => 'second-key'), 'second-key')
  clearCheckoutRequestKey(storage)
  assert.equal(getCheckoutRequestKey(order, storage, () => 'third-key'), 'third-key')
  clearCheckoutRequestKey(storage)
  reloaded.clearCheckoutRequestKey(storage)
})
