import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dateIcon from '../../assets/admin-date-icon.png'
import notificationIcon from '../../assets/admin-notification-icon.png'
import dashboardIllustration from '../../assets/admin-dashboard-illustration.png'
import { AdminSidebar } from '../../components/AdminNavigation.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { loadAdminActivities, loadAdminProductivity, loadAdminRevenue } from '../../services/adminDashboard.js'
import '../../styles/admin-dashboard.css'

const ACTIVITY_MAX_COUNT = 30
const ACTIVITY_REFRESH_MS = 60000
const completedAtFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

// "8 min ago" for the last day, then the exact date and time the work was finished.
function completedWhen(iso, now) {
  const minutes = Math.floor(Math.max(0, now - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  return completedAtFormat.format(new Date(iso))
}

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

function ActivityRow({ activity, now, ongoing = false }) {
  return (
    <article>
      <span className={`activity-status ${ongoing ? 'is-ongoing' : 'is-done'}`} aria-hidden="true">
        {ongoing ? '◌' : '✓'}
      </span>
      <div>
        <strong title={activity.text}>{activity.text}</strong>
        <time dateTime={activity.at} title={new Date(activity.at).toLocaleString()}>
          {ongoing ? (activity.phase === 'started' ? 'Started ' : 'Since ') : ''}{completedWhen(activity.at, now)}
        </time>
      </div>
    </article>
  )
}

const revenuePeriodLabels = { week: 'Week', month: 'Month', year: 'Year' }

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [revenueData, setRevenueData] = useState(null)
  const [revenueLoading, setRevenueLoading] = useState(true)
  const [revenueError, setRevenueError] = useState('')
  const [revenuePeriod, setRevenuePeriod] = useState('month')
  const [completedActivities, setCompletedActivities] = useState([])
  const [ongoingActivities, setOngoingActivities] = useState([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [activitiesError, setActivitiesError] = useState('')
  const [productivity, setProductivity] = useState(null)
  const [productivityLoading, setProductivityLoading] = useState(true)
  const [productivityError, setProductivityError] = useState('')
  const reportDialogRef = useRef(null)
  const [now, setNow] = useState(() => Date.now())
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

  const fetchActivities = useCallback(async () => {
    try {
      const { completed, ongoing } = await loadAdminActivities(ACTIVITY_MAX_COUNT)
      setCompletedActivities(completed)
      setOngoingActivities(ongoing)
      setActivitiesError('')
      setNow(Date.now())
    } catch (error) {
      setActivitiesError(error.message)
    } finally {
      setActivitiesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivities()
    const timer = window.setInterval(fetchActivities, ACTIVITY_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [fetchActivities])

  const fetchProductivity = useCallback(async () => {
    try {
      setProductivity(await loadAdminProductivity())
      setProductivityError('')
    } catch (error) {
      setProductivityError(error.message)
    } finally {
      setProductivityLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProductivity()
    const timer = window.setInterval(fetchProductivity, ACTIVITY_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [fetchProductivity])

  const hasActivities = completedActivities.length + ongoingActivities.length > 0
  const completionPercent = productivity?.tasks.completion_percent ?? 0
  const utilizationPercent = productivity?.workers.utilization_percent ?? 0
  const comparison = productivity?.comparison
  const change = comparison?.change_percent
  const performanceTitle = change == null
    ? comparison?.current_approved ? 'Approvals this month' : 'No approved tasks yet'
    : change > 0 ? 'Completed tasks increased' : change < 0 ? 'Completed tasks decreased' : 'Completed tasks steady'
  const performanceDetail = change == null
    ? comparison?.current_approved ? `${comparison.current_approved} approved so far; no prior-month baseline.` : 'No approved tasks in either period yet.'
    : `${comparison.current_approved} approved this month vs ${comparison.previous_approved} by this date last month (${change > 0 ? '+' : ''}${change}%).`

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
                <article className="admin-stat-card is-featured">
                  <div>
                    <p>Sales This {revenuePeriodLabels[revenuePeriod]}</p>
                    <strong>{revenueLoading ? '—' : revenue ? peso.format(revenue.net) : 'Unavailable'}</strong>
                    <small>{revenue ? `${revenue.order_count} revenue order${revenue.order_count === 1 ? '' : 's'} · net of refunds` : 'Database revenue'}</small>
                  </div>
                </article>

                <div className="admin-stat-subgrid">
                  <article className="admin-stat-card">
                    <div>
                      <p>Active Workers</p>
                      <strong>6</strong>
                      <small>Currently working</small>
                    </div>
                  </article>

                  <article className="admin-stat-card">
                    <div>
                      <p>Harvested This Month</p>
                      <strong>12,000 <em>kg</em></strong>
                      <small>Total harvested</small>
                    </div>
                  </article>
                </div>
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
                  <button type="button" onClick={() => reportDialogRef.current?.showModal()}>View report</button>
                </div>

                {productivityLoading && !productivity ? (
                  <p className="productivity-state">Loading productivity report…</p>
                ) : productivityError && !productivity ? (
                  <p className="productivity-state is-error">{productivityError} <button type="button" onClick={fetchProductivity}>Retry</button></p>
                ) : productivity && (
                  <div className="productivity-metrics">
                    <div className="progress-metric">
                      <div className="progress-ring" style={{ '--progress': `${completionPercent}%` }}>
                        <strong>{completionPercent}%</strong>
                      </div>
                      <p>Tasks completed today</p>
                    </div>
                    <div className="progress-metric">
                      <div className="progress-ring" style={{ '--progress': `${utilizationPercent}%` }}>
                        <strong>{utilizationPercent}%</strong>
                      </div>
                      <p>Resource utilization</p>
                    </div>
                    <div className={`performance-note${change == null || change === 0 ? ' is-neutral' : change < 0 ? ' is-decrease' : ''}`}>
                      <span aria-hidden="true">{change == null || change === 0 ? '→' : change < 0 ? '↘' : '↗'}</span>
                      <div>
                        <strong>{performanceTitle}</strong>
                        <p>{performanceDetail}</p>
                      </div>
                    </div>
                  </div>
                )}
                {productivity && productivityError && <p className="productivity-state is-error">Could not refresh the report. <button type="button" onClick={fetchProductivity}>Retry</button></p>}
              </article>
            </section>

            <aside className="admin-panel activity-panel">
              <div className="panel-heading">
                <div>
                  <span>Recent activities</span>
                  <strong>Latest updates</strong>
                </div>
              </div>

              <div className="activity-list" aria-live="polite">
                {activitiesLoading ? (
                  <p className="activity-empty">Loading recent activity…</p>
                ) : activitiesError ? (
                  <p className="activity-empty is-error">{activitiesError}</p>
                ) : !hasActivities ? (
                  <p className="activity-empty">No activity yet. Finished and ongoing tasks and deliveries will appear here.</p>
                ) : (
                  <>
                    {completedActivities.map((activity) => (
                      <ActivityRow activity={activity} key={activity.id} now={now} />
                    ))}
                    {ongoingActivities.length > 0 ? (
                      <>
                        <p className="activity-divider">Ongoing · {ongoingActivities.length}</p>
                        {ongoingActivities.map((activity) => (
                          <ActivityRow activity={activity} key={activity.id} now={now} ongoing />
                        ))}
                      </>
                    ) : null}
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
        <dialog className="productivity-report-dialog" ref={reportDialogRef} aria-labelledby="productivity-report-title">
          <div className="productivity-report-heading">
            <div>
              <h2 id="productivity-report-title">Productivity report</h2>
              <p>{productivity?.date || 'Today'} · Asia/Manila</p>
            </div>
            <button type="button" onClick={() => reportDialogRef.current?.close()} aria-label="Close report">×</button>
          </div>
          {productivityLoading && !productivity ? (
            <p className="productivity-report-state">Loading report…</p>
          ) : productivityError && !productivity ? (
            <p className="productivity-report-state is-error">{productivityError} <button type="button" onClick={fetchProductivity}>Retry</button></p>
          ) : productivity && (
            <>
              <div className="productivity-report-grid">
                <div><strong>{productivity.tasks.completed} / {productivity.tasks.scheduled}</strong><span>Scheduled tasks completed today</span></div>
                <div><strong>{productivity.tasks.awaiting_review}</strong><span>Awaiting admin review</span></div>
                <div><strong>{productivity.workers.scheduled} / {productivity.workers.total}</strong><span>Crop workers scheduled today</span></div>
              </div>
              <p className="productivity-report-definition">Completion rate is approved tasks divided by tasks scheduled today. Resource utilization is crop workers with a task today divided by all crop workers.</p>
              <div className="productivity-report-comparison">
                <h3>Monthly comparison</h3>
                <p>{performanceDetail}</p>
                <small>{productivity.month_label} to date compared with {productivity.previous_month_label} through the equivalent calendar day. Counts include admin-approved tasks.</small>
              </div>
              <div className="productivity-report-actions">
                <a href="/admin/tasks">View task schedule</a>
                <a href="/admin/records">View completed records</a>
              </div>
              {productivityError && <p className="productivity-report-state is-error">These are the last loaded results. <button type="button" onClick={fetchProductivity}>Retry</button></p>}
            </>
          )}
        </dialog>
      </section>
    </main>
  )
}
