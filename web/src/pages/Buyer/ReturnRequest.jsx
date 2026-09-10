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
  // Map of itemId -> affectedQuantity (number)
  const [selectedItems, setSelectedItems] = useState({})
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
        // Pre-select all items by default with their full quantity
        const initialMap = {}
        loaded.items.forEach((item) => {
          initialMap[item.id] = item.quantity
        })
        setSelectedItems(initialMap)
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

  function toggleItemSelection(item) {
    setSelectedItems((prev) => {
      const next = { ...prev }
      if (next[item.id]) {
        delete next[item.id]
      } else {
        next[item.id] = item.quantity
      }
      return next
    })
  }

  function adjustItemQuantity(item, delta) {
    setSelectedItems((prev) => {
      const current = prev[item.id] || 1
      const nextQty = Math.max(1, Math.min(item.quantity, current + delta))
      return { ...prev, [item.id]: nextQty }
    })
  }

  function toggleSelectAll() {
    if (!order?.items) return
    const allSelected = order.items.every((it) => selectedItems[it.id] > 0)
    if (allSelected) {
      setSelectedItems({})
    } else {
      const allMap = {}
      order.items.forEach((it) => {
        allMap[it.id] = it.quantity
      })
      setSelectedItems(allMap)
    }
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

  const selectedCount = useMemo(() => {
    return Object.values(selectedItems).filter((q) => q > 0).length
  }, [selectedItems])

  const totalAffectedQuantity = useMemo(() => {
    return Object.values(selectedItems).reduce((sum, q) => sum + (Number(q) || 0), 0)
  }, [selectedItems])

  const estimatedRefund = useMemo(() => {
    if (!order?.items) return 0
    let total = 0
    order.items.forEach((item) => {
      const qty = selectedItems[item.id] || 0
      if (qty > 0) {
        const unitPrice = Number(item.unit_price) || 100
        total += qty * unitPrice
      }
    })
    return Math.min(total, Number(order.total_amount))
  }, [order, selectedItems])

  const ready = Boolean(category && selectedCount > 0 && reason.trim() && photos.length > 0)

  async function submit(event) {
    if (event) event.preventDefault()
    if (!ready || submitting) return

    setSubmitting(true)
    setError('')

    try {
      const selectedEntries = Object.entries(selectedItems).filter(([_, q]) => q > 0)
      const [primaryItemId, primaryQuantity] = selectedEntries[0] || [order.items[0].id, 1]

      const itemsBreakdown = selectedEntries
        .map(([id, qty]) => {
          const item = order.items.find((it) => String(it.id) === String(id))
          return `${item?.product_name || 'Item'} (${qty} pcs)`
        })
        .join(', ')

      const resolutionPrefix = resolution === 'replacement'
        ? '[Requested Resolution: Replacement Fruit]\n'
        : '[Requested Resolution: Refund Only]\n'
      const itemsPrefix = `[Affected Items: ${itemsBreakdown}]\n\n`
      const fullReason = `${resolutionPrefix}${itemsPrefix}${reason.trim()}`.slice(0, 1000)

      await reportBuyerOrderDispute(order.id, {
        category,
        itemId: Number(primaryItemId),
        affectedQuantity: Number(primaryQuantity),
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

                {/* STEP 2: Affected Items & Quantity Stepper */}
                <div style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ display: 'block', margin: 0, color: '#2c5330', fontSize: '12px', fontWeight: '750' }}>
                      STEP 2 — Affected item(s)
                    </label>
                    {order.items.length > 1 && (
                      <button
                        type="button"
                        className="return-items-select-all"
                        onClick={toggleSelectAll}
                      >
                        {order.items.every((it) => selectedItems[it.id] > 0) ? 'Deselect All' : 'Select All Items'}
                      </button>
                    )}
                  </div>

                  <div className="return-items-list">
                    {order.items.map((item) => {
                      const isSelected = Boolean(selectedItems[item.id] && selectedItems[item.id] > 0)
                      const currentQty = selectedItems[item.id] || 0
                      const unitPrice = Number(item.unit_price) || 100
                      const subtotal = currentQty * unitPrice

                      return (
                        <div
                          key={item.id}
                          className={`return-item-selectable-card ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => toggleItemSelection(item)}
                        >
                          <div className="return-item-left">
                            <div className="return-checkbox">
                              {isSelected && <Check size={14} strokeWidth={3} />}
                            </div>

                            <div className="return-item-thumb">
                              <img src={pineappleImage} alt={item.product_name} />
                            </div>

                            <div className="return-item-info">
                              <strong>{item.product_name}</strong>
                              <span>
                                {item.weight_label ? `${item.weight_label} · ` : ''}
                                PHP {unitPrice.toLocaleString()} each · Ordered: {item.quantity} pcs
                              </span>
                            </div>
                          </div>

                          <div className="return-item-right" onClick={(e) => e.stopPropagation()}>
                            {isSelected ? (
                              <>
                                <span className="return-qty-label">Quantity affected:</span>
                                <div className="return-qty-stepper">
                                  <button
                                    type="button"
                                    onClick={() => adjustItemQuantity(item, -1)}
                                    disabled={currentQty <= 1}
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span>{currentQty}</span>
                                  <button
                                    type="button"
                                    onClick={() => adjustItemQuantity(item, 1)}
                                    disabled={currentQty >= item.quantity}
                                    aria-label="Increase quantity"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                                <span className="return-item-subtotal">PHP {subtotal.toLocaleString()}</span>
                              </>
                            ) : (
                              <span className="return-item-unselected-label">Click to select</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Describe the issue box - Fixed to exactly match user's screenshot */}
                  <div style={{ marginTop: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                      <label htmlFor="return-reason" style={{ margin: 0, color: '#173b21', fontSize: '13px', fontWeight: '750' }}>
                        Describe the issue
                      </label>
                      <span style={{ fontSize: '11px', color: '#68736b' }}>{reason.length} / 1000 characters</span>
                    </div>
                    <textarea
                      id="return-reason"
                      className="return-textarea-box"
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
                  <span className="return-resolution-badge">
                    {totalAffectedQuantity > 0 ? `${totalAffectedQuantity} pc${totalAffectedQuantity === 1 ? '' : 's'} affected` : 'Live Estimate'}
                  </span>
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
                  {order.items
                    .filter((it) => selectedItems[it.id] > 0)
                    .map((it) => {
                      const q = selectedItems[it.id]
                      const sub = q * (Number(it.unit_price) || 100)
                      return (
                        <div className="return-total-row" key={it.id}>
                          <span>{it.product_name} ({q} pcs)</span>
                          <span>PHP {sub.toLocaleString()}</span>
                        </div>
                      )
                    })}
                  {selectedCount === 0 && (
                    <div className="return-total-row" style={{ color: '#8e9b8f', fontStyle: 'italic' }}>
                      <span>No items selected</span>
                      <span>PHP 0</span>
                    </div>
                  )}
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


