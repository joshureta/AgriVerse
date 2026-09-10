import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  Minus,
  PackageOpen,
  PackageX,
  Plus,
  RefreshCw,
  Scale,
  ShieldCheck,
  X,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import { loadBuyerOrder, readFileAsBase64, reportBuyerOrderDispute } from '../../services/buyerMarketplace.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/deliveryProgress.css'

const issues = [
  { value: 'damaged', label: 'Damaged', help: 'Bruised, crushed, or leaking', icon: AlertCircle },
  { value: 'spoiled_rotten', label: 'Spoiled / rotten', help: 'Not fresh or safe to use', icon: PackageX },
  { value: 'wrong_item', label: 'Wrong item', help: 'Different product or size', icon: RefreshCw },
  { value: 'missing_item', label: 'Missing item', help: 'An item was not included', icon: PackageOpen },
  { value: 'wrong_quantity', label: 'Wrong quantity', help: 'You received fewer items', icon: Scale },
]

export default function ReturnRequest() {
  const orderId = useMemo(() => Number(new URLSearchParams(window.location.search).get('order')), [])
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [category, setCategory] = useState('')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')
  const [resolution, setResolution] = useState('refund')
  const [photos, setPhotos] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      const loaded = await loadBuyerOrder(orderId)
      setOrder(loaded)
      if (loaded?.items && loaded.items.length > 0) {
        setItemId(String(loaded.items[0].id))
        setQuantity(loaded.items[0].quantity)
      }
    } catch (caught) {
      setError(caught.message)
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

  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file))
    setPhotoPreviews(urls)
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [photos])

  const affectedItem = useMemo(() => {
    return order?.items?.find((item) => String(item.id) === itemId)
  }, [order, itemId])

  function handleItemChange(newItemId) {
    setItemId(newItemId)
    const selected = order?.items?.find((item) => String(item.id) === newItemId)
    setQuantity(selected ? selected.quantity : 1)
  }

  function adjustQuantity(delta) {
    if (!affectedItem) return
    const max = affectedItem.quantity
    const next = Math.max(1, Math.min(max, Number(quantity) + delta))
    setQuantity(next)
  }

  function handlePhotoSelect(event) {
    const selected = Array.from(event.target.files || [])
    if (!selected.length) return
    setPhotos((current) => [...current, ...selected].slice(0, 6))
    event.target.value = ''
  }

  function removePhoto(indexToRemove) {
    setPhotos((current) => current.filter((_, index) => index !== indexToRemove))
  }

  const estimatedRefund = useMemo(() => {
    if (!order || !affectedItem) return 0
    const totalOrderItems = order.items.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1
    const unitPrice = Number(affectedItem.unit_price) || Math.round(Number(order.total_amount) / totalOrderItems)
    return Math.min(Number(quantity) * unitPrice, Number(order.total_amount))
  }, [order, affectedItem, quantity])

  const ready = Boolean(category && itemId && Number(quantity) > 0 && reason.trim() && photos.length > 0)

  async function submit(event) {
    if (event) event.preventDefault()
    if (!ready || submitting) return

    setSubmitting(true)
    setError('')

    try {
      const resolutionPrefix = resolution === 'replacement'
        ? '[Requested Resolution: Replacement Fruit]\n\n'
        : '[Requested Resolution: Refund Only]\n\n'
      const fullReason = `${resolutionPrefix}${reason.trim()}`.slice(0, 1000)

      await reportBuyerOrderDispute(order.id, {
        category,
        itemId: Number(itemId),
        affectedQuantity: Number(quantity),
        reason: fullReason,
        photos: await Promise.all(
          photos.map(async (file) => ({
            data: await readFileAsBase64(file),
            mime: file.type || 'image/jpeg',
          })),
        ),
      })

      window.location.href = `/buyer/delivery-progress?track=${order.id}`
    } catch (caught) {
      setError(caught.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="buyer-page delivery-page">
      <BuyerHeader active="orders" cartCount={0} />

      <div className="delivery-content return-request-content">
        <button className="delivery-back-button" type="button" onClick={() => history.back()}>
          <ArrowLeft /> Back to order
        </button>

        {loading && <div className="delivery-message">Loading your delivered order…</div>}
        {error && <div className="delivery-message is-error">{error}</div>}

        {order && (
          <section className="delivery-card return-request-card">
            {/* Preserved Upper Section Banner */}
            <header>
              <span className="return-eyebrow">RETURN / REFUND REQUEST</span>
              <h1>Report a delivery issue</h1>
              <p>Tell us what happened. We’ll review your report and arrange the appropriate resolution.</p>
            </header>

            <div className="return-order-summary">
              <PackageOpen />
              <div>
                <strong>{order.order_number}</strong>
                <span>{order.items.map((item) => `${item.quantity} ${item.product_name}`).join(', ')}</span>
              </div>
              <b>PHP {Number(order.total_amount).toLocaleString()}</b>
            </div>

            {/* 2-Column Redesigned Grid */}
            <div className="return-layout-grid">
              {/* Left Column: Form Steps */}
              <form className="return-form-column" onSubmit={submit}>
                
                {/* STEP 1: What happened? (Rich Card Tiles) */}
                <div className="delivery-dispute-intro">
                  <span>STEP 1 OF 3</span>
                  <h3>What happened?</h3>
                  <p>Choose the issue that best matches your delivery.</p>
                </div>

                <div className="return-issue-tiles" role="group" aria-label="Issue type">
                  {issues.map((issue) => {
                    const IconComponent = issue.icon
                    const isSelected = category === issue.value
                    return (
                      <button
                        key={issue.value}
                        type="button"
                        className={`return-issue-tile ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setCategory(issue.value)}
                      >
                        <div className="return-issue-tile-head">
                          <div className="return-issue-icon">
                            <IconComponent size={18} />
                          </div>
                          {isSelected && (
                            <span className="return-issue-check">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <strong>{issue.label}</strong>
                        <small>{issue.help}</small>
                      </button>
                    )
                  })}
                </div>

                {/* STEP 2: Affected Item & Quantity Stepper */}
                <div style={{ marginTop: '24px' }}>
                  <label htmlFor="return-item" style={{ display: 'block', margin: '0 0 8px', color: '#2c5330', fontSize: '12px', fontWeight: '750' }}>
                    STEP 2 — Affected item
                  </label>

                  {order.items.length > 1 && (
                    <select
                      id="return-item"
                      value={itemId}
                      onChange={(event) => handleItemChange(event.target.value)}
                      required
                    >
                      <option value="">Select an item</option>
                      {order.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.product_name} · {item.quantity} {item.weight_label || 'ordered'}
                        </option>
                      ))}
                    </select>
                  )}

                  {affectedItem && (
                    <div className="return-item-card">
                      <div className="return-item-info-wrap">
                        <div className="return-item-thumb">
                          <img src={pineappleImage} alt={affectedItem.product_name} />
                        </div>
                        <div className="return-item-info">
                          <strong>{affectedItem.product_name}</strong>
                          <span>
                            {affectedItem.weight_label ? `${affectedItem.weight_label} · ` : ''}
                            PHP {Number(affectedItem.unit_price || 100).toLocaleString()} each · Ordered: {affectedItem.quantity} pcs
                          </span>
                        </div>
                      </div>

                      <div className="return-qty-wrap">
                        <span className="return-qty-label">Quantity affected:</span>
                        <div className="return-qty-stepper">
                          <button
                            type="button"
                            onClick={() => adjustQuantity(-1)}
                            disabled={Number(quantity) <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span>{quantity}</span>
                          <button
                            type="button"
                            onClick={() => adjustQuantity(1)}
                            disabled={Number(quantity) >= affectedItem.quantity}
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                      <label htmlFor="return-reason" style={{ margin: 0, color: '#2c5330', fontSize: '12px', fontWeight: '750' }}>
                        Describe the issue
                      </label>
                      <span style={{ fontSize: '11px', color: '#68736b' }}>{reason.length} / 1000 characters</span>
                    </div>
                    <textarea
                      id="return-reason"
                      maxLength={1000}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="For example: two pineapples arrived bruised and leaking."
                      rows={4}
                      value={reason}
                      required
                    />
                  </div>
                </div>

                {/* STEP 3: Photo Evidence & Resolution */}
                <div style={{ marginTop: '24px' }}>
                  <label htmlFor="return-photos" style={{ display: 'block', margin: '0 0 8px', color: '#2c5330', fontSize: '12px', fontWeight: '750' }}>
                    STEP 3 — Photo evidence &amp; preferred resolution
                  </label>

                  <label className="return-photo-picker" htmlFor="return-photos">
                    <Camera />
                    <span>
                      <strong>Add photo evidence (Required)</strong>
                      <small>Up to 6 photos showing produce damage, packaging condition, and delivery receipt.</small>
                    </span>
                  </label>

                  <input
                    id="return-photos"
                    className="sr-only"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    type="file"
                  />

                  {photos.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <div className="return-photo-thumbnails">
                        {photoPreviews.map((url, idx) => (
                          <div className="return-photo-thumb" key={url}>
                            <img src={url} alt={`Evidence ${idx + 1}`} />
                            <button
                              type="button"
                              className="return-photo-remove"
                              onClick={() => removePhoto(idx)}
                              title="Remove photo"
                            >
                              <X />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="delivery-evidence-help" style={{ marginTop: '6px' }}>
                        {photos.length} photo{photos.length === 1 ? '' : 's'} selected (maximum 6).
                      </p>
                    </div>
                  )}

                  {/* Resolution choices */}
                  <div style={{ marginTop: '18px' }}>
                    <span style={{ display: 'block', color: '#2c5330', fontSize: '12px', fontWeight: '750', marginBottom: '8px' }}>
                      Preferred Resolution
                    </span>
                    <div className="return-resolution-options">
                      <label className={`return-resolution-card ${resolution === 'refund' ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="resolution"
                          value="refund"
                          checked={resolution === 'refund'}
                          onChange={() => setResolution('refund')}
                        />
                        <div>
                          <strong>
                            Refund Only
                            <span className="return-resolution-badge">Recommended</span>
                          </strong>
                          <p>
                            Full refund of PHP {estimatedRefund.toLocaleString()} credited back to your payment account within 24–48 hours. No fruit return needed.
                          </p>
                        </div>
                      </label>

                      <label className={`return-resolution-card ${resolution === 'replacement' ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="resolution"
                          value="replacement"
                          checked={resolution === 'replacement'}
                          onChange={() => setResolution('replacement')}
                        />
                        <div>
                          <strong>Replacement Fruit</strong>
                          <p>
                            Replacement pineapples will be scheduled and dispatched on the next farm delivery route.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Bottom Confirmation Action Buttons (Mobile View or Direct submit) */}
                <div className="delivery-confirmation-actions" style={{ marginTop: '24px' }}>
                  <button className="is-primary return-submit-btn" disabled={!ready || submitting} type="submit">
                    {submitting ? 'Submitting…' : 'Submit report'}
                  </button>
                  <button className="is-secondary" disabled={submitting} onClick={() => history.back()} type="button">
                    Cancel
                  </button>
                </div>
              </form>

              {/* Right Column: Sticky Summary & Buyer Protection Sidebar */}
              <aside className="return-sidebar-card">
                <div className="return-sidebar-heading">
                  <h3>Dispute Summary</h3>
                  <span className="return-resolution-badge">Live Estimate</span>
                </div>

                <div className="return-sidebar-meta">
                  <div className="return-meta-row">
                    <span>Order Number</span>
                    <strong>{order.order_number}</strong>
                  </div>
                  <div className="return-meta-row">
                    <span>Seller / Farm</span>
                    <strong>JToledo Trading Farm</strong>
                  </div>
                  <div className="return-meta-row">
                    <span>Delivery Status</span>
                    <strong style={{ color: '#26743a' }}>Delivered</strong>
                  </div>
                  {category && (
                    <div className="return-meta-row">
                      <span>Selected Issue</span>
                      <strong style={{ textTransform: 'capitalize' }}>
                        {issues.find((i) => i.value === category)?.label || category}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="return-sidebar-totals">
                  <div className="return-total-row">
                    <span>Affected Items ({quantity} pcs)</span>
                    <span>PHP {estimatedRefund.toLocaleString()}</span>
                  </div>
                  <div className="return-total-row">
                    <span>Resolution</span>
                    <span style={{ fontWeight: '700', color: '#176d34' }}>
                      {resolution === 'refund' ? 'Refund Only' : 'Replacement'}
                    </span>
                  </div>
                  <div className="return-total-row is-grand">
                    <span>Estimated Refund</span>
                    <strong>PHP {estimatedRefund.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="return-protection-box">
                  <div className="return-protection-title">
                    <ShieldCheck />
                    <span>AgriVerse Buyer Protection</span>
                  </div>
                  <p>
                    Farm operations will inspect photo evidence and resolve your report within <strong>24 to 48 hours</strong>.
                  </p>
                </div>

                <div className="return-sidebar-actions">
                  <button
                    type="button"
                    className="return-submit-btn"
                    disabled={!ready || submitting}
                    onClick={submit}
                  >
                    {submitting ? 'Submitting…' : 'Submit report'}
                  </button>
                  <button
                    type="button"
                    className="return-cancel-btn"
                    disabled={submitting}
                    onClick={() => history.back()}
                  >
                    Cancel
                  </button>
                </div>
              </aside>
            </div>
          </section>
        )}
      </div>

      <BuyerFooter />
    </main>
  )
}

