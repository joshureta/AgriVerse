import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Check, PackageMinus, PackagePlus, X } from 'lucide-react'
import archiveIcon from '../../assets/archive-inventory-icon.png'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { SellerSidebar, SellerTopbar } from '../../components/SellerNavigation.jsx'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/inventory-management.css'
import '../../styles/seller-workspace.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const PAGE_SIZE = 5
const emptyItemForm = {
  inventory_category_id: '', unit_id: '', item_name: '', stock_quantity: '', stock_to_add: '',
  size_id: '', harvest_date: '', formulation: '', expiration_date: '', pesticide_type: '',
  equipment_type_id: '', condition: '', availability: '', last_maintenance: '',
}

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

function categoryDetails(item) {
  const details = item.details || {}
  if (item.category_code === 'pineapple') {
    return [item.variant, details.harvest_date ? `Harvested ${formatDate(details.harvest_date)}` : null].filter(Boolean).join(' · ')
  }
  if (item.category_code === 'fertilizer') {
    return [details.formulation || item.variant, details.expiration_date ? `Expires ${formatDate(details.expiration_date)}` : null].filter(Boolean).join(' · ')
  }
  if (item.category_code === 'pesticide') {
    return [details.pesticide_type || item.variant, details.expiration_date ? `Expires ${formatDate(details.expiration_date)}` : null].filter(Boolean).join(' · ')
  }
  if (item.category_code === 'equipment') {
    return [item.variant, details.condition, details.availability].filter(Boolean).join(' · ')
  }
  return item.variant === '—' ? 'General inventory item' : item.variant
}

