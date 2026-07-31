import { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import '../../styles/admin-dashboard.css'
import '../../styles/user-management.css'

const initialUsers = [
  {
    id: 1,
    name: 'James Dela Cruz',
    email: 'james@example.com',
    role: 'Farm Worker',
    status: 'Active',
    location: 'Tagaytay City',
    joined: 'Jul 24, 2026',
  },
  {
    id: 2,
    name: 'Maria Santos',
    email: 'maria@example.com',
    role: 'Buyer',
    status: 'Active',
    location: 'Silang, Cavite',
    joined: 'Jul 22, 2026',
  },
  {
    id: 3,
    name: 'Juan Reyes',
    email: 'juan@example.com',
    role: 'Driver',
    status: 'Active',
    location: 'Amadeo, Cavite',
    joined: 'Jul 18, 2026',
  },
  {
    id: 4,
    name: 'Yuri Mendoza',
    email: 'yuri@example.com',
    role: 'Farm Worker',
    status: 'Inactive',
    location: 'Tagaytay City',
    joined: 'Jul 12, 2026',
  },
  {
    id: 5,
    name: 'Ana Villanueva',
    email: 'ana@example.com',
    role: 'Seller',
    status: 'Active',
    location: 'Alfonso, Cavite',
    joined: 'Jul 8, 2026',
  },
  {
    id: 6,
    name: 'Carlo Garcia',
    email: 'carlo@example.com',
    role: 'Buyer',
    status: 'Pending',
    location: 'Mendez, Cavite',
    joined: 'Jul 4, 2026',
  },
]

const navItems = [
  { href: '/admin', icon: 'dashboard', label: 'Dashboard' },
  { href: '/admin/users', icon: 'users', label: 'User Management', active: true },
  { icon: 'operations', label: 'Operations' },
  { icon: 'records', label: 'Records' },
  { icon: 'monitoring', label: 'Monitoring' },
]

function formatDashboardDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
}

