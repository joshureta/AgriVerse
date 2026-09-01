import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Mail,
  Menu,
  MessageCircle,
  PackageCheck,
  Send,
  ShoppingCart,
  Truck,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import jtoledoLogo from '../assets/Jtoledologo.png'
import { buyerCartQuantity, loadBuyerOrders, readBuyerCart } from '../services/buyerMarketplace.js'
import { loadBuyerUnreadCount } from '../services/buyerMessages.js'

const UNREAD_POLL_INTERVAL_MS = 20000
const NOTIFICATION_READ_KEY = 'agriverse_buyer_read_notifications_v1'

const notificationCopy = {
  pending: ['Order received', 'Your order is waiting for seller confirmation.'],
  confirmed: ['Order confirmed', 'The seller confirmed your order.'],
  preparing: ['Order is being prepared', 'Your pineapples are being packed.'],
  ready_for_delivery: ['Order is ready', 'Your order is ready for delivery or pickup.'],
  out_for_delivery: ['Out for delivery', 'Your pineapple order is on the way.'],
  delivered: ['Order delivered', 'Your order has been marked as delivered.'],
  cancelled: ['Order cancelled', 'This order was cancelled. Open it for details.'],
}

function notificationDate(order) {
  const statusDate = {
    confirmed: order.confirmed_at,
    preparing: order.preparing_at,
    ready_for_delivery: order.ready_for_delivery_at,
    out_for_delivery: order.out_for_delivery_at,
    delivered: order.delivered_at,
    cancelled: order.cancelled_at,
  }
  return statusDate[order.order_status] || order.created_at
}

