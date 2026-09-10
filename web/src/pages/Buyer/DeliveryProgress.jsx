import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  MapPin,
  PackageCheck,
  PackageOpen,
  ReceiptText,
  Search,
  Store,
  Truck,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import {
  buyerCartQuantity,
  confirmBuyerOrderReceipt,
  loadBuyerOrder,
  loadBuyerOrders,
  readBuyerCart,
  readFileAsBase64,
  rateBuyerOrder,
  reportBuyerOrderDispute,
} from '../../services/buyerMarketplace.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/deliveryProgress.css'

const statusRank = {
  pending: 0,
  confirmed: 1,
  preparing: 1,
  ready_for_delivery: 1,
  out_for_delivery: 2,
  delivered: 3,
  completed: 4,
}

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready_for_delivery: 'Ready for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const DISPUTE_CATEGORY_OPTIONS = [
  { value: 'damaged', label: 'Damaged', description: 'Crushed, bruised, or otherwise damaged' },
  { value: 'spoiled_rotten', label: 'Spoiled / Rotten', description: 'Not fresh or no longer safe to use' },
  { value: 'wrong_item', label: 'Wrong item', description: 'Different product or size than ordered' },
  { value: 'missing_item', label: 'Missing item', description: 'An item from the order was not included' },
  { value: 'wrong_quantity', label: 'Wrong quantity', description: 'You received fewer items than ordered' },
]

const disputeCategoryLabels = Object.fromEntries(DISPUTE_CATEGORY_OPTIONS.map((option) => [option.value, option.label]))

const ORDER_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'to_pay', label: 'To Pay' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'to_receive', label: 'To Receive' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'returns', label: 'Returns & Refunds' },
]

function matchesOrderFilter(order, filter) {
  if (filter === 'all') return true
  if (filter === 'to_pay') {
    return order.payment_method === 'gcash' && order.order_status !== 'cancelled' && ['unpaid', 'pending', 'failed'].includes(order.payment_status)
  }
  if (filter === 'preparing') {
    return ['confirmed', 'preparing', 'ready_for_delivery'].includes(order.order_status)
  }
  if (filter === 'to_receive') {
    return ['out_for_delivery', 'delivered'].includes(order.order_status)
  }
  if (filter === 'completed') return order.order_status === 'completed'
  if (filter === 'cancelled') return order.order_status === 'cancelled'
  if (filter === 'returns') {
    return order.payment_status === 'refunded' || Boolean(order.delivery_dispute_status)
  }
  return true
}

