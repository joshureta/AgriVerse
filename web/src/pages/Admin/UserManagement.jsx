import { useCallback, useEffect, useRef, useState } from 'react'
import deleteIcon from '../../assets/delete-icon.png'
import userManagementIcon from '../../assets/user-management-icon.png'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { workerCategories } from '../../constants/user-options.js'
import { useAuth } from '../../hooks/useAuth.js'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/user-management.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const PAGE_SIZE = 10
const roleOptions = [
  { value: '', label: 'All roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'farm_worker', label: 'Farm Worker' },
]

function formatCreatedAt(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date(value))
}

function roleLabel(role) {
  return {
    admin: 'Admin',
    buyer: 'Buyer',
    farm_worker: 'Farm Worker',
  }[role] || role
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

export default function UserManagement() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const filterRef = useRef(null)

  const loadUsers = useCallback(async () => {
    if (!currentUser?.id) return
    setLoading(true)
    setError('')

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (search.trim()) params.set('search', search.trim())
    if (roleFilter) params.set('role', roleFilter)

    try {
      const data = await apiRequest(`/api/admin/users?${params}`)
      setUsers(data.users || [])
      setPagination(data.pagination || { page, total: 0, totalPages: 1 })
    } catch (requestError) {
      setUsers([])
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id, page, roleFilter, search])

  useEffect(() => {
    const delay = window.setTimeout(loadUsers, search ? 300 : 0)
    return () => window.clearTimeout(delay)
  }, [loadUsers, refreshKey, search])

  useEffect(() => {
    if (!filterOpen) return undefined

    function closeFilter(event) {
      if (event.key === 'Escape' || !filterRef.current?.contains(event.target)) {
        setFilterOpen(false)
      }
    }

    document.addEventListener('mousedown', closeFilter)
    document.addEventListener('keydown', closeFilter)
    return () => {
      document.removeEventListener('mousedown', closeFilter)
      document.removeEventListener('keydown', closeFilter)
    }
  }, [filterOpen])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const payload = {
      full_name: String(form.get('full_name') || '').trim(),
      role: form.get('role'),
    }

    if (modal.mode === 'add') {
      payload.email = String(form.get('email') || '').trim()
      payload.password = String(form.get('password') || '')
      if (payload.role === 'farm_worker') {
        payload.worker_category = form.get('worker_category')
      }
    }

    try {
      await apiRequest(
        modal.mode === 'add' ? '/api/admin/users' : `/api/admin/users/${modal.user.id}`,
        {
          method: modal.mode === 'add' ? 'POST' : 'PATCH',
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

  async function handleDelete(user) {
    const buyerNotice = user.role === 'buyer'
      ? ' Their saved addresses and personal information will be removed, while anonymized order history will be retained.'
      : ''
    if (!window.confirm(`Delete ${user.full_name}? This also removes their sign-in account.${buyerNotice}`)) return
    setError('')
    try {
      await apiRequest(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      if (users.length === 1 && page > 1) setPage((value) => value - 1)
      else setRefreshKey((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const modalRole = modal?.role ?? modal?.user?.role ?? 'buyer'

  return (
    <main className="admin-dashboard user-management-page">
      <AdminSidebar active="users" />

      <section className="admin-workspace">
        <AdminTopbar />

        <div className="user-management-content">
          <header className="user-page-heading">
            <div>
              <img className="user-heading-icon" src={userManagementIcon} alt="" />
              <h1>User Management</h1>
            </div>
          </header>

          <section className="users-panel">
            <div className="users-toolbar">
              <div className="role-filter" ref={filterRef}>
                <button
                  className="role-filter-trigger"
                  type="button"
                  onClick={() => setFilterOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={filterOpen}
                >
                  <span>{roleOptions.find((option) => option.value === roleFilter)?.label}</span>
                  <i aria-hidden="true" />
                </button>
                {filterOpen && (
                  <div className="role-filter-menu" role="listbox" aria-label="Filter users by role">
                    {roleOptions.map((option) => (
                      <button
                        className={roleFilter === option.value ? 'is-selected' : ''}
                        type="button"
                        role="option"
                        aria-selected={roleFilter === option.value}
                        key={option.value || 'all'}
                        onClick={() => {
                          setRoleFilter(option.value)
                          setPage(1)
                          setFilterOpen(false)
                        }}
                      >
                        <span>{option.label}</span>
                        {roleFilter === option.value && <i aria-hidden="true">&#10003;</i>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <label className="user-search">
                <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search full name" />
                <span aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="m16 16 4 4" />
                  </svg>
                </span>
              </label>
              <button className="toolbar-add-user" type="button" onClick={() => setModal({ mode: 'add', role: 'buyer' })}>
                <span aria-hidden="true">&#43;</span>
                Add User
              </button>
            </div>

            {error && <div className="users-error" role="alert">{error}</div>}
            <div className="users-table-wrap">
              <table className="users-table">
                <thead><tr><th>FULL NAME</th><th>EMAIL</th><th>ROLE</th><th>CREATED AT</th><th>ACTIONS</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td className="users-state" colSpan="5">Loading users…</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td className="users-state" colSpan="5">No users found.</td></tr>
                  ) : users.map((user) => (
                    <tr key={user.id}>
                      <td><strong>{user.full_name}</strong></td>
                      <td className="user-email">{user.email || 'No email available'}</td>
                      <td><span className={`role-pill role-${user.role}`}>{roleLabel(user.role)}</span></td>
                      <td>{formatCreatedAt(user.created_at)}</td>
                      <td><div className="user-actions">
                        <button type="button" className="edit-user" onClick={() => window.location.assign(`/admin/users/edit?id=${encodeURIComponent(user.id)}`)} aria-label={`Edit ${user.full_name}`}>✎</button>
                        <button type="button" className="delete-user" onClick={() => handleDelete(user)} disabled={user.id === currentUser?.id} aria-label={`Delete ${user.full_name}`}><img src={deleteIcon} alt="" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="users-footer">
              <span>{pagination.total} total user{pagination.total === 1 ? '' : 's'}</span>
              <div>
                <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>← Previous</button>
                <strong>{page}</strong>
                <button type="button" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next →</button>
              </div>
            </footer>
          </section>
        </div>
      </section>

      {modal && (
        <div className="user-modal-backdrop" role="presentation">
          <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
            <button className="user-modal-close" type="button" onClick={() => setModal(null)} aria-label="Close">×</button>
            <p>{modal.mode === 'add' ? 'Create account' : 'Update profile'}</p>
            <h2 id="user-modal-title">{modal.mode === 'add' ? 'Add a new user' : 'Edit user'}</h2>
            <span>The table displays only the four requested profile fields.</span>
            <form onSubmit={handleSubmit}>
              <label><span>Full name</span><input name="full_name" defaultValue={modal.user?.full_name || ''} required minLength="2" maxLength="100" /></label>
              {modal.mode === 'add' && <>
                <label><span>Email address</span><input name="email" type="email" required placeholder="user@example.com" /></label>
                <label><span>Temporary password</span><input name="password" type="password" required minLength="8" placeholder="At least 8 characters" /></label>
              </>}
              <label>
                <span>Role</span>
                <select
                  name="role"
                  value={modalRole}
                  onChange={(event) => setModal((current) => ({ ...current, role: event.target.value }))}
                >
                  <option value="buyer">Buyer</option>
                  <option value="farm_worker">Farm Worker</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              {modalRole === 'farm_worker' && (
                <label>
                  <span>Worker Category</span>
                  <select name="worker_category" defaultValue="" required>
                    <option value="" disabled>Select worker category</option>
                    {workerCategories.map((option) => (
                      <option value={option.value} key={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              )}
              <footer><button type="button" onClick={() => setModal(null)}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save user'}</button></footer>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
