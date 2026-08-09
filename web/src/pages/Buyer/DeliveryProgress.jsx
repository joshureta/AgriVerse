import {
  CalendarDays,
  Check,
  ClipboardList,
  MapPin,
  PackageOpen,
  ReceiptText,
  Store,
  Truck,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import pineappleDeliveryHistory from '../../assets/buyer/pineapple-delivery-history.png'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/deliveryProgress.css'

const milestones = [
  { label: 'Order Confirmed & Packing', date: 'April 6, 2026', icon: PackageOpen, complete: true },
  { label: 'In Transit', date: 'April 7, 2026', icon: Truck, complete: true },
  { label: 'Delivered', date: 'April 8, 2026', icon: Check, complete: true },
]

const details = [
  { label: 'Order Number', value: '#24798399', icon: ReceiptText },
  { label: 'Order Date', value: '4-6-2026', icon: CalendarDays },
  { label: 'Est. Delivery', value: '4-8-2026', icon: Truck },
]

const items = [
  { size: 'Small', quantity: 13, price: 1500 },
  { size: 'Medium', quantity: 6, price: 2500 },
]

const history = [
  { number: '#ORD-2026-001', date: 'April 2, 2025', items: '13 Small Pineapples, 5 Large Pineapples', status: 'Processing' },
  { number: '#ORD-2026-001', date: 'May 8, 2025', items: '13 Medium Pineapples, 6 Large Pineapples', status: 'Delivered' },
]

function IconBadge({ icon: Icon }) {
  return <span className="delivery-icon-badge"><Icon aria-hidden="true" /></span>
}

export default function DeliveryProgress() {
  return (
    <main className="buyer-page delivery-page">
      <BuyerHeader active="orders" cartCount={1} />

      <div className="delivery-content">
        <header className="delivery-title">
          <h1>Orders &amp; Delivery Progress</h1>
          <p>Track your order from confirmation to delivery.</p>
        </header>

        <section className="delivery-card delivery-route" aria-labelledby="delivery-route-title">
          <h2 id="delivery-route-title">Delivery Route</h2>
          <div className="route-map">
            <article className="route-location route-origin">
              <h3><MapPin aria-hidden="true" /> Tagaytay City</h3>
              <p>JToledo Trading Farm</p>
              <Store aria-hidden="true" />
            </article>
            <span className="route-dashes" aria-hidden="true" />
            <IconBadge icon={Truck} />
            <span className="route-dashes route-arrow" aria-hidden="true" />
            <article className="route-location route-destination">
              <h3><MapPin aria-hidden="true" /> Manila City</h3>
              <p>Delivery Address</p>
              <Store aria-hidden="true" />
            </article>
          </div>

          <div className="delivery-timeline">
            {milestones.map(({ label, date, icon, complete }, index) => (
              <div className={`delivery-milestone ${complete ? 'is-complete' : ''}`} key={label}>
                {index > 0 && <span className="milestone-line" aria-hidden="true" />}
                <IconBadge icon={icon} />
                <strong>{label}</strong>
                <time>{date}</time>
              </div>
            ))}
          </div>
        </section>

        <div className="delivery-summary-grid">
          <section className="delivery-card order-details" aria-labelledby="order-details-title">
            <h2 id="order-details-title">Order Details</h2>
            <div className="order-detail-list">
              {details.map(({ label, value, icon }) => (
                <article className="order-detail" key={label}>
                  <IconBadge icon={icon} />
                  <p><strong>{label}</strong><span>{value}</span></p>
                </article>
              ))}
            </div>
          </section>

          <section className="delivery-card order-items" aria-labelledby="order-items-title">
            <h2 id="order-items-title">Order Items</h2>
            <div className="order-item-list">
              {items.map((item) => (
                <article className="delivery-order-item" key={item.size}>
                  <img src={pineappleImage} alt="" />
                  <p><strong>Pineapple - {item.size}</strong><span>{item.quantity} pieces</span><b>₱{item.price.toLocaleString()}</b></p>
                </article>
              ))}
            </div>
            <div className="delivery-total"><span>Total</span><strong>₱3500</strong></div>
          </section>
        </div>

        <section className="delivery-card order-history" aria-labelledby="order-history-title">
          <h2 id="order-history-title"><ClipboardList aria-hidden="true" /> Order History</h2>
          <div className="history-list">
            {history.map((order) => (
              <article className="history-order" key={`${order.date}-${order.status}`}>
                <div className="history-product-art"><img src={pineappleDeliveryHistory} alt="Pineapple ready for delivery" /></div>
                <div className="history-copy">
                  <small>Order {order.number}</small>
                  <time>{order.date}</time>
                  <p><strong>Items:</strong> {order.items}</p>
                </div>
                <span className="history-status">{order.status}</span>
              </article>
            ))}
          </div>
          <a className="new-order-button" href="/buyer/order">Place New Order</a>
        </section>
      </div>

      <BuyerFooter />
    </main>
  )
}