function formatDate(value, includeTime = false) {
  if (!value) return 'Pending'
  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

function IconBadge({ icon: Icon }) {
  return <span className="delivery-icon-badge"><Icon aria-hidden="true" /></span>
}

function createMilestones(order) {
  const rank = statusRank[order.order_status] ?? 0
  return [
    { label: 'Order Placed', date: order.created_at, icon: ReceiptText },
    {
      label: 'Confirmed & Packing',
      date: order.preparing_at || order.confirmed_at,
      icon: PackageOpen,
    },
    { label: 'In Transit', date: order.out_for_delivery_at, icon: Truck },
    {
      label: 'Delivered',
      date: order.delivered_at || order.estimated_delivery_at,
      icon: Check,
      estimated: !order.delivered_at,
    },
  ].map((milestone, index) => ({
    ...milestone,
    complete: index < rank,
    current: index === rank,
  }))
}

function orderItemsText(order) {
  return order.items.map((item) => `${item.quantity} ${item.product_name}`).join(', ')
}

function getDeliveryAddress(order) {
  return [
    order.delivery_barangay,
    order.delivery_city_municipality,
    order.delivery_province,
    order.delivery_region,
    order.delivery_country,
  ].filter(Boolean).join(', ')
}

export default function DeliveryProgress() {
  const trackedOrderId = useMemo(() => {
    const value = Number(new URLSearchParams(window.location.search).get('track'))
    return Number.isSafeInteger(value) && value > 0 ? value : null
  }, [])
  const [orders, setOrders] = useState([])
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmingOrderId, setConfirmingOrderId] = useState(null)
  const [disputing, setDisputing] = useState(false)
  const [disputeFormOpen, setDisputeFormOpen] = useState(false)
  const [disputeCategory, setDisputeCategory] = useState('')
  const [disputeItemId, setDisputeItemId] = useState('')
  const [disputeAffectedQuantity, setDisputeAffectedQuantity] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [disputePhotos, setDisputePhotos] = useState([])
  const [receiptError, setReceiptError] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const loadedOrders = await loadBuyerOrders()
      setOrders(loadedOrders)
      setSelectedOrderId((current) => {
        if (loadedOrders.some((order) => order.id === current)) return current
        return trackedOrderId && loadedOrders.some((order) => order.id === trackedOrderId)
          ? trackedOrderId
          : null
      })
    } catch (requestError) {
      setOrders([])
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [trackedOrderId])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Fetching the single order (rather than reusing the list) is what lets the backend
  // reconcile GCash payment status and the buyer-confirmation auto-complete timeout.
  useEffect(() => {
    if (!selectedOrderId) return undefined
    let cancelled = false
    loadBuyerOrder(selectedOrderId)
      .then((freshOrder) => {
        if (cancelled) return
        setOrders((current) => current.map((order) => (order.id === freshOrder.id ? freshOrder : order)))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [selectedOrderId])

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  )

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesOrderFilter(order, activeFilter)),
    [activeFilter, orders],
  )

  const visibleOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return filteredOrders
    return filteredOrders.filter((order) => [
      order.order_number,
      orderItemsText(order),
      statusLabels[order.order_status] || order.order_status,
      order.delivery_method,
    ].some((value) => String(value || '').toLowerCase().includes(query)))
  }, [filteredOrders, searchQuery])

  useEffect(() => {
    setDisputeFormOpen(false)
    setDisputeCategory('')
    setDisputeItemId('')
    setDisputeAffectedQuantity('')
    setDisputeReason('')
    setDisputePhotos([])
    setReceiptError('')
  }, [selectedOrderId])

  async function handleConfirmReceipt() {
    if (!selectedOrder) return
    setConfirming(true)
    setReceiptError('')
    try {
      const updatedOrder = await confirmBuyerOrderReceipt(selectedOrder.id)
      setOrders((current) => current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)))
    } catch (requestError) {
      setReceiptError(requestError.message)
    } finally {
      setConfirming(false)
    }
  }

  async function handleListConfirmReceipt(order) {
    setConfirmingOrderId(order.id); setReceiptError('')
    try { const updated = await confirmBuyerOrderReceipt(order.id); setOrders((current) => current.map((item) => item.id === updated.id ? updated : item)) }
    catch (requestError) { setReceiptError(requestError.message) }
    finally { setConfirmingOrderId(null) }
  }

  async function handleRateOrder(order) {
    const value = window.prompt('Rate this order from 1 to 5 stars')
    if (value == null) return
    const rating = Number(value)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) { setReceiptError('Please choose a whole-number rating from 1 to 5.'); return }
    const comment = window.prompt('Add a comment (optional)') || ''
    try { const updated = await rateBuyerOrder(order.id, rating, comment); setOrders((current) => current.map((item) => item.id === updated.id ? updated : item)) }
    catch (requestError) { setReceiptError(requestError.message) }
  }

  async function handleSubmitDispute(event) {
    event.preventDefault()
    if (!selectedOrder || !disputeCategory || !disputeItemId || !disputeAffectedQuantity || disputePhotos.length === 0) return
    setDisputing(true)
    setReceiptError('')
    try {
      const encodedPhotos = await Promise.all(disputePhotos.map(async (file) => ({
        data: await readFileAsBase64(file),
        mime: file.type || 'image/jpeg',
      })))
      const updatedOrder = await reportBuyerOrderDispute(selectedOrder.id, {
        category: disputeCategory,
        itemId: Number(disputeItemId),
        affectedQuantity: Number(disputeAffectedQuantity),
        reason: disputeReason.trim(),
        photos: encodedPhotos,
      })
      setOrders((current) => current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)))
      setDisputeFormOpen(false)
      setDisputeCategory('')
      setDisputeItemId('')
      setDisputeAffectedQuantity('')
      setDisputeReason('')
      setDisputePhotos([])
    } catch (requestError) {
      setReceiptError(requestError.message)
    } finally {
      setDisputing(false)
    }
  }

  const milestones = selectedOrder ? createMilestones(selectedOrder) : []
  const destination = selectedOrder ? getDeliveryAddress(selectedOrder) : ''

  return (
    <main className="buyer-page delivery-page">
      <BuyerHeader active="orders" cartCount={buyerCartQuantity(readBuyerCart())} />

      <div className="delivery-content">
        <header className="delivery-title">
          <div>
            <h1>{selectedOrder ? `Order ${selectedOrder.order_number}` : 'My Orders'}</h1>
            <p>{selectedOrder ? 'View this order’s route, details, and delivery progress.' : 'Select an order to view its delivery progress and complete details.'}</p>
          </div>
        </header>

        {!selectedOrder && (
          <>
            <nav className="buyer-order-tabs" aria-label="Filter orders by status">
              {ORDER_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={activeFilter === filter.id ? 'is-active' : ''}
                  aria-pressed={activeFilter === filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  <span>{filter.label}</span>
                </button>
              ))}
            </nav>

          </>
        )}

        {error && <div className="delivery-message is-error" role="alert"><span>{error}</span><button type="button" onClick={fetchOrders}>Try again</button></div>}
        {loading && <div className="delivery-message" role="status">Loading your orders…</div>}
        {!loading && !error && orders.length === 0 && <section className="delivery-card delivery-empty">
          <PackageCheck aria-hidden="true" />
          <h2>No orders yet</h2>
          <p>Your delivery progress will appear here after checkout.</p>
          <a href="/buyer/order">Place Your First Order</a>
        </section>}

        {!loading && !error && orders.length > 0 && filteredOrders.length === 0 && !selectedOrder && (
          <section className="delivery-card delivery-empty delivery-filter-empty">
            <PackageOpen aria-hidden="true" />
            <h2>No orders in this category</h2>
            <p>Orders matching this status will appear here.</p>
            <button type="button" onClick={() => setActiveFilter('all')}>View All Orders</button>
          </section>
        )}

        {!loading && !error && filteredOrders.length > 0 && !selectedOrder && (
          <section className="delivery-card order-history is-history-view" aria-labelledby="order-history-title">
            <header className="history-heading">
              <div><h2 id="order-history-title">{activeFilter === 'all' ? 'Order History' : ORDER_FILTERS.find((filter) => filter.id === activeFilter)?.label}</h2><p>{visibleOrders.length} order{visibleOrders.length === 1 ? '' : 's'} in this view</p></div>
              <label className="order-history-search">
                <span className="sr-only">Search your orders</span>
                <Search aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search order number or item"
                />
              </label>
            </header>
            <div className="history-list">
              <div className="history-list-head" aria-hidden="true"><span>Order</span><span>Items</span><span>Total</span><span>Status</span><span>Actions</span></div>
              {visibleOrders.length === 0 && (
                <div className="history-search-empty">
                  <Search aria-hidden="true" />
                  <p>No orders match “{searchQuery.trim()}”.</p>
                  <button type="button" onClick={() => setSearchQuery('')}>Clear Search</button>
                </div>
              )}
              {visibleOrders.map((order) => (
                <article
                  className="history-order"
                  key={order.id}
                  role="button"
                  tabIndex="0"
                  onClick={() => { setSelectedOrderId(order.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedOrderId(order.id); window.scrollTo({ top: 0, behavior: 'smooth' }) } }}
                >
                  <div className="history-copy">
                    <small>{order.order_number}</small>
                    <time>{formatDate(order.created_at)}</time>
                  </div>
                  <p className="history-items">{orderItemsText(order)}</p>
                  <div className="history-payment"><strong>PHP {Number(order.total_amount || 0).toLocaleString()}</strong><small>{String(order.delivery_method || 'Delivery').replaceAll('_', ' ')}</small></div>
                  <span className={`history-status is-${order.order_status}`}>{statusLabels[order.order_status] || order.order_status}</span>
                  <div className="history-order-actions">
                    {(order.order_status === 'delivered' || order.order_status === 'completed') && <button type="button" onClick={(event) => { event.stopPropagation(); window.location.href = `/buyer/return-request?order=${order.id}` }}>Return/Refund</button>}
                    {order.order_status === 'delivered' && <button type="button" className="is-primary" disabled={confirmingOrderId === order.id} onClick={(event) => { event.stopPropagation(); handleListConfirmReceipt(order) }}>{confirmingOrderId === order.id ? 'Confirming…' : 'Order Received'}</button>}
                    {order.order_status === 'completed' && <button type="button" className="is-primary" onClick={(event) => { event.stopPropagation(); handleRateOrder(order) }}>{order.buyer_rating ? 'Update rating' : 'Rate'}</button>}
                    {!['delivered', 'completed'].includes(order.order_status) && <span className="history-view-order">View details <ChevronRight aria-hidden="true" /></span>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {selectedOrder && <>
          {!trackedOrderId && <button className="delivery-back-button" type="button" onClick={() => { setSelectedOrderId(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><ArrowLeft aria-hidden="true" /> Back to My Orders</button>}
          <section className="delivery-card delivery-route" aria-labelledby="delivery-route-title">
            <div className="delivery-route-heading">
              <h2 id="delivery-route-title">Delivery Route</h2>
              <span className={`delivery-current-status is-${selectedOrder.order_status}`}>
                {statusLabels[selectedOrder.order_status] || selectedOrder.order_status}
              </span>
            </div>
            <div className="route-map">
              <article className="route-location route-origin">
                <h3><MapPin aria-hidden="true" /> Tagaytay City</h3>
                <p>JToledo Trading Farm</p>
                <Store aria-hidden="true" />
              </article>
              <span className="route-dashes" aria-hidden="true" />
              <IconBadge icon={selectedOrder.delivery_method === 'pickup' ? PackageCheck : Truck} />
              <span className="route-dashes route-arrow" aria-hidden="true" />
              <article className="route-location route-destination">
                {selectedOrder.delivery_method === 'pickup'
                  ? <>
                    <h3><PackageCheck aria-hidden="true" /> Farm Pickup</h3>
                    <p>JToledo Trading Farm, Tagaytay City</p>
                    <Store className="route-location-art" aria-hidden="true" />
                  </>
                  : <>
                    <span className="route-location-label">Delivery address</span>
                    <h3><MapPin aria-hidden="true" /> {destination || 'Address not provided'}</h3>
                  </>}
              </article>
            </div>

            {selectedOrder.order_status === 'cancelled'
              ? <div className="delivery-cancelled">This order was cancelled on {formatDate(selectedOrder.cancelled_at)}.</div>
              : <div className="delivery-timeline">
                {milestones.map(({ label, date, icon, complete, current, estimated }, index) => (
                  <div className={`delivery-milestone ${complete ? 'is-complete' : ''} ${current ? 'is-current' : ''}`} key={label}>
                    {index > 0 && <span className="milestone-line" aria-hidden="true" />}
                    <IconBadge icon={icon} />
                    <strong>{label}</strong>
                    <time>{estimated && !complete && !current ? 'Estimated: ' : ''}{formatDate(date)}</time>
                  </div>
                ))}
              </div>}
          </section>

          {selectedOrder.order_status === 'delivered' && selectedOrder.delivery_dispute_status !== 'open' && (
            <section className="delivery-card delivery-confirmation" aria-labelledby="delivery-confirmation-title">
              <h2 id="delivery-confirmation-title">Did you receive your order?</h2>
              <p>Confirm everything arrived as expected, or report a problem while the delivery details are still fresh.</p>
              {receiptError && <div className="delivery-message is-error" role="alert">{receiptError}</div>}
              {!disputeFormOpen ? (
                <div className="delivery-confirmation-actions">
                  <button type="button" className="is-primary" onClick={handleConfirmReceipt} disabled={confirming || disputing}>
                    {confirming ? 'Confirming…' : 'Confirm Receipt'}
                  </button>
                  <button type="button" className="is-secondary" onClick={() => { window.location.href = `/buyer/return-request?order=${selectedOrder.id}` }} disabled={confirming || disputing}>
                    Report a delivery issue
                  </button>
                </div>
              ) : (
                <form className="delivery-dispute-form" onSubmit={handleSubmitDispute}>
                  <div className="delivery-dispute-intro">
                    <span>STEP 1 OF 3</span>
                    <h3>Tell us what went wrong</h3>
                    <p>Choose the issue that best matches your delivery. We’ll ask the farm team to review your report and propose the appropriate return or refund resolution.</p>
                  </div>
                  <label htmlFor="delivery-dispute-category">What happened?</label>
                  <div className="delivery-dispute-categories" role="group" aria-label="What happened">
                    {DISPUTE_CATEGORY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={disputeCategory === option.value ? 'is-selected' : ''}
                        onClick={() => setDisputeCategory(option.value)}
                      >
                        <strong>{option.label}</strong><small>{option.description}</small>
                      </button>
                    ))}
                  </div>

                  <label htmlFor="delivery-dispute-item">STEP 2 — Which item is affected?</label>
                  <select
                    id="delivery-dispute-item"
                    value={disputeItemId}
                    onChange={(event) => { setDisputeItemId(event.target.value); setDisputeAffectedQuantity('') }}
                    required
                  >
                    <option value="" disabled>Select an item</option>
                    {selectedOrder.items.map((item) => (
                      <option key={item.id} value={item.id}>{item.product_name} ({item.quantity} {item.weight_label})</option>
                    ))}
                  </select>

                  <label htmlFor="delivery-dispute-quantity">How many were affected?</label>
                  <input
                    id="delivery-dispute-quantity"
                    type="number"
                    min="1"
                    max={selectedOrder.items.find((item) => String(item.id) === String(disputeItemId))?.quantity || undefined}
                    value={disputeAffectedQuantity}
                    onChange={(event) => setDisputeAffectedQuantity(event.target.value)}
                    disabled={!disputeItemId}
                    required
                  />

                  <label htmlFor="delivery-dispute-reason">Describe the issue</label>
                  <textarea
                    id="delivery-dispute-reason"
                    value={disputeReason}
                    onChange={(event) => setDisputeReason(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="For example: two pineapples arrived bruised and leaking."
                    required
                  />

                  <label htmlFor="delivery-dispute-photos">STEP 3 — Add photo evidence (required)</label>
                  <input
                    id="delivery-dispute-photos"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => setDisputePhotos(Array.from(event.target.files || []).slice(0, 6))}
                    required
                  />
                  <p className="delivery-evidence-help">Add up to 6 clear photos showing the item, packaging, and any damage. {disputePhotos.length > 0 && `${disputePhotos.length} photo${disputePhotos.length === 1 ? '' : 's'} selected.`}</p>

                  <div className="delivery-confirmation-actions">
                    <button
                      type="submit"
                      className="is-danger"
                      disabled={disputing || !disputeCategory || !disputeItemId || !disputeAffectedQuantity || !disputeReason.trim() || disputePhotos.length === 0}
                    >
                      {disputing ? 'Submitting…' : 'Submit Report'}
                    </button>
                    <button type="button" className="is-secondary" onClick={() => setDisputeFormOpen(false)} disabled={disputing}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          <div className="delivery-summary-grid">
            <section className="delivery-card order-details" aria-labelledby="order-details-title">
              <h2 id="order-details-title">Order Details</h2>
              <div className="order-detail-list">
                <article className="order-detail"><IconBadge icon={ReceiptText} /><p><strong>Order Number</strong><span>{selectedOrder.order_number}</span></p></article>
                <article className="order-detail"><IconBadge icon={CalendarDays} /><p><strong>Order Date</strong><span>{formatDate(selectedOrder.created_at, true)}</span></p></article>
                <article className="order-detail"><IconBadge icon={Truck} /><p><strong>Est. Delivery</strong><span>{selectedOrder.delivery_method === 'pickup' ? 'On-site pickup' : formatDate(selectedOrder.estimated_delivery_at)}</span></p></article>
              </div>
            </section>

            <section className="delivery-card order-items" aria-labelledby="order-items-title">
              <h2 id="order-items-title">Order Items</h2>
              <div className="order-item-list">
                {selectedOrder.items.map((item) => (
                  <article className="delivery-order-item" key={item.id}>
                    <img src={pineappleImage} alt="" />
                    <p><strong>{item.product_name}</strong><span>{item.weight_label} · {item.quantity} {item.quantity === 1 ? 'piece' : 'pieces'}</span><b>PHP {item.line_total.toLocaleString()}</b></p>
                  </article>
                ))}
              </div>
              <div className="delivery-order-cost"><span>Shipping</span><strong>PHP {selectedOrder.shipping_fee.toLocaleString()}</strong></div>
              <div className="delivery-total"><span>Total</span><strong>PHP {selectedOrder.total_amount.toLocaleString()}</strong></div>
            </section>
          </div>

          {selectedOrder.delivery_proof_image_url && (
            <section className="delivery-card delivery-proof" aria-labelledby="delivery-proof-title">
              <h2 id="delivery-proof-title">Delivery Photo</h2>
              <img src={selectedOrder.delivery_proof_image_url} alt="Proof of delivery submitted by the driver" />
              {selectedOrder.delivery_proof_notes && <p>{selectedOrder.delivery_proof_notes}</p>}
            </section>
          )}

          {selectedOrder.delivery_dispute_status && (
            <section className={`delivery-card delivery-return-status is-${selectedOrder.delivery_dispute_status}`} aria-labelledby="delivery-return-status-title">
              <header className="delivery-return-status-head">
                <span className="delivery-return-status-icon"><PackageOpen aria-hidden="true" /></span>
                <div>
                  <h2 id="delivery-return-status-title">{selectedOrder.delivery_dispute_status === 'open' ? 'We’re reviewing your return request' : 'Update on your return request'}</h2>
                  <p>{selectedOrder.delivery_dispute_status === 'open' ? 'We’ll review your report and evidence within 1–2 business days.' : selectedOrder.delivery_dispute_resolution_notes || 'Your request has been resolved.'}</p>
                </div>
                <span className={`delivery-return-status-pill is-${selectedOrder.delivery_dispute_status}`}>{selectedOrder.delivery_dispute_status === 'open' ? 'Under review' : 'Resolved'}</span>
              </header>
              <div className="delivery-return-summary">
                <div className="delivery-return-details">
                  <p><span>Reported issue</span><strong>{disputeCategoryLabels[selectedOrder.delivery_dispute_category] || 'Delivery issue'}</strong></p>
                  <p><span>Affected item</span><strong>{selectedOrder.items.find((item) => item.id === selectedOrder.delivery_dispute_item_id)?.product_name || 'Order item'}{selectedOrder.delivery_dispute_affected_quantity ? ` · ${selectedOrder.delivery_dispute_affected_quantity} affected` : ''}</strong></p>
                  {selectedOrder.refund_amount != null && <p><span>Refund amount</span><strong>PHP {Number(selectedOrder.refund_amount).toLocaleString()}</strong></p>}
                </div>
                {selectedOrder.delivery_dispute_reason && <p className="delivery-return-note"><span>Buyer note</span>{selectedOrder.delivery_dispute_reason}</p>}
              </div>
            </section>
          )}

        </>}
      </div>

      <BuyerFooter />
    </main>
  )
}
