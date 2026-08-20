import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  PackageCheck,
  PackageOpen,
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
  { key: 'all', label: 'All Orders', statuses: null },
  { key: 'awaiting', label: 'Awaiting Confirmation', statuses: ['pending'] },
  { key: 'fulfillment', label: 'In Fulfillment', statuses: ['confirmed', 'preparing', 'ready_for_delivery', 'out_for_delivery'] },
  { key: 'completed', label: 'Completed', statuses: ['delivered'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
]

const statusLabels = {
  pending: 'Pending', confirmed: 'Confirmed', preparing: 'Packaging', ready_for_delivery: 'Ready for Delivery',
  out_for_delivery: 'In Transit', delivered: 'Delivered', cancelled: 'Cancelled',
}

const nextActions = {
  pending: [{ status: 'confirmed', label: 'Confirm Order' }, { status: 'cancelled', label: 'Cancel Order', danger: true }],
  confirmed: [{ status: 'preparing', label: 'Start Preparing' }, { status: 'cancelled', label: 'Cancel Order', danger: true }],
  preparing: [{ status: 'ready_for_delivery', label: 'Mark as Ready' }],
  ready_for_delivery: [{ status: 'out_for_delivery', label: 'Start Delivery' }],
  out_for_delivery: [{ status: 'delivered', label: 'Mark as Delivered' }],
}

function money(value) {
  return `PHP ${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function dateTime(value) {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function itemsSummary(order) {
  return (order.items || []).map((item) => `${item.product_name} x${item.quantity}`).join(', ')
}

function actionIcon(status) {
  if (status === 'cancelled') return <XCircle aria-hidden="true" />
  if (status === 'out_for_delivery') return <Truck aria-hidden="true" />
  return <Check aria-hidden="true" />
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
  const [notice, setNotice] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [confirmationError, setConfirmationError] = useState('')
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

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!selected && !confirmation) return undefined
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape' || updating) return
      if (confirmation) setConfirmation(null)
      else setSelected(null)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [confirmation, selected, updating])

  const counts = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => order.order_status === 'pending').length,
    fulfillment: orders.filter((order) => ['confirmed', 'preparing', 'ready_for_delivery', 'out_for_delivery'].includes(order.order_status)).length,
    delivered: orders.filter((order) => order.order_status === 'delivered').length,
    cancelled: orders.filter((order) => order.order_status === 'cancelled').length,
  }), [orders])

  const filtered = useMemo(() => {
    const tab = tabs.find((entry) => entry.key === activeTab)
    const term = search.trim().toLowerCase()

    return orders
      .filter((order) => !tab.statuses || tab.statuses.includes(order.order_status))
      .filter((order) => !term ||
        order.order_number?.toLowerCase().includes(term) ||
        order.delivery_full_name?.toLowerCase().includes(term) ||
        order.delivery_mobile_number?.toLowerCase().includes(term) ||
        itemsSummary(order).toLowerCase().includes(term))
      .sort((first, second) => new Date(second.created_at) - new Date(first.created_at))
  }, [activeTab, orders, search])

  const filtersActive = Boolean(search.trim())
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visibleOrders = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => { setPage(1) }, [activeTab, search])
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])

  function selectStage(stage) {
    setActiveTab(stage)
    setPage(1)
  }

  function clearFilters() {
    setSearch('')
  }

  function requestOrderAction(order, action) {
    setConfirmation({ order, action, note: '' })
    setConfirmationError('')
  }

  async function confirmOrderAction() {
    if (!confirmation) return
    const { order, action } = confirmation
    const note = confirmation.note.trim()
    if (action.status === 'cancelled' && !note) {
      setConfirmationError('Please provide a reason for cancelling this order.')
      return
    }

    setUpdating(true)
    setConfirmationError('')
    try {
      await changeSellerOrderStatus(order.id, action.status, note)
      setConfirmation(null)
      setSelected(null)
      setNotice(`${order.order_number} is now ${statusLabels[action.status].toLowerCase()}.`)
      await fetchOrders({ background: true })
    } catch (requestError) {
      setConfirmationError(requestError.message)
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
            <button className={activeTab === 'all' ? 'is-active' : ''} type="button" onClick={() => selectStage('all')}><span><Box /></span><div><small>Total Orders</small><strong>{counts.total}</strong><em>View all orders <ChevronRight /></em></div></button>
            <button className={activeTab === 'awaiting' ? 'is-active' : ''} type="button" onClick={() => selectStage('awaiting')}><span><Clock3 /></span><div><small>Pending Confirmation</small><strong>{counts.pending}</strong><em>Needs attention <ChevronRight /></em></div></button>
            <button className={activeTab === 'fulfillment' ? 'is-active' : ''} type="button" onClick={() => selectStage('fulfillment')}><span><PackageCheck /></span><div><small>In Fulfillment</small><strong>{counts.fulfillment}</strong><em>View active orders <ChevronRight /></em></div></button>
            <button className={activeTab === 'completed' ? 'is-active' : ''} type="button" onClick={() => selectStage('completed')}><span><CheckCircle2 /></span><div><small>Delivered</small><strong>{counts.delivered}</strong><em>View completed <ChevronRight /></em></div></button>
          </section>

          <section className="seller-orders-table-card">
            <div className="seller-order-toolbar">
              <label className="seller-order-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, phone, or item" aria-label="Search orders" /></label>
            </div>

            <div className="seller-order-tabs" role="tablist">
              {tabs.map((tab) => <button className={activeTab === tab.key ? 'is-active' : ''} type="button" role="tab" aria-selected={activeTab === tab.key} onClick={() => selectStage(tab.key)} key={tab.key}>{tab.label}</button>)}
            </div>

            {error && <div className="seller-order-error" role="alert">{error}<button type="button" onClick={() => setError('')}>Dismiss</button></div>}
            <div className="seller-order-table-wrap">
              <table className="seller-order-table">
                <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Order Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan="6" className="seller-order-empty"><span>Loading orders...</span></td></tr>}
                  {!loading && visibleOrders.length === 0 && <tr><td colSpan="6" className="seller-order-empty"><PackageOpen /><strong>{filtersActive ? 'No matching orders' : `No ${tabs.find((tab) => tab.key === activeTab)?.label.toLowerCase()} yet`}</strong><span>{filtersActive ? 'Try changing or clearing your filters.' : 'Orders in this stage will appear here.'}</span>{filtersActive && <button type="button" onClick={clearFilters}>Clear filters</button>}</td></tr>}
                  {!loading && visibleOrders.map((order) => {
                    const primaryAction = (nextActions[order.order_status] || []).find((action) => !action.danger)
                    return <tr key={order.id} tabIndex="0" onClick={() => setSelected(order)} onKeyDown={(event) => { if (event.key === 'Enter') setSelected(order) }}>
                      <td><strong>{order.order_number}</strong><small>{itemsSummary(order)}</small></td>
                      <td><strong>{order.delivery_full_name}</strong><small>{order.delivery_mobile_number || 'No phone provided'}</small></td>
                      <td><strong>{money(order.total_amount)}</strong><small>{order.payment_method?.replaceAll('_', ' ')}</small></td>
                      <td><span>{dateTime(order.created_at)}</span></td>
                      <td><span className={`seller-status is-${order.order_status}`}>{statusLabels[order.order_status]}</span></td>
                      <td><div className="seller-row-actions"><button type="button" title="View details" onClick={(event) => { event.stopPropagation(); setSelected(order) }}><Eye /></button>{primaryAction && <button className="is-primary" type="button" disabled={updating} onClick={(event) => { event.stopPropagation(); requestOrderAction(order, primaryAction) }}>{actionIcon(primaryAction.status)}<span>{primaryAction.label}</span></button>}</div></td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
            <footer className="seller-order-pagination">
              <span>{filtered.length} total order{filtered.length === 1 ? '' : 's'}</span>
              <div>
                <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>← Previous</button>
                <strong>{page}</strong>
                <button type="button" disabled={page >= pages || loading} onClick={() => setPage((value) => value + 1)}>Next →</button>
              </div>
            </footer>
          </section>
        </div>
      </section>

      {notice && <div className="seller-order-toast" role="status"><CheckCircle2 /><span>{notice}</span></div>}

      {selected && <div className="seller-order-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}>
        <section className="seller-order-modal" role="dialog" aria-modal="true" aria-labelledby="seller-order-dialog-title">
          <header><div><small>{selected.order_number}</small><h2 id="seller-order-dialog-title">Order Details</h2><span className={`seller-status is-${selected.order_status}`}>{statusLabels[selected.order_status]}</span></div><button type="button" onClick={() => setSelected(null)} aria-label="Close order details"><X /></button></header>
          <div className="seller-order-modal-body">
            <section><h3>Customer &amp; Delivery</h3><dl><div><dt>Customer</dt><dd>{selected.delivery_full_name}</dd></div><div><dt>Mobile</dt><dd>{selected.delivery_mobile_number || 'Not provided'}</dd></div><div><dt>Method</dt><dd>{selected.delivery_method}</dd></div><div><dt>Address</dt><dd>{[selected.delivery_barangay, selected.delivery_city_municipality, selected.delivery_province, selected.delivery_region, selected.delivery_country].filter(Boolean).join(', ') || 'Farm pickup'}</dd></div></dl></section>
            <section><h3>Payment Summary</h3><dl><div><dt>Method</dt><dd>{selected.payment_method}</dd></div><div><dt>Status</dt><dd>{selected.payment_status}</dd></div><div><dt>Subtotal</dt><dd>{money(selected.subtotal)}</dd></div><div><dt>Shipping</dt><dd>{money(selected.shipping_fee)}</dd></div><div><dt>Total</dt><dd><strong>{money(selected.total_amount)}</strong></dd></div></dl></section>
            <section className="seller-modal-items"><h3>Ordered Items</h3>{selected.items.map((item) => <article key={item.id}><div><strong>{item.product_name}</strong><small>{item.weight_label} · {item.quantity} pieces at {money(item.unit_price)}</small></div><b>{money(item.line_total)}</b></article>)}</section>
            <section><h3>Customer Note</h3><p>{selected.customer_note || 'No additional instructions were provided.'}</p></section>
            <section className="seller-status-history"><h3>Status Timeline</h3><ol><li><span /><div><strong>Order Placed</strong><small>{dateTime(selected.created_at)}</small></div></li>{[...(selected.history || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((entry) => <li key={entry.id}><span /><div><strong>{statusLabels[entry.new_status]}</strong><small>{dateTime(entry.created_at)}</small>{entry.note && <em>{entry.note}</em>}</div></li>)}</ol></section>
          </div>
          {(nextActions[selected.order_status] || []).length > 0 && <footer>{(nextActions[selected.order_status] || []).map((action) => <button className={action.danger ? 'is-danger' : 'is-primary'} type="button" disabled={updating} onClick={() => requestOrderAction(selected, action)} key={action.status}>{actionIcon(action.status)} {action.label}</button>)}</footer>}
        </section>
      </div>}

      {confirmation && <div className="seller-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !updating) setConfirmation(null) }}>
        <section className={`seller-confirmation-dialog ${confirmation.action.danger ? 'is-danger' : ''}`} role="alertdialog" aria-modal="true" aria-labelledby="seller-confirmation-title" aria-describedby="seller-confirmation-description">
          <span className="seller-confirmation-icon">{confirmation.action.danger ? <CircleAlert aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}</span>
          <p>Confirm order update</p>
          <h2 id="seller-confirmation-title">{confirmation.action.label}?</h2>
          <div id="seller-confirmation-description" className="seller-confirmation-message">You’re about to change <strong>{confirmation.order.order_number}</strong> from <b>{statusLabels[confirmation.order.order_status]}</b> to <b>{statusLabels[confirmation.action.status]}</b>.</div>
          <dl><div><dt>Customer</dt><dd>{confirmation.order.delivery_full_name}</dd></div><div><dt>Order total</dt><dd>{money(confirmation.order.total_amount)}</dd></div></dl>
          {confirmation.action.status === 'cancelled' && <label><span>Cancellation reason <em>*</em></span><textarea value={confirmation.note} maxLength="500" placeholder="Explain why this order is being cancelled" onChange={(event) => setConfirmation((current) => ({ ...current, note: event.target.value }))} autoFocus /></label>}
          {confirmation.action.status === 'cancelled' && <small>Allocated inventory will be returned to stock.</small>}
          {confirmationError && <div className="seller-confirmation-error" role="alert">{confirmationError}</div>}
          <footer><button type="button" className="is-cancel" disabled={updating} onClick={() => setConfirmation(null)}>Go Back</button><button type="button" className="is-confirm" disabled={updating} onClick={confirmOrderAction}>{updating ? 'Updating…' : confirmation.action.label}</button></footer>
        </section>
      </div>}
    </main>
  )
}
