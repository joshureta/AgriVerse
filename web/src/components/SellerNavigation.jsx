import { useState } from 'react'
import dateIcon from '../assets/admin-date-icon.png'
import notificationIcon from '../assets/admin-notification-icon.png'
import agriverseWordmark from '../assets/agriverse-wordmark.png'
import { useAuth } from '../hooks/useAuth.js'

const sellerLinks = [
  { href: '/farm-worker/dashboard', icon: 'dashboard', label: 'Dashboard', key: 'dashboard' },
  { href: '/farm-worker/inventory', icon: 'operations', label: 'Inventory Management', key: 'inventory' },
  { href: '/farm-worker/orders', icon: 'records', label: 'Order Management', key: 'orders' },
]

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function SellerSidebar({ active = 'dashboard' }) {
  return (
    <aside className="admin-sidebar seller-sidebar">
      <a className="admin-logo" href="/farm-worker/dashboard" aria-label="AgriVerse seller home">
        <img className="admin-logo-image" src={agriverseWordmark} alt="AgriVerse" />
      </a>

      <nav className="admin-nav" aria-label="Seller navigation">
        {sellerLinks.map((link) => (
          <a
            className={active === link.key ? 'is-active' : ''}
            href={link.href}
            key={link.key}
            aria-current={active === link.key ? 'page' : undefined}
          >
            <span className={`admin-nav-icon icon-${link.icon}`} aria-hidden="true" />
            {link.label}
          </a>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <span>Seller workspace</span>
        <strong>AgriVerse</strong>
      </div>
    </aside>
  )
}

export function SellerTopbar() {
  const { profile, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const displayName = profile?.full_name || 'Seller'

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    window.location.replace('/login')
  }

  return (
    <header className="admin-topbar">
      <div className="admin-date">
        <img src={dateIcon} alt="" />
        <time dateTime={new Date().toISOString()}>{formatDate(new Date())}</time>
      </div>
      <div className="admin-account">
        <button className="admin-notification" type="button" aria-label="Notifications">
          <img src={notificationIcon} alt="" />
          <span aria-hidden="true" />
        </button>
        <div className="admin-avatar" aria-hidden="true">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="admin-identity">
          <strong>{displayName}</strong>
          <span>Seller</span>
        </div>
        <button
          className="admin-signout"
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? 'Wait...' : 'Sign out'}
        </button>
      </div>
    </header>
  )
}