export default function InventoryManagement({ workspace = 'admin', initialView = 'items' }) {
  const [activeView, setActiveView] = useState(initialView)
  const [items, setItems] = useState([])
  const [stockHistory, setStockHistory] = useState([])
  const [stockHistoryPage, setStockHistoryPage] = useState(1)
  const [stockHistoryPagination, setStockHistoryPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [options, setOptions] = useState({ categories: [], units: [], pineappleSizes: [], equipmentTypes: [] })
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [itemForm, setItemForm] = useState(emptyItemForm)
  const [categoryForm, setCategoryForm] = useState({ category_name: '', description: '' })
  const [refreshKey, setRefreshKey] = useState(0)
  const inventoryApi = workspace === 'seller' ? '/api/seller/inventory' : '/api/admin/inventory'
  const Sidebar = workspace === 'seller' ? SellerSidebar : AdminSidebar
  const Topbar = workspace === 'seller' ? SellerTopbar : AdminTopbar

  const selectedCategory = options.categories.find(
    (category) => String(category.id) === String(itemForm.inventory_category_id),
  )

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (search.trim()) params.set('search', search.trim())
    if (type) params.set('categoryId', type)
    if (activeView === 'archive') params.set('archived', 'true')
    if (activeView === 'stock') params.set('pineappleOnly', 'true')
    if (activeView === 'items') params.set('excludePineapple', 'true')

    try {
      const data = await apiRequest(`${inventoryApi}?${params}`)
      setItems(data.items || [])
      setPagination(data.pagination || { page, total: 0, totalPages: 1 })
    } catch (requestError) {
      setItems([])
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [activeView, inventoryApi, page, search, type])

  const loadOptions = useCallback(() => apiRequest(`${inventoryApi}/options`)
    .then((data) => setOptions(data))
    .catch((requestError) => setError(requestError.message)), [inventoryApi])

  useEffect(() => {
    if (workspace === 'admin') loadOptions()
  }, [loadOptions, workspace])

  const loadStockHistory = useCallback(async () => {
    if (activeView !== 'stock') return
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const data = await apiRequest(`${inventoryApi}/stock-history?page=${stockHistoryPage}&pageSize=10`)
      setStockHistory(data.movements || [])
      setStockHistoryPagination(data.pagination || { page: stockHistoryPage, total: 0, totalPages: 1 })
    } catch (requestError) {
      setStockHistory([])
      setHistoryError(requestError.message)
    } finally {
      setHistoryLoading(false)
    }
  }, [activeView, inventoryApi, stockHistoryPage])

  useEffect(() => {
    const delay = window.setTimeout(loadItems, search ? 300 : 0)
    return () => window.clearTimeout(delay)
  }, [loadItems, refreshKey, search])

  useEffect(() => { setStockHistoryPage(1) }, [refreshKey])

  useEffect(() => { loadStockHistory() }, [loadStockHistory, refreshKey])

  function openAddItem() {
    const firstItemCategory = options.categories.find((category) => category.code !== 'pineapple')
    setItemForm({
      ...emptyItemForm,
      inventory_category_id: firstItemCategory?.id || '',
      unit_id: options.units[0]?.id || '',
      size_id: options.pineappleSizes[0]?.id || '',
      equipment_type_id: options.equipmentTypes[0]?.id || '',
    })
    setModal({ mode: 'add-item' })
  }

  function changeView(view) {
    if (view === activeView) return
    setActiveView(view)
    setPage(1)
    setSearch('')
    setType('')
    setError('')
  }

  function openEditItem(item) {
    setItemForm({
      ...emptyItemForm,
      inventory_category_id: item.inventory_category_id,
      unit_id: item.unit_id,
      item_name: item.item_name,
      stock_quantity: item.stock_quantity,
      stock_to_add: '',
      size_id: item.details?.size_id || '',
      harvest_date: item.details?.harvest_date || '',
      formulation: item.details?.formulation || '',
      expiration_date: item.details?.expiration_date || '',
      pesticide_type: item.details?.pesticide_type || '',
      equipment_type_id: item.details?.equipment_type_id || '',
      condition: item.details?.condition || '',
      availability: item.details?.availability || '',
      last_maintenance: item.details?.last_maintenance || '',
    })
    setModal({ mode: 'edit-item', item })
  }

  function openAddStock(item) {
    setItemForm({ ...emptyItemForm, stock_quantity: item.stock_quantity, stock_to_add: '' })
    setError('')
    setModal({ mode: 'add-stock', item, direction: 'add' })
  }

  function openRemoveStock(item) {
    setItemForm({ ...emptyItemForm, stock_quantity: item.stock_quantity, stock_to_add: '' })
    setError('')
    setModal({ mode: 'add-stock', item, direction: 'remove' })
  }

  function requestStockConfirmation(event) {
    event.preventDefault()
    const quantity = Number(itemForm.stock_to_add)
    const removing = modal.direction === 'remove'
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      setError(`Quantity to ${removing ? 'remove' : 'add'} must be a whole number greater than zero.`)
      return
    }
    if (removing && quantity > modal.item.stock_quantity) {
      setError('Cannot remove more than the current stock.')
      return
    }
    setError('')
    setModal((currentModal) => ({ ...currentModal, mode: 'confirm-stock' }))
  }

  async function submitStockChange() {
    const quantity = Number(itemForm.stock_to_add)
    const removing = modal.direction === 'remove'
    setSaving(true)
    setError('')
    try {
      const endpoint = modal.item.id
        ? `${inventoryApi}/${modal.item.id}/stock${removing ? '/remove' : ''}`
        : `${inventoryApi}/pineapple-sizes/${modal.item.details.size_id}/stock`
      await apiRequest(endpoint, {
        method: 'POST', body: JSON.stringify({ quantity }),
      })
      setModal(null)
      setRefreshKey((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  function openAddCategory() {
    setError('')
    setCategoryForm({ category_name: '', description: '' })
    setModal({ mode: 'add-category' })
  }

  async function saveItem(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const editing = modal.mode === 'edit-item'
      const payload = {
        ...itemForm,
        inventory_category_id: Number(itemForm.inventory_category_id),
        unit_id: Number(itemForm.unit_id),
        size_id: itemForm.size_id ? Number(itemForm.size_id) : null,
        equipment_type_id: itemForm.equipment_type_id ? Number(itemForm.equipment_type_id) : null,
      }
      delete payload.stock_to_add
      if (editing) delete payload.stock_quantity
      else payload.stock_quantity = Number(itemForm.stock_quantity)
      await apiRequest(
        editing ? `${inventoryApi}/${modal.item.id}` : inventoryApi,
        {
          method: editing ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
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

  async function addCategory(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await apiRequest(`${inventoryApi}/categories`, {
        method: 'POST',
        body: JSON.stringify(categoryForm),
      })
      setModal(null)
      await loadOptions()
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
      await apiRequest(`${inventoryApi}/${item.id}/archive`, { method: 'POST' })
      if (items.length === 1 && page > 1) setPage((value) => value - 1)
      else setRefreshKey((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function restoreItem(item) {
    setError('')
    try {
      await apiRequest(`${inventoryApi}/${item.id}/restore`, { method: 'POST' })
      if (items.length === 1 && page > 1) setPage((value) => value - 1)
      else setRefreshKey((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <main className={`admin-dashboard inventory-page${workspace === 'seller' ? ' seller-inventory-page' : ''}`}>
      <Sidebar active="inventory" />
      <section className="admin-workspace">
        <Topbar />
        <div className="inventory-content">
          <header className="inventory-heading">
            <div className="inventory-title">
              <h1>Inventory Management</h1>
              <p className="inventory-title-copy">
                Track farm supplies, harvested stock levels, and storage distribution across sectors
              </p>
            </div>
          </header>

          <section className="inventory-browser">
            {workspace === 'seller' ? <header className="seller-stock-banner">
              <div className="seller-stock-banner-title">
                <div><h2>Pineapple Stock</h2><p>Monitor available pineapple sizes and record new stock arrivals.</p></div>
              </div>
              <span className="seller-stock-live"><i aria-hidden="true" />Live stock tracking</span>
            </header> : <nav className="inventory-view-tabs" aria-label="Inventory views" role="tablist">
              <button className={activeView === 'items' ? 'is-active' : ''} type="button" role="tab" aria-selected={activeView === 'items'} onClick={() => changeView('items')}>
                <span>Inventory Items</span>
              </button>
              <button className={activeView === 'stock' ? 'is-active' : ''} type="button" role="tab" aria-selected={activeView === 'stock'} onClick={() => changeView('stock')}>
                <span>Pineapple Stock</span>
              </button>
              <button className={activeView === 'archive' ? 'is-active' : ''} type="button" role="tab" aria-selected={activeView === 'archive'} onClick={() => changeView('archive')}>
                <span>Archived Items</span>
              </button>
            </nav>}

            {activeView !== 'stock' && <div className="inventory-category-tabs" role="group" aria-label="Filter inventory by category">
              <button className={!type ? 'is-active' : ''} type="button" onClick={() => { setType(''); setPage(1) }}>All</button>
              {options.categories.filter((category) => activeView === 'archive' || category.code !== 'pineapple').map((category) => (
                <button className={String(type) === String(category.id) ? 'is-active' : ''} type="button" key={category.id} onClick={() => { setType(String(category.id)); setPage(1) }}>
                  {category.category_name}
                </button>
              ))}
            </div>}

            <div className={`inventory-panel${activeView === 'stock' ? ' pineapple-stock-panel' : ''}`}>
            {activeView !== 'stock' && <div className={`inventory-toolbar${activeView === 'items' ? ' has-actions' : ''}`}>
              {activeView !== 'stock' && <label className="inventory-search">
                <span className="sr-only">Search inventory</span>
                <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder={activeView === 'stock' ? 'Search pineapple stock' : 'Search inventory items'} />
                <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4 4" />
                </svg>
              </label>}
              {activeView === 'items' && <div className="inventory-toolbar-actions">
                <button className="add-category-button" type="button" onClick={openAddCategory}><span>＋</span>Add Category</button>
                <button className="add-item-button" type="button" onClick={openAddItem}><span>＋</span>Add Item</button>
              </div>}
            </div>}

            {error && <div className="inventory-error" role="alert">{error}</div>}
            <div className="inventory-table-wrap">
              {activeView === 'stock' ? <table className="inventory-table pineapple-stock-table">
                <thead><tr><th>ID</th><th>PINEAPPLE SIZE</th><th>AVAILABLE STOCK</th><th>UNIT</th><th>STOCK STATUS</th><th>LAST UPDATED</th><th>ACTIONS</th></tr></thead>
                <tbody>
                  {loading ? <tr><td className="inventory-empty" colSpan="7">Loading pineapple stock…</td></tr>
                    : items.length ? items.map((item) => {
                      const status = item.stock_quantity <= 0 ? 'out' : item.stock_quantity <= 10 ? 'low' : 'in'
                      const label = status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock'
                      return <tr key={item.id ?? `size-${item.details?.size_id}`}><td>{item.id ?? '—'}</td><td><strong>{item.variant}</strong></td><td><strong className="inventory-quantity">{item.stock_quantity}</strong></td><td>{item.unit_label || 'pcs'}</td><td><span className={`stock-status stock-${status}`}>{label}</span></td><td>{formatDate(item.updated_at)}</td><td><div className="inventory-actions"><button className="inventory-add-stock" type="button" onClick={() => openAddStock(item)}><span aria-hidden="true">+</span>Add Stock</button></div></td></tr>
                    }) : <tr><td className="inventory-empty" colSpan="7">No pineapple stock records found.</td></tr>}
                </tbody>
              </table> : <table className="inventory-table inventory-records-table">
                <thead><tr><th>ID</th><th>CATEGORY</th><th>ITEM NAME</th><th>CATEGORY DETAILS</th><th>QUANTITY</th><th>UNIT</th><th>{activeView === 'archive' ? 'ARCHIVED AT' : 'LAST UPDATED'}</th><th>ACTIONS</th></tr></thead>
                <tbody>
                  {loading ? <tr><td className="inventory-empty" colSpan="8">Loading inventory…</td></tr>
                    : items.length ? items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td><td><span className="inventory-category-badge">{item.item_type}</span></td><td><strong>{item.item_name}</strong></td><td className="inventory-details-cell">{categoryDetails(item)}</td>
                        <td><strong className="inventory-quantity">{item.stock_quantity}</strong></td><td>{item.unit_label || '—'}</td><td>{formatDate(activeView === 'archive' ? item.archived_at : item.updated_at)}</td>
                        <td><div className="inventory-actions">
                          {activeView === 'items' ? <>
                            <button className="inventory-edit" type="button" onClick={() => openEditItem(item)} aria-label={`Edit ${item.item_name}`}>✎</button>
                            <button className="inventory-add-stock-icon" type="button" onClick={() => openAddStock(item)} aria-label={`Add stock to ${item.item_name}`}><PackagePlus size={14} aria-hidden="true" /></button>
                            <button className="inventory-remove-stock" type="button" onClick={() => openRemoveStock(item)} aria-label={`Remove stock from ${item.item_name}`} disabled={item.stock_quantity <= 0}><PackageMinus size={14} aria-hidden="true" /></button>
                            <button className="inventory-archive" type="button" onClick={() => archiveItem(item)} aria-label={`Archive ${item.item_name}`}><img src={archiveIcon} alt="" /></button>
                          </>
                            : <button className="inventory-restore" type="button" onClick={() => restoreItem(item)} aria-label={`Restore ${item.item_name}`}>Restore</button>}
                        </div></td>
                      </tr>
                    )) : <tr><td className="inventory-empty" colSpan="8">{activeView === 'archive' ? 'No archived items found.' : 'No inventory items found.'}</td></tr>}
                </tbody>
              </table>}
            </div>
            {activeView !== 'stock' && <footer className="inventory-pagination">
              <span>{pagination.total} total item{pagination.total === 1 ? '' : 's'}</span>
              <div>
                <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>← Previous</button>
                <strong>{page}</strong>
                <button type="button" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next →</button>
              </div>
            </footer>}
            {activeView === 'stock' && <section className="stock-history-section">
              <header><div><h2>Stock Movement History</h2><p>Recent pineapple stock additions and deductions</p></div></header>
              {historyError && <div className="stock-history-error" role="alert">{historyError}</div>}
              <div className="inventory-table-wrap">
                <table className="stock-history-table">
                  <thead><tr><th>DATE &amp; TIME</th><th>PINEAPPLE SIZE</th><th>MOVEMENT</th><th>QUANTITY</th><th>BEFORE</th><th>AFTER</th></tr></thead>
                  <tbody>
                    {historyLoading ? <tr><td colSpan="6">Loading stock history…</td></tr>
                      : stockHistory.length ? stockHistory.map((movement) => <tr key={movement.id}>
                        <td>{new Date(movement.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                        <td><strong>{movement.pineapple_size}</strong></td>
                        <td><span className={`movement-badge movement-${movement.movement_type === 'stock_in' ? 'in' : 'out'}`}>{movement.movement_type === 'stock_in' ? 'Stock In' : 'Stock Out'}</span></td>
                        <td><strong className={movement.movement_type === 'stock_in' ? 'movement-positive' : 'movement-negative'}>{movement.movement_type === 'stock_in' ? '+' : '−'}{movement.quantity} {movement.unit}</strong></td>
                        <td>{movement.quantity_before}</td><td>{movement.quantity_after}</td>
                      </tr>) : <tr><td colSpan="6">No stock movements recorded yet.</td></tr>}
                  </tbody>
                </table>
              </div>
              <footer className="inventory-pagination">
                <span>{stockHistoryPagination.total} movement{stockHistoryPagination.total === 1 ? '' : 's'}</span>
                <div>
                  <button type="button" disabled={stockHistoryPage <= 1 || historyLoading} onClick={() => setStockHistoryPage((value) => value - 1)}>← Previous</button>
                  <strong>{stockHistoryPage}</strong>
                  <button type="button" disabled={stockHistoryPage >= stockHistoryPagination.totalPages || historyLoading} onClick={() => setStockHistoryPage((value) => value + 1)}>Next →</button>
                </div>
              </footer>
            </section>}
            </div>
          </section>

        </div>
      </section>

      {modal?.mode === 'add-category' && <div className="inventory-modal-backdrop">
        <section className="inventory-modal category-modal" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
          <button className="inventory-modal-close" type="button" onClick={() => setModal(null)} aria-label="Close"><X size={18} aria-hidden="true" /></button>
          <p>Inventory setup</p><h2 id="category-modal-title">Add Category</h2>
          {error && <div className="inventory-modal-error" role="alert">{error}</div>}
          <form onSubmit={addCategory}>
            <label><span>Category name</span><input value={categoryForm.category_name} onChange={(event) => setCategoryForm({ ...categoryForm, category_name: event.target.value })} maxLength="80" placeholder="Example: Seeds" required /></label>
            <label><span>Description (optional)</span><input value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} maxLength="300" placeholder="What items belong in this category?" /></label>
            <footer><button type="button" onClick={() => setModal(null)}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add Category'}</button></footer>
          </form>
        </section>
      </div>}

      {(modal?.mode === 'add-item' || modal?.mode === 'edit-item') && <div className="inventory-modal-backdrop">
        <section className="inventory-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-modal-title">
          <button className="inventory-modal-close" type="button" onClick={() => setModal(null)} aria-label="Close"><X size={18} aria-hidden="true" /></button>
          <p>{modal.mode === 'add-item' ? 'New inventory record' : 'Update inventory record'}</p>
          <h2 id="inventory-modal-title">{modal.mode === 'add-item' ? 'Add Item' : `Edit ${modal.item.item_name}`}</h2>
          {error && <div className="inventory-modal-error" role="alert">{error}</div>}
          <form onSubmit={saveItem}>
            <label><span>Item type</span><select value={itemForm.inventory_category_id} onChange={(event) => setItemForm({ ...emptyItemForm, inventory_category_id: event.target.value, unit_id: itemForm.unit_id, item_name: itemForm.item_name, stock_quantity: itemForm.stock_quantity, stock_to_add: itemForm.stock_to_add, size_id: options.pineappleSizes[0]?.id || '', equipment_type_id: options.equipmentTypes[0]?.id || '' })} required><option value="" disabled>Select item type</option>{options.categories.filter((category) => category.code !== 'pineapple').map((category) => <option value={category.id} key={category.id}>{category.category_name}</option>)}</select></label>
            <label><span>Item name</span><input value={itemForm.item_name} onChange={(event) => setItemForm({ ...itemForm, item_name: event.target.value })} required maxLength="100" /></label>
            <label><span>Unit</span><select value={itemForm.unit_id} onChange={(event) => setItemForm({ ...itemForm, unit_id: event.target.value })} required><option value="" disabled>Select unit</option>{options.units.map((unit) => <option value={unit.id} key={unit.id}>{unit.unit_name} ({unit.abbreviation})</option>)}</select></label>
            {modal.mode === 'add-item'
              ? <label><span>Starting stock</span><input type="number" min="0" step="1" value={itemForm.stock_quantity} onChange={(event) => setItemForm({ ...itemForm, stock_quantity: event.target.value })} required /></label>
              : <label><span>Current stock</span><input className="inventory-current-stock" type="number" value={itemForm.stock_quantity} readOnly aria-readonly="true" /></label>}
            {selectedCategory?.code === 'pineapple' && <>
              <label><span>Size</span><select value={itemForm.size_id} onChange={(event) => setItemForm({ ...itemForm, size_id: event.target.value })} required><option value="" disabled>Select size</option>{options.pineappleSizes.map((size) => <option value={size.id} key={size.id}>{size.size_name}</option>)}</select></label>
              <label><span>Harvest date</span><input type="date" value={itemForm.harvest_date} onChange={(event) => setItemForm({ ...itemForm, harvest_date: event.target.value })} /></label>
            </>}
            {selectedCategory?.code === 'fertilizer' && <>
              <label><span>Formulation</span><input value={itemForm.formulation} onChange={(event) => setItemForm({ ...itemForm, formulation: event.target.value })} required maxLength="120" /></label>
              <label><span>Expiration date</span><input type="date" value={itemForm.expiration_date} onChange={(event) => setItemForm({ ...itemForm, expiration_date: event.target.value })} /></label>
            </>}
            {selectedCategory?.code === 'pesticide' && <>
              <label><span>Pesticide type</span><input value={itemForm.pesticide_type} onChange={(event) => setItemForm({ ...itemForm, pesticide_type: event.target.value })} required maxLength="120" /></label>
              <label><span>Expiration date</span><input type="date" value={itemForm.expiration_date} onChange={(event) => setItemForm({ ...itemForm, expiration_date: event.target.value })} /></label>
            </>}
            {selectedCategory?.code === 'equipment' && <>
              <label><span>Equipment type</span><select value={itemForm.equipment_type_id} onChange={(event) => setItemForm({ ...itemForm, equipment_type_id: event.target.value })} required><option value="" disabled>Select equipment type</option>{options.equipmentTypes.map((equipmentType) => <option value={equipmentType.id} key={equipmentType.id}>{equipmentType.type_name}</option>)}</select></label>
              <label><span>Condition</span><input value={itemForm.condition} onChange={(event) => setItemForm({ ...itemForm, condition: event.target.value })} required maxLength="80" /></label>
              <label><span>Availability</span><input value={itemForm.availability} onChange={(event) => setItemForm({ ...itemForm, availability: event.target.value })} required maxLength="80" /></label>
              <label><span>Last maintenance</span><input type="date" value={itemForm.last_maintenance} onChange={(event) => setItemForm({ ...itemForm, last_maintenance: event.target.value })} /></label>
            </>}
            <footer><button type="button" onClick={() => setModal(null)}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Item'}</button></footer>
          </form>
        </section>
      </div>}

      {modal?.mode === 'add-stock' && <div className="inventory-modal-backdrop">
        <section className="inventory-modal stock-modal" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title">
          <button className="inventory-modal-close" type="button" onClick={() => setModal(null)} aria-label="Close"><X size={18} aria-hidden="true" /></button>
          <div className="stock-modal-heading">
            <span className={`stock-modal-icon${modal.direction === 'remove' ? ' stock-modal-icon-remove' : ''}`} aria-hidden="true">{modal.direction === 'remove' ? <PackageMinus size={21} /> : <PackagePlus size={21} />}</span>
            <div><p>{modal.item.category_code === 'pineapple' ? 'Pineapple inventory' : `${modal.item.item_type} inventory`}</p><h2 id="stock-modal-title">{modal.direction === 'remove' ? 'Remove Stock' : 'Add Stock'}</h2></div>
          </div>
          {error && <div className="inventory-modal-error" role="alert">{error}</div>}
          <form onSubmit={requestStockConfirmation}>
            <div className="stock-modal-summary">
              <div><small>{modal.item.category_code === 'pineapple' ? 'Selected size' : 'Item'}</small><span>{modal.item.category_code === 'pineapple' ? modal.item.variant : modal.item.item_name}</span></div>
              <div><small>Available now</small><strong>{modal.item.stock_quantity} <em>{modal.item.unit_label || 'pcs'}</em></strong></div>
            </div>
            <label className="stock-quantity-field">
              <span>{modal.direction === 'remove' ? 'Quantity to remove' : 'Quantity to add'}</span>
              <div className="stock-input-wrap"><input type="number" min="1" max={modal.direction === 'remove' ? modal.item.stock_quantity : undefined} step="1" value={itemForm.stock_to_add} onChange={(event) => setItemForm({ ...itemForm, stock_to_add: event.target.value })} placeholder="0" aria-describedby="stock-quantity-help" required autoFocus /><span>{modal.item.unit_label || 'pcs'}</span></div>
              <small id="stock-quantity-help">Enter a whole number greater than zero{modal.direction === 'remove' ? `, up to ${modal.item.stock_quantity}` : ''}.</small>
            </label>
            {Number(itemForm.stock_to_add) > 0 && <div className="stock-after-preview"><span>Current <strong>{modal.item.stock_quantity}</strong></span><ArrowRight size={16} aria-hidden="true" /><span>New total <strong>{modal.direction === 'remove' ? Number(modal.item.stock_quantity) - Number(itemForm.stock_to_add) : Number(modal.item.stock_quantity) + Number(itemForm.stock_to_add)} {modal.item.unit_label || 'pcs'}</strong></span></div>}
            <footer className="stock-modal-actions"><button type="submit">Confirm</button></footer>
          </form>
        </section>
      </div>}

      {modal?.mode === 'confirm-stock' && <div className="inventory-modal-backdrop stock-confirmation-backdrop">
        <section className="inventory-modal stock-confirmation-modal" role="alertdialog" aria-modal="true" aria-labelledby="stock-confirmation-title" aria-describedby="stock-confirmation-description">
          <button className="inventory-modal-close" type="button" onClick={() => setModal((currentModal) => ({ ...currentModal, mode: 'add-stock' }))} aria-label="Go back"><X size={18} aria-hidden="true" /></button>
          <span className="stock-confirmation-icon" aria-hidden="true"><Check size={24} /></span>
          <p>Confirm stock update</p>
          <h2 id="stock-confirmation-title">{modal.direction === 'remove' ? 'Remove' : 'Add'} {itemForm.stock_to_add} {modal.item.unit_label || 'pcs'}?</h2>
          <p id="stock-confirmation-description" className="stock-confirmation-copy">Please review the change before updating the inventory for <strong>{modal.item.category_code === 'pineapple' ? modal.item.variant : modal.item.item_name}</strong>.</p>
          <div className="stock-confirmation-totals">
            <div><span>Current stock</span><strong>{modal.item.stock_quantity} {modal.item.unit_label || 'pcs'}</strong></div>
            <ArrowRight size={18} aria-hidden="true" />
            <div><span>New total</span><strong>{modal.direction === 'remove' ? Number(modal.item.stock_quantity) - Number(itemForm.stock_to_add) : Number(modal.item.stock_quantity) + Number(itemForm.stock_to_add)} {modal.item.unit_label || 'pcs'}</strong></div>
          </div>
          {error && <div className="inventory-modal-error" role="alert">{error}</div>}
          <footer>
            <button type="button" onClick={() => setModal((currentModal) => ({ ...currentModal, mode: 'add-stock' }))} disabled={saving}>Go back</button>
            <button type="button" className="stock-confirm-submit" onClick={submitStockChange} disabled={saving}>{saving ? (modal.direction === 'remove' ? 'Removing stock…' : 'Adding stock…') : (modal.direction === 'remove' ? 'Yes, remove stock' : 'Yes, add stock')}</button>
          </footer>
        </section>
      </div>}
    </main>
  )
}