function formatAlertTime(value) {
  const date = new Date(value)
  const elapsed = Date.now() - date.getTime()
  if (!Number.isFinite(elapsed) || elapsed < 60000) return 'Now'
  if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m ago`
  if (elapsed < 86400000) return `${Math.floor(elapsed / 3600000)}h ago`
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }).format(date)
}

function createOrderNotifications(orders) {
  return orders.map((order) => {
    const status = order.order_status || 'pending'
    const [title, message] = notificationCopy[status] || notificationCopy.pending
    return {
      id: `${order.id}:${status}`,
      status,
      title,
      message,
      orderNumber: order.order_number,
      createdAt: notificationDate(order),
      href: `/buyer/delivery-progress?track=${order.id}`,
    }
  }).sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt)).slice(0, 6)
}

export function BuyerHeader({ active = 'home', cartCount }) {
  const { profile, signOut } = useAuth()
  const buyerName = profile?.full_name || 'Buyer'
  const displayedCartCount = cartCount ?? buyerCartQuantity(readBuyerCart())
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsError, setNotificationsError] = useState(false)
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem(NOTIFICATION_READ_KEY) || '[]') }
    catch { return [] }
  })
  const notificationMenuRef = useRef(null)
  const notificationUnreadCount = notifications.filter((notification) => !readNotificationIds.includes(notification.id)).length

  useEffect(() => {
    let cancelled = false

    async function fetchUnreadCount() {
      try {
        const count = await loadBuyerUnreadCount()
        if (!cancelled) setUnreadCount(count)
      } catch {
        // Badge just won't refresh this cycle; not worth surfacing an error for.
      }
    }

    fetchUnreadCount()
    const interval = window.setInterval(fetchUnreadCount, UNREAD_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchNotifications() {
      try {
        const orders = await loadBuyerOrders()
        if (!cancelled) {
          setNotifications(createOrderNotifications(orders))
          setNotificationsError(false)
        }
      } catch {
        if (!cancelled) setNotificationsError(true)
      } finally {
        if (!cancelled) setNotificationsLoading(false)
      }
    }

    fetchNotifications()
    const interval = window.setInterval(fetchNotifications, UNREAD_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    function closeNotificationMenu(event) {
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
        notificationMenuRef.current.removeAttribute('open')
      }
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') notificationMenuRef.current?.removeAttribute('open')
    }
    document.addEventListener('pointerdown', closeNotificationMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeNotificationMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function saveReadNotifications(ids) {
    setReadNotificationIds(ids)
    window.localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(ids))
  }

  function markNotificationRead(id) {
    if (readNotificationIds.includes(id)) return
    saveReadNotifications([...readNotificationIds, id])
  }

  function markAllNotificationsRead() {
    saveReadNotifications([...new Set([...readNotificationIds, ...notifications.map((notification) => notification.id)])])
  }

  async function handleSignOut() {
    await signOut()
    window.location.replace('/login')
  }

  return (
    <header className="buyer-site-header">
      <div className="buyer-header-main">
        <div className="buyer-header-alerts" aria-label="Messages and notifications">
          <a
            className="buyer-icon-link"
            href="/buyer/messages"
            aria-label={unreadCount > 0 ? `Messages (${unreadCount} unread)` : 'Messages'}
          >
            <MessageCircle aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="buyer-status-dot">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </a>
          <details className="buyer-notification-menu" ref={notificationMenuRef}>
            <summary className="buyer-icon-link" aria-label={notificationUnreadCount ? `Notifications (${notificationUnreadCount} unread)` : 'Notifications'}>
              <Bell aria-hidden="true" />
              {notificationUnreadCount > 0 && <span className="buyer-status-dot">{notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}</span>}
            </summary>
            <section className="buyer-notification-dropdown" aria-label="Recent notifications">
              <header><div><h2>Notifications</h2><p>Recent order updates</p></div>{notificationUnreadCount > 0 && <button type="button" onClick={markAllNotificationsRead}>Mark all as read</button>}</header>
              <div className="buyer-notification-list">
                {notificationsLoading && <p className="buyer-notification-state">Loading notifications…</p>}
                {!notificationsLoading && notificationsError && <p className="buyer-notification-state is-error">Notifications could not be refreshed.</p>}
                {!notificationsLoading && !notificationsError && notifications.length === 0 && <p className="buyer-notification-state">You have no order updates yet.</p>}
                {!notificationsLoading && notifications.map((notification) => (
                  <a className={`buyer-notification-item${readNotificationIds.includes(notification.id) ? '' : ' is-unread'}`} href={notification.href} onClick={() => markNotificationRead(notification.id)} key={notification.id}>
                    <span className={`buyer-notification-icon is-${notification.status}`}>
                      {notification.status === 'delivered' ? <CheckCircle2 aria-hidden="true" /> : notification.status === 'out_for_delivery' ? <Truck aria-hidden="true" /> : notification.status === 'pending' ? <Clock3 aria-hidden="true" /> : <PackageCheck aria-hidden="true" />}
                    </span>
                    <span className="buyer-notification-copy"><strong>{notification.title}</strong><small>{notification.orderNumber}</small><p>{notification.message}</p><time dateTime={notification.createdAt}>{formatAlertTime(notification.createdAt)}</time></span>
                    {!readNotificationIds.includes(notification.id) && <i aria-label="Unread" />}
                  </a>
                ))}
              </div>
              {notifications.length > 0 && <footer><a href="/buyer/delivery-progress">View all orders</a></footer>}
            </section>
          </details>
        </div>

        <a className="buyer-brand" href="/buyer" aria-label="JToledo Trading home">
          <img src={jtoledoLogo} alt="JToledo Trading" />
        </a>

        <div className="buyer-header-account">
          <a className={`buyer-cart-link ${active === 'cart' ? 'is-active' : ''}`} href="/buyer/cart" aria-label="Shopping cart">
            <ShoppingCart aria-hidden="true" />
            {displayedCartCount > 0 && <span className="buyer-cart-count">{displayedCartCount > 99 ? '99+' : displayedCartCount}</span>}
          </a>
          <details className="buyer-profile-menu">
            <summary>
              <span className="buyer-avatar"><UserRound aria-hidden="true" /></span>
              <span className="buyer-profile-name">{buyerName}</span>
              <ChevronDown className="buyer-profile-chevron" aria-hidden="true" />
            </summary>
            <div className="buyer-profile-dropdown">
              <a href="/buyer/delivery-progress">My Orders</a>
              <a href="/buyer/profile">My Profile</a>
              <button type="button" onClick={handleSignOut}>Sign Out</button>
            </div>
          </details>
        </div>
      </div>

      <nav className="buyer-main-nav" aria-label="Buyer navigation">
        <a href="/buyer#about">About Us</a>
        <a className={active === 'home' ? 'is-active' : ''} href="/buyer" aria-current={active === 'home' ? 'page' : undefined}>Home</a>
        <a className={active === 'orders' || active === 'cart' ? 'is-active' : ''} href="/buyer/order" aria-current={active === 'orders' || active === 'cart' ? 'page' : undefined}>Order</a>
      </nav>

      <details className="buyer-mobile-menu">
        <summary aria-label="Open navigation"><Menu aria-hidden="true" /></summary>
        <nav aria-label="Mobile buyer navigation">
          <a href="/buyer#about">About Us</a>
          <a href="/buyer">Home</a>
          <a href="/buyer/order">Order</a>
          <a href="/buyer/cart">Shopping Cart</a>
          <a href="/buyer/messages">Messages</a>
          <a href="/buyer/delivery-progress">My Orders</a>
          <a href="/buyer/profile">My Profile</a>
          <button type="button" onClick={handleSignOut}>Sign Out</button>
        </nav>
      </details>
    </header>
  )
}

const buyerJourneySteps = [
  { id: 'order', label: 'Order', href: '/buyer/order' },
  { id: 'cart', label: 'Shopping Cart', href: '/buyer/cart' },
  { id: 'checkout', label: 'Checkout', href: '/buyer/checkout' },
  { id: 'delivery', label: 'Delivery', href: '/buyer/delivery-progress' },
]

export function BuyerJourneyNav({ current }) {
  return (
    <nav className="buyer-journey-nav" aria-label="Order process">
      <ol>
        {buyerJourneySteps.map((step, index) => (
          <li key={step.id}>
            {index > 0 && <span className="buyer-journey-separator" aria-hidden="true">&gt;</span>}
            <a className={current === step.id ? 'is-current' : ''} href={step.href} aria-current={current === step.id ? 'step' : undefined}>
              {step.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function BuyerFooter() {
  return (
    <footer className="buyer-site-footer" id="about">
      <div className="buyer-footer-grid">
        <section>
          <h2>About Jtoledo Trading</h2>
          <p>JToledo Trading is a privately owned agricultural enterprise in Tagaytay specializing in pineapple farming and distribution, with over 25 years of farming operations managed by Joseph Toledo.</p>
        </section>
        <section>
          <h2>Navigation</h2>
          <nav className="buyer-footer-links" aria-label="Footer navigation">
            <a href="/buyer#about">About Us</a>
            <a href="#contact">Contact Us</a>
          </nav>
        </section>
        <section id="contact">
          <h2>Contact</h2>
          <ul className="buyer-contact-list">
            <li><strong>Mobile Number:</strong> 09989947159</li>
            <li><strong>Email:</strong> jperetoledo7@gmail.com</li>
            <li><strong>Address:</strong> 107 Daang Malabag, Brgy. Malabag, Silang, Cavite 4118, Philippines</li>
          </ul>
        </section>
        <section>
          <h2>Stay Connected</h2>
          <p>Stay connected with our latest news and price alerts to never miss a great deal.</p>
          <form className="buyer-newsletter" onSubmit={(event) => event.preventDefault()}>
            <label className="sr-only" htmlFor="buyer-email">Email Address</label>
            <Mail aria-hidden="true" />
            <input id="buyer-email" type="email" placeholder="Email Address" />
            <button type="submit" aria-label="Subscribe"><Send aria-hidden="true" /></button>
          </form>
        </section>
      </div>
      <div className="buyer-footer-bottom">
        <span>© 2026 All rights reserved.</span>
        <div><a href="#terms">Terms &amp; Conditions</a><a href="#privacy">Privacy Policy</a></div>
      </div>
    </footer>
  )
}
