import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ClipboardList,
  MapPin,
  PackageCheck,
  PackageOpen,
  ReceiptText,
  Store,
  Truck,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader, BuyerJourneyNav } from '../../components/BuyerChrome.jsx'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import pineappleDeliveryHistory from '../../assets/buyer/pineapple-delivery-history.png'
import { buyerCartQuantity, loadBuyerOrders, readBuyerCart } from '../../services/buyerMarketplace.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/deliveryProgress.css'

const statusRank = {
  pending: 0,
  confirmed: 1,
  preparing: 1,
  out_for_delivery: 2,
  delivered: 3,
}

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
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

export default function DeliveryProgress() {
  const [orders, setOrders] = useState([])
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const loadedOrders = await loadBuyerOrders()
      setOrders(loadedOrders)
      setSelectedOrderId((current) => loadedOrders.some((order) => order.id === current)
        ? current
        : loadedOrders[0]?.id || null)
    } catch (requestError) {
      setOrders([])
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || orders[0] || null,
    [orders, selectedOrderId],
  )

  const milestones = selectedOrder ? createMilestones(selectedOrder) : []
  const destination = selectedOrder
    ? [selectedOrder.delivery_barangay, selectedOrder.delivery_city_municipality, selectedOrder.delivery_province]
      .filter(Boolean).join(', ') || 'Registered delivery address'
    : ''

  return (
    <main className="buyer-page delivery-page">
      <BuyerHeader active="orders" cartCount={buyerCartQuantity(readBuyerCart())} />
      <BuyerJourneyNav current="delivery" />

      <div className="delivery-content">
        <header className="delivery-title">
          <div>
            <h1>Orders &amp; Delivery Progress</h1>
            <p>Track your real orders from confirmation to delivery.</p>
          </div>
        </header>

        {error && <div className="delivery-message is-error" role="alert"><span>{error}</span><button type="button" onClick={fetchOrders}>Try again</button></div>}
        {loading && <div className="delivery-message" role="status">Loading your orders…</div>}
        {!loading && !error && orders.length === 0 && <section className="delivery-card delivery-empty">
          <PackageCheck aria-hidden="true" />
          <h2>No orders yet</h2>
          <p>Your delivery progress will appear here after checkout.</p>
          <a href="/buyer/order">Place Your First Order</a>
        </section>}

        {selectedOrder && <>
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
                <h3><MapPin aria-hidden="true" /> {selectedOrder.delivery_method === 'pickup' ? 'Farm Pickup' : destination}</h3>
                <p>{selectedOrder.delivery_method === 'pickup' ? 'On-site collection' : 'Delivery Address'}</p>
                <Store aria-hidden="true" />
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

          <section className="delivery-card order-history" aria-labelledby="order-history-title">
            <h2 id="order-history-title"><ClipboardList aria-hidden="true" /> Order History</h2>
            <div className="history-list">
              {orders.map((order) => (
                <button className={`history-order ${order.id === selectedOrder.id ? 'is-selected' : ''}`} type="button" key={order.id} onClick={() => setSelectedOrderId(order.id)}>
                  <div className="history-product-art"><img src={pineappleDeliveryHistory} alt="" /></div>
                  <div className="history-copy">
                    <small>Order {order.order_number}</small>
                    <time>{formatDate(order.created_at)}</time>
                    <p><strong>Items:</strong> {orderItemsText(order)}</p>
                  </div>
                  <span className={`history-status is-${order.order_status}`}>{statusLabels[order.order_status] || order.order_status}</span>
                </button>
              ))}
            </div>
            <a className="new-order-button" href="/buyer/order">Place New Order</a>
          </section>
        </>}
      </div>

      <BuyerFooter />
    </main>
  )
}
