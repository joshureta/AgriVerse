import assert from 'node:assert/strict'
import test from 'node:test'
import { retryCheckoutTransport } from '../src/services/checkoutTransport.js'

test('a lost checkout response retries the same order request once', async () => {
  const bodies = []
  const orderBody = JSON.stringify({ idempotency_key: 'same-request-key', items: [{ product_id: 3, quantity: 2 }] })
  const response = { ok: true }
  const result = await retryCheckoutTransport(async () => {
    bodies.push(orderBody)
    if (bodies.length === 1) throw new TypeError('Failed to fetch')
    return response
  }, async () => {})

  assert.equal(result, response)
  assert.deepEqual(bodies, [orderBody, orderBody])
})

test('an application error does not submit checkout again', async () => {
  let attempts = 0
  await assert.rejects(retryCheckoutTransport(async () => {
    attempts += 1
    throw new Error('Out of stock')
  }, async () => {}), /Out of stock/)
  assert.equal(attempts, 1)
})
