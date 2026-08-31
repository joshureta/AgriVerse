import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { supabase } from '../../lib/supabase.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/buyerProfile.css'

const emptyForm = {
  fullName: '',
  email: '',
  mobileNumber: '',
  barangay: '',
  cityMunicipality: '',
  province: '',
  region: '',
  country: 'Philippines',
}

function getInitials(name, email) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return 'MB'
}

function ProfileField({ label, name, value, onChange, type = 'text', required = false, autoComplete, placeholder }) {
  return (
    <label className="profile-form-field">
      <span>{label} {required && <em className="required-star">*</em>}</span>
      <input
        autoComplete={autoComplete}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  )
}

export default function BuyerProfile() {
  const { profile, refreshProfile, user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setForm({
      fullName: profile?.full_name || '',
      email: user?.email || '',
      mobileNumber: profile?.mobile_number || '',
      barangay: profile?.barangay || '',
      cityMunicipality: profile?.city_municipality || '',
      province: profile?.province || '',
      region: profile?.region || '',
      country: profile?.country || 'Philippines',
    })
  }, [profile, user])

  const address = useMemo(() => [
    profile?.barangay,
    profile?.city_municipality,
    profile?.province,
    profile?.region,
    profile?.country,
  ].filter(Boolean).join(', '), [profile])

  const initials = useMemo(
    () => getInitials(profile?.full_name, user?.email),
    [profile?.full_name, user?.email],
  )

  function startEditing() {
    setError('')
    setMessage('')
    setEditing(true)
  }

  function cancelEditing() {
    setForm({
      fullName: profile?.full_name || '',
      email: user?.email || '',
      mobileNumber: profile?.mobile_number || '',
      barangay: profile?.barangay || '',
      cityMunicipality: profile?.city_municipality || '',
      province: profile?.province || '',
      region: profile?.region || '',
      country: profile?.country || 'Philippines',
    })
    setError('')
    setEditing(false)
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function saveProfile(event) {
    event.preventDefault()
    const fullName = form.fullName.trim()
    const email = form.email.trim().toLowerCase()
    const mobileNumber = form.mobileNumber.trim()

    if (fullName.length < 2) {
      setError('Enter a full name with at least 2 characters.')
      return
    }

    if (!email) {
      setError('Enter a valid email address.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    const emailChanged = email !== user?.email?.toLowerCase()
    if (emailChanged) {
      const { error: emailError } = await supabase.auth.updateUser({ email })
      if (emailError) {
        setError(emailError.message)
        setSaving(false)
        return
      }
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        mobile_number: mobileNumber || null,
        barangay: form.barangay.trim() || null,
        city_municipality: form.cityMunicipality.trim() || null,
        province: form.province.trim() || null,
        region: form.region.trim() || null,
        country: form.country.trim() || 'Philippines',
      })
      .eq('id', user.id)

    if (profileUpdateError) {
      setError(profileUpdateError.message)
      setSaving(false)
      return
    }

    await refreshProfile()
    setSaving(false)
    setEditing(false)
    setMessage(emailChanged
      ? 'Profile saved. Check both email inboxes to confirm your new address.'
      : 'Profile updated successfully.')
  }

  return (
    <main className="buyer-page buyer-profile-page">
      <BuyerHeader />

      <section className="profile-content" aria-labelledby="profile-title">
        <header className="profile-page-header">
          <h1 id="profile-title">My Profile</h1>
          <p>Manage your account personal details and delivery preferences.</p>
        </header>

        <div className="profile-main-card">
          <div className="profile-hero-section">
            <div className="profile-hero-identity">
              <div className="profile-avatar-initials" aria-hidden="true">
                <span>{initials}</span>
                <span className="profile-avatar-badge" title="Verified Account">
                  <ShieldCheck size={14} aria-hidden="true" />
                </span>
              </div>
              <div className="profile-hero-text">
                <h2>{profile?.full_name || 'Buyer User'}</h2>
              </div>
            </div>

            {!editing && (
              <button className="profile-edit-btn" type="button" onClick={startEditing} aria-label="Edit Profile" title="Edit Profile">
                <Pencil size={18} aria-hidden="true" />
              </button>
            )}
          </div>

          {message && (
            <div className="profile-feedback-alert is-success" role="status">
              <Check size={16} aria-hidden="true" />
              <span>{message}</span>
            </div>
          )}

          {editing ? (
            <form className="profile-edit-section" onSubmit={saveProfile}>
              <div className="profile-section-heading">
                <div>
                  <h3>Edit Profile Details</h3>
                  <p>Update your name, contact information, and shipping address.</p>
                </div>
                <button className="profile-close-btn" type="button" onClick={cancelEditing} aria-label="Cancel editing">
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              {error && (
                <div className="profile-feedback-alert is-error" role="alert">
                  <X size={16} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div className="profile-form-grid">
                <ProfileField
                  autoComplete="name"
                  label="Full Name"
                  name="fullName"
                  onChange={updateField}
                  placeholder="e.g. Joshua Gabriel P. Ureta"
                  required
                  value={form.fullName}
                />
                <ProfileField
                  autoComplete="email"
                  label="Email Address"
                  name="email"
                  onChange={updateField}
                  placeholder="your.email@example.com"
                  required
                  type="email"
                  value={form.email}
                />
                <ProfileField
                  autoComplete="tel"
                  label="Phone Number"
                  name="mobileNumber"
                  onChange={updateField}
                  placeholder="e.g. 0912 345 6789"
                  value={form.mobileNumber}
                />
                <ProfileField
                  autoComplete="address-level3"
                  label="Barangay"
                  name="barangay"
                  onChange={updateField}
                  placeholder="e.g. Barangay San Jose"
                  value={form.barangay}
                />
                <ProfileField
                  autoComplete="address-level2"
                  label="City / Municipality"
                  name="cityMunicipality"
                  onChange={updateField}
                  placeholder="e.g. Calamba"
                  value={form.cityMunicipality}
                />
                <ProfileField
                  autoComplete="address-level1"
                  label="Province"
                  name="province"
                  onChange={updateField}
                  placeholder="e.g. Laguna"
                  value={form.province}
                />
                <ProfileField
                  label="Region"
                  name="region"
                  onChange={updateField}
                  placeholder="e.g. Region IV-A (CALABARZON)"
                  value={form.region}
                />
                <ProfileField
                  autoComplete="country-name"
                  label="Country"
                  name="country"
                  onChange={updateField}
                  placeholder="Philippines"
                  value={form.country}
                />
              </div>

              <div className="profile-form-actions">
                <button className="profile-action-cancel" type="button" onClick={cancelEditing} disabled={saving}>
                  Cancel
                </button>
                <button className="profile-action-save" type="submit" disabled={saving}>
                  <Check size={16} aria-hidden="true" />
                  <span>{saving ? 'Saving…' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-details-grid">
              <div className="profile-info-tile">
                <div className="profile-tile-icon"><UserRound size={18} aria-hidden="true" /></div>
                <div className="profile-tile-content">
                  <span className="profile-tile-label">Full Name</span>
                  <strong className="profile-tile-value">{profile?.full_name || 'Not provided'}</strong>
                </div>
              </div>

              <div className="profile-info-tile">
                <div className="profile-tile-icon"><Mail size={18} aria-hidden="true" /></div>
                <div className="profile-tile-content">
                  <span className="profile-tile-label">Email Address</span>
                  <div className="profile-tile-value-row">
                    <strong className="profile-tile-value">{user?.email || 'Not provided'}</strong>
                    <span className="profile-verified-badge"><Check size={11} aria-hidden="true" /> Verified</span>
                  </div>
                </div>
              </div>

              <div className="profile-info-tile">
                <div className="profile-tile-icon"><Phone size={18} aria-hidden="true" /></div>
                <div className="profile-tile-content">
                  <span className="profile-tile-label">Contact Number</span>
                  <strong className="profile-tile-value">{profile?.mobile_number || 'Not provided'}</strong>
                </div>
              </div>

              <div className="profile-info-tile profile-tile-full">
                <div className="profile-tile-icon"><MapPin size={18} aria-hidden="true" /></div>
                <div className="profile-tile-content">
                  <span className="profile-tile-label">Default Delivery Address</span>
                  <strong className="profile-tile-value">{address || 'No delivery address provided yet.'}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <BuyerFooter />
    </main>
  )
}

