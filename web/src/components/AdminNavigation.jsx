import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import dateIcon from '../assets/admin-date-icon.png'
import cropHealthMonitoringIcon from '../assets/crop-health-monitoring-icon.png'
import environmentalMonitoringIcon from '../assets/environmental-monitoring-icon.png'
import inventoryIcon from '../assets/inventory-icon.png'
import notificationIcon from '../assets/admin-notification-icon.png'
import taskScheduleIcon from '../assets/task-schedule-icon.png'
import agriverseWordmark from '../assets/agriverse-wordmark.png'
import { useAuth } from '../hooks/useAuth.js'
import { loadAdminConversations } from '../services/adminMessages.js'

const UNREAD_POLL_INTERVAL_MS = 20000

const navItems = [
  { href: '/admin', icon: 'dashboard', label: 'Dashboard', key: 'dashboard' },
  { href: '/admin/users', icon: 'users', label: 'User Management', key: 'users' },
]

const secondaryNavItems = [
  { href: '/admin/records', icon: 'records', label: 'Records', key: 'records' },
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
  const [monitoringOpen, setMonitoringOpen] = useState(
    active === 'crop-monitoring' || active === 'environmental-monitoring',
  )

  function handleMonitoringToggle() {
    setMonitoringOpen((open) => !open)
  }

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
            href={item.href || '#'}
            key={item.key}
            aria-current={item.key === active ? 'page' : undefined}
          >
            <span className={`admin-nav-icon icon-${item.icon}`} aria-hidden="true" />
            {item.label}
          </a>
        ))}

        <div className="admin-nav-group monitoring-nav-group">
          <button
            className={`admin-nav-group-trigger${monitoringOpen ? ' is-open' : ''}`}
            type="button"
            onClick={handleMonitoringToggle}
            aria-expanded={monitoringOpen}
            aria-controls="monitoring-submenu"
          >
            <span className="admin-nav-icon icon-monitoring" aria-hidden="true" />
            <span>Monitoring</span>
            <span className="admin-nav-chevron" aria-hidden="true" />
          </button>

          <div
            className={`admin-nav-submenu monitoring-nav-submenu${monitoringOpen ? ' is-open' : ''}`}
            id="monitoring-submenu"
          >
            <a
              className={active === 'crop-monitoring' ? 'is-active' : ''}
              href="/admin/monitoring/crop-health"
              aria-current={active === 'crop-monitoring' ? 'page' : undefined}
            >
              <img
                className="monitoring-submenu-image"
                src={cropHealthMonitoringIcon}
                alt=""
              />
              <span>Crop Health Monitoring</span>
            </a>
            <a
              className={active === 'environmental-monitoring' ? 'is-active' : ''}
              href="/admin/monitoring/environmental"
              aria-current={active === 'environmental-monitoring' ? 'page' : undefined}
            >
              <img
                className="monitoring-submenu-image"
                src={environmentalMonitoringIcon}
                alt=""
              />
              <span>Environmental Monitoring</span>
            </a>
          </div>
        </div>
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
  const [unreadCount, setUnreadCount] = useState(0)
  const displayName = profile?.full_name || 'Administrator'

  useEffect(() => {
    let cancelled = false

    async function fetchUnreadCount() {
      try {
        const conversations = await loadAdminConversations()
        if (cancelled) return
        const total = conversations.reduce((sum, conversation) => sum + (conversation.unread_count || 0), 0)
        setUnreadCount(total)
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
        <a
          className="admin-notification"
          href="/admin/messages"
          aria-label={unreadCount > 0 ? `Messages (${unreadCount} unread)` : 'Messages'}
        >
          <MessageCircle aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="admin-message-badge" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </a>
        <button className="admin-notification" type="button" aria-label="Notifications">
          <img src={notificationIcon} alt="" />
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
