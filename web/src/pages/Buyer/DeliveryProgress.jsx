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
import { BuyerFooter, BuyerHeader, BuyerJourneyNav } from '../../components/BuyerChrome.jsx'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import {
  buyerCartQuantity,
  confirmBuyerOrderReceipt,
  loadBuyerOrder,
  loadBuyerOrders,
  readBuyerCart,
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
  const [disputing, setDisputing] = useState(false)
  const [disputeFormOpen, setDisputeFormOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
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
    setDisputeReason('')
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

  async function handleSubmitDispute(event) {
    event.preventDefault()
    if (!selectedOrder) return
    setDisputing(true)
    setReceiptError('')
    try {
      const updatedOrder = await reportBuyerOrderDispute(selectedOrder.id, disputeReason.trim())
      setOrders((current) => current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)))
      setDisputeFormOpen(false)
      setDisputeReason('')
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
      <BuyerJourneyNav current="delivery" />

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
              <div className="history-list-head" aria-hidden="true"><span>Order</span><span>Items</span><span>Total</span><span>Status</span><span /></div>
              {visibleOrders.length === 0 && (
                <div className="history-search-empty">
                  <Search aria-hidden="true" />
                  <p>No orders match “{searchQuery.trim()}”.</p>
                  <button type="button" onClick={() => setSearchQuery('')}>Clear Search</button>
                </div>
              )}
              {visibleOrders.map((order) => (
                <button className="history-order" type="button" key={order.id} onClick={() => { setSelectedOrderId(order.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                  <div className="history-copy">
                    <small>{order.order_number}</small>
                    <time>{formatDate(order.created_at)}</time>
                  </div>
                  <p className="history-items">{orderItemsText(order)}</p>
                  <div className="history-payment"><strong>PHP {Number(order.total_amount || 0).toLocaleString()}</strong><small>{String(order.delivery_method || 'Delivery').replaceAll('_', ' ')}</small></div>
                  <span className={`history-status is-${order.order_status}`}>{statusLabels[order.order_status] || order.order_status}</span>
                  <span className="history-view-order">View details <ChevronRight aria-hidden="true" /></span>
                </button>
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

          {selectedOrder.delivery_proof_image_url && (
            <section className="delivery-card delivery-proof" aria-labelledby="delivery-proof-title">
              <h2 id="delivery-proof-title">Delivery Photo</h2>
              <img src={selectedOrder.delivery_proof_image_url} alt="Proof of delivery submitted by the driver" />
              {selectedOrder.delivery_proof_notes && <p>{selectedOrder.delivery_proof_notes}</p>}
            </section>
          )}

          {selectedOrder.order_status === 'delivered' && selectedOrder.delivery_dispute_status !== 'open' && (
            <section className="delivery-card delivery-confirmation" aria-labelledby="delivery-confirmation-title">
              <h2 id="delivery-confirmation-title">Did you receive your order?</h2>
              <p>Let us know so we can close out this order. If you don't respond in a few days, it will be marked completed automatically.</p>
              {receiptError && <div className="delivery-message is-error" role="alert">{receiptError}</div>}
              {!disputeFormOpen ? (
                <div className="delivery-confirmation-actions">
                  <button type="button" className="is-primary" onClick={handleConfirmReceipt} disabled={confirming || disputing}>
                    {confirming ? 'Confirming…' : 'Confirm Receipt'}
                  </button>
                  <button type="button" className="is-secondary" onClick={() => setDisputeFormOpen(true)} disabled={confirming || disputing}>
                    Report an Issue
                  </button>
                </div>
              ) : (
                <form className="delivery-dispute-form" onSubmit={handleSubmitDispute}>
                  <label htmlFor="delivery-dispute-reason">What went wrong?</label>
                  <textarea
                    id="delivery-dispute-reason"
                    value={disputeReason}
                    onChange={(event) => setDisputeReason(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    required
                  />
                  <div className="delivery-confirmation-actions">
                    <button type="submit" className="is-danger" disabled={disputing || !disputeReason.trim()}>
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

          {selectedOrder.delivery_dispute_status === 'open' && (
            <section className="delivery-card delivery-dispute-pending" aria-labelledby="delivery-dispute-pending-title">
              <h2 id="delivery-dispute-pending-title">We're reviewing your report</h2>
              <p>{selectedOrder.delivery_dispute_reason}</p>
            </section>
          )}

          {selectedOrder.delivery_dispute_status === 'resolved' && selectedOrder.delivery_dispute_resolution_notes && (
            <section className="delivery-card delivery-dispute-pending" aria-labelledby="delivery-dispute-resolved-title">
              <h2 id="delivery-dispute-resolved-title">Update on your report</h2>
              <p>{selectedOrder.delivery_dispute_resolution_notes}</p>
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

        </>}
      </div>

      <BuyerFooter />
    </main>
  )
}
