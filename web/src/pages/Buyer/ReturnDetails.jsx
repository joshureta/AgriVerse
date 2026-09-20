import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ExternalLink,
  Hourglass,
  MessageSquare,
  PackageOpen,
  ReceiptText,
  ShieldAlert,
  X,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import ProgressStepper from '../../components/ProgressStepper.jsx'
import { buildReturnSteps } from '../../components/returnSteps.js'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import { loadBuyerOrder } from '../../services/buyerMarketplace.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/deliveryProgress.css'

const categoryLabels = {
  damaged: 'Damaged produce',
  spoiled_rotten: 'Spoiled / rotten produce',
  wrong_item: 'Wrong item received',
  missing_item: 'Missing item in delivery',
  wrong_quantity: 'Incorrect quantity delivered',
}

function formatDateTime(value) {
  if (!value) return 'Pending'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ReturnDetails() {
  const orderId = useMemo(() => Number(new URLSearchParams(window.location.search).get('order')), [])
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePhoto, setActivePhoto] = useState(null)

  const load = useCallback(async () => {
    try {
      const loaded = await loadBuyerOrder(orderId)
      setOrder(loaded)
    } catch (caught) {
      setError(caught.message || 'Failed to load order details.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (Number.isSafeInteger(orderId) && orderId > 0) {
      load()
    } else {
      setError('No order was specified.')
      setLoading(false)
    }
  }, [load, orderId])

  // Parse buyer note and item breakdown from structured delivery_dispute_reason
  const { resolutionLabel, itemBreakdownText, userDescription } = useMemo(() => {
    if (!order?.delivery_dispute_reason) {
      return { resolutionLabel: 'Refund Only', itemBreakdownText: '', userDescription: '' }
    }

    const raw = order.delivery_dispute_reason
    let resLabel = 'Refund Only'
    let breakdown = ''
    let desc = raw

    const resMatch = raw.match(/\[Requested Resolution:\s*([^\]]+)\]/)
    if (resMatch) {
      resLabel = resMatch[1].trim()
      desc = desc.replace(resMatch[0], '').trim()
    }

    const itemsMatch = raw.match(/\[Affected Items:\s*([^\]]+)\]/)
    if (itemsMatch) {
      breakdown = itemsMatch[1].trim()
      desc = desc.replace(itemsMatch[0], '').trim()
    }

    return { resolutionLabel: resLabel, itemBreakdownText: breakdown, userDescription: desc }
  }, [order])

  // Compute affected items list
  const affectedItemsList = useMemo(() => {
    if (!order || !order.items) return []

    // If there is an itemBreakdownText, try to match items from order
    if (itemBreakdownText) {
      return order.items.filter((item) => itemBreakdownText.includes(item.product_name)).map((item) => {
        const regex = new RegExp(`${item.product_name}\\s*\\((\\d+)\\s*pcs?\\)`, 'i')
        const match = itemBreakdownText.match(regex)
        const qty = match ? Number(match[1]) : item.quantity
        return {
          ...item,
          affectedQty: qty,
          subtotal: qty * (Number(item.unit_price) || 0),
        }
      })
    }

    // Fallback to single delivery_dispute_item_id
    if (order.delivery_dispute_item_id) {
      const single = order.items.find((it) => it.id === order.delivery_dispute_item_id)
      if (single) {
        const qty = order.delivery_dispute_affected_quantity || single.quantity
        return [
          {
            ...single,
            affectedQty: qty,
            subtotal: qty * (Number(single.unit_price) || 0),
          },
        ]
      }
    }

    // Default to first item if present
    return order.items.slice(0, 1).map((item) => ({
      ...item,
      affectedQty: order.delivery_dispute_affected_quantity || 1,
      subtotal: (order.delivery_dispute_affected_quantity || 1) * (Number(item.unit_price) || 0),
    }))
  }, [order, itemBreakdownText])

  const totalRefundAmount = useMemo(() => {
    if (order?.refund_amount != null) return Number(order.refund_amount)
    return affectedItemsList.reduce((sum, it) => sum + (it.subtotal || 0), 0)
  }, [order, affectedItemsList])

  const photos = useMemo(() => {
    if (Array.isArray(order?.delivery_dispute_photo_urls)) {
      return order.delivery_dispute_photo_urls
    }
    return []
  }, [order])

  const resolved = order?.delivery_dispute_status === 'resolved'

  return (
    <main className="buyer-page delivery-page">
      <BuyerHeader active="orders" />

      <div className="delivery-content">
        <a className="delivery-back-button" href="/buyer/delivery-progress">
          <ChevronLeft aria-hidden="true" /> Back
        </a>

        <Breadcrumb
          items={[
            { label: 'My Orders', href: '/buyer/delivery-progress' },
            { label: order ? `Order ${order.order_number}` : 'Order', href: `/buyer/delivery-progress?track=${orderId}` },
            { label: 'Return details' },
          ]}
        />

        {loading && <div className="delivery-message">Loading your dispute details…</div>}
        {error && <div className="delivery-message is-error">{error}</div>}

        {order && (
          <>
            <header className="delivery-title">
              <h1>Return for order {order.order_number}</h1>
            </header>

            <div className="order-detail-layout">
              <div className="order-detail-main">
                <section className="delivery-card return-panel" aria-labelledby="return-progress-title">
                  <h2 id="return-progress-title">Return Progress</h2>
                  <div className="return-panel-stepper">
                    <ProgressStepper
                      steps={buildReturnSteps(order, (value) =>
                        new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}
                    />
                  </div>
                </section>

                <section className="delivery-card return-panel" aria-labelledby="return-produce-title">
                  <div className="return-panel-head">
                    <h2 id="return-produce-title">Affected Produce</h2>
                    <span>{categoryLabels[order.delivery_dispute_category] || 'Damaged produce'}</span>
                  </div>

                  <div className="return-detail-items-list">
                    {affectedItemsList.length > 0 ? (
                      affectedItemsList.map((item) => (
                        <div key={item.id} className="return-detail-item-row">
                          <div className="return-detail-item-pic">
                            <img src={pineappleImage} alt={item.product_name} />
                          </div>
                          <div className="return-detail-item-info">
                            <strong>{item.product_name}</strong>
                            <small>
                              {item.affectedQty} pcs affected · PHP {Number(item.unit_price || 0).toLocaleString()} each
                            </small>
                          </div>
                          <b className="return-detail-item-subtotal">
                            PHP {Number(item.subtotal || 0).toLocaleString()}
                          </b>
                        </div>
                      ))
                    ) : (
                      <div className="return-detail-item-row">
                        <PackageOpen size={20} />
                        <div className="return-detail-item-info">
                          <strong>Order item</strong>
                          <small>{order.delivery_dispute_affected_quantity || 1} pcs affected</small>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="delivery-order-cost"><span>Requested resolution</span><strong>{resolutionLabel}</strong></div>
                  <div className="delivery-total"><span>Total Claim</span><strong>PHP {totalRefundAmount.toLocaleString()}</strong></div>
                </section>

                <section className="delivery-card return-panel" aria-labelledby="return-evidence-title">
                  <div className="return-panel-head">
                    <h2 id="return-evidence-title">Submitted Evidence</h2>
                    <span>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
                  </div>

                  {photos.length > 0 ? (
                    <div className="return-detail-photos-grid">
                      {photos.map((url, idx) => (
                        <button
                          key={url || idx}
                          type="button"
                          className="return-detail-photo-thumb"
                          onClick={() => setActivePhoto(url)}
                          aria-label={`View photo evidence ${idx + 1}`}
                        >
                          <img src={url} alt={`Evidence #${idx + 1}`} />
                          <span className="return-photo-zoom-hint">
                            <ExternalLink size={14} />
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="return-detail-empty-photos">No photos were submitted with this dispute.</p>
                  )}

                  <div className="return-detail-description-wrap">
                    <span className="return-detail-label">Buyer Description</span>
                    <blockquote className="return-detail-quote">
                      {userDescription || 'No additional note was provided.'}
                    </blockquote>
                  </div>
                </section>
              </div>

              <aside className="order-detail-side">
                <section className="delivery-card order-details" aria-labelledby="return-order-details-title">
                  <h2 id="return-order-details-title">Order Details</h2>
                  <div className="order-detail-list">
                    <article className="order-detail"><span className="delivery-icon-badge"><ReceiptText aria-hidden="true" /></span><p><strong>Order Number</strong><span>{order.order_number}</span></p></article>
                    <article className="order-detail"><span className="delivery-icon-badge"><CalendarDays aria-hidden="true" /></span><p><strong>Order Date</strong><span>{formatDateTime(order.created_at)}</span></p></article>
                    <article className="order-detail">
                      <span className="delivery-icon-badge">{resolved ? <Check aria-hidden="true" /> : <Hourglass aria-hidden="true" />}</span>
                      <p><strong>Status</strong><span>{resolved ? 'Resolved' : 'Under review'}</span></p>
                    </article>
                  </div>
                </section>

                <div className="return-detail-advisory">
                  <ShieldAlert size={18} />
                  <div>
                    <strong>Important notice</strong>
                    <p>Please keep the affected produce and delivery packaging intact until customer support completes the review.</p>
                  </div>
                </div>

                <section className="delivery-card delivery-confirmation delivery-receipt-card" aria-labelledby="return-help-title">
                  <h2 id="return-help-title">Need help?</h2>
                  <p>Message support about this return.</p>
                  <div className="delivery-confirmation-actions">
                    <button
                      type="button"
                      className="is-primary"
                      onClick={() => {
                        window.location.href = '/buyer/messages?partner_role=admin'
                      }}
                    >
                      <MessageSquare size={16} /> Contact Support
                    </button>
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>

      {/* Lightbox Modal for Photo Evidence */}
      {activePhoto && (
        <div className="return-lightbox-overlay" onClick={() => setActivePhoto(null)}>
          <div className="return-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="return-lightbox-close"
              onClick={() => setActivePhoto(null)}
              aria-label="Close photo preview"
            >
              <X size={18} />
            </button>
            <img src={activePhoto} alt="Produce evidence full view" />
          </div>
        </div>
      )}

      <BuyerFooter />
    </main>
  )
}
