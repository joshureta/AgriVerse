import {
  TrendingUp,
} from 'lucide-react'
import { SellerSidebar, SellerTopbar } from '../../components/SellerNavigation.jsx'
import sellerHero from '../../assets/seller-dashboard-pineapple-crates.png'
import { useAuth } from '../../hooks/useAuth.js'
import { supabase } from '../../lib/supabase.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import '../../styles/admin-dashboard.css'
import '../../styles/seller-dashboard.css'
import '../../styles/seller-workspace.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })
const statusLabels = { pending: 'New', confirmed: 'Confirmed', preparing: 'Preparing', ready_for_delivery: 'Ready', ready_for_pickup: 'Pickup ready', delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled' }
const EMPTY_LIST = []

async function loadSellerDashboard() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')
  const response = await fetch(`${API_URL}/api/seller/dashboard`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to load seller dashboard')
  return body
}

export default function SellerDashboard() {
  const { profile } = useAuth()
  const displayName = profile?.full_name || 'Seller'
  const firstName = displayName.split(' ')[0]
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const fetchDashboard = useCallback(async () => {
    try { setError(''); setDashboard(await loadSellerDashboard()) } catch (caught) { setError(caught.message) }
  }, [])
  useEffect(() => { fetchDashboard() }, [fetchDashboard])
  const series = dashboard?.revenue?.series || EMPTY_LIST
  const maxRevenue = Math.max(...series.map((point) => Number(point.net) || 0), 1)
  const points = useMemo(() => series.map((point, index) => `${8 + index * (384 / Math.max(series.length - 1, 1))},${96 - ((Number(point.net) || 0) / maxRevenue) * 84}`).join(' '), [maxRevenue, series])
  const inventory = dashboard?.inventory || EMPTY_LIST
  const totalStock = dashboard?.stats?.stock_total || 0
  const change = dashboard?.revenue?.change_percent
  const tone = (status) => ['pending', 'confirmed'].includes(status) ? 'new' : ['preparing', 'ready_for_delivery', 'ready_for_pickup'].includes(status) ? 'progress' : 'done'
  const inventoryGradient = useMemo(() => {
    if (!totalStock || !inventory.length) return 'conic-gradient(#dfe8df 0 100%)'
    let cursor = 0
    const colors = ['#196c35', '#78b83d', '#d9a51d', '#4b9b70']
    return `conic-gradient(${inventory.map((item, index) => { const start = cursor; cursor += (item.quantity / totalStock) * 360; return `${colors[index % colors.length]} ${start}deg ${cursor}deg` }).join(', ')})`
  }, [inventory, totalStock])

  return (
    <main className="admin-dashboard seller-dashboard">
      <SellerSidebar active="dashboard" />

      <section className="admin-workspace">
        <SellerTopbar />

        <div className="admin-content seller-content">
          <section className="admin-hero seller-hero">
            <div className="seller-hero-copy">
              <p className="admin-eyebrow">Seller workspace</p>
              <h1>Hello {firstName}!</h1>
              <p>Here is today&apos;s harvest, inventory, and order overview.</p>
            </div>
            <img src={sellerHero} alt="Green crates filled with harvested pineapples" />
          </section>

          <section className="seller-stats" aria-label="Seller summary">
            <article>
              <div><small>Pineapples In Stock</small><strong>{dashboard ? totalStock.toLocaleString() : '—'} <em>pcs</em></strong><p>Available in inventory</p></div>
            </article>
            <article>
              <div><small>Sales This Month</small><strong>{dashboard ? peso.format(dashboard.stats.sales_this_month) : '—'}</strong><p>Paid orders, net of refunds</p></div>
            </article>
            <article>
              <div><small>Pending Orders</small><strong>{dashboard ? dashboard.stats.pending_orders : '—'}</strong><p>Needs attention</p></div>
            </article>
          </section>

          <div className="seller-analytics-grid">
              <section className="seller-panel seller-inventory-statistics" aria-labelledby="seller-inventory-statistics-title">
                <header><div><small>Inventory</small><h2 id="seller-inventory-statistics-title">Inventory Statistics</h2></div><span className="seller-panel-menu">•••</span></header>
                <div className="seller-inventory-statistics-content">
                  <div className="seller-stock-donut" style={{ background: inventoryGradient }}>
                    <span><strong>{totalStock.toLocaleString()}</strong><small>In stock</small></span>
                  </div>
                  <ul className="seller-inventory-legend">
                    {inventory.map((item, index) => <li key={item.size}><i style={{ background: ['#196c35', '#78b83d', '#d9a51d', '#4b9b70'][index % 4] }} /><span>{item.size}</span><strong>{item.quantity.toLocaleString()}</strong></li>)}
                  </ul>
                </div>
              </section>

              <section className="seller-panel seller-revenue" aria-labelledby="seller-revenue-title">
              <header><div><small>Revenue</small><h2 id="seller-revenue-title">Sales Analytics</h2></div><span><TrendingUp /> {change == null ? '—' : `${change >= 0 ? '+' : ''}${change}%`}</span></header>
              <div className="seller-chart">
                <div className="seller-chart-labels"><span>{peso.format(maxRevenue)}</span><span>{peso.format(maxRevenue * .75)}</span><span>{peso.format(maxRevenue * .5)}</span><span>{peso.format(maxRevenue * .25)}</span><span>₱0</span></div>
                {error ? <div className="seller-state is-error">{error}<button onClick={fetchDashboard}>Retry</button></div> : <svg viewBox="0 0 400 105" role="img" aria-label="Seller revenue trend from paid orders">
                  <g className="seller-grid-lines"><line x1="0" y1="12" x2="400" y2="12" /><line x1="0" y1="32" x2="400" y2="32" /><line x1="0" y1="52" x2="400" y2="52" /><line x1="0" y1="72" x2="400" y2="72" /><line x1="0" y1="92" x2="400" y2="92" /></g>
                  <polyline className="seller-chart-fill" points={`0,105 ${points || '8,96'} 400,105`} />
                  <polyline className="seller-chart-line" points={points || '8,96'} />
                  {series.map((point, index) => { const x = 8 + index * (384 / Math.max(series.length - 1, 1)); const y = 96 - ((Number(point.net) || 0) / maxRevenue) * 84; return <circle cx={x} cy={y} r="3.5" key={point.label} /> })}
                </svg>}
                <div className="seller-chart-months">{series.map((point) => <span key={point.label}>{point.label}</span>)}</div>
              </div>
              </section>
          </div>

          <section className="seller-panel seller-orders seller-orders-table" id="orders" aria-labelledby="seller-orders-title">
              <header><div><small>Orders</small><h2 id="seller-orders-title">Recent Orders</h2></div><span className="seller-panel-menu">•••</span></header>
              <div className="seller-order-table-wrap">
                <table>
                  <thead><tr><th>No.</th><th>Order</th><th>Customer</th><th>Items</th><th>Order Date</th><th>Status</th><th>Total</th></tr></thead>
                  <tbody>
                {(dashboard?.orders || []).map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td><td>{order.order_number || `#${order.id}`}</td><td>{order.customer}</td><td>{order.quantity} pineapples</td><td>{new Date(order.created_at).toLocaleDateString('en-PH')}</td><td><span className={`seller-order-status is-${tone(order.status)}`}>{statusLabels[order.status] || order.status}</span></td><td>{peso.format(order.total_amount)}</td>
                  </tr>
                ))}
                  </tbody>
                </table>
              </div>
          </section>
        </div>
      </section>
    </main>
  )
}
