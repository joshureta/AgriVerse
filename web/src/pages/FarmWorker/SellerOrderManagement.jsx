import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  PackageCheck,
  Search,
  Truck,
  X,
  XCircle,
} from 'lucide-react'
import { SellerSidebar, SellerTopbar } from '../../components/SellerNavigation.jsx'
import { changeSellerOrderStatus, loadSellerOrders } from '../../services/sellerOrders.js'
import '../../styles/admin-dashboard.css'
import '../../styles/seller-order-management.css'

const tabs = [
  { key: 'awaiting', label: 'Awaiting Confirmation', statuses: ['pending'] },
  { key: 'fulfillment', label: 'In Fulfillment', statuses: ['confirmed', 'preparing', 'ready_for_delivery', 'out_for_delivery'] },
  { key: 'completed', label: 'Completed', statuses: ['delivered', 'cancelled'] },
]

const statusLabels = {
  pending: 'Pending', confirmed: 'Confirmed', preparing: 'Packaging', ready_for_delivery: 'Ready for Delivery',
  out_for_delivery: 'In Transit', delivered: 'Delivered', cancelled: 'Cancelled',
}

const nextActions = {
  pending: [{ status: 'confirmed', label: 'Confirm' }, { status: 'cancelled', label: 'Cancel', danger: true }],
  confirmed: [{ status: 'preparing', label: 'Start Preparing' }, { status: 'cancelled', label: 'Cancel', danger: true }],
  preparing: [{ status: 'ready_for_delivery', label: 'Ready for Delivery' }],
  ready_for_delivery: [],
  out_for_delivery: [],
}

