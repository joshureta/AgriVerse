import { useCallback, useEffect, useMemo, useState } from 'react'
import dashboardIllustration from '../../assets/admin-dashboard-illustration.png'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { HistoricalFarmTrends, ProductivityPanel } from '../../components/DashboardAnalytics.jsx'
import DashboardReportMenu from '../../components/DashboardReportMenu.jsx'
import FieldConditions from '../../components/FieldConditions.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { loadAdminActivities, loadAdminInventory, loadAdminProductivity, loadAdminRevenue, loadAdminSummary } from '../../services/adminDashboard.js'
import '../../styles/admin-dashboard.css'

const ACTIVITY_MAX_COUNT = 30
const REFRESH_MS = 60000
const INVENTORY_COLORS = ['#196c35', '#78b83d', '#d9a51d', '#4b9b70']
const completedAtFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
})
const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 0,
})

function completedWhen(iso, now) {
  const minutes = Math.floor(Math.max(0, now - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  return completedAtFormat.format(new Date(iso))
}

function ActivityRow({ activity, now, ongoing = false }) {
  return <article>
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
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [revenueData, setRevenueData] = useState(null)
  const [revenueError, setRevenueError] = useState('')
  const [completedActivities, setCompletedActivities] = useState([])
  const [ongoingActivities, setOngoingActivities] = useState([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [activitiesError, setActivitiesError] = useState('')
  const [inventory, setInventory] = useState(null)
  const [inventoryError, setInventoryError] = useState('')
  const [summary, setSummary] = useState(null)
  const [summaryError, setSummaryError] = useState('')
  const [productivity, setProductivity] = useState(null)
  const [productivityError, setProductivityError] = useState('')
  const [soilTrend, setSoilTrend] = useState([])
  const [environmentalHistoryAvailable, setEnvironmentalHistoryAvailable] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const displayName = profile?.full_name || 'Admin'
  const firstName = displayName.split(' ')[0]
  const revenue = revenueData?.revenue

  const fetchRevenue = useCallback(async () => {
    try {
      setRevenueData(await loadAdminRevenue('month'))
      setRevenueError('')
    } catch (error) { setRevenueError(error.message) }
  }, [])
  const fetchActivities = useCallback(async () => {
    try {
      const { completed, ongoing } = await loadAdminActivities(ACTIVITY_MAX_COUNT)
      setCompletedActivities(completed)
      setOngoingActivities(ongoing)
      setActivitiesError('')
      setNow(Date.now())
    } catch (error) { setActivitiesError(error.message) }
    finally { setActivitiesLoading(false) }
  }, [])
  const fetchInventory = useCallback(async () => {
    try { setInventory(await loadAdminInventory()); setInventoryError('') }
    catch (error) { setInventoryError(error.message) }
  }, [])
  const fetchSummary = useCallback(async () => {
    try { setSummary(await loadAdminSummary()); setSummaryError('') }
    catch (error) { setSummaryError(error.message) }
  }, [])
  const fetchProductivity = useCallback(async () => {
    try { setProductivity(await loadAdminProductivity()); setProductivityError('') }
    catch (error) { setProductivityError(error.message) }
  }, [])

  useEffect(() => {
    const refresh = () => {
      fetchRevenue(); fetchActivities(); fetchInventory(); fetchSummary(); fetchProductivity()
    }
    refresh()
    const timer = window.setInterval(refresh, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [fetchRevenue, fetchActivities, fetchInventory, fetchSummary, fetchProductivity])

  const updateSoilTrend = useCallback((trend, available) => {
    setSoilTrend(trend)
    setEnvironmentalHistoryAvailable(available)
  }, [])
  const hasActivities = completedActivities.length + ongoingActivities.length > 0
  const totalStock = inventory?.reduce((total, item) => total + item.quantity, 0) ?? 0
  const inventoryGradient = useMemo(() => {
    if (!totalStock) return 'conic-gradient(#dfe8df 0 100%)'
    let cursor = 0
    return `conic-gradient(${inventory.map((item, index) => {
      const start = cursor
      cursor += item.quantity / totalStock * 360
      return `${INVENTORY_COLORS[index % INVENTORY_COLORS.length]} ${start}deg ${cursor}deg`
    }).join(', ')})`
  }, [inventory, totalStock])
  const snapshotTimes = [summary?.generated_at, revenueData?.generated_at, productivity?.generated_at].filter(Boolean)
  const oldestSnapshot = snapshotTimes.length ? snapshotTimes.reduce((oldest, time) => new Date(time) < new Date(oldest) ? time : oldest) : null

  return <main className="admin-dashboard admin-overview-dashboard">
    <AdminSidebar active="dashboard" />
    <section className="admin-workspace">
      <AdminTopbar />
      <div className="admin-content">
        <section className="admin-hero">
          <div>
            <p className="admin-eyebrow">AgriVerse dashboard &amp; analytics</p>
            <h1>Hello {firstName}!</h1>
            <p>Here is what is happening across your farm operations today.</p>
            <small className="dashboard-updated">{oldestSnapshot ? `Summary updated ${completedWhen(oldestSnapshot, now)}` : 'Loading dashboard summaries…'}</small>
          </div>
          <div className="admin-hero-art" aria-hidden="true">
            <img src={dashboardIllustration} alt="" />
            <span className="hero-sun" /><span className="hero-field hero-field-one" />
            <span className="hero-field hero-field-two" /><span className="hero-laptop">▰</span>
            <span className="hero-plant">♣</span>
          </div>
        </section>

        <div className="admin-dashboard-grid analytics-dashboard-grid">
          <section className="admin-stat-grid" aria-label="Farm summary">
            <article className="admin-stat-card is-featured"><div>
              <p>Sales This Month</p>
              <strong>{revenue ? peso.format(revenue.net) : revenueError ? 'Unavailable' : '—'}</strong>
              <small>{revenue ? `${revenue.order_count.toLocaleString('en-PH')} orders` : revenueError || 'Loading orders…'}</small>
            </div></article>
            <article className="admin-stat-card"><div><p>Active Workers</p><strong>{summary?.active_workers ?? (summaryError ? 'Unavailable' : '—')}</strong></div></article>
            <article className="admin-stat-card"><div><p>Harvested This Month</p><strong>{summary?.harvested_pieces?.toLocaleString('en-PH') ?? (summaryError ? 'Unavailable' : '—')} {summary && <em>pcs</em>}</strong></div></article>
            <article className="admin-stat-card"><div><p>Tasks Completed Today</p><strong>{productivity?.tasks.completed ?? (productivityError ? 'Unavailable' : '—')}</strong></div></article>
          </section>

          <ProductivityPanel data={productivity} error={productivityError} />

          <div className="dashboard-activity-stack">
            <div className="dashboard-report-placement"><DashboardReportMenu /></div>
            <aside className="admin-panel activity-panel">
              <div className="panel-heading"><div><span>Recent activities</span><strong>Latest updates</strong></div></div>
              <div className="activity-list" aria-live="polite">
                {activitiesLoading ? <p className="activity-empty">Loading recent activity…</p>
                  : activitiesError ? <p className="activity-empty is-error">{activitiesError}</p>
                    : !hasActivities ? <p className="activity-empty">No activity yet. Finished and ongoing tasks and deliveries will appear here.</p>
                      : <>
                        {completedActivities.map((activity) => <ActivityRow activity={activity} key={activity.id} now={now} />)}
                        {ongoingActivities.length > 0 && <>
                          <p className="activity-divider">Ongoing · {ongoingActivities.length}</p>
                          {ongoingActivities.map((activity) => <ActivityRow activity={activity} key={activity.id} now={now} ongoing />)}
                        </>}
                      </>}
              </div>
            </aside>
          </div>

          <HistoricalFarmTrends onSoilTrend={updateSoilTrend} />
          <FieldConditions soilTrend={soilTrend} historyAvailable={environmentalHistoryAvailable} />

          <article className="admin-panel admin-inventory-panel" aria-labelledby="admin-inventory-title">
            <header className="admin-inventory-heading">
              <div><small>Inventory</small><h2 id="admin-inventory-title">Inventory Statistics</h2><p>Pineapple stock by size</p></div>
            </header>
            {inventoryError && !inventory ? <p className="admin-inventory-state is-error">{inventoryError} <button type="button" onClick={fetchInventory}>Retry</button></p>
              : inventory ? <div className="admin-inventory-content">
                <div className="admin-stock-donut" style={{ background: inventoryGradient }} role="img" aria-label={`${totalStock.toLocaleString()} pineapples in stock`}>
                  <span><strong>{totalStock.toLocaleString()}</strong><small>In stock</small></span>
                </div>
                <ul className="admin-inventory-legend">{inventory.map((item, index) => <li key={item.size}>
                  <i style={{ background: INVENTORY_COLORS[index % INVENTORY_COLORS.length] }} aria-hidden="true" />
                  <span>{item.size}</span><strong>{item.quantity.toLocaleString()}</strong>
                </li>)}</ul>
              </div> : <p className="admin-inventory-state">Loading inventory…</p>}
            {inventory && inventoryError && <p className="admin-inventory-state is-error">Could not refresh inventory. <button type="button" onClick={fetchInventory}>Retry</button></p>}
          </article>
        </div>
      </div>
    </section>
  </main>
}
