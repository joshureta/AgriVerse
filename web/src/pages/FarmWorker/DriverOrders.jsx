import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { AdminTopbar } from '../../components/AdminNavigation.jsx'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/seller-order-management.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

function formatWindow(start, end) {
  if (!start || !end) return 'Schedule pending'
  const formatter = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' })
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`
}

export default function DriverOrders() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadOrders() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        const token = data.session?.access_token
        if (!token) throw new Error('Your session has ended. Please sign in again.')
        const response = await fetch(`${API_URL}/api/driver/orders`, { headers: { Authorization: `Bearer ${token}` } })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error || 'Unable to load delivery orders')
        if (active) setOrders(body.orders || [])
      } catch (requestError) {
        if (active) setError(requestError.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadOrders()
    return () => { active = false }
  }, [])

  return <main className="admin-dashboard seller-order-page">
    <section className="admin-workspace">
      <AdminTopbar />
      <div className="seller-order-content">
        <header className="seller-order-heading"><div><p>Driver workspace</p><h1>My Deliveries</h1><span>Orders assigned to you for delivery.</span></div></header>
        {error && <div className="tasks-error" role="alert">{error}</div>}
        <section className="seller-orders-list" aria-label="Assigned delivery orders">
          {loading ? <p>Loading assigned orders…</p> : orders.length ? orders.map((order) => <article className="seller-order-card" key={order.id}>
            <header><div><strong>{order.order_number}</strong><span>{order.order_status.replaceAll('_', ' ')}</span></div><b>₱{Number(order.total_amount).toLocaleString()}</b></header>
            <p><strong>{order.delivery_full_name}</strong> · {order.payment_method}</p>
            <p><MapPin aria-hidden="true" /> {[order.delivery_barangay, order.delivery_city_municipality, order.delivery_province, order.delivery_region].filter(Boolean).join(', ')}</p>
            <footer><span>{formatWindow(order.delivery_scheduled_at, order.delivery_window_end_at)}</span></footer>
          </article>) : <p>No delivery orders are assigned to you.</p>}
        </section>
      </div>
    </section>
  </main>
}
