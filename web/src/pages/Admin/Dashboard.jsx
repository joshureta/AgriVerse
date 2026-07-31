import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import '../../styles/admin-dashboard.css'

const navItems = [
  { href: '/admin', icon: 'dashboard', label: 'Dashboard', active: true },
  { href: '/admin/users', icon: 'users', label: 'User Management' },
  { icon: 'operations', label: 'Operations' },
  { icon: 'records', label: 'Records' },
  { icon: 'monitoring', label: 'Monitoring' },
]

const activities = [
  { text: 'James completed field planting', status: 'done', time: '8 min ago' },
  { text: 'Juan completed tractor delivery', status: 'done', time: '24 min ago' },
  { text: 'Yuri completed fertilizing', status: 'done', time: '1 hr ago' },
  { text: 'Sanji started crop inspection', status: 'progress', time: '2 hrs ago' },
]

const revenueLines = [
  {
    className: 'is-dark-green',
    points: [[5, 72], [29, 61], [53, 51], [76, 41], [98, 13]],
  },
  {
    className: 'is-green',
    points: [[5, 61], [29, 53], [53, 45], [76, 35], [98, 29]],
  },
  {
    className: 'is-yellow',
    points: [[5, 80], [29, 76], [53, 57], [76, 48], [98, 44]],
  },
]

function formatDashboardDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function RevenueLine({ className, points }) {
  return (
    <div className={`revenue-line ${className}`} aria-hidden="true">
      {points.slice(0, -1).map(([x, y], index) => {
        const [nextX, nextY] = points[index + 1]
        const width = Math.hypot(nextX - x, nextY - y)
        const angle = Math.atan2(nextY - y, nextX - x) * (180 / Math.PI)

        return (
          <span
            className="revenue-segment"
            key={`${x}-${y}`}
            style={{
              '--angle': `${angle}deg`,
              '--left': `${x}%`,
              '--top': `${y}%`,
              '--width': `${width}%`,
            }}
          />
        )
      })}
      {points.map(([x, y]) => (
        <span
          className="revenue-dot"
          key={`dot-${x}-${y}`}
          style={{ '--left': `${x}%`, '--top': `${y}%` }}
        />
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { profile, signOut, user } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const displayName = profile?.full_name || 'Josh Ureta'
  const firstName = displayName.split(' ')[0]

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    window.location.replace('/login')
  }

  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar">
        <a className="admin-logo" href="/admin" aria-label="Jtoledo Trading admin home">
          <span className="admin-logo-mark" aria-hidden="true">J</span>
          <span>JTOLEDO</span>
        </a>

        <nav className="admin-nav" aria-label="Admin navigation">
          {navItems.map((item) => (
            <a
              className={item.active ? 'is-active' : ''}
              href={item.href || '#'}
              key={item.label}
              aria-current={item.active ? 'page' : undefined}
            >
              <span
                className={`admin-nav-icon icon-${item.icon}`}
                aria-hidden="true"
              />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <span>Administrator workspace</span>
          <strong>Jtoledo Trading</strong>
        </div>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-date">
            <span aria-hidden="true">▣</span>
            <time dateTime={new Date().toISOString()}>
              {formatDashboardDate(new Date())}
            </time>
          </div>

          <div className="admin-account">
            <button className="admin-notification" type="button" aria-label="Notifications">
              ♟
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

        <div className="admin-content">
          <section className="admin-hero">
            <div>
              <p className="admin-eyebrow">Jtoledo Trading overview</p>
              <h1>Hello {firstName}!</h1>
              <p>Here is what is happening across your farm operations today.</p>
            </div>
            <div className="admin-hero-art" aria-hidden="true">
              <span className="hero-sun" />
              <span className="hero-field hero-field-one" />
              <span className="hero-field hero-field-two" />
              <span className="hero-laptop">▰</span>
              <span className="hero-plant">♣</span>
            </div>
          </section>

          <div className="admin-dashboard-grid">
            <section className="admin-main-column">
              <div className="admin-stat-grid">
                <article className="admin-stat-card">
                  <span className="stat-icon stat-workers" aria-hidden="true">●</span>
                  <div>
                    <p>Active Workers</p>
                    <strong>6</strong>
                    <small>Currently working</small>
                  </div>
                </article>

                <article className="admin-stat-card">
                  <span className="stat-icon stat-harvest" aria-hidden="true">♣</span>
                  <div>
                    <p>Harvested This Month</p>
                    <strong>12,000 <em>kg</em></strong>
                    <small>Total harvested</small>
                  </div>
                </article>

                <article className="admin-stat-card">
                  <span className="stat-icon stat-sales" aria-hidden="true">₱</span>
                  <div>
                    <p>Sales This Month</p>
                    <strong>₱6,000</strong>
                    <small>Monthly revenue</small>
                  </div>
                </article>
              </div>

              <article className="admin-panel revenue-panel">
                <div className="panel-heading">
                  <div>
                    <span>Revenue</span>
                    <strong>Monthly performance</strong>
                  </div>
                  <div className="chart-legend" aria-label="Revenue chart legend">
                    <span><i className="legend-sales" /> Sales</span>
                    <span><i className="legend-orders" /> Orders</span>
                    <span><i className="legend-costs" /> Costs</span>
                  </div>
                </div>

                <div
                  className="revenue-chart"
                  role="img"
                  aria-label="Revenue, orders, and costs trend upward across five weeks"
                >
                  <div className="chart-y-labels" aria-hidden="true">
                    <span>25k</span>
                    <span>20k</span>
                    <span>15k</span>
                    <span>10k</span>
                    <span>5k</span>
                    <span>0</span>
                  </div>
                  <div className="chart-plot">
                    {revenueLines.map((line) => (
                      <RevenueLine key={line.className} {...line} />
                    ))}
                    <div className="chart-x-labels" aria-hidden="true">
                      <span>Week 1</span>
                      <span>Week 2</span>
                      <span>Week 3</span>
                      <span>Week 4</span>
                      <span>Week 5</span>
                    </div>
                  </div>
                </div>
              </article>

              <article className="admin-panel productivity-panel">
                <div className="panel-heading">
                  <div>
                    <span>Productivity reports</span>
                    <strong>Team performance</strong>
                  </div>
                  <button type="button">View report</button>
                </div>

                <div className="productivity-metrics">
                  <div className="progress-metric">
                    <div className="progress-ring" style={{ '--progress': '85%' }}>
                      <strong>85%</strong>
                    </div>
                    <p>Tasks completed today</p>
                  </div>
                  <div className="progress-metric">
                    <div className="progress-ring" style={{ '--progress': '78%' }}>
                      <strong>78%</strong>
                    </div>
                    <p>Resource utilization</p>
                  </div>
                  <div className="performance-note">
                    <span aria-hidden="true">↗</span>
                    <div>
                      <strong>Performance increased</strong>
                      <p>Productivity is up by 12% this month.</p>
                    </div>
                  </div>
                </div>
              </article>
            </section>

            <aside className="admin-panel activity-panel">
              <div className="panel-heading">
                <div>
                  <span>Recent activities</span>
                  <strong>Latest updates</strong>
                </div>
                <button type="button" aria-label="More activity options">•••</button>
              </div>

              <div className="activity-list">
                {activities.map((activity) => (
                  <article key={activity.text}>
                    <span
                      className={`activity-status is-${activity.status}`}
                      aria-hidden="true"
                    >
                      {activity.status === 'done' ? '✓' : '◌'}
                    </span>
                    <div>
                      <strong>{activity.text}</strong>
                      <time>{activity.time}</time>
                    </div>
                  </article>
                ))}
              </div>

              <button className="activity-link" type="button">View all activities</button>

              <div className="admin-profile-card">
                <span>Signed in as</span>
                <strong>{user?.email}</strong>
                <small>Protected administrator account</small>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
