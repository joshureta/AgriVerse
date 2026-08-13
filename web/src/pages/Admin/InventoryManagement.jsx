import { useCallback, useEffect, useState } from 'react'
import archiveIcon from '../../assets/archive-inventory-icon.png'
import inventoryIcon from '../../assets/inventory-management-icon-green.png'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/inventory-management.css'

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

export default function InventoryManagement() {
  const [activeView, setActiveView] = useState('items')
  const [items, setItems] = useState([])
  const [options, setOptions] = useState({ categories: [], units: [], pineappleSizes: [], equipmentTypes: [] })
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [itemForm, setItemForm] = useState(emptyItemForm)
  const [categoryForm, setCategoryForm] = useState({ category_name: '', description: '' })
  const [refreshKey, setRefreshKey] = useState(0)

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
  }, [activeView, page, search, type])

  const loadOptions = useCallback(() => apiRequest('/api/admin/inventory/options')
    .then((data) => setOptions(data))
    .catch((requestError) => setError(requestError.message)), [])

  useEffect(() => { loadOptions() }, [loadOptions])

  useEffect(() => {
    const delay = window.setTimeout(loadItems, search ? 300 : 0)
    return () => window.clearTimeout(delay)
  }, [loadItems, refreshKey, search])

  function openAddItem() {
    setItemForm({
      ...emptyItemForm,
      inventory_category_id: options.categories[0]?.id || '',
      unit_id: options.units[0]?.id || '',
      size_id: options.pineappleSizes[0]?.id || '',
      equipment_type_id: options.equipmentTypes[0]?.id || '',
    })
    setModal({ mode: 'add-item' })
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
      const stockToAdd = editing && itemForm.stock_to_add !== ''
        ? Number(itemForm.stock_to_add)
        : 0
      if (!Number.isSafeInteger(stockToAdd) || stockToAdd < 0) {
        throw new Error('Stock to add must be a whole number of zero or greater.')
      }
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
        editing ? `/api/admin/inventory/${modal.item.id}` : '/api/admin/inventory',
        {
          method: editing ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
      )
      if (editing && stockToAdd > 0) {
        await apiRequest(`/api/admin/inventory/${modal.item.id}/stock`, {
          method: 'POST',
          body: JSON.stringify({ quantity: stockToAdd }),
        })
      }
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
      await apiRequest('/api/admin/inventory/categories', {
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
      await apiRequest(`/api/admin/inventory/${item.id}/archive`, { method: 'POST' })
      if (items.length === 1 && page > 1) setPage((value) => value - 1)
      else setRefreshKey((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function restoreItem(item) {
    setError('')
    try {
      await apiRequest(`/api/admin/inventory/${item.id}/restore`, { method: 'POST' })
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
              {activeView === 'items'
                ? <><button className="add-category-button" type="button" onClick={openAddCategory}><span>＋</span>Add Category</button><button className="add-item-button" type="button" onClick={openAddItem}><span>＋</span>Add Item</button></>
                : null}
            </div>
          </header>

          <nav className="inventory-view-tabs" aria-label="Inventory views">
            <button className={activeView === 'items' ? 'is-active' : ''} type="button" onClick={() => { setActiveView('items'); setPage(1); setError('') }}>Inventory Items</button>
            <button className={activeView === 'archive' ? 'is-active' : ''} type="button" onClick={() => { setActiveView('archive'); setPage(1); setError('') }}>Archived Items</button>
          </nav>

          <div className="inventory-category-tabs" role="group" aria-label="Filter inventory by category">
            <button className={!type ? 'is-active' : ''} type="button" onClick={() => { setType(''); setPage(1) }}>All</button>
            {options.categories.map((category) => (
              <button className={String(type) === String(category.id) ? 'is-active' : ''} type="button" key={category.id} onClick={() => { setType(String(category.id)); setPage(1) }}>
                {category.category_name}
              </button>
            ))}
          </div>

          <section className="inventory-panel">
            <div className="inventory-toolbar">
              <strong className="inventory-view-label">{activeView === 'items' ? 'Active item records' : 'Archived item records'}</strong>
              <label className="inventory-search">
                <span className="sr-only">Search inventory</span>
                <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search inventory items" />
                <span aria-hidden="true" />
              </label>
            </div>

            {error && <div className="inventory-error" role="alert">{error}</div>}
            <div className="inventory-table-wrap">
              <table className="inventory-table inventory-records-table">
                <thead><tr><th>ID</th><th>CATEGORY</th><th>ITEM NAME</th><th>CATEGORY DETAILS</th><th>QUANTITY</th><th>UNIT</th><th>{activeView === 'archive' ? 'ARCHIVED AT' : 'LAST UPDATED'}</th><th>ACTIONS</th></tr></thead>
                <tbody>
                  {loading ? <tr><td className="inventory-empty" colSpan="8">Loading inventory…</td></tr>
                    : items.length ? items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td><td><span className="inventory-category-badge">{item.item_type}</span></td><td><strong>{item.item_name}</strong></td><td className="inventory-details-cell">{categoryDetails(item)}</td>
                        <td><strong className="inventory-quantity">{item.stock_quantity}</strong></td><td>{item.unit_label || '—'}</td><td>{formatDate(activeView === 'archive' ? item.archived_at : item.updated_at)}</td>
                        <td><div className="inventory-actions">
                          {activeView === 'items' ? <><button className="inventory-edit" type="button" onClick={() => openEditItem(item)} aria-label={`Edit ${item.item_name}`}>✎</button>
                            <button className="inventory-archive" type="button" onClick={() => archiveItem(item)} aria-label={`Archive ${item.item_name}`}><img src={archiveIcon} alt="" /></button></>
                            : <button className="inventory-restore" type="button" onClick={() => restoreItem(item)} aria-label={`Restore ${item.item_name}`}>Restore</button>}
                        </div></td>
                      </tr>
                    )) : <tr><td className="inventory-empty" colSpan="8">{activeView === 'archive' ? 'No archived items found.' : 'No inventory items found.'}</td></tr>}
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

      {modal?.mode === 'add-category' && <div className="inventory-modal-backdrop">
        <section className="inventory-modal category-modal" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
          <button className="inventory-modal-close" type="button" onClick={() => setModal(null)} aria-label="Close">×</button>
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
          <button className="inventory-modal-close" type="button" onClick={() => setModal(null)} aria-label="Close">×</button>
          <p>{modal.mode === 'add-item' ? 'New inventory record' : 'Update inventory record'}</p>
          <h2 id="inventory-modal-title">{modal.mode === 'add-item' ? 'Add Item' : `Edit ${modal.item.item_name}`}</h2>
          {error && <div className="inventory-modal-error" role="alert">{error}</div>}
          <form onSubmit={saveItem}>
            <label><span>Item type</span><select value={itemForm.inventory_category_id} onChange={(event) => setItemForm({ ...emptyItemForm, inventory_category_id: event.target.value, unit_id: itemForm.unit_id, item_name: itemForm.item_name, stock_quantity: itemForm.stock_quantity, stock_to_add: itemForm.stock_to_add, size_id: options.pineappleSizes[0]?.id || '', equipment_type_id: options.equipmentTypes[0]?.id || '' })} required><option value="" disabled>Select item type</option>{options.categories.map((category) => <option value={category.id} key={category.id}>{category.category_name}</option>)}</select></label>
            <label><span>Item name</span><input value={itemForm.item_name} onChange={(event) => setItemForm({ ...itemForm, item_name: event.target.value })} required maxLength="100" /></label>
            <label><span>Unit</span><select value={itemForm.unit_id} onChange={(event) => setItemForm({ ...itemForm, unit_id: event.target.value })} required><option value="" disabled>Select unit</option>{options.units.map((unit) => <option value={unit.id} key={unit.id}>{unit.unit_name} ({unit.abbreviation})</option>)}</select></label>
            {modal.mode === 'add-item'
              ? <label><span>Starting stock</span><input type="number" min="0" step="1" value={itemForm.stock_quantity} onChange={(event) => setItemForm({ ...itemForm, stock_quantity: event.target.value })} required /></label>
              : <>
                <label><span>Current stock</span><input className="inventory-current-stock" type="number" value={itemForm.stock_quantity} readOnly aria-readonly="true" /></label>
                <label><span>Quantity to add</span><input type="number" min="0" step="1" value={itemForm.stock_to_add} onChange={(event) => setItemForm({ ...itemForm, stock_to_add: event.target.value })} placeholder="Enter additional stock" /></label>
              </>}
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
    </main>
  )
}
