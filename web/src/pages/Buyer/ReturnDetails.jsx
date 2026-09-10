import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ExternalLink,
  MessageSquare,
  PackageOpen,
  ShieldAlert,
  X,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
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

  return (
    <main className="buyer-page delivery-page">
      <BuyerHeader active="orders" />

      <div className="delivery-content return-details-page-wrap">
        <button
          type="button"
          className="delivery-back-button"
          onClick={() => {
            window.location.href = `/buyer/delivery-progress?order=${orderId}`
          }}
        >
          <ArrowLeft /> Back to delivery tracking
        </button>

        {loading && <div className="delivery-message">Loading your dispute details…</div>}
        {error && <div className="delivery-message is-error">{error}</div>}

        {order && (
          <section className="delivery-card return-detail-card" aria-labelledby="return-details-heading">
            {/* Header Section */}
            <div className="return-detail-header">
              <div>
                <span className="return-eyebrow">DISPUTE &amp; CLAIM SUMMARY</span>
                <h1 id="return-details-heading">Return / Refund Details</h1>
                <p className="return-detail-meta">
                  Order <strong>{order.order_number}</strong> · Seller: <strong>{order.seller_farm_name || 'JToledo Trading'}</strong> · Submitted{' '}
                  {order.delivery_dispute_created_at
                    ? new Date(order.delivery_dispute_created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Recently'}
                </p>
              </div>

              <div>
                <span className={`return-detail-badge is-${order.delivery_dispute_status || 'open'}`}>
                  <span className="return-detail-badge-dot" />
                  {order.delivery_dispute_status === 'resolved' ? 'Resolved' : 'Under Review'}
                </span>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="return-detail-stepper-wrap">
              <div className="delivery-return-stepper-track">
                <div className="delivery-return-stepper-bg" />
                <div
                  className="delivery-return-stepper-fill"
                  style={{
                    width: order.delivery_dispute_status === 'resolved' ? '100%' : '50%',
                  }}
                />
              </div>

              <div className="delivery-return-stepper-steps">
                <div className="delivery-return-step is-done">
                  <div className="delivery-return-step-node">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <strong>Report submitted</strong>
                  <small>
                    {order.delivery_dispute_created_at
                      ? new Date(order.delivery_dispute_created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Submitted'}
                  </small>
                </div>

                <div className={`delivery-return-step ${order.delivery_dispute_status === 'open' ? 'is-active' : 'is-done'}`}>
                  <div className="delivery-return-step-node">
                    {order.delivery_dispute_status === 'resolved' ? (
                      <Check size={14} strokeWidth={3} />
                    ) : (
                      <span className="delivery-return-step-dot" />
                    )}
                  </div>
                  <strong>Return decision</strong>
                  <small>
                    {order.delivery_dispute_status === 'resolved' ? 'Decision reached' : '1–2 business days'}
                  </small>
                </div>

                <div className={`delivery-return-step ${order.delivery_dispute_status === 'resolved' ? 'is-done' : 'is-pending'}`}>
                  <div className="delivery-return-step-node">
                    {order.delivery_dispute_status === 'resolved' ? (
                      <Check size={14} strokeWidth={3} />
                    ) : (
                      <span>3</span>
                    )}
                  </div>
                  <strong>Refund completed</strong>
                  <small>
                    {order.delivery_dispute_status === 'resolved' ? 'Completed' : 'Pending'}
                  </small>
                </div>
              </div>
            </div>

            {/* 2-Column Grid */}
            <div className="return-detail-grid">
              {/* Left Column: Affected Produce & Claim */}
              <div className="return-detail-column">
                <div className="return-detail-section-box">
                  <div className="return-detail-section-head">
                    <h3>Affected Produce</h3>
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

                  <div className="return-detail-claim-total">
                    <div>
                      <span>Requested Resolution</span>
                      <strong>{resolutionLabel}</strong>
                    </div>
                    <div className="return-detail-total-val">
                      <span>Total Claim</span>
                      <strong>PHP {totalRefundAmount.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                {/* Important Advisory */}
                <div className="return-detail-advisory">
                  <ShieldAlert size={18} />
                  <div>
                    <strong>Important notice</strong>
                    <p>Please keep the affected produce and delivery packaging intact until customer support completes the review.</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Evidence & Description */}
              <div className="return-detail-column">
                <div className="return-detail-section-box">
                  <div className="return-detail-section-head">
                    <h3>Submitted Evidence</h3>
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

                  {/* Buyer Description */}
                  <div className="return-detail-description-wrap">
                    <span className="return-detail-label">Buyer Description</span>
                    <blockquote className="return-detail-quote">
                      {userDescription || 'No additional note was provided.'}
                    </blockquote>
                  </div>
                </div>

                {/* Actions */}
                <div className="return-detail-actions">
                  <button
                    type="button"
                    className="return-contact-support-btn"
                    onClick={() => {
                      window.location.href = '/buyer/messages?partner_role=admin'
                    }}
                  >
                    <MessageSquare size={16} />
                    Contact Support
                  </button>

                  <button
                    type="button"
                    className="return-secondary-back-btn"
                    onClick={() => {
                      window.location.href = `/buyer/delivery-progress?order=${orderId}`
                    }}
                  >
                    Back to tracking
                  </button>
                </div>
              </div>
            </div>
          </section>
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
