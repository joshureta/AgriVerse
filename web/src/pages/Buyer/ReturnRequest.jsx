import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  Minus,
  PackageOpen,
  PackageX,
  Plus,
  ReceiptText,
  RefreshCw,
  Scale,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import Breadcrumb from '../../components/Breadcrumb.jsx'
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

export default function ReturnRequest() {
  const orderId = useMemo(() => Number(new URLSearchParams(window.location.search).get('order')), [])
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [category, setCategory] = useState('')
  // Map of itemId -> affectedQuantity (number)
  const [selectedItems, setSelectedItems] = useState({})
  const [reason, setReason] = useState('')
  const [photos, setPhotos] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

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
    setValidationErrors((current) => ({ ...current, items: '' }))
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
    setValidationErrors((current) => ({ ...current, photos: '' }))
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

  function validateReport() {
    const nextErrors = {}
    if (!category) nextErrors.category = 'Choose what happened to your delivery.'
    if (selectedCount === 0) nextErrors.items = 'Select at least one affected item.'
    if (!reason.trim()) nextErrors.reason = 'Describe what went wrong with the delivery.'
    if (photos.length === 0) nextErrors.photos = 'Add at least one photo as evidence.'
    return nextErrors
  }

  async function submit(event) {
    if (event) event.preventDefault()
    if (submitting) return

    const nextErrors = validateReport()
    setValidationErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const firstIncompleteStep = nextErrors.category
        ? 'return-step-1'
        : nextErrors.items || nextErrors.reason
          ? 'return-step-2'
          : 'return-step-3'
      window.requestAnimationFrame(() => {
        document.getElementById(firstIncompleteStep)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }

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

      const resolutionPrefix = '[Requested Resolution: Refund Only]\n'
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

      <div className="delivery-content">
        <a className="delivery-back-button" href="/buyer/delivery-progress">
          <ChevronLeft aria-hidden="true" /> Back
        </a>

        <Breadcrumb
          items={[
            { label: 'My Orders', href: '/buyer/delivery-progress' },
            { label: order ? `Order ${order.order_number}` : 'Order', href: `/buyer/delivery-progress?track=${orderId}` },
            { label: 'Report an issue' },
          ]}
        />

        {loading && <div className="delivery-message">Loading your delivered order…</div>}
        {error && <div className="delivery-message is-error">{error}</div>}

        {order && (
          <>
            <header className="delivery-title">
              <h1>Report a delivery issue</h1>
            </header>

            <div className="order-detail-layout">
              <form className="order-detail-main" onSubmit={submit}>
                {/* STEP 1: What happened? */}
                <section
                  className={`delivery-card return-panel ${validationErrors.category ? 'has-validation-error' : ''}`}
                  aria-labelledby="return-step-1"
                >
                  <span className="return-step-label">Step 1 of 3</span>
                  <h2 id="return-step-1">What happened?</h2>
                  <p className="return-panel-help">Choose the issue that best matches your delivery.</p>

                  <div
                    className={`return-issue-tiles ${validationErrors.category ? 'is-missing' : ''}`}
                    role="group"
                    aria-label="Issue type"
                    aria-invalid={Boolean(validationErrors.category)}
                  >
                    {issues.map((issue) => {
                      const IconComponent = issue.icon
                      const isSelected = category === issue.value
                      return (
                        <button
                          key={issue.value}
                          type="button"
                          className={`return-issue-tile ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => {
                            setCategory(issue.value)
                            setValidationErrors((current) => ({ ...current, category: '' }))
                          }}
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
                  {validationErrors.category && (
                    <p className="return-validation-error" role="alert">{validationErrors.category}</p>
                  )}
                </section>

                {/* STEP 2: Affected items and description */}
                <section
                  className={`delivery-card return-panel ${validationErrors.items || validationErrors.reason ? 'has-validation-error' : ''}`}
                  aria-labelledby="return-step-2"
                >
                  <div className="return-panel-head">
                    <div>
                      <span className="return-step-label">Step 2 of 3</span>
                      <h2 id="return-step-2">Affected items</h2>
                    </div>
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

                  <div className={`return-items-list ${validationErrors.items ? 'is-missing' : ''}`}>
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
                  {validationErrors.items && (
                    <p className="return-validation-error" role="alert">{validationErrors.items}</p>
                  )}

                  <div className="return-describe">
                    <div className="return-describe-head">
                      <label htmlFor="return-reason">Describe the issue</label>
                      <span>{reason.length} / 1000 characters</span>
                    </div>
                    <textarea
                      id="return-reason"
                      className="return-textarea-box"
                      maxLength={1000}
                      onChange={(event) => {
                        setReason(event.target.value)
                        if (event.target.value.trim()) {
                          setValidationErrors((current) => ({ ...current, reason: '' }))
                        }
                      }}
                      placeholder="For example: two pineapples arrived bruised and leaking."
                      rows={4}
                      value={reason}
                      aria-invalid={Boolean(validationErrors.reason)}
                      required
                    />
                    {validationErrors.reason && (
                      <p className="return-validation-error" role="alert">{validationErrors.reason}</p>
                    )}
                  </div>
                </section>

                {/* STEP 3: Photo evidence and resolution */}
                <section
                  className={`delivery-card return-panel ${validationErrors.photos ? 'has-validation-error' : ''}`}
                  aria-labelledby="return-step-3"
                >
                  <span className="return-step-label">Step 3 of 3</span>
                  <h2 id="return-step-3">Photo evidence and resolution</h2>
                  {validationErrors.photos && (
                    <p className="return-validation-error" role="alert">{validationErrors.photos}</p>
                  )}

                  <div className={`return-photo-evidence-box ${validationErrors.photos ? 'is-missing' : ''}`}>
                    <label className="return-photo-picker" htmlFor="return-photos">
                      <Camera />
                      <span>
                        <strong>{photos.length > 0 ? 'Add more photo evidence' : 'Add photo evidence (Required)'}</strong>
                        {photos.length === 0 && (
                          <small>Up to 6 photos showing produce damage, packaging condition, and delivery receipt.</small>
                        )}
                      </span>
                    </label>

                    {photos.length > 0 && (
                      <div className="return-photo-selection">
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
                        <p className="delivery-evidence-help">
                          {photos.length} photo{photos.length === 1 ? '' : 's'} selected (maximum 6).
                        </p>
                      </div>
                    )}
                  </div>

                  <input
                    id="return-photos"
                    className="sr-only"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    type="file"
                  />

                  <span className="return-resolution-label">Resolution</span>
                  <div className="return-resolution-options">
                    <div className="return-resolution-card is-selected">
                      <div>
                        <strong>Refund Only</strong>
                        <p>
                          If approved, PHP {estimatedRefund.toLocaleString()} is refunded to your original payment method. Our team reviews requests within 1–2 business days. No fruit return needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </form>

              <aside className="order-detail-side">
                <section className="delivery-card order-details" aria-labelledby="request-order-details-title">
                  <h2 id="request-order-details-title">Order Details</h2>
                  <div className="order-detail-list">
                    <article className="order-detail"><span className="delivery-icon-badge"><ReceiptText aria-hidden="true" /></span><p><strong>Order Number</strong><span>{order.order_number}</span></p></article>
                    <article className="order-detail"><span className="delivery-icon-badge"><CalendarDays aria-hidden="true" /></span><p><strong>Order Date</strong><span>{formatDateTime(order.created_at)}</span></p></article>
                    <article className="order-detail"><span className="delivery-icon-badge"><Truck aria-hidden="true" /></span><p><strong>Delivery Status</strong><span>Delivered</span></p></article>
                  </div>
                </section>

                <section className="delivery-card return-claim-card" aria-labelledby="return-claim-title">
                  <div className="return-sidebar-heading">
                    <h3 id="return-claim-title">Your claim</h3>
                    <span className="return-resolution-badge">
                      {totalAffectedQuantity > 0 ? `${totalAffectedQuantity} pc${totalAffectedQuantity === 1 ? '' : 's'} affected` : 'Live Estimate'}
                    </span>
                  </div>

                  {category && (
                    <div className="return-sidebar-meta">
                      <div className="return-meta-row">
                        <span>Selected Issue</span>
                        <strong>{issues.find((i) => i.value === category)?.label || category}</strong>
                      </div>
                    </div>
                  )}

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
                      <span style={{ fontWeight: '700', color: '#176d34' }}>Refund Only</span>
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
                      disabled={submitting}
                      onClick={submit}
                    >
                      {submitting ? 'Submitting…' : 'Submit report'}
                    </button>
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>

      <BuyerFooter />
    </main>
  )
}
