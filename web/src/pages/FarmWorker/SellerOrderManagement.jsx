import { useCallback, useEffect, useRef, useState } from 'react'
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
  TriangleAlert,
  Truck,
  X,
  XCircle,
} from 'lucide-react'
import { SellerSidebar, SellerTopbar } from '../../components/SellerNavigation.jsx'
import Pagination from '../../components/Pagination.jsx'
import { changeSellerOrderStatus, loadSellerOrder, loadSellerOrders } from '../../services/sellerOrders.js'
import '../../styles/admin-dashboard.css'
import '../../styles/seller-order-management.css'
import '../../styles/seller-workspace.css'

const tabs = [
  { key: 'all', label: 'All Orders', statuses: null },
  { key: 'awaiting', label: 'Awaiting Confirmation', statuses: ['pending'] },
  { key: 'fulfillment', label: 'In Fulfillment', statuses: ['confirmed', 'preparing', 'ready_for_delivery', 'out_for_delivery', 'ready_for_pickup'] },
  { key: 'completed', label: 'Completed', statuses: ['delivered', 'completed'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
]

const statusLabels = {
  pending: 'Pending', confirmed: 'Confirmed', preparing: 'Packaging', ready_for_delivery: 'Ready for Delivery',
  out_for_delivery: 'In Transit', ready_for_pickup: 'Ready for Pickup', delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled',
}

const nextActions = {
  pending: [{ status: 'confirmed', label: 'Confirm Order' }, { status: 'cancelled', label: 'Cancel Order', danger: true }],
  confirmed: [{ status: 'preparing', label: 'Start Preparing' }, { status: 'cancelled', label: 'Cancel Order', danger: true }],
  preparing: [{ status: 'ready_for_delivery', label: 'Mark as Ready' }],
  ready_for_delivery: [{ status: 'out_for_delivery', label: 'Start Delivery' }],
}

// On-site pickup orders never see a driver, so they fork off the shared pending/confirmed/preparing
// steps onto their own two-button path instead of the delivery-only ready_for_delivery/out_for_delivery pair.
const pickupActions = {
  preparing: [{ status: 'ready_for_pickup', label: 'Ready for Pickup' }],
  ready_for_pickup: [{ status: 'completed', label: 'Mark Picked Up' }],
}

const DRIVER_READY_STATUSES = new Set(['accepted', 'picked_up'])

function availableActions(order) {
  const actions = (order.delivery_method === 'pickup' && pickupActions[order.order_status]) || nextActions[order.order_status] || []
  if (order.order_status !== 'ready_for_delivery') return actions
  return actions.filter((action) => action.status !== 'out_for_delivery' || DRIVER_READY_STATUSES.has(order.delivery_assignment_status))
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
  const [counts, setCounts] = useState({ all: 0, awaiting: 0, fulfillment: 0, completed: 0, cancelled: 0 })
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [activeTab, setActiveTab] = useState('awaiting')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)
  const [pendingDismissed, setPendingDismissed] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [confirmationError, setConfirmationError] = useState('')
  const pageSize = 7
  const requestId = useRef(0)

  useEffect(() => { requestId.current += 1 }, [activeTab, page, search])

  const fetchOrders = useCallback(async ({ background = false } = {}) => {
    const currentRequest = ++requestId.current
    if (background) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    if (!background) setError('')
    try {
      const data = await loadSellerOrders({ page, pageSize, stage: activeTab, search })
      if (currentRequest !== requestId.current) return
      setOrders(data.orders || [])
      setCounts(data.counts || { all: 0, awaiting: 0, fulfillment: 0, completed: 0, cancelled: 0 })
      setPagination(data.pagination || { page, total: 0, totalPages: 1 })
      setSelected((current) => current ? data.orders?.find((order) => order.id === current.id) || current : null)
    } catch (requestError) {
      if (currentRequest === requestId.current && !background) {
        setOrders([])
        setPagination({ page, total: 0, totalPages: 1 })
        setError(requestError.message)
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [activeTab, page, search])

  useEffect(() => {
    const timer = window.setTimeout(() => fetchOrders(), search ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [fetchOrders, search])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchOrders({ background: true })
    }, 20000)
    return () => window.clearInterval(timer)
  }, [fetchOrders])

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

  const filtersActive = Boolean(search.trim())
  const pages = pagination.totalPages
  const visibleOrders = orders

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
    setNotice(null)
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
      await fetchOrders({ background: true })
      setNotice({
        orderId: order.id,
        message: action.status === 'confirmed'
          ? `Order ${order.order_number} confirmed. It has moved to In Fulfillment.`
          : `Order ${order.order_number} is now ${statusLabels[action.status].toLowerCase()}.`,
      })
    } catch (requestError) {
      setConfirmationError(`Could not ${action.label.toLowerCase()} for ${order.order_number}. ${requestError.message || 'Please try again.'}`)
    } finally {
      setUpdating(false)
    }
  }

  async function viewNotifiedOrder() {
    if (!notice) return
    try {
      const order = await loadSellerOrder(notice.orderId)
      const tab = tabs.find((entry) => entry.statuses?.includes(order.order_status))
      if (tab) selectStage(tab.key)
      setSelected(order)
      setNotice(null)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <main className="admin-dashboard seller-orders-page">
      <SellerSidebar active="orders" />
      <section className="admin-workspace">
        <SellerTopbar />
        <div className="seller-orders-content">
          <header className="seller-orders-title">
            <div className="seller-orders-title-copy"><h1>Order Management</h1><span>Receive, confirm, fulfill, and complete buyer orders.</span></div>
            <small className={refreshing ? 'is-refreshing' : ''}>{refreshing ? 'Updating...' : 'Auto-refresh on'}</small>
          </header>

          {(notice || (counts.awaiting > 0 && !pendingDismissed)) && <section className="seller-order-notices" aria-label="Order notifications">
            {notice && <div className="seller-order-notice is-success" role="status">
              <span className="seller-order-notice-icon"><CheckCircle2 aria-hidden="true" /></span>
              <p><strong>Order updated:</strong> {notice.message}{' '}<button type="button" className="seller-order-notice-link" onClick={viewNotifiedOrder}>View order</button></p>
              <button type="button" className="seller-order-notice-dismiss" aria-label="Dismiss order update notification" onClick={() => setNotice(null)}><X aria-hidden="true" /></button>
            </div>}
            {counts.awaiting > 0 && !pendingDismissed && <div className="seller-order-notice is-warning" role="status">
              <span className="seller-order-notice-icon"><TriangleAlert aria-hidden="true" /></span>
              <p><button type="button" className="seller-order-notice-link is-title" onClick={() => selectStage('awaiting')}>Orders Awaiting Confirmation:</button>{' '}{counts.awaiting} order{counts.awaiting === 1 ? '' : 's'} need{counts.awaiting === 1 ? 's' : ''} confirmation.</p>
              <button type="button" className="seller-order-notice-dismiss" aria-label="Dismiss pending orders notification" onClick={() => setPendingDismissed(true)}><X aria-hidden="true" /></button>
            </div>}
          </section>}

          <section className="seller-order-stats" aria-label="Order statistics">
            <button className={activeTab === 'all' ? 'is-active' : ''} type="button" onClick={() => selectStage('all')}><span><Box /></span><div><small>Total Orders</small><strong>{counts.all}</strong><em>View all orders <ChevronRight /></em></div></button>
            <button className={activeTab === 'awaiting' ? 'is-active' : ''} type="button" onClick={() => selectStage('awaiting')}><span><Clock3 /></span><div><small>Pending Confirmation</small><strong>{counts.awaiting}</strong><em>Needs attention <ChevronRight /></em></div></button>
            <button className={activeTab === 'fulfillment' ? 'is-active' : ''} type="button" onClick={() => selectStage('fulfillment')}><span><PackageCheck /></span><div><small>In Fulfillment</small><strong>{counts.fulfillment}</strong><em>View active orders <ChevronRight /></em></div></button>
            <button className={activeTab === 'completed' ? 'is-active' : ''} type="button" onClick={() => selectStage('completed')}><span><CheckCircle2 /></span><div><small>Completed</small><strong>{counts.completed}</strong><em>View completed <ChevronRight /></em></div></button>
          </section>

          <section className="seller-orders-table-card">
            <div className="seller-order-tabs" role="tablist">
              {tabs.filter((tab) => tab.key !== 'all').map((tab) => <button className={activeTab === tab.key ? 'is-active' : ''} type="button" role="tab" aria-selected={activeTab === tab.key} onClick={() => selectStage(tab.key)} key={tab.key}>{tab.label}</button>)}
            </div>

            <div className="seller-order-toolbar">
              <label className="seller-order-search"><Search /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search order or customer" aria-label="Search order or customer" /></label>
            </div>

            <div className="seller-order-table-wrap">
              {error && <div className="seller-order-error" role="alert">{error}<button type="button" onClick={() => setError('')}>Dismiss</button></div>}
              <table className="seller-order-table">
                <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Order Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan="6" className="seller-order-empty"><div className="seller-order-empty-content"><span>Loading orders...</span></div></td></tr>}
                  {!loading && visibleOrders.length === 0 && <tr><td colSpan="6" className="seller-order-empty"><div className="seller-order-empty-content"><PackageOpen /><strong>{filtersActive ? 'No matching orders' : `No ${tabs.find((tab) => tab.key === activeTab)?.label.toLowerCase()} yet`}</strong><span>{filtersActive ? 'Try changing or clearing your filters.' : 'Orders in this stage will appear here.'}</span>{filtersActive && <button type="button" onClick={clearFilters}>Clear filters</button>}</div></td></tr>}
                  {!loading && visibleOrders.map((order) => {
                    const primaryAction = availableActions(order).find((action) => !action.danger)
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
            <footer className="pagination-footer">
              <span>{pagination.total} total order{pagination.total === 1 ? '' : 's'}</span>
              <Pagination page={page} totalPages={pages} onChange={setPage} disabled={loading} ariaLabel="Seller order pages" />
            </footer>
          </section>
        </div>
      </section>

      {selected && <div className="seller-order-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}>
        <section className="seller-order-modal" role="dialog" aria-modal="true" aria-labelledby="seller-order-dialog-title">
          <header>
            <div className="seller-order-modal-heading">
              <small>Order · {selected.order_number}</small>
              <div><h2 id="seller-order-dialog-title">Order Details</h2><span className={`seller-status is-${selected.order_status}`}>{statusLabels[selected.order_status]}</span></div>
              <p>Placed {dateTime(selected.created_at)}</p>
            </div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Close order details"><X /></button>
          </header>
          <div className="seller-order-modal-body">
            <div className="seller-order-receipt">
              <div className="seller-receipt-heading"><span>Order receipt</span><strong>{selected.order_number}</strong><small>{dateTime(selected.created_at)}</small></div>
              <section>
                <div className="seller-modal-section-title"><div><h3>Customer &amp; Delivery</h3><small>Recipient and fulfillment details</small></div></div>
                <dl><div><dt>Customer</dt><dd>{selected.delivery_full_name}</dd></div><div><dt>Mobile</dt><dd>{selected.delivery_mobile_number || 'Not provided'}</dd></div><div><dt>Method</dt><dd>{selected.delivery_method}</dd></div>{selected.delivery_method === 'pickup' ? null : <div className="seller-modal-address"><dt>Address</dt><dd>{[selected.delivery_barangay, selected.delivery_city_municipality, selected.delivery_province, selected.delivery_region, selected.delivery_country].filter(Boolean).join(', ') || 'Farm pickup'}</dd></div>}</dl>
              </section>
              <section className="seller-modal-items">
                <div className="seller-modal-section-title"><div><h3>Ordered Items</h3><small>{selected.items.length} item{selected.items.length === 1 ? '' : 's'} in this order</small></div></div>
                {selected.items.map((item) => <article key={item.id}><span className="seller-item-quantity">{item.quantity}×</span><div><strong>{item.product_name}</strong><small>{item.weight_label} · {money(item.unit_price)} each</small></div><b>{money(item.line_total)}</b></article>)}
              </section>
              <section className="seller-payment-summary">
                <div className="seller-modal-section-title"><div><h3>Payment Summary</h3><small>Charges and payment status</small></div></div>
                <dl><div><dt>Method</dt><dd>{selected.payment_method?.replaceAll('_', ' ')}</dd></div><div><dt>Status</dt><dd><span className={`seller-payment-status is-${selected.payment_status}`}>{selected.payment_status}</span></dd></div><div><dt>Subtotal</dt><dd>{money(selected.subtotal)}</dd></div><div><dt>Shipping</dt><dd>{money(selected.shipping_fee)}</dd></div><div className="seller-payment-total"><dt>Total</dt><dd>{money(selected.total_amount)}</dd></div></dl>
              </section>
              <section className="seller-customer-note">
                <div className="seller-modal-section-title"><div><h3>Customer Note</h3><small>Special instructions from the buyer</small></div></div>
                <p>{selected.customer_note || 'No additional instructions were provided.'}</p>
              </section>
              <section className="seller-status-history">
                <div className="seller-modal-section-title"><div><h3>Status Timeline</h3><small>Order activity and updates</small></div></div>
                <ol><li><span /><div><strong>Order Placed</strong><small>{dateTime(selected.created_at)}</small></div></li>{[...(selected.history || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((entry) => <li key={entry.id}><span /><div><strong>{statusLabels[entry.new_status]}</strong><small>{dateTime(entry.created_at)}</small>{entry.note && <em>{entry.note}</em>}</div></li>)}</ol>
              </section>
            </div>
          </div>
          {availableActions(selected).length > 0 && <footer>{[...availableActions(selected)].sort((first, second) => Number(second.danger) - Number(first.danger)).map((action) => <button className={action.danger ? 'is-danger' : 'is-primary'} type="button" disabled={updating} onClick={() => requestOrderAction(selected, action)} key={action.status}>{actionIcon(action.status)} {action.label}</button>)}</footer>}
          {selected.order_status === 'ready_for_delivery' && !DRIVER_READY_STATUSES.has(selected.delivery_assignment_status) && <footer><small className="seller-driver-pending-note">Waiting for a driver to accept this delivery before it can start.</small></footer>}
          {selected.order_status === 'ready_for_pickup' && <footer><small className="seller-driver-pending-note">Order number <strong>{selected.order_number}</strong> — confirm it with the buyer before marking this picked up.</small></footer>}
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
