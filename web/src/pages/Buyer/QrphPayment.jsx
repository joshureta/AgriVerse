import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, PackageSearch, QrCode, XCircle } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import { createQrphCheckout, loadBuyerOrder } from '../../services/buyerMarketplace.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/payment-confirmation.css'
import '../../styles/Buyer/qrph-payment.css'

const orderId = new URL(window.location.href).searchParams.get('order')
const CONFETTI_PIECES = Array.from({ length: 28 }, (_, index) => index)

export default function QrphPayment() {
  const [order, setOrder] = useState(null)
  const [payment, setPayment] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!orderId) {
      setError('No order was specified for this payment.')
      setStatus('error')
      return undefined
    }
    let active = true
    async function start() {
      setStatus('loading')
      setError('')
      try {
        const current = await loadBuyerOrder(orderId)
        if (!active) return
        setOrder(current)
        if (current.payment_method !== 'qrph') throw new Error('This order does not use QR Ph.')
        if (current.payment_status === 'paid') {
          setStatus('paid')
          return
        }
        if (current.order_status === 'cancelled') throw new Error('This order has been cancelled.')
        const next = await createQrphCheckout(orderId)
        if (!active) return
        setPayment(next)
        setStatus(next.status === 'paid' ? 'paid' : 'pending')
      } catch (caught) {
        if (active) {
          setError(caught.message || 'Could not start QR Ph payment.')
          setStatus('error')
        }
      }
    }
    start()
    return () => { active = false }
  }, [attempt])

  useEffect(() => {
    if (status !== 'pending') return undefined
    let active = true
    const timer = window.setInterval(async () => {
      try {
        const current = await loadBuyerOrder(orderId)
        if (!active) return
        setOrder(current)
        if (current.payment_status === 'paid') setStatus('paid')
        else if (current.payment_status === 'failed') setStatus('failed')
        else if (current.order_status === 'cancelled') {
          setError('This order has been cancelled.')
          setStatus('error')
        }
      } catch {
        // Keep the payment view visible during a temporary polling failure.
      }
    }, 3000)
    return () => { active = false; window.clearInterval(timer) }
  }, [status])

  const qrImage = payment?.image_url?.startsWith('data:')
    ? payment.image_url
    : payment?.image_url ? `data:image/png;base64,${payment.image_url}` : null
  const orderUrl = `/buyer/delivery-progress?track=${encodeURIComponent(order?.id ?? orderId ?? '')}`

  return (
    <main className="buyer-page payment-confirmation-page">
      <BuyerHeader active="orders" />

      {status === 'paid' && order && (
        <aside className="payment-success-toast" role="status" aria-live="polite">
          <CheckCircle2 aria-hidden="true" />
          <div><strong>Payment successful</strong><p>Order {order.order_number} is confirmed.</p></div>
        </aside>
      )}

      <div className="payment-confirmation-shell">
        <section className={`payment-confirmation-card qrph-payment-card is-${status}`}>
          {status === 'loading' && (
            <>
              <span className="payment-confirmation-icon is-pending"><Loader2 aria-hidden="true" className="is-spinning" /></span>
              <h1>Preparing your payment…</h1>
              <p>We&apos;re getting the QR Ph payment ready for your order.</p>
            </>
          )}

          {status === 'pending' && (
            <>
              <span className="payment-confirmation-icon is-pending"><QrCode aria-hidden="true" /></span>
              <h1>Complete Your QR Ph Payment</h1>
              <p>{payment?.test_mode ? 'Use the PayMongo simulator to test payment for order ' : 'Pay for order '}<b>{order?.order_number}</b>{payment?.test_mode ? '.' : ' using BDO Pay or another QR Ph banking app.'}</p>
              <dl className="payment-confirmation-summary">
                <div><dt>Order Number</dt><dd>{order?.order_number}</dd></div>
                <div><dt>Amount to Pay</dt><dd>PHP {Number(order?.total_amount || 0).toLocaleString()}</dd></div>
                <div><dt>Payment Method</dt><dd>QR Ph</dd></div>
              </dl>

              {payment?.test_mode ? (
                <div className="qrph-payment-action">
                  <strong>PayMongo test mode</strong>
                  <p>Use the test simulator to complete this payment. Do not scan a test QR with a real banking app.</p>
                  {payment.test_url
                    ? <div className="payment-confirmation-actions"><a className="is-primary" href={payment.test_url} target="_blank" rel="noreferrer">Simulate Test Payment</a></div>
                    : <p>The test payment link was not returned. Check this order in PayMongo&apos;s test dashboard.</p>}
                </div>
              ) : qrImage ? (
                <div className="qrph-payment-action">
                  <img className="qrph-image" src={qrImage} alt="QR Ph code for this order" />
                  <p>Scan or upload this code in your banking app. It expires after about 30 minutes.</p>
                </div>
              ) : <p>PayMongo is processing your payment. Please wait for confirmation.</p>}

              <p>Your order remains pending until PayMongo confirms payment. This page checks automatically.</p>
              <div className="payment-confirmation-actions">
                <button type="button" className="is-secondary" onClick={() => setAttempt((value) => value + 1)}>Check or Renew QR</button>
                <a className="is-secondary" href={orderUrl}>View Order</a>
              </div>
            </>
          )}

          {status === 'paid' && (
            <>
              <div className="payment-confetti" aria-hidden="true">
                {CONFETTI_PIECES.map((piece) => (
                  <i key={piece} style={{
                    '--x': `${(piece * 37) % 100}%`,
                    '--delay': `${(piece % 7) * 55}ms`,
                    '--hue': 95 + piece * 29,
                    '--drift': `${piece % 2 === 0 ? -110 : 110}px`,
                    '--rotation': `${piece * 31}deg`,
                  }} />
                ))}
              </div>
              <span className="payment-confirmation-icon is-success"><CheckCircle2 aria-hidden="true" /></span>
              <h1>Payment Successful!</h1>
              <p>Your QR Ph payment for order <b>{order?.order_number}</b> has been confirmed. It&apos;s now being prepared.</p>
              <dl className="payment-confirmation-summary">
                <div><dt>Order Number</dt><dd>{order?.order_number}</dd></div>
                <div><dt>Amount Paid</dt><dd>PHP {Number(order?.total_amount || 0).toLocaleString()}</dd></div>
                <div><dt>Payment Method</dt><dd>QR Ph</dd></div>
              </dl>
              <div className="payment-confirmation-actions">
                <a className="is-primary" href={orderUrl}>Track Your Order</a>
                <a className="is-secondary" href="/buyer/order">Back to Shop</a>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <span className="payment-confirmation-icon is-failed"><XCircle aria-hidden="true" /></span>
              <h1>Payment Failed</h1>
              <p>The QR Ph payment for order <b>{order?.order_number}</b> expired or did not go through. Your order is still awaiting payment.</p>
              <div className="payment-confirmation-actions">
                <button type="button" className="is-primary" onClick={() => setAttempt((value) => value + 1)}>Retry Payment</button>
                <a className="is-secondary" href={orderUrl}>View Order</a>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <span className="payment-confirmation-icon is-failed"><PackageSearch aria-hidden="true" /></span>
              <h1>We Couldn&apos;t Load This Payment</h1>
              <p>{error}</p>
              <div className="payment-confirmation-actions">
                <button type="button" className="is-primary" onClick={() => setAttempt((value) => value + 1)}>Try Again</button>
                <a className="is-secondary" href={orderUrl}>View Order</a>
              </div>
            </>
          )}
        </section>
      </div>
      <BuyerFooter />
    </main>
  )
}
