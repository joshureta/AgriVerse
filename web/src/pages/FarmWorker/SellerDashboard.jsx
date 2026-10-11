import {
  Banknote,
  Box,
  CheckCircle2,
  Clock3,
  PackageCheck,
  ShoppingBag,
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
  const series = dashboard?.revenue?.series || []
  const maxRevenue = Math.max(...series.map((point) => Number(point.net) || 0), 1)
  const points = useMemo(() => series.map((point, index) => `${8 + index * (384 / Math.max(series.length - 1, 1))},${96 - ((Number(point.net) || 0) / maxRevenue) * 84}`).join(' '), [maxRevenue, series])
  const inventory = dashboard?.inventory || []
  const totalStock = dashboard?.stats?.stock_total || 0
  const change = dashboard?.revenue?.change_percent
  const tone = (status) => ['pending', 'confirmed'].includes(status) ? 'new' : ['preparing', 'ready_for_delivery', 'ready_for_pickup'].includes(status) ? 'progress' : 'done'

  return (
    <main className="admin-dashboard seller-dashboard">
      <SellerSidebar active="dashboard" />

      <section className="admin-workspace">
        <SellerTopbar />

        <div className="seller-content">
          <section className="seller-hero">
            <div className="seller-hero-copy">
              <p>Seller workspace</p>
              <h1>Hello {firstName}!</h1>
              <span>Here is today&apos;s harvest, inventory, and order overview.</span>
            </div>
            <img src={sellerHero} alt="Green crates filled with harvested pineapples" />
          </section>

          <section className="seller-stats" aria-label="Seller summary">
            <article>
              <span className="seller-stat-icon is-harvest"><PackageCheck /></span>
              <div><small>Pineapples In Stock</small><strong>{dashboard ? totalStock.toLocaleString() : '—'} <em>pcs</em></strong><p>Available in inventory</p></div>
            </article>
            <article>
              <span className="seller-stat-icon is-sales"><Banknote /></span>
              <div><small>Sales This Month</small><strong>{dashboard ? peso.format(dashboard.stats.sales_this_month) : '—'}</strong><p>Paid orders, net of refunds</p></div>
            </article>
            <article>
              <span className="seller-stat-icon is-orders"><ShoppingBag /></span>
              <div><small>Pending Orders</small><strong>{dashboard ? dashboard.stats.pending_orders : '—'}</strong><p>Needs attention</p></div>
            </article>
          </section>

          <div className="seller-dashboard-body">
            <section className="seller-panel seller-revenue" aria-labelledby="seller-revenue-title">
              <header><div><small>Revenue</small><h2 id="seller-revenue-title">Monthly Performance</h2></div><span><TrendingUp /> {change == null ? '—' : `${change >= 0 ? '+' : ''}${change}%`}</span></header>
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

            <section className="seller-panel seller-orders" id="orders" aria-labelledby="seller-orders-title">
              <header><div><small>Orders</small><h2 id="seller-orders-title">Recent Orders</h2></div><a href="#orders">View all</a></header>
              <div className="seller-order-list">
                {(dashboard?.orders || []).map((order) => (
                  <article key={order.id}>
                    <span className="seller-order-icon"><Box /></span>
                    <div><strong>{order.customer}</strong><small>{order.quantity} pineapples · {order.order_number}</small></div>
                    <span className={`seller-order-status is-${tone(order.status)}`}>{statusLabels[order.status] || order.status}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="seller-panel seller-inventory" id="inventory" aria-labelledby="seller-inventory-title">
              <header><div><small>Stock overview</small><h2 id="seller-inventory-title">Inventory Status</h2></div></header>
              <div className="seller-inventory-content">
                <div className="seller-stock-ring"><span><strong>{totalStock.toLocaleString()}</strong><small>pcs in stock</small></span></div>
                <ul>
                  {inventory.map((item) => <li key={item.size}>{item.quantity > 0 ? <CheckCircle2 /> : <Clock3 />}<span><strong>{item.size}</strong><small>{item.quantity.toLocaleString()} available</small></span></li>)}
                </ul>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}
