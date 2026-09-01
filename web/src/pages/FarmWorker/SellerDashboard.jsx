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
import '../../styles/admin-dashboard.css'
import '../../styles/seller-dashboard.css'
import '../../styles/seller-workspace.css'

const recentOrders = [
  { customer: 'James Rivera', order: '24 pineapples', status: 'New', tone: 'new' },
  { customer: 'Juan Dela Cruz', order: '15 pineapples', status: 'Completed', tone: 'done' },
  { customer: 'Yuri Santos', order: '32 pineapples', status: 'Preparing', tone: 'progress' },
  { customer: 'Sanji Reyes', order: '18 pineapples', status: 'New', tone: 'new' },
]

const revenuePoints = '8,88 72,76 136,66 200,52 264,41 328,23 392,12'

export default function SellerDashboard() {
  const { profile } = useAuth()
  const displayName = profile?.full_name || 'Seller'
  const firstName = displayName.split(' ')[0]

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
              <div><small>Harvested This Month</small><strong>12,000 <em>kg</em></strong><p>Total harvested</p></div>
            </article>
            <article>
              <span className="seller-stat-icon is-sales"><Banknote /></span>
              <div><small>Sales This Month</small><strong>PHP 6,000</strong><p>Monthly revenue</p></div>
            </article>
            <article>
              <span className="seller-stat-icon is-orders"><ShoppingBag /></span>
              <div><small>Pending Orders</small><strong>8</strong><p>Needs attention</p></div>
            </article>
          </section>

          <div className="seller-dashboard-body">
            <section className="seller-panel seller-revenue" aria-labelledby="seller-revenue-title">
              <header><div><small>Revenue</small><h2 id="seller-revenue-title">Monthly Performance</h2></div><span><TrendingUp /> +12.4%</span></header>
              <div className="seller-chart">
                <div className="seller-chart-labels"><span>25k</span><span>20k</span><span>15k</span><span>10k</span><span>5k</span></div>
                <svg viewBox="0 0 400 105" role="img" aria-label="Mock revenue trend increasing across seven months">
                  <g className="seller-grid-lines"><line x1="0" y1="12" x2="400" y2="12" /><line x1="0" y1="32" x2="400" y2="32" /><line x1="0" y1="52" x2="400" y2="52" /><line x1="0" y1="72" x2="400" y2="72" /><line x1="0" y1="92" x2="400" y2="92" /></g>
                  <polyline className="seller-chart-fill" points={`0,105 ${revenuePoints} 400,105`} />
                  <polyline className="seller-chart-line" points={revenuePoints} />
                  {[['8','88'],['72','76'],['136','66'],['200','52'],['264','41'],['328','23'],['392','12']].map(([x,y]) => <circle cx={x} cy={y} r="3.5" key={`${x}-${y}`} />)}
                </svg>
                <div className="seller-chart-months"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span></div>
              </div>
            </section>

            <section className="seller-panel seller-orders" id="orders" aria-labelledby="seller-orders-title">
              <header><div><small>Orders</small><h2 id="seller-orders-title">Recent Orders</h2></div><a href="#orders">View all</a></header>
              <div className="seller-order-list">
                {recentOrders.map((order) => (
                  <article key={`${order.customer}-${order.order}`}>
                    <span className="seller-order-icon"><Box /></span>
                    <div><strong>{order.customer}</strong><small>{order.order}</small></div>
                    <span className={`seller-order-status is-${order.tone}`}>{order.status}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="seller-panel seller-inventory" id="inventory" aria-labelledby="seller-inventory-title">
              <header><div><small>Stock overview</small><h2 id="seller-inventory-title">Inventory Status</h2></div></header>
              <div className="seller-inventory-content">
                <div className="seller-stock-ring"><span><strong>78%</strong><small>In stock</small></span></div>
                <ul>
                  <li><CheckCircle2 /><span><strong>Small</strong><small>420 available</small></span></li>
                  <li><CheckCircle2 /><span><strong>Medium</strong><small>315 available</small></span></li>
                  <li><Clock3 /><span><strong>Large</strong><small>Low stock: 82</small></span></li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}
