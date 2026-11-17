import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadAdminAnalytics } from '../services/adminDashboard.js'

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 0,
})

export function ProductivityPanel({ data, error }) {
  const tasks = data?.tasks
  const workers = data?.workers
  const comparison = data?.comparison
  const change = comparison?.change_percent
  return <section className="admin-panel dashboard-productivity-panel" aria-labelledby="dashboard-productivity-title">
    <div className="dashboard-section-heading">
      <div>
        <h2 id="dashboard-productivity-title">Operations &amp; Productivity</h2>
        <p>Today's scheduled farm work · {data?.month_label || 'Current month'} comparison</p>
      </div>
    </div>
    {error && !data ? <p className="dashboard-analytics-state is-error">{error}</p> : !data
      ? <p className="dashboard-analytics-state">Loading productivity…</p>
      : <>
        <div className="dashboard-productivity-stats">
          <div><span>Scheduled today</span><strong>{tasks.scheduled}</strong></div>
          <div><span>Completed today</span><strong>{tasks.completed}</strong></div>
          <div><span>Awaiting review</span><strong>{tasks.awaiting_review}</strong></div>
        </div>
        <div className="dashboard-productivity-metrics">
          <div>
            <div className="dashboard-metric-label"><span>Task completion</span><strong>{tasks.completion_percent}%</strong></div>
            <div className="dashboard-progress-track"><span style={{ width: `${tasks.completion_percent}%` }} /></div>
            <small>{tasks.completed} of {tasks.scheduled} scheduled tasks completed</small>
          </div>
          <div>
            <div className="dashboard-metric-label"><span>Worker utilization</span><strong>{workers.utilization_percent}%</strong></div>
            <div className="dashboard-progress-track"><span style={{ width: `${workers.utilization_percent}%` }} /></div>
            <small>{workers.scheduled} of {workers.total} crop workers scheduled today</small>
          </div>
        </div>
        <p className="dashboard-productivity-comparison">
          <span>Approved tasks this month to date</span>
          <strong>{comparison.current_approved}</strong>
          <span>vs {comparison.previous_approved} during the same days of {data.previous_month_label}</span>
          <b className={change == null ? '' : change < 0 ? 'is-down' : 'is-up'}>
            {change == null ? 'No prior comparison' : `${change > 0 ? '+' : ''}${change}%`}
          </b>
        </p>
        {error && <p className="dashboard-analytics-state is-error">Could not refresh productivity: {error}</p>}
      </>}
  </section>
}

function changeLabel(current, previous, isCurrent) {
  if (isCurrent || !previous) return '—'
  const change = Math.round((current - previous) / previous * 100)
  return `${change > 0 ? '+' : ''}${change}%`
}

export function HistoricalFarmTrends({ onSoilTrend }) {
  const [months, setMonths] = useState(6)
  const [field, setField] = useState('all')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const result = await loadAdminAnalytics({ months, field })
      setData(result)
      onSoilTrend(result.soil_moisture, result.environmental_history_available)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [field, months, onSoilTrend])

  useEffect(() => {
    setLoading(true)
    refresh()
    const timer = window.setInterval(refresh, 60000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const currentData = data?.field === field && data?.months === months ? data : null
  const series = useMemo(() => currentData?.series || [], [currentData])
  const chart = useMemo(() => {
    const maxRevenue = Math.max(1, ...series.map((item) => item.revenue))
    const maxHarvest = Math.max(1, ...series.map((item) => item.harvested))
    const spacing = series.length > 1 ? 620 / (series.length - 1) : 0
    const points = series.map((item, index) => ({
      x: 50 + index * spacing,
      revenueY: 185 - item.revenue / maxRevenue * 150,
      harvestY: 185 - item.harvested / maxHarvest * 150,
      ...item,
    }))
    return { points, maxRevenue, maxHarvest }
  }, [series])

  return <section className="admin-panel dashboard-history-panel" aria-labelledby="dashboard-history-title">
    <div className="dashboard-section-heading dashboard-history-heading">
      <div>
        <h2 id="dashboard-history-title">Historical Farm Trends</h2>
        <p>Recorded monthly revenue and approved harvests</p>
      </div>
      <div className="dashboard-history-filters">
        <label>Harvest field
          <select value={field} onChange={(event) => setField(event.target.value)}>
            <option value="all">All fields</option>
            {(data?.fields || []).map((item) => <option key={item.id} value={item.field_name}>{item.field_name}</option>)}
          </select>
        </label>
        <label>Time range
          <select value={months} onChange={(event) => setMonths(Number(event.target.value))}>
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
        </label>
      </div>
    </div>
    {error && !currentData ? <p className="dashboard-analytics-state is-error">{error}</p> : loading && !currentData
      ? <p className="dashboard-analytics-state">Loading historical data…</p>
      : <>
        <div className="dashboard-history-legend"><span><i className="is-revenue" />Revenue (farm-wide)</span><span><i className="is-harvest" />Harvested pieces ({field === 'all' ? 'all fields' : field})</span></div>
        <div className="dashboard-history-content">
          <div className="dashboard-history-chart" role="img" aria-label="Monthly revenue line and harvest quantity bars; exact values are in the table below">
            <svg viewBox="0 0 720 220" preserveAspectRatio="none" aria-hidden="true">
              {[35, 85, 135, 185].map((y) => <line key={y} x1="35" x2="685" y1={y} y2={y} className="dashboard-chart-gridline" />)}
              {chart.points.map((point) => <rect key={point.key} x={point.x - 11} y={point.harvestY} width="22" height={185 - point.harvestY} className="dashboard-chart-bar" />)}
              <polyline points={chart.points.map((point) => `${point.x},${point.revenueY}`).join(' ')} className="dashboard-chart-line" />
              {chart.points.map((point) => <circle key={point.key} cx={point.x} cy={point.revenueY} r="4" className="dashboard-chart-dot" />)}
              {chart.points.map((point) => <text key={point.key} x={point.x} y="207" className="dashboard-chart-label" textAnchor="middle">{point.label.slice(0, 3)}</text>)}
            </svg>
            <div className="dashboard-chart-scales"><span>Revenue up to {peso.format(chart.maxRevenue)}</span><span>Harvest up to {chart.maxHarvest.toLocaleString('en-PH')} pcs</span></div>
          </div>
          <div className="dashboard-history-table-wrap">
            <table className="dashboard-history-table">
              <caption>Monthly comparison</caption>
              <thead><tr><th>Month</th><th>Revenue</th><th>Harvest</th><th>Revenue change</th></tr></thead>
              <tbody>{series.map((item, index) => <tr key={item.key}>
                <th scope="row">{item.label}</th>
                <td>{peso.format(item.revenue)}</td>
                <td>{item.harvested.toLocaleString('en-PH')} pcs</td>
                <td>{changeLabel(item.revenue, series[index - 1]?.revenue, index === series.length - 1)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>
        <p className="dashboard-history-note">The current month is still in progress. Revenue covers all fields; the field filter applies to harvest only.</p>
        {error && <p className="dashboard-analytics-state is-error">Could not refresh trends: {error}</p>}
      </>}
  </section>
}
