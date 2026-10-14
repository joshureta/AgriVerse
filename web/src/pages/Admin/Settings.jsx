import { useEffect, useMemo, useState } from 'react'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/settings.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const tabs = [
  { id: 'fields', label: 'Fields & Locations', plural: 'locations' },
  { id: 'categories', label: 'Task Categories', plural: 'categories' },
  { id: 'fleet', label: 'Fleet', plural: 'vehicles' },
  { id: 'archive', label: 'Archived Items', plural: 'archived items' },
]
const vehicleStatuses = { available: 'Available', in_use: 'In Use', maintenance: 'Maintenance', inactive: 'Inactive' }

async function accessToken(refresh = false) {
  const result = refresh ? await supabase.auth.refreshSession() : await supabase.auth.getSession()
  if (result.error) throw new Error(result.error.message)
  const token = result.data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')
  return token
}

async function apiRequest(path, options = {}, retry = true) {
  const token = await accessToken()
  const response = await fetch(API_URL + path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers } })
  if (response.status === 401 && retry) { await accessToken(true); return apiRequest(path, options, false) }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`)
  return body
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('fields')
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState({ fields: [], categories: [], fleet: [], archive: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [openMenu, setOpenMenu] = useState(null)

  async function loadTab(tab = activeTab) {
    setLoading(true); setError('')
    try {
      if (tab === 'fleet') {
        const data = await apiRequest('/api/admin/deliveries/vehicles')
        setRecords((current) => ({ ...current, fleet: data.vehicles || [] }))
      } else if (tab === 'archive') {
        const [categories, fields] = await Promise.all([apiRequest('/api/admin/lookups/task-categories?includeInactive=true'), apiRequest('/api/admin/lookups/fields?includeInactive=true')])
        setRecords((current) => ({ ...current, archive: [
          ...(fields.values || []).filter((item) => !item.status).map((item) => ({ ...item, type: 'Field / Location', name: item.field_name })),
          ...(categories.values || []).filter((item) => !item.status).map((item) => ({ ...item, type: 'Task Category', name: item.category_name })),
        ] }))
      } else {
        const endpoint = tab === 'categories' ? 'task-categories' : 'fields'
        const data = await apiRequest(`/api/admin/lookups/${endpoint}`)
        setRecords((current) => ({ ...current, [tab]: data.values || [] }))
      }
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }

  useEffect(() => { loadTab(activeTab) }, [activeTab])

  const tabConfig = tabs.find((tab) => tab.id === activeTab)
  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase()
    return records[activeTab].filter((item) => JSON.stringify(item).toLowerCase().includes(query))
  }, [activeTab, records, search])

  function beginAdd() { setModal({ mode: activeTab === 'fleet' ? 'vehicle' : 'lookup', item: null }) }
  function beginEdit(item) { setModal({ mode: activeTab === 'fleet' ? 'vehicle' : 'lookup', item }) }

  async function save(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      if (modal.mode === 'vehicle') {
        const id = modal.item?.id ? `/${modal.item.id}` : ''
        await apiRequest(`/api/admin/deliveries/vehicles${id}`, { method: modal.item ? 'PATCH' : 'POST', body: JSON.stringify({ vehicle_name: form.get('name'), plate_number: form.get('plate'), status: form.get('status') }) })
      } else {
        const resource = activeTab === 'categories' ? 'task-categories' : 'fields'
        const nameKey = activeTab === 'categories' ? 'category_name' : 'field_name'
        const id = modal.item?.id ? `/${modal.item.id}` : ''
        await apiRequest(`/api/admin/lookups/${resource}${id}`, { method: modal.item ? 'PATCH' : 'POST', body: JSON.stringify({ [nameKey]: form.get('name'), description: form.get('description') || '' }) })
      }
      setModal(null); setOpenMenu(null); loadTab()
    } catch (requestError) { setError(requestError.message) }
  }

  async function archive(item) {
    const resource = activeTab === 'categories' ? 'task-categories' : 'fields'
    const name = activeTab === 'categories' ? item.category_name : item.field_name
    if (!window.confirm(`Archive ${name}?`)) return
    await apiRequest(`/api/admin/lookups/${resource}/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status: false }) }); loadTab()
  }

  async function restore(item) {
    const resource = item.type === 'Task Category' ? 'task-categories' : 'fields'
    await apiRequest(`/api/admin/lookups/${resource}/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status: true }) }); loadTab()
  }

  return (
    <main className="admin-dashboard settings-page">
      <AdminSidebar active="settings" />
      <section className="admin-workspace">
        <AdminTopbar />
        <div className="settings-content">
          <header className="settings-header">
            <h1>Settings</h1>
            <nav className="settings-tabs" aria-label="Settings sections">
              {tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? 'is-active' : ''} type="button" onClick={() => { setActiveTab(tab.id); setSearch('') }}>{tab.label}</button>)}
            </nav>
          </header>
          <section className="settings-table-card">
            <div className="settings-toolbar">
              <label className="settings-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${tabConfig.plural}`} /></label>
              {activeTab !== 'archive' && <button className="settings-add-button" type="button" onClick={beginAdd}>＋ Add new {activeTab === 'fleet' ? 'vehicle' : activeTab === 'categories' ? 'category' : 'location'}</button>}
            </div>
            {error && <p className="settings-error" role="alert">{error}</p>}
            <div className="settings-table-scroll">
              <table className="settings-table">
                <thead><tr><th>Permission</th><th>{activeTab === 'fleet' ? 'Vehicle details' : 'Catalog permissions'}</th><th>{activeTab === 'categories' ? 'Description' : 'Status'}</th><th>Company settings permissions</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan="5" className="settings-empty">Loading…</td></tr> : visibleRecords.length === 0 ? <tr><td colSpan="5" className="settings-empty">No {tabConfig.plural} found.</td></tr> : visibleRecords.map((item) => {
                    const name = activeTab === 'fleet' ? item.vehicle_name : activeTab === 'categories' ? item.category_name : activeTab === 'archive' ? item.name : item.field_name
                    const description = activeTab === 'fleet' ? item.plate_number : activeTab === 'categories' ? item.description || 'No description added' : activeTab === 'archive' ? item.type : 'Manage records and assignments'
                    const status = activeTab === 'fleet' ? vehicleStatuses[item.status] || item.status : activeTab === 'archive' ? 'Archived' : 'Active'
                    return <tr key={`${activeTab}-${item.id}`}><td><strong>{name}</strong></td><td><span className="settings-check">☑</span> {description}</td><td>{status}</td><td><span className="settings-check">☑</span> {activeTab === 'archive' ? 'Restore item' : 'Manage settings'}</td><td><button className="settings-more" type="button" aria-label={`Actions for ${name}`} onClick={() => activeTab === 'archive' ? restore(item) : beginEdit(item)}>⋮</button>{activeTab !== 'archive' && activeTab !== 'fleet' && <button className="settings-archive-link" type="button" onClick={() => archive(item)}>Archive</button>}</td></tr>
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
      {modal && <div className="settings-modal-backdrop"><form className="settings-modal" onSubmit={save}><h2>{modal.item ? 'Edit' : 'Add'} {modal.mode === 'vehicle' ? 'vehicle' : activeTab === 'categories' ? 'task category' : 'field / location'}</h2><label>Name<input name="name" defaultValue={modal.item ? (modal.mode === 'vehicle' ? modal.item.vehicle_name : activeTab === 'categories' ? modal.item.category_name : modal.item.field_name) : ''} required /></label>{modal.mode === 'vehicle' ? <><label>Plate number<input name="plate" defaultValue={modal.item?.plate_number || ''} required /></label><label>Status<select name="status" defaultValue={modal.item?.status || 'available'}>{Object.entries(vehicleStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></> : activeTab === 'categories' && <label>Description<textarea name="description" defaultValue={modal.item?.description || ''} /></label>}<div className="settings-modal-actions"><button type="button" onClick={() => setModal(null)}>Cancel</button><button className="settings-add-button" type="submit">Save</button></div></form></div>}
    </main>
  )
}
