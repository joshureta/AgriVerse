import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import ProfileAddressFields from '../components/ProfileAddressFields.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { saveOwnProfile } from '../services/profile.js'
import '../styles/Buyer/buyerProfile.css'
import '../styles/own-profile.css'

function fromProfile(profile) {
  return {
    full_name: profile?.full_name || '', mobile_number: profile?.mobile_number || '',
    country: 'Philippines', region: profile?.region || '', province: profile?.province || '',
    city_municipality: profile?.city_municipality || '', barangay: profile?.barangay || '',
  }
}

export default function OwnProfile() {
  const { profile, refreshProfile, signOut, user } = useAuth()
  const [form, setForm] = useState(() => fromProfile(profile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [addressVersion, setAddressVersion] = useState(0)
  useEffect(() => { setForm(fromProfile(profile)) }, [profile])
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const home = profile?.role === 'admin' ? '/admin'
    : profile?.worker_category === 'seller' ? '/farm-worker/dashboard'
      : profile?.worker_category === 'driver' ? '/driver/orders' : null
  const role = profile?.role === 'admin' ? 'Administrator'
    : profile?.worker_category === 'seller' ? 'Seller'
      : profile?.worker_category === 'driver' ? 'Driver' : 'Crop worker'

  async function save(event) {
    event.preventDefault()
    setError('')
    if (form.full_name.trim().length < 2) { setError('Enter a full name with at least 2 characters.'); return }
    if (!form.region.trim() || !form.city_municipality.trim() || !form.barangay.trim()) {
      setError('Select a complete base address.'); return
    }
    setSaving(true)
    try {
      await saveOwnProfile(form)
      await refreshProfile()
      setToast('Profile saved successfully.')
    } catch (caught) {
      setError(caught.message || 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return <main className="own-profile-page">
    {toast && <div className="profile-save-toast" role="status"><Check size={17} aria-hidden="true" /><span>{toast}</span></div>}
    <header className="own-profile-header"><a href={home || '/profile'}>AgriVerse</a><nav>{home && <a href={home}>Workspace</a>}<button type="button" onClick={async () => { await signOut(); window.location.replace('/login') }}>Sign out</button></nav></header>
    <section className="own-profile-content">
      <div className="profile-page-header"><h1>My Profile</h1><p>Keep your contact and base address up to date.</p></div>
      <div className="own-profile-card">
        <aside><div className="profile-avatar-initials">{(profile?.full_name || 'U').slice(0, 1).toUpperCase()}</div><h2>{profile?.full_name || 'User'}</h2><p>{user?.email}</p><span>{role}</span></aside>
        <form onSubmit={save}>
          <div className="own-profile-title"><h2>Edit Profile Details</h2><p>Changes are saved to your account and visible on mobile and web.</p></div>
          {error && <div className="profile-feedback-alert is-error" role="alert"><X size={16} aria-hidden="true" /><span>{error}</span></div>}
          <div className="profile-form-grid">
            <label className="profile-form-field"><span>Full Name *</span><input required value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} /></label>
            <label className="profile-form-field"><span>Email Address</span><input value={user?.email || ''} readOnly /></label>
            <label className="profile-form-field"><span>Phone Number</span><input type="tel" value={form.mobile_number} onChange={(event) => setForm((current) => ({ ...current, mobile_number: event.target.value }))} /></label>
            <ProfileAddressFields key={addressVersion} value={form} onChange={(changes) => setForm((current) => ({ ...current, ...changes }))} disabled={saving} />
          </div>
          <div className="own-profile-actions"><button type="button" onClick={() => { setForm(fromProfile(profile)); setAddressVersion((version) => version + 1); setError('') }} disabled={saving}>Reset</button><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button></div>
        </form>
      </div>
    </section>
  </main>
}
