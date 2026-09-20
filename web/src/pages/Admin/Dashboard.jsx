import { useCallback, useEffect, useMemo, useState } from 'react'
import dateIcon from '../../assets/admin-date-icon.png'
import notificationIcon from '../../assets/admin-notification-icon.png'
import dashboardIllustration from '../../assets/admin-dashboard-illustration.png'
import { AdminSidebar } from '../../components/AdminNavigation.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { loadAdminRevenue } from '../../services/adminDashboard.js'
import '../../styles/admin-dashboard.css'

const activities = [
  { text: 'James completed field planting', status: 'done', time: '8 min ago' },
  { text: 'Juan completed tractor delivery', status: 'done', time: '24 min ago' },
  { text: 'Yuri completed fertilizing', status: 'done', time: '1 hr ago' },
  { text: 'Sanji started crop inspection', status: 'progress', time: '2 hrs ago' },
]

function formatDashboardDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

function PineappleHarvestIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 10c-4.8 0-8 3.8-8 9.1C8 25 11.4 29 16 29s8-4 8-9.9C24 13.8 20.8 10 16 10Z" fill="currentColor" opacity=".92" />
      <path d="m16 11-3.4-7.3L16 6.1 18.8 2l-.6 5.4 5-3.3-3.4 7.2M10 17l12 7M10 23l11-7M16 11v17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PineappleSalesIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M5 13h22l-2 14H7L5 13Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 13c.6-4 2.6-6 6-6s5.4 2 6 6M11 19h10M12 23h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m16 8-2.2-5L16 4.7 18.2 2l-.5 4 3.8-2.2L19 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const revenuePeriodLabels = { week: 'Week', month: 'Month', year: 'Year' }