function money(value) {
  return `PHP ${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function dateTime(value) {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function itemsSummary(order) {
  return order.items.map((item) => `${item.product_name} x${item.quantity}`).join(', ')
}

export default function SellerOrderManagement() {
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('awaiting')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const pageSize = 7

  const fetchOrders = useCallback(async ({ background = false } = {}) => {
    if (background) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    if (!background) setError('')
    try {
      const data = await loadSellerOrders()
      setOrders(data)
      setSelected((current) => current ? data.find((order) => order.id === current.id) || null : null)
    } catch (requestError) {
      if (!background) setError(requestError.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchOrders({ background: true })
    }, 20000)
    return () => window.clearInterval(timer)
  }, [fetchOrders])

  const counts = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => order.order_status === 'pending').length,
    fulfillment: orders.filter((order) => ['confirmed', 'preparing', 'ready_for_delivery', 'out_for_delivery'].includes(order.order_status)).length,
    delivered: orders.filter((order) => order.order_status === 'delivered').length,
  }), [orders])

  const filtered = useMemo(() => {
    const tab = tabs.find((entry) => entry.key === activeTab)
    const term = search.trim().toLowerCase()
    return orders.filter((order) => tab.statuses.includes(order.order_status)).filter((order) => !term ||
      order.order_number?.toLowerCase().includes(term) ||
      order.delivery_full_name.toLowerCase().includes(term) ||
      itemsSummary(order).toLowerCase().includes(term))
  }, [activeTab, orders, search])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visibleOrders = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => { setPage(1) }, [activeTab, search])
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])

  async function advanceOrder(order, action) {
    const question = action.status === 'cancelled'
      ? `Cancel ${order.order_number}? Allocated inventory will be returned to stock.`
      : `${action.label} for ${order.order_number}?`
    if (!window.confirm(question)) return
    setUpdating(true)
    setError('')
    try {
      await changeSellerOrderStatus(order.id, action.status)
      await fetchOrders({ background: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <main className="admin-dashboard seller-orders-page">
      <SellerSidebar active="orders" />
      <section className="admin-workspace">
        <SellerTopbar />
        <div className="seller-orders-content">
          <header className="seller-orders-title">
            <div className="seller-title-icon"><Box /></div>
            <div><p>Seller workspace</p><h1>Order Management</h1><span>Receive, confirm, fulfill, and complete buyer orders.</span></div>
            <small className={refreshing ? 'is-refreshing' : ''}>{refreshing ? 'Updating...' : 'Auto-refresh on'}</small>
          </header>

          <section className="seller-order-stats" aria-label="Order statistics">
            <article><span><Box /></span><div><small>Total Orders</small><strong>{counts.total}</strong></div></article>
            <article><span><Clock3 /></span><div><small>Pending Confirmation</small><strong>{counts.pending}</strong></div></article>
            <article><span><PackageCheck /></span><div><small>In Fulfillment</small><strong>{counts.fulfillment}</strong></div></article>
            <article><span><CheckCircle2 /></span><div><small>Delivered</small><strong>{counts.delivered}</strong></div></article>
          </section>

          <section className="seller-orders-table-card">
            <div className="seller-order-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order number, customer, or item" aria-label="Search orders" /></div>
            <div className="seller-order-tabs" role="tablist">
              {tabs.map((tab) => <button className={activeTab === tab.key ? 'is-active' : ''} type="button" role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} key={tab.key}>{tab.label}</button>)}
            </div>

            {error && <div className="seller-order-error" role="alert">{error}<button type="button" onClick={() => fetchOrders()}>Try again</button></div>}
            <div className="seller-order-table-wrap">
              <table className="seller-order-table">
                <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Quantity</th><th>Total</th><th>Order Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan="8" className="seller-order-empty">Loading orders...</td></tr>}
                  {!loading && visibleOrders.length === 0 && <tr><td colSpan="8" className="seller-order-empty">No orders found in this stage.</td></tr>}
                  {!loading && visibleOrders.map((order) => (
                    <tr key={order.id}>
                      <td><strong>{order.order_number}</strong></td>
                      <td>{order.delivery_full_name}</td>
                      <td className="seller-items-cell">{itemsSummary(order)}</td>
                      <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                      <td><strong>{money(order.total_amount)}</strong></td>
                      <td>{dateTime(order.created_at)}</td>
                      <td><span className={`seller-status is-${order.order_status}`}>{statusLabels[order.order_status]}</span></td>
                      <td><div className="seller-row-actions"><button type="button" title="View details" onClick={() => setSelected(order)}><Eye /></button>{(nextActions[order.order_status] || []).map((action) => <button className={action.danger ? 'is-danger' : 'is-primary'} type="button" disabled={updating} onClick={() => advanceOrder(order, action)} key={action.status}>{action.status === 'cancelled' ? <X /> : <Check />}<span>{action.label}</span></button>)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="seller-order-pagination"><span>{filtered.length} total orders</span><div><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><strong>{page}</strong><button type="button" disabled={page === pages} onClick={() => setPage((value) => value + 1)}>Next</button></div></footer>
          </section>
        </div>
      </section>

      {selected && <div className="seller-order-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}>
        <section className="seller-order-modal" role="dialog" aria-modal="true" aria-labelledby="seller-order-dialog-title">
          <header><div><small>{selected.order_number}</small><h2 id="seller-order-dialog-title">Order Details</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Close order details"><X /></button></header>
          <div className="seller-order-modal-body">
            <section><h3>Customer &amp; Delivery</h3><dl><div><dt>Customer</dt><dd>{selected.delivery_full_name}</dd></div><div><dt>Mobile</dt><dd>{selected.delivery_mobile_number || 'Not provided'}</dd></div><div><dt>Method</dt><dd>{selected.delivery_method}</dd></div><div><dt>Address</dt><dd>{[selected.delivery_barangay, selected.delivery_city_municipality, selected.delivery_province, selected.delivery_region].filter(Boolean).join(', ') || 'Farm pickup'}</dd></div></dl></section>
            <section><h3>Payment</h3><dl><div><dt>Method</dt><dd>{selected.payment_method}</dd></div><div><dt>Status</dt><dd>{selected.payment_status}</dd></div><div><dt>Subtotal</dt><dd>{money(selected.subtotal)}</dd></div><div><dt>Shipping</dt><dd>{money(selected.shipping_fee)}</dd></div><div><dt>Total</dt><dd><strong>{money(selected.total_amount)}</strong></dd></div></dl></section>
            <section className="seller-modal-items"><h3>Ordered Items</h3>{selected.items.map((item) => <article key={item.id}><div><strong>{item.product_name}</strong><small>{item.weight_label} - {item.quantity} pieces at {money(item.unit_price)}</small></div><b>{money(item.line_total)}</b></article>)}</section>
            {selected.customer_note && <section><h3>Customer Note</h3><p>{selected.customer_note}</p></section>}
            <section className="seller-status-history"><h3>Status Timeline</h3><ol><li><span /><div><strong>Order Placed</strong><small>{dateTime(selected.created_at)}</small></div></li>{[...(selected.history || [])].sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).map((entry) => <li key={entry.id}><span /><div><strong>{statusLabels[entry.new_status]}</strong><small>{dateTime(entry.created_at)}</small></div></li>)}</ol></section>
          </div>
          {(nextActions[selected.order_status] || []).length > 0 && <footer>{(nextActions[selected.order_status] || []).map((action) => <button className={action.danger ? 'is-danger' : 'is-primary'} type="button" disabled={updating} onClick={() => advanceOrder(selected, action)} key={action.status}>{action.status === 'cancelled' ? <XCircle /> : action.status === 'out_for_delivery' ? <Truck /> : <Check />} {action.label}</button>)}</footer>}
        </section>
      </div>}
    </main>
  )
}