export default function UserManagement() {
  const { profile, signOut } = useAuth()
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All roles')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [showAddUser, setShowAddUser] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const displayName = profile?.full_name || 'Josh Ureta'

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return users.filter((user) => {
      const matchesSearch = !normalizedSearch
        || user.name.toLowerCase().includes(normalizedSearch)
        || user.email.toLowerCase().includes(normalizedSearch)
        || user.location.toLowerCase().includes(normalizedSearch)
      const matchesRole = roleFilter === 'All roles' || user.role === roleFilter
      const matchesStatus = statusFilter === 'All statuses'
        || user.status === statusFilter

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [roleFilter, search, statusFilter, users])

  const activeCount = users.filter((user) => user.status === 'Active').length
  const pendingCount = users.filter((user) => user.status === 'Pending').length

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    window.location.replace('/login')
  }

  function toggleSelected(userId) {
    setSelectedUsers((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ))
  }

  function toggleAllVisible() {
    const visibleIds = filteredUsers.map((user) => user.id)
    const allVisibleSelected = visibleIds.length > 0
      && visibleIds.every((id) => selectedUsers.includes(id))

    setSelectedUsers((current) => (
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])]
    ))
  }

  function toggleUserStatus(userId) {
    setUsers((current) => current.map((user) => (
      user.id === userId
        ? { ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' }
        : user
    )))
  }

  function handleAddUser(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('name').trim()
    const email = form.get('email').trim()

    setUsers((current) => [
      {
        id: Date.now(),
        name,
        email,
        role: form.get('role'),
        status: 'Pending',
        location: form.get('location').trim() || 'Not provided',
        joined: 'Today',
      },
      ...current,
    ])
    setShowAddUser(false)
  }

  return (
    <main className="admin-dashboard user-management-page">
      <aside className="admin-sidebar">
        <a className="admin-logo" href="/admin" aria-label="Jtoledo Trading admin home">
          <span className="admin-logo-mark" aria-hidden="true">J</span>
          <span>JTOLEDO</span>
        </a>

        <nav className="admin-nav" aria-label="Admin navigation">
          {navItems.map((item) => (
            <a
              className={item.active ? 'is-active' : ''}
              href={item.href || '#'}
              key={item.label}
              aria-current={item.active ? 'page' : undefined}
            >
              <span
                className={`admin-nav-icon icon-${item.icon}`}
                aria-hidden="true"
              />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <span>Administrator workspace</span>
          <strong>Jtoledo Trading</strong>
        </div>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-date">
            <span aria-hidden="true">▣</span>
            <time dateTime={new Date().toISOString()}>
              {formatDashboardDate(new Date())}
            </time>
          </div>

          <div className="admin-account">
            <button className="admin-notification" type="button" aria-label="Notifications">
              ♟
              <span aria-hidden="true" />
            </button>
            <div className="admin-avatar" aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="admin-identity">
              <strong>{displayName}</strong>
              <span>Admin</span>
            </div>
            <button
              className="admin-signout"
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? 'Wait…' : 'Sign out'}
            </button>
          </div>
        </header>

        <div className="user-management-content">
          <header className="user-page-heading">
            <div>
              <p>Administration</p>
              <h1>User Management</h1>
              <span>View and manage everyone using the Jtoledo Trading platform.</span>
            </div>
            <button type="button" onClick={() => setShowAddUser(true)}>
              <span aria-hidden="true">+</span>
              Add user
            </button>
          </header>

          <section className="user-summary-grid" aria-label="User overview">
            <article>
              <span className="user-summary-icon">◎</span>
              <div><strong>{users.length}</strong><p>Total users</p></div>
              <small>All accounts</small>
            </article>
            <article>
              <span className="user-summary-icon is-active">✓</span>
              <div><strong>{activeCount}</strong><p>Active users</p></div>
              <small>Currently enabled</small>
            </article>
            <article>
              <span className="user-summary-icon is-pending">◷</span>
              <div><strong>{pendingCount}</strong><p>Pending</p></div>
              <small>Awaiting approval</small>
            </article>
            <article>
              <span className="user-summary-icon is-worker">♣</span>
              <div>
                <strong>{users.filter((user) => user.role === 'Farm Worker').length}</strong>
                <p>Farm workers</p>
              </div>
              <small>Workforce accounts</small>
            </article>
          </section>

          <section className="users-panel">
            <div className="users-toolbar">
              <label className="user-search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, or location"
                  aria-label="Search users"
                />
              </label>

              <div className="user-filters">
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  aria-label="Filter users by role"
                >
                  <option>All roles</option>
                  <option>Buyer</option>
                  <option>Farm Worker</option>
                  <option>Driver</option>
                  <option>Seller</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter users by status"
                >
                  <option>All statuses</option>
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Pending</option>
                </select>
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <div className="bulk-selection">
                <strong>{selectedUsers.length} selected</strong>
                <button type="button" onClick={() => setSelectedUsers([])}>
                  Clear selection
                </button>
              </div>
            )}

            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={
                          filteredUsers.length > 0
                          && filteredUsers.every((user) => selectedUsers.includes(user.id))
                        }
                        onChange={toggleAllVisible}
                        aria-label="Select all visible users"
                      />
                    </th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleSelected(user.id)}
                          aria-label={`Select ${user.name}`}
                        />
                      </td>
                      <td>
                        <div className="user-cell">
                          <span className="user-avatar">{getInitials(user.name)}</span>
                          <div><strong>{user.name}</strong><span>{user.email}</span></div>
                        </div>
                      </td>
                      <td><span className="role-pill">{user.role}</span></td>
                      <td>{user.location}</td>
                      <td>
                        <span className={`status-pill is-${user.status.toLowerCase()}`}>
                          <i />
                          {user.status}
                        </span>
                      </td>
                      <td>{user.joined}</td>
                      <td>
                        <button
                          className="user-action"
                          type="button"
                          onClick={() => toggleUserStatus(user.id)}
                          aria-label={`${user.status === 'Active' ? 'Deactivate' : 'Activate'} ${user.name}`}
                          title={user.status === 'Active' ? 'Deactivate user' : 'Activate user'}
                        >
                          •••
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="empty-users">
                  <strong>No users found</strong>
                  <p>Try changing your search or filters.</p>
                </div>
              )}
            </div>

            <footer className="users-footer">
              <span>Showing {filteredUsers.length} of {users.length} mock users</span>
              <div>
                <button type="button" disabled>Previous</button>
                <strong>1</strong>
                <button type="button" disabled>Next</button>
              </div>
            </footer>
          </section>
        </div>
      </section>

      {showAddUser && (
        <div className="user-modal-backdrop" role="presentation">
          <section
            className="user-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-user-title"
          >
            <button
              className="user-modal-close"
              type="button"
              onClick={() => setShowAddUser(false)}
              aria-label="Close add user form"
            >
              ×
            </button>
            <p>Frontend preview</p>
            <h2 id="add-user-title">Add a new user</h2>
            <span>This creates a temporary row only. It is not saved to Supabase.</span>

            <form onSubmit={handleAddUser}>
              <label>
                <span>Full name</span>
                <input name="name" placeholder="Enter full name" required />
              </label>
              <label>
                <span>Email address</span>
                <input name="email" type="email" placeholder="user@example.com" required />
              </label>
              <div>
                <label>
                  <span>Role</span>
                  <select name="role" defaultValue="Buyer">
                    <option>Buyer</option>
                    <option>Farm Worker</option>
                    <option>Driver</option>
                    <option>Seller</option>
                  </select>
                </label>
                <label>
                  <span>Location</span>
                  <input name="location" placeholder="City or municipality" />
                </label>
              </div>
              <footer>
                <button type="button" onClick={() => setShowAddUser(false)}>Cancel</button>
                <button type="submit">Add mock user</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
