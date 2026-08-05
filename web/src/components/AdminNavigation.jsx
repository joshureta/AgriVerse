import { useState } from 'react'
import dateIcon from '../assets/admin-date-icon.png'
import inventoryIcon from '../assets/inventory-icon.png'
import notificationIcon from '../assets/admin-notification-icon.png'
import taskScheduleIcon from '../assets/task-schedule-icon.png'
import agriverseWordmark from '../assets/agriverse-wordmark.png'
import { useAuth } from '../hooks/useAuth.js'

const navItems = [
  { href: '/admin', icon: 'dashboard', label: 'Dashboard', key: 'dashboard' },
  { href: '/admin/users', icon: 'users', label: 'User Management', key: 'users' },
]

const secondaryNavItems = [
  { icon: 'records', label: 'Records', key: 'records' },
  { icon: 'monitoring', label: 'Monitoring', key: 'monitoring' },
]

function formatDashboardDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function AdminSidebar({ active }) {
  const [operationsOpen, setOperationsOpen] = useState(
    active === 'tasks' || active === 'inventory',
  )

  return (
    <aside className="admin-sidebar">
      <a className="admin-logo" href="/admin" aria-label="AgriVerse admin home">
        <img className="admin-logo-image" src={agriverseWordmark} alt="AgriVerse" />
      </a>

      <nav className="admin-nav" aria-label="Admin navigation">
        {navItems.map((item) => (
          <a
            className={item.key === active ? 'is-active' : ''}
            href={item.href || '#'}
            key={item.key}
            aria-current={item.key === active ? 'page' : undefined}
          >
            <span className={`admin-nav-icon icon-${item.icon}`} aria-hidden="true" />
            {item.label}
          </a>
        ))}

        <div className="admin-nav-group">
          <button
            className={`admin-nav-group-trigger${operationsOpen ? ' is-open' : ''}`}
            type="button"
            onClick={() => setOperationsOpen((open) => !open)}
            aria-expanded={operationsOpen}
            aria-controls="operations-submenu"
          >
            <span className="admin-nav-icon icon-operations" aria-hidden="true" />
            <span>Operations</span>
            <span className="admin-nav-chevron" aria-hidden="true" />
          </button>

          <div
            className={`admin-nav-submenu${operationsOpen ? ' is-open' : ''}`}
            id="operations-submenu"
          >
            <a
              className={active === 'tasks' ? 'is-active' : ''}
              href="/admin/tasks"
              aria-current={active === 'tasks' ? 'page' : undefined}
            >
              <img src={taskScheduleIcon} alt="" />
              <span>Task and Schedule</span>
            </a>
            <a
              className={active === 'inventory' ? 'is-active' : ''}
              href="/admin/inventory"
              aria-current={active === 'inventory' ? 'page' : undefined}
            >
              <img src={inventoryIcon} alt="" />
              <span>Inventory</span>
            </a>
          </div>
        </div>

        {secondaryNavItems.map((item) => (
          <a
            className={item.key === active ? 'is-active' : ''}
            href="#"
            key={item.key}
            aria-current={item.key === active ? 'page' : undefined}
          >
            <span className={`admin-nav-icon icon-${item.icon}`} aria-hidden="true" />
            {item.label}
          </a>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <span>Administrator workspace</span>
        <strong>AgriVerse</strong>
      </div>
    </aside>
  )
}

export function AdminTopbar() {
  const { profile, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const displayName = profile?.full_name || 'Administrator'

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    window.location.replace('/login')
  }

  return (
    <header className="admin-topbar">
      <div className="admin-date">
        <img src={dateIcon} alt="" />
        <time dateTime={new Date().toISOString()}>{formatDashboardDate(new Date())}</time>
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
          <span>Admin</span>
        </div>
        <button
          className="admin-signout"
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? 'Wait…' : 'Sign out'}
        </button>
      </div>
    </header>
  )
}
