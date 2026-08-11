import { useEffect, useState } from 'react'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { workerCategories } from '../../constants/user-options.js'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/edit-user.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const roles = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'farm_worker', label: 'Farm Worker' },
  { value: 'admin', label: 'Admin' },
]
async function getToken(refresh = false) {
  const result = refresh
    ? await supabase.auth.refreshSession()
    : await supabase.auth.getSession()

  if (result.error) throw new Error(result.error.message)
  const token = result.data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')
  return token
}

async function apiRequest(path, options = {}, retry = true) {
  const token = await getToken()
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (response.status === 401 && retry) {
    await getToken(true)
    return apiRequest(path, options, false)
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`)
  return body
}

function displayValue(value) {
  return value || 'Not provided'
}

function formatDate(value) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date(value))
}

function ReadOnlyField({ label, value }) {
  return (
    <label className="edit-user-field">
      <span>{label}</span>
      <input value={displayValue(value)} readOnly />
    </label>
  )
}

function EditableField({ label, name, type = 'text', value, onChange, required = false }) {
  return (
    <label className="edit-user-field is-editable">
      <span>{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
      />
    </label>
  )
}

export default function EditUser() {
  const userId = new URLSearchParams(window.location.search).get('id')
  const [userProfile, setUserProfile] = useState(null)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    mobile_number: '',
    role: 'buyer',
    worker_category: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true

    async function loadUser() {
      if (!userId) {
        setError('No user was selected for editing.')
        setLoading(false)
        return
      }

      try {
        const data = await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`)
        if (!active) return
        setUserProfile(data.user)
        setForm({
          full_name: data.user.full_name || '',
          email: data.user.email || '',
          mobile_number: data.user.mobile_number || '',
          role: data.user.role || 'buyer',
          worker_category: data.user.worker_category || '',
        })
      } catch (requestError) {
        if (active) setError(requestError.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadUser()
    return () => { active = false }
  }, [userId])

  function handleFieldChange(event) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'role' && value !== 'farm_worker' ? { worker_category: '' } : {}),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const data = await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      })
      setUserProfile(data.user)
      setForm({
        full_name: data.user.full_name || '',
        email: data.user.email || '',
        mobile_number: data.user.mobile_number || '',
        role: data.user.role || 'buyer',
        worker_category: data.user.worker_category || '',
      })
      setSuccess('The user information was updated successfully.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="admin-dashboard edit-user-page">
      <AdminSidebar active="users" />
      <section className="admin-workspace">
        <AdminTopbar />

        <div className="edit-user-content">
          <a className="edit-user-back" href="/admin/users">
            <span aria-hidden="true">‹</span> Back to users
          </a>

          {loading ? (
            <div className="edit-user-state">Loading user information…</div>
          ) : error && !userProfile ? (
            <div className="edit-user-state is-error">{error}</div>
          ) : (
            <section className="edit-user-card">
              <header>
                <span>User management</span>
                <h1>Edit User Information</h1>
              </header>

              <form onSubmit={handleSubmit}>

                {error && <div className="edit-user-message is-error" role="alert">{error}</div>}
                {success && <div className="edit-user-message is-success" role="status">{success}</div>}

                <fieldset>
                  <legend>Account information</legend>
                  <div className="edit-user-grid">
                    <EditableField label="Full Name" name="full_name" value={form.full_name} onChange={handleFieldChange} required />
                    <EditableField label="Email Address" name="email" type="email" value={form.email} onChange={handleFieldChange} required />
                    <EditableField label="Mobile Number" name="mobile_number" value={form.mobile_number} onChange={handleFieldChange} />
                    <ReadOnlyField label="Created At" value={formatDate(userProfile.created_at)} />
                    <label className="edit-user-field is-editable">
                      <span>Role</span>
                      <select name="role" value={form.role} onChange={handleFieldChange}>
                        {roles.map((option) => (
                          <option value={option.value} key={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="edit-user-field is-editable">
                      <span>Worker Category</span>
                      <select
                        name="worker_category"
                        value={form.worker_category}
                        onChange={handleFieldChange}
                        disabled={form.role !== 'farm_worker'}
                        required={form.role === 'farm_worker'}
                      >
                        <option value="">{form.role === 'farm_worker' ? 'Select worker category' : 'Not applicable'}</option>
                        {workerCategories.map((option) => (
                          <option value={option.value} key={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </fieldset>

                <fieldset>
                  <legend>Location information</legend>
                  <div className="edit-user-grid">
                    <ReadOnlyField label="Country" value={userProfile.country} />
                    <ReadOnlyField label="Region" value={userProfile.region} />
                    <ReadOnlyField label="Province" value={userProfile.province} />
                    <ReadOnlyField label="City / Municipality" value={userProfile.city_municipality} />
                    <ReadOnlyField label="Barangay" value={userProfile.barangay} />
                  </div>
                </fieldset>

                <footer>
                  <button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <a href="/admin/users">Cancel</a>
                </footer>
              </form>
            </section>
          )}
        </div>
      </section>
    </main>
  )
}
