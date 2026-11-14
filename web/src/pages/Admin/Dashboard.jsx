import { useCallback, useEffect, useMemo, useState } from 'react'
import dashboardIllustration from '../../assets/admin-dashboard-illustration.png'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import FieldConditions from '../../components/FieldConditions.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { loadAdminActivities, loadAdminInventory, loadAdminRevenue, loadAdminSummary } from '../../services/adminDashboard.js'
import '../../styles/admin-dashboard.css'

const ACTIVITY_MAX_COUNT = 30
const ACTIVITY_REFRESH_MS = 60000
const INVENTORY_COLORS = ['#196c35', '#78b83d', '#d9a51d', '#4b9b70']
const completedAtFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

// Formats an activity time for display.
function completedWhen(iso, now) {
  const minutes = Math.floor(Math.max(0, now - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  return completedAtFormat.format(new Date(iso))
}

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

// Displays one activity and its status.
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

// Displays the admin dashboard and loads its reports.
export default function AdminDashboard() {
  const { profile } = useAuth()
  const [revenueData, setRevenueData] = useState(null)
  const [revenueLoading, setRevenueLoading] = useState(true)
  const [revenueError, setRevenueError] = useState('')
  const [revenuePeriod, setRevenuePeriod] = useState('month')
  const [completedActivities, setCompletedActivities] = useState([])
  const [ongoingActivities, setOngoingActivities] = useState([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [activitiesError, setActivitiesError] = useState('')
  const [inventory, setInventory] = useState(null)
  const [inventoryError, setInventoryError] = useState('')
  const [summary, setSummary] = useState(null)
  const [summaryError, setSummaryError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const displayName = profile?.full_name || 'Josh Ureta'
  const firstName = displayName.split(' ')[0]
  const revenue = revenueData?.revenue
  // Finds the largest revenue value to scale the chart.
  const maxRevenue = useMemo(
    () => Math.max(
      1,
      ...(revenue?.series || []).flatMap((point) => [point.gross, point.net, point.refunds].map(Number)),
    ),
    [revenue],
  )
  // Converts revenue values into chart coordinates.
  const revenueChart = useMemo(() => {
    const points = revenue?.series || []
    // Builds the chart points for one revenue series.
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

  // Loads revenue data for the selected time period.
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

  // Reloads revenue when the selected period changes.
  useEffect(() => {
    fetchRevenue()
  }, [fetchRevenue])

  // Loads completed and ongoing activities.
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

  // Refreshes activities on a timer.
  useEffect(() => {
    fetchActivities()
    const timer = window.setInterval(fetchActivities, ACTIVITY_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [fetchActivities])

  // Loads current pineapple stock by size.
  const fetchInventory = useCallback(async () => {
    try {
      setInventory(await loadAdminInventory())
      setInventoryError('')
    } catch (error) {
      setInventoryError(error.message)
    }
  }, [])

  // Refreshes stock alongside the dashboard figures.
  useEffect(() => {
    fetchInventory()
    const timer = window.setInterval(fetchInventory, ACTIVITY_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [fetchInventory])

  // Loads the dashboard summary figures.
  const fetchSummary = useCallback(async () => {
    try {
      setSummary(await loadAdminSummary())
      setSummaryError('')
    } catch (error) {
      setSummaryError(error.message)
    }
  }, [])

  // Refreshes the summary on a timer.
  useEffect(() => {
    fetchSummary()
    const timer = window.setInterval(fetchSummary, ACTIVITY_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [fetchSummary])

  const hasActivities = completedActivities.length + ongoingActivities.length > 0
  const totalStock = inventory?.reduce((total, item) => total + item.quantity, 0) ?? 0
  const inventoryGradient = useMemo(() => {
    if (!totalStock) return 'conic-gradient(#dfe8df 0 100%)'
    let cursor = 0
    return `conic-gradient(${inventory.map((item, index) => {
      const start = cursor
      cursor += (item.quantity / totalStock) * 360
      return `${INVENTORY_COLORS[index % INVENTORY_COLORS.length]} ${start}deg ${cursor}deg`
    }).join(', ')})`
  }, [inventory, totalStock])

  return (
    <main className="admin-dashboard admin-overview-dashboard">
      {/* Admin navigation and page header. */}
      <AdminSidebar active="dashboard" />

      <section className="admin-workspace">
        <AdminTopbar />

        <div className="admin-content">
          {/* Welcome banner for the admin. */}
          <section className="admin-hero">
            <div>
              <p className="admin-eyebrow">AgriVerse overview</p>
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
              {/* Key farm and sales figures. */}
              <section className="admin-stat-grid" aria-label="Farm summary">
                <article className="admin-stat-card is-featured">
                  <div>
                    <p>Sales This {revenuePeriodLabels[revenuePeriod]}</p>
                    <strong>{revenueLoading ? '—' : revenue ? peso.format(revenue.net) : 'Unavailable'}</strong>
                    <small>{revenueLoading ? 'Loading orders…' : revenue ? `${revenue.order_count.toLocaleString('en-PH')} order${revenue.order_count === 1 ? '' : 's'}` : 'Orders unavailable'}</small>
                  </div>
                </article>

                <div className="admin-stat-subgrid">
                  <article className="admin-stat-card">
                    <div>
                      <p>Active Workers</p>
                      <strong>{summary?.active_workers ?? (summaryError ? 'Unavailable' : '—')}</strong>
                    </div>
                  </article>
                  <article className="admin-stat-card">
                    <div>
                      <p>Harvested This Month</p>
                      <strong>{summary?.harvested_pieces?.toLocaleString('en-PH') ?? (summaryError ? 'Unavailable' : '—')} {summary && <em>pcs</em>}</strong>
                    </div>
                  </article>
                </div>
              </section>

              {/* Revenue chart and period filters. */}
              <article className="admin-panel revenue-panel">
                <div className="panel-heading">
                  <div>
                    <span>Revenue trend</span>
                    <strong>{revenueData?.period_label || `Current ${revenuePeriodLabels[revenuePeriod]}`}</strong>
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

                {revenueLoading && <div className="revenue-state">Loading revenue…</div>}
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

            </section>

            <div className="admin-side-column">
              {/* Recent completed and ongoing activities. */}
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
              {/* Current field conditions. */}
              <FieldConditions />
              {/* Pineapple inventory summary, using the same stock as the seller dashboard. */}
              <article className="admin-panel admin-inventory-panel" aria-labelledby="admin-inventory-title">
                <header className="admin-inventory-heading">
                  <div><small>Inventory</small><h2 id="admin-inventory-title">Inventory Statistics</h2></div>
                  <span className="admin-inventory-menu" aria-hidden="true">•••</span>
                </header>
                {inventoryError && !inventory ? (
                  <p className="admin-inventory-state is-error">{inventoryError} <button type="button" onClick={fetchInventory}>Retry</button></p>
                ) : inventory ? (
                  <div className="admin-inventory-content">
                    <div className="admin-stock-donut" style={{ background: inventoryGradient }} role="img" aria-label={`${totalStock.toLocaleString()} pineapples in stock`}>
                      <span><strong>{totalStock.toLocaleString()}</strong><small>In stock</small></span>
                    </div>
                    <ul className="admin-inventory-legend">
                      {inventory.map((item, index) => (
                        <li key={item.size}>
                          <i style={{ background: INVENTORY_COLORS[index % INVENTORY_COLORS.length] }} aria-hidden="true" />
                          <span>{item.size}</span><strong>{item.quantity.toLocaleString()}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : <p className="admin-inventory-state">Loading inventory…</p>}
                {inventory && inventoryError && <p className="admin-inventory-state is-error">Could not refresh inventory. <button type="button" onClick={fetchInventory}>Retry</button></p>}
              </article>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
