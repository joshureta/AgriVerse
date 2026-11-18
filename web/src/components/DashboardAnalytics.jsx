import { useCallback, useEffect, useState } from 'react'
import { loadAdminAnalytics } from '../services/adminDashboard.js'

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 0,
})

const orderCount = (value) => `${value.toLocaleString('en-PH')} order${value === 1 ? '' : 's'}`

const operationDate = new Intl.DateTimeFormat('en-PH', {
  month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila',
})

const operationStatuses = {
  pending: 'Scheduled',
  in_progress: 'In progress',
  awaiting_approval: 'Awaiting review',
  completed: 'Completed',
}

function scheduleTime(value) {
  if (!value) return '—'
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '—'
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
}

export function ProductivityPanel({ data, error }) {
  const tasks = data?.tasks
  const workers = data?.workers
  const schedule = data?.today_schedule || []
  const attention = data?.attention
  const dateLabel = data?.date
    ? operationDate.format(new Date(`${data.date}T00:00:00+08:00`))
    : 'Today'
  return <section className="admin-panel dashboard-productivity-panel" aria-labelledby="dashboard-productivity-title">
    <div className="dashboard-section-heading">
      <div>
        <h2 id="dashboard-productivity-title">Farm Operations</h2>
        <p>Today's farm work · {dateLabel}</p>
      </div>
      <a className="dashboard-operations-action" href="/admin/tasks">Manage tasks</a>
    </div>
    {error && !data ? <p className="dashboard-analytics-state is-error">{error}</p> : !data
      ? <p className="dashboard-analytics-state">Loading farm operations…</p>
      : <>
        <div className="dashboard-operations-layout">
          <div className="dashboard-operations-main">
            <div className="dashboard-productivity-stats">
              <div><span>Scheduled today</span><strong>{tasks.scheduled}</strong></div>
              <div><span>Completed</span><strong>{tasks.completed}</strong></div>
              <div><span>Awaiting review</span><strong>{tasks.awaiting_review}</strong></div>
            </div>
            <div className="dashboard-operations-list-heading">
              <h3>Today's schedule</h3>
              <a href="/admin/tasks">View all tasks</a>
            </div>
            {schedule.length ? <div className="dashboard-operations-task-list">
              {schedule.map((item) => <div className="dashboard-operations-task" key={item.id}>
                <time>{scheduleTime(item.start_time)}</time>
                <div><strong>{item.title}</strong><small>{item.field} · {item.worker}</small></div>
                <span className={`dashboard-operations-status is-${item.status}`}>
                  {operationStatuses[item.status] || 'Scheduled'}
                </span>
              </div>)}
            </div> : <p className="dashboard-operations-empty">No farm work scheduled today. Use Manage tasks to plan the next assignment.</p>}
          </div>
          <aside className="dashboard-operations-side" aria-label="Farm operations overview">
            <div className="dashboard-operations-side-card is-attention">
              <h3>Needs attention</h3>
              <a href="/admin/tasks?modal=overdue"><span>Overdue tasks</span><strong>{attention?.overdue_tasks ?? 0}</strong></a>
              <a href="/admin/tasks"><span>Awaiting review</span><strong>{attention?.awaiting_review ?? 0}</strong></a>
            </div>
            <div className="dashboard-operations-side-card">
              <h3>Team today</h3>
              <div><span>Crop workers assigned</span><strong>{workers.scheduled}</strong></div>
              <div><span>Not scheduled</span><strong>{Math.max(0, workers.total - workers.scheduled)}</strong></div>
            </div>
          </aside>
        </div>
        {error && <p className="dashboard-analytics-state is-error">Could not refresh farm operations: {error}</p>}
      </>}
  </section>
}

function TrendBars({ series, valueKey, selectedKey, onSelect, formatValue }) {
  const maximum = Math.max(1, ...series.map((item) => Number(item[valueKey] || 0)))
  return <div className="dashboard-history-chart-scroll">
    <div className="dashboard-history-bars" style={{ '--month-count': series.length }} role="group" aria-label={`Monthly ${valueKey === 'revenue' ? 'revenue' : 'orders'} values`}>
      {series.map((item) => <button
        key={item.key}
        type="button"
        className="dashboard-history-month-bar"
        aria-label={`${item.label}: ${formatValue(item[valueKey] || 0)}`}
        aria-pressed={item.key === selectedKey}
        onClick={() => onSelect(item.key)}
      >
        <span className="dashboard-history-bar-area"><span className="dashboard-history-bar" style={{ height: `${(item[valueKey] || 0) / maximum * 100}%` }} /></span>
        <span className="dashboard-history-month-label">{item.label.slice(0, 3)}</span>
      </button>)}
    </div>
  </div>
}