export default function AdminDashboard() {
  const { profile, signOut, user } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [revenueData, setRevenueData] = useState(null)
  const [revenueLoading, setRevenueLoading] = useState(true)
  const [revenueError, setRevenueError] = useState('')
  const [revenuePeriod, setRevenuePeriod] = useState('month')
  const displayName = profile?.full_name || 'Josh Ureta'
  const firstName = displayName.split(' ')[0]
  const revenue = revenueData?.revenue
  const maxRevenue = useMemo(
    () => Math.max(
      1,
      ...(revenue?.series || []).flatMap((point) => [point.gross, point.net, point.refunds].map(Number)),
    ),
    [revenue],
  )
  const revenueChart = useMemo(() => {
    const points = revenue?.series || []
    const makeSeries = (field) => {
      const dots = points.map((point, index) => ({
        x: points.length === 1 ? 300 : 18 + (index / (points.length - 1)) * 564,
        y: 112 - ((Number(point[field]) || 0) / maxRevenue) * 98,
        value: Number(point[field]) || 0,
        point,
      }))
      return { points: dots.map(({ x, y }) => `${x},${y}`).join(' '), dots }
    }
    return {
      gross: makeSeries('gross'),
      net: makeSeries('net'),
      refunds: makeSeries('refunds'),
    }
  }, [maxRevenue, revenue])

  const fetchRevenue = useCallback(async () => {
    setRevenueLoading(true)
    try {
      setRevenueData(await loadAdminRevenue(revenuePeriod))
      setRevenueError('')
    } catch (error) {
      setRevenueError(error.message)
    } finally {
      setRevenueLoading(false)
    }
  }, [revenuePeriod])

  useEffect(() => {
    fetchRevenue()
  }, [fetchRevenue])

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    window.location.replace('/login')
  }

  return (
    <main className="admin-dashboard">
      <AdminSidebar active="dashboard" />

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-date">
            <img src={dateIcon} alt="" />
            <time dateTime={new Date().toISOString()}>
              {formatDashboardDate(new Date())}
            </time>
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

        <div className="admin-content">
          <section className="admin-hero">
            <div>
              <p className="admin-eyebrow">Jtoledo Trading overview</p>
              <h1>Hello {firstName}!</h1>
              <p>Here is what is happening across your farm operations today.</p>
            </div>
            <div className="admin-hero-art" aria-hidden="true">
              <img src={dashboardIllustration} alt="" />
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
                  <span className="stat-icon stat-harvest"><PineappleHarvestIcon /></span>
                  <div>
                    <p>Harvested This Month</p>
                    <strong>12,000 <em>kg</em></strong>
                    <small>Total harvested</small>
                  </div>
                </article>

                <article className="admin-stat-card">
                  <span className="stat-icon stat-sales"><PineappleSalesIcon /></span>
                  <div>
                    <p>Sales This {revenuePeriodLabels[revenuePeriod]}</p>
                    <strong>{revenueLoading ? '—' : revenue ? peso.format(revenue.net) : 'Unavailable'}</strong>
                    <small>{revenue ? `${revenue.order_count} revenue order${revenue.order_count === 1 ? '' : 's'} · net of refunds` : 'Database revenue'}</small>
                  </div>
                </article>
              </div>

              <article className="admin-panel revenue-panel">
                <div className="panel-heading">
                  <div>
                    <span>Revenue trend</span>
                    <strong>{revenueData?.period_label || `Current ${revenuePeriodLabels[revenuePeriod]}`} · database performance</strong>
                  </div>
                  <div className="revenue-heading-actions">
                    <div className="revenue-period-filter" aria-label="Revenue period">
                      {Object.entries(revenuePeriodLabels).map(([value, label]) => (
                        <button
                          className={revenuePeriod === value ? 'is-active' : ''}
                          type="button"
                          onClick={() => setRevenuePeriod(value)}
                          aria-pressed={revenuePeriod === value}
                          key={value}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {revenueLoading && <div className="revenue-state">Loading revenue from the database…</div>}
                {!revenueLoading && revenueError && (
                  <div className="revenue-state is-error">
                    <span>{revenueError}</span>
                    <button type="button" onClick={fetchRevenue}>Retry</button>
                  </div>
                )}
                {!revenueLoading && revenue && (
                  <>
                    <div className="revenue-trend" role="img" aria-label={`Revenue for ${revenueData.period_label}`}>
                      <div className="revenue-trend-scale" aria-hidden="true">
                        <span>{peso.format(maxRevenue)}</span>
                        <span>{peso.format(maxRevenue * 0.67)}</span>
                        <span>{peso.format(maxRevenue * 0.33)}</span>
                        <span>₱0</span>
                      </div>
                      <div className="revenue-trend-plot">
                        <svg viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true">
                          {['gross', 'net', 'refunds'].map((seriesName) => (
                            <g className={`revenue-series is-${seriesName}`} key={seriesName}>
                              <polyline points={revenueChart[seriesName].points} />
                              {revenueChart[seriesName].dots.map(({ x, y, value, point }) => (
                                <circle cx={x} cy={y} r="3.5" key={`${seriesName}-${point.label}`}>
                                  <title>{`${point.label} ${seriesName}: ${peso.format(value)}`}</title>
                                </circle>
                              ))}
                            </g>
                          ))}
                        </svg>
                        <div
                          className={`revenue-trend-labels is-${revenuePeriod}`}
                          style={{ '--week-columns': revenue.series?.length || 5 }}
                          aria-hidden="true"
                        >
                          {(revenue.series || []).map((point) => (
                            <span key={point.label}>
                              <strong>{point.label}</strong>
                              <small>{point.orders} order{point.orders === 1 ? '' : 's'}</small>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="revenue-line-legend" aria-label="Revenue chart legend">
                      <span className="is-gross"><i />Gross sales <strong>{peso.format(revenue.gross)}</strong></span>
                      <span className="is-net"><i />Net revenue <strong>{peso.format(revenue.net)}</strong></span>
                      <span className="is-refunds"><i />Refunds <strong>{peso.format(revenue.refunds)}</strong></span>
                    </div>
                    <div className="revenue-footnote">
                      <span>{revenue.paid_orders} paid · {revenue.refunded_orders} refunded</span>
                      <span>Average order: <strong>{peso.format(revenue.average_order_value)}</strong></span>
                    </div>
                  </>
                )}
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
