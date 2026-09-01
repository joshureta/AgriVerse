import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, PackageSearch, XCircle } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import { createGcashCheckout, loadBuyerOrder } from '../../services/buyerMarketplace.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/payment-confirmation.css'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 8
const CONFETTI_PIECES = Array.from({ length: 28 }, (_, index) => index)

function readOrderIdFromUrl() {
  return new URL(window.location.href).searchParams.get('order')
}

export default function PaymentConfirmation() {
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [gaveUpPolling, setGaveUpPolling] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState('')
  const attemptsRef = useRef(0)

  useEffect(() => {
    const orderId = readOrderIdFromUrl()
    if (!orderId) {
      setStatus('error')
      setLoadError('No order was specified for this payment.')
      return undefined
    }

    let active = true
    let timer = null

    async function poll() {
      try {
        const fetchedOrder = await loadBuyerOrder(orderId)
        if (!active) return
        setOrder(fetchedOrder)
        setStatus(fetchedOrder.payment_status === 'paid' ? 'paid' : fetchedOrder.payment_status === 'failed' ? 'failed' : 'pending')
        if (fetchedOrder.payment_status === 'pending') {
          attemptsRef.current += 1
          if (attemptsRef.current < MAX_POLL_ATTEMPTS) {
            timer = window.setTimeout(poll, POLL_INTERVAL_MS)
          } else {
            setGaveUpPolling(true)
          }
        }
      } catch (requestError) {
        if (active) {
          setStatus('error')
          setLoadError(requestError.message)
        }
      }
    }

    poll()
    return () => {
      active = false
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  async function retryGcashPayment() {
    if (!order || retrying) return
    setRetrying(true)
    setRetryError('')
    try {
      const checkoutUrl = await createGcashCheckout(order.id)
      window.location.href = checkoutUrl
    } catch (requestError) {
      setRetryError(requestError.message)
      setRetrying(false)
    }
  }

  function checkAgain() {
    attemptsRef.current = 0
    setGaveUpPolling(false)
    setStatus('pending')
    loadBuyerOrder(readOrderIdFromUrl())
      .then((fetchedOrder) => {
        setOrder(fetchedOrder)
        setStatus(fetchedOrder.payment_status === 'paid' ? 'paid' : fetchedOrder.payment_status === 'failed' ? 'failed' : 'pending')
      })
      .catch((requestError) => {
        setStatus('error')
        setLoadError(requestError.message)
      })
  }

  return (
    <main className="buyer-page payment-confirmation-page">
      <BuyerHeader active="orders" />

      <div className="payment-confirmation-shell">
        <section className={`payment-confirmation-card is-${status}`}>
          {status === 'loading' && (
            <>
              <span className="payment-confirmation-icon is-pending"><Loader2 aria-hidden="true" className="is-spinning" /></span>
              <h1>Loading payment status…</h1>
            </>
          )}

          {status === 'pending' && (
            <>
              <span className="payment-confirmation-icon is-pending"><Loader2 aria-hidden="true" className="is-spinning" /></span>
              <h1>Confirming your payment…</h1>
              <p>We&apos;re verifying your GCash payment for order <b>{order?.order_number}</b>. This can take a few seconds — please don&apos;t close this page.</p>
              {gaveUpPolling && (
                <div className="payment-confirmation-stall">
                  <p>This is taking longer than expected. You can keep waiting or check again.</p>
                  <button type="button" onClick={checkAgain}>Check Again</button>
                </div>
              )}
            </>
          )}

          {status === 'paid' && (
            <>
              <div className="payment-confetti" aria-hidden="true">
                {CONFETTI_PIECES.map((piece) => (
                  <i
                    key={piece}
                    style={{
                      '--x': `${(piece * 37) % 100}%`,
                      '--delay': `${(piece % 7) * 55}ms`,
                      '--hue': 95 + piece * 29,
                      '--drift': `${piece % 2 === 0 ? -110 : 110}px`,
                      '--rotation': `${piece * 31}deg`,
                    }}
                  />
                ))}
              </div>
              <span className="payment-confirmation-icon is-success"><CheckCircle2 aria-hidden="true" /></span>
              <h1>Payment Successful!</h1>
              <p>Your GCash payment for order <b>{order?.order_number}</b> has been confirmed. It&apos;s now being prepared.</p>
              <dl className="payment-confirmation-summary">
                <div><dt>Order Number</dt><dd>{order?.order_number}</dd></div>
                <div><dt>Amount Paid</dt><dd>PHP {Number(order?.total_amount || 0).toLocaleString()}</dd></div>
                <div><dt>Payment Method</dt><dd>GCash</dd></div>
              </dl>
              <div className="payment-confirmation-actions">
                <a className="is-primary" href={`/buyer/delivery-progress?track=${encodeURIComponent(order?.id ?? '')}`}>Track Your Order</a>
                <a className="is-secondary" href="/buyer/order">Back to Shop</a>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <span className="payment-confirmation-icon is-failed"><XCircle aria-hidden="true" /></span>
              <h1>Payment Failed</h1>
              <p>Your GCash payment for order <b>{order?.order_number}</b> did not go through. No charges were made.</p>
              {retryError && <p className="payment-confirmation-error">{retryError}</p>}
              <div className="payment-confirmation-actions">
                <button type="button" className="is-primary" onClick={retryGcashPayment} disabled={retrying}>
                  {retrying ? 'Redirecting…' : 'Retry Payment'}
                </button>
                <a className="is-secondary" href="/buyer/delivery-progress">View Orders</a>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <span className="payment-confirmation-icon is-failed"><PackageSearch aria-hidden="true" /></span>
              <h1>We Couldn&apos;t Load This Payment</h1>
              <p>{loadError || 'Something went wrong while checking your payment status.'}</p>
              <div className="payment-confirmation-actions">
                <a className="is-secondary" href="/buyer/delivery-progress">View Orders</a>
              </div>
            </>
          )}
        </section>
      </div>

      <BuyerFooter />
    </main>
  )
}