export function HistoricalFarmTrends() {
  const [months, setMonths] = useState(6)
  const [selectedMonthKey, setSelectedMonthKey] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const result = await loadAdminAnalytics({ months })
      setData(result)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [months])

  useEffect(() => {
    setLoading(true)
    refresh()
    const timer = window.setInterval(refresh, 60000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const currentData = data?.months === months ? data : null
  const series = currentData?.series || []
  const selectedMonth = series.find((item) => item.key === selectedMonthKey) || series.at(-1)
  const totalRevenue = series.reduce((total, item) => total + item.revenue, 0)
  const totalOrders = series.reduce((total, item) => total + (item.orders || 0), 0)
  const rangeLabel = series.length ? `${series[0].label}–${series.at(-1).label}` : ''

  return <section className="admin-panel dashboard-history-panel" aria-labelledby="dashboard-history-title">
    <div className="dashboard-section-heading dashboard-history-heading">
      <div>
        <h2 id="dashboard-history-title">Historical Farm Trends</h2>
        <p>Revenue and monthly orders, shown separately</p>
      </div>
      <div className="dashboard-history-filters">
        <label>Time range
          <select value={months} onChange={(event) => setMonths(Number(event.target.value))}>
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
        </label>
        <label>Month
          <select value={selectedMonth?.key || ''} onChange={(event) => setSelectedMonthKey(event.target.value)} disabled={!series.length}>
            {!series.length && <option value="">Loading months…</option>}
            {series.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
      </div>
    </div>
    {error && !currentData ? <div className="dashboard-history-error">
      <p className="dashboard-analytics-state is-error">{error}</p>
      <button type="button" onClick={() => { setLoading(true); refresh() }}>Retry</button>
    </div> : loading && !currentData
      ? <p className="dashboard-analytics-state">Loading historical data…</p>
      : <>
        <div className="dashboard-history-content">
          <section className="dashboard-history-series is-revenue" aria-labelledby="dashboard-revenue-title">
            <div className="dashboard-history-series-heading">
              <div><h3 id="dashboard-revenue-title">Revenue</h3><p>Recorded monthly sales</p></div>
              <span className="dashboard-history-scope">Farm-wide</span>
            </div>
            <strong className="dashboard-history-total">{peso.format(totalRevenue)}</strong>
            <small className="dashboard-history-total-caption">Total for {rangeLabel}</small>
            <div className="dashboard-history-selected" aria-live="polite"><span>{selectedMonth?.label || 'Selected month'}</span><strong>{peso.format(selectedMonth?.revenue || 0)}</strong></div>
            <TrendBars series={series} valueKey="revenue" selectedKey={selectedMonth?.key} onSelect={setSelectedMonthKey} formatValue={(value) => peso.format(value)} />
          </section>
          <section className="dashboard-history-series is-orders" aria-labelledby="dashboard-orders-title">
            <div className="dashboard-history-series-heading">
              <div><h3 id="dashboard-orders-title">Monthly orders</h3><p>Orders placed, excluding cancellations</p></div>
              <span className="dashboard-history-scope">Farm-wide</span>
            </div>
            <strong className="dashboard-history-total">{orderCount(totalOrders)}</strong>
            <small className="dashboard-history-total-caption">Total for {rangeLabel}</small>
            <div className="dashboard-history-selected" aria-live="polite"><span>{selectedMonth?.label || 'Selected month'}</span><strong>{orderCount(selectedMonth?.orders || 0)}</strong></div>
            <TrendBars series={series} valueKey="orders" selectedKey={selectedMonth?.key} onSelect={setSelectedMonthKey} formatValue={orderCount} />
          </section>
        </div>
        <p className="dashboard-history-note">The current month is still in progress. Orders exclude cancellations; revenue reflects paid orders after refunds.</p>
        {error && <p className="dashboard-analytics-state is-error">Could not refresh trends: {error}</p>}
      </>}
  </section>
}
