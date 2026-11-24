import WorkspaceDrawer from './WorkspaceDrawer.jsx'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, Menu } from 'lucide-react'
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuButtonRef = useRef(null)
  return (
    <aside className={`admin-sidebar seller-sidebar${mobileOpen ? ' is-mobile-open' : ''}`} onKeyDown={(event) => {
      if (event.key === 'Escape' && mobileOpen) {
        setMobileOpen(false)
        menuButtonRef.current?.focus()
      }
    }}>
      <a className="admin-logo" href="/farm-worker/dashboard" aria-label="AgriVerse seller home">
        <img className="admin-logo-image" src={agriverseWordmark} alt="AgriVerse" />
      </a>

      <button className="admin-mobile-toggle" type="button" ref={menuButtonRef}
        aria-expanded={mobileOpen} aria-controls="seller-drawer" aria-label="Open navigation"
        onClick={() => setMobileOpen((open) => !open)}>
        <Menu aria-hidden="true" />
      </button>

      <WorkspaceDrawer open={mobileOpen} setOpen={setMobileOpen} triggerRef={menuButtonRef}
        id="seller-drawer" title="Seller navigation">
      <nav className="admin-nav" id="seller-navigation" aria-label="Seller navigation">
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
      </WorkspaceDrawer>
    </aside>
  )
}

export function SellerTopbar() {
  const { profile, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const displayName = profile?.full_name || 'Seller'
  const accountMenuRef = useRef(null)

  useEffect(() => {
    function closeOnOutsideClick(event) {
      const menu = accountMenuRef.current
      if (menu && !menu.contains(event.target)) menu.open = false
    }
    function closeOnEscape(event) {
      const menu = accountMenuRef.current
      if (event.key === 'Escape' && menu?.open) {
        menu.open = false
        menu.querySelector('summary')?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

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
        <details className="admin-account-menu" ref={accountMenuRef}>
          <summary className="admin-account-trigger" aria-label={`${displayName} account menu`}>
            <span className="admin-avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
            <span className="admin-identity">
              <strong>{displayName}</strong>
              <span>Seller</span>
            </span>
            <ChevronDown className="admin-account-chevron" aria-hidden="true" />
          </summary>
          <div className="admin-account-dropdown">
            <button className="admin-signout" type="button" onClick={handleSignOut} disabled={signingOut}>
              <LogOut aria-hidden="true" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </details>
      </div>
    </header>
  )
}
