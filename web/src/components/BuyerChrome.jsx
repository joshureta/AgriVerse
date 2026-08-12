import {
  Bell,
  ChevronDown,
  Mail,
  Menu,
  MessageCircle,
  Send,
  ShoppingCart,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import jtoledoLogo from '../assets/Jtoledologo.png'
import { buyerCartQuantity, readBuyerCart } from '../services/buyerMarketplace.js'

export function BuyerHeader({ active = 'home', cartCount }) {
  const { profile, signOut } = useAuth()
  const buyerName = profile?.full_name || 'Buyer'
  const displayedCartCount = cartCount ?? buyerCartQuantity(readBuyerCart())

  async function handleSignOut() {
    await signOut()
    window.location.replace('/login')
  }

  return (
    <header className="buyer-site-header">
      <div className="buyer-header-main">
        <div className="buyer-header-alerts" aria-label="Messages and notifications">
          <a className="buyer-icon-link" href="/buyer#messages" aria-label="Messages">
            <MessageCircle aria-hidden="true" />
            <span className="buyer-status-dot">1</span>
          </a>
          <button className="buyer-icon-link" type="button" aria-label="Notifications">
            <Bell aria-hidden="true" />
            <span className="buyer-status-dot">1</span>
          </button>
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
              <a href="/buyer/delivery-progress">Track Delivery</a>
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
          <a href="/buyer/delivery-progress">Track Delivery</a>
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
