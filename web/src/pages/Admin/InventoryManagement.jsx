import { useCallback, useEffect, useMemo, useState } from 'react'
import archiveIcon from '../../assets/archive-inventory-icon.png'
import inventoryIcon from '../../assets/inventory-management-icon-green.png'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/inventory-management.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const PAGE_SIZE = 5
const emptyItemForm = { item_type: '', item_name: '', variant: '', stock_quantity: '' }

async function readAccessToken(refresh = false) {
  const result = refresh
    ? await supabase.auth.refreshSession()
    : await supabase.auth.getSession()
  if (result.error) throw new Error(result.error.message)
  const token = result.data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')
  return token
}

async function apiRequest(path, options = {}, retry = true) {
  const token = await readAccessToken()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
    if (response.status === 401 && retry) {
      await readAccessToken(true)
      return apiRequest(path, options, false)
    }
    const body = response.status === 204 ? null : await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`)
    return body
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The backend did not respond. Make sure it is running on port 5000.')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date(value))
}

export default function InventoryManagement() {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [itemForm, setItemForm] = useState(emptyItemForm)
  const [stockForm, setStockForm] = useState({ item_id: '', quantity: '' })
  const [refreshKey, setRefreshKey] = useState(0)

  const itemTypes = useMemo(
    () => [...new Set(items.map((item) => item.item_type))].sort(),
    [items],
  )
  const stockItem = items.find((item) => String(item.id) === String(stockForm.item_id))

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (search.trim()) params.set('search', search.trim())
    if (type) params.set('type', type)

    try {
      const data = await apiRequest(`/api/admin/inventory?${params}`)
      setItems(data.items || [])
      setPagination(data.pagination || { page, total: 0, totalPages: 1 })
    } catch (requestError) {
      setItems([])
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, type])

  useEffect(() => {
    const delay = window.setTimeout(loadItems, search ? 300 : 0)
    return () => window.clearTimeout(delay)
  }, [loadItems, refreshKey, search])

  function openAddItem() {
    setItemForm(emptyItemForm)
    setModal({ mode: 'add-item' })
  }

  function openEditItem(item) {
    setItemForm({
      item_type: item.item_type,
      item_name: item.item_name,
      variant: item.variant,
      stock_quantity: item.stock_quantity,
    })
    setModal({ mode: 'edit-item', item })
  }

  async function saveItem(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const editing = modal.mode === 'edit-item'
      await apiRequest(
        editing ? `/api/admin/inventory/${modal.item.id}` : '/api/admin/inventory',
        {
          method: editing ? 'PATCH' : 'POST',
          body: JSON.stringify({ ...itemForm, stock_quantity: Number(itemForm.stock_quantity) }),
        },
      )
      setModal(null)
      setPage(1)
      setRefreshKey((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function addStock(event) {
    event.preventDefault()
    if (!stockForm.item_id) return
    setSaving(true)
    setError('')
    try {
      await apiRequest(`/api/admin/inventory/${stockForm.item_id}/stock`, {
        method: 'POST',
        body: JSON.stringify({ quantity: Number(stockForm.quantity) }),
      })
      setModal(null)
      setRefreshKey((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function archiveItem(item) {
    if (!window.confirm(`Archive ${item.item_name} (${item.variant})?`)) return
    setError('')
    try {
      await apiRequest(`/api/admin/inventory/${item.id}/archive`, { method: 'POST' })
      if (items.length === 1 && page > 1) setPage((value) => value - 1)
      else setRefreshKey((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <main className="admin-dashboard inventory-page">
      <AdminSidebar active="inventory" />
      <section className="admin-workspace">
        <AdminTopbar />
        <div className="inventory-content">
          <header className="inventory-heading">
            <div className="inventory-title"><img src={inventoryIcon} alt="" /><h1>Inventory Management</h1></div>
            <div className="inventory-heading-actions">
              <button className="add-item-button" type="button" onClick={openAddItem}><span>＋</span>Add Item</button>
            </div>
          </header>

          <section className="inventory-panel">
            <div className="inventory-toolbar">
              <label className="inventory-filter">
                <span className="sr-only">Filter by item type</span>
                <select value={type} onChange={(event) => { setType(event.target.value); setPage(1) }}>
                  <option value="">All item types</option>
                  {itemTypes.map((itemType) => <option key={itemType}>{itemType}</option>)}
                </select>
              </label>
              <label className="inventory-search">
                <span className="sr-only">Search inventory</span>
                <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search item name, type, or variant" />
                <span aria-hidden="true" />
              </label>
            </div>

            {error && <div className="inventory-error" role="alert">{error}</div>}
            <div className="inventory-table-wrap">
              <table className="inventory-table">
                <thead><tr><th>ITEM ID</th><th>ITEM TYPE</th><th>ITEM NAME</th><th>VARIANT</th><th>STOCK<br />QTY</th><th>LAST<br />UPDATED</th><th>ACTIONS</th></tr></thead>
                <tbody>
                  {loading ? <tr><td className="inventory-empty" colSpan="7">Loading inventory…</td></tr>
                    : items.length ? items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td><td>{item.item_type}</td><td>{item.item_name}</td><td>{item.variant}</td>
                        <td>{item.stock_quantity}</td><td>{formatDate(item.updated_at)}</td>
                        <td><div className="inventory-actions">
                          <button className="inventory-edit" type="button" onClick={() => openEditItem(item)} aria-label={`Edit ${item.item_name}`}>✎</button>
                          <button className="inventory-archive" type="button" onClick={() => archiveItem(item)} aria-label={`Archive ${item.item_name}`}><img src={archiveIcon} alt="" /></button>
                        </div></td>
                      </tr>
                    )) : <tr><td className="inventory-empty" colSpan="7">No inventory items found.</td></tr>}
                </tbody>
              </table>
            </div>
            <footer className="inventory-pagination">
              <span>{pagination.total} total item{pagination.total === 1 ? '' : 's'}</span>
              <div>
                <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>← Previous</button>
                <strong>{page}</strong>
                <button type="button" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next →</button>
              </div>
            </footer>
          </section>
        </div>
      </section>

      {modal?.mode === 'add-stock' && <div className="inventory-modal-backdrop">
        <section className="stock-modal" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title">
          <header><img src={inventoryIcon} alt="" /><h2 id="stock-modal-title">Add Stock</h2></header>
          {error && <div className="inventory-modal-error" role="alert">{error}</div>}
          <form onSubmit={addStock}>
            <label className="stock-type"><span>Item Type</span><input value={stockItem?.item_type || ''} readOnly /></label>
            <label className="stock-quantity"><span>Stock Quantity</span><input type="number" min="1" value={stockForm.quantity} onChange={(event) => setStockForm({ ...stockForm, quantity: event.target.value })} required /></label>
            <label className="stock-name"><span>Item Name</span><select value={stockForm.item_id} onChange={(event) => setStockForm({ ...stockForm, item_id: event.target.value })} required><option value="" disabled>Select an item</option>{items.map((item) => <option value={item.id} key={item.id}>{item.item_name}</option>)}</select></label>
            <label className="stock-variant"><span>Variant</span><input value={stockItem?.variant || ''} readOnly /></label>
            <footer><button type="submit" disabled={saving}><span>＋</span>{saving ? 'Adding…' : 'Add Stock'}</button><button type="button" onClick={() => setModal(null)}>Cancel</button></footer>
          </form>
        </section>
      </div>}

      {(modal?.mode === 'add-item' || modal?.mode === 'edit-item') && <div className="inventory-modal-backdrop">
        <section className="inventory-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-modal-title">
          <button className="inventory-modal-close" type="button" onClick={() => setModal(null)} aria-label="Close">×</button>
          <p>{modal.mode === 'add-item' ? 'New inventory record' : 'Update inventory record'}</p>
          <h2 id="inventory-modal-title">{modal.mode === 'add-item' ? 'Add Item' : `Edit ${modal.item.item_name}`}</h2>
          {error && <div className="inventory-modal-error" role="alert">{error}</div>}
          <form onSubmit={saveItem}>
            <label><span>Item type</span><input value={itemForm.item_type} onChange={(event) => setItemForm({ ...itemForm, item_type: event.target.value })} required maxLength="60" /></label>
            <label><span>Item name</span><input value={itemForm.item_name} onChange={(event) => setItemForm({ ...itemForm, item_name: event.target.value })} required maxLength="100" /></label>
            <label><span>Variant</span><input value={itemForm.variant} onChange={(event) => setItemForm({ ...itemForm, variant: event.target.value })} required maxLength="100" /></label>
            <label><span>Stock quantity</span><input type="number" min="0" value={itemForm.stock_quantity} onChange={(event) => setItemForm({ ...itemForm, stock_quantity: event.target.value })} required /></label>
            <footer><button type="button" onClick={() => setModal(null)}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Item'}</button></footer>
          </form>
        </section>
      </div>}
    </main>
  )
}
