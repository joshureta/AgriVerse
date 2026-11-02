import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Pencil,
  ShieldCheck,
  X,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import ProfileAddressFields from '../../components/ProfileAddressFields.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { supabase } from '../../lib/supabase.js'
import { saveOwnProfile } from '../../services/profile.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/buyerProfile.css'

const emptyForm = {
  fullName: '',
  email: '',
  mobileNumber: '',
  businessName: '',
  barangay: '',
  cityMunicipality: '',
  province: '',
  region: '',
  country: 'Philippines',
}

// Creates initials for the buyer profile avatar.
function getInitials(name, email) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return 'MB'
}

// Formats the buyer's account start date.
function memberSince(value) {
  if (!value) return 'Recently joined'
  return `Member since ${new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(new Date(value))}`
}

// Displays one editable profile field.
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

// Displays and edits the buyer's profile.
export default function BuyerProfile() {
  const { profile, refreshProfile, user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!user?.id) return
    const key = `agriverse-pending-email-${user.id}`
    const pending = window.localStorage.getItem(key)
    if (!pending) return
    if (pending === user.email?.toLowerCase()) {
      window.localStorage.removeItem(key)
      setMessage('Your new email address is confirmed.')
    } else {
      setMessage('Email change requested. Confirm it from your email inbox before using the new address.')
    }
  }, [user?.id, user?.email])

  // Fills the form with the current profile values.
  useEffect(() => {
    setForm({
      fullName: profile?.full_name || '',
      email: user?.email || '',
      mobileNumber: profile?.mobile_number || '',
      businessName: profile?.business_name || '',
      barangay: profile?.barangay || '',
      cityMunicipality: profile?.city_municipality || '',
      province: profile?.province || '',
      region: profile?.region || '',
      country: profile?.country || 'Philippines',
    })
  }, [profile, user])

  // Builds the buyer's display address.
  const address = useMemo(() => [
    profile?.barangay,
    profile?.city_municipality,
    profile?.province,
    profile?.region,
    profile?.country,
  ].filter(Boolean).join(', '), [profile])

  // Gets initials for the profile avatar.
  const initials = useMemo(
    () => getInitials(profile?.full_name, user?.email),
    [profile?.full_name, user?.email],
  )

  // Opens the profile edit form.
  function startEditing() {
    setError('')
    setEditing(true)
  }

  // Discards unsaved profile changes.
  function cancelEditing() {
    setForm({
      fullName: profile?.full_name || '',
      email: user?.email || '',
      mobileNumber: profile?.mobile_number || '',
      businessName: profile?.business_name || '',
      barangay: profile?.barangay || '',
      cityMunicipality: profile?.city_municipality || '',
      province: profile?.province || '',
      region: profile?.region || '',
      country: profile?.country || 'Philippines',
    })
    setError('')
    setEditing(false)
  }

  // Updates a value in the profile form.
  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  // Saves the buyer's account and address details.
  async function saveProfile(event) {
    event.preventDefault()
    const fullName = form.fullName.trim()
    const email = form.email.trim().toLowerCase()
    const mobileNumber = form.mobileNumber.trim()

    if (fullName.length < 2) {
      setError('Enter a full name with at least 2 characters.')
      return
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }

    if (!form.region.trim() || !form.cityMunicipality.trim() || !form.barangay.trim()) {
      setError('Select a complete delivery address.')
      return
    }

    setSaving(true)
    setError('')

    try {
      await saveOwnProfile({
        full_name: fullName, mobile_number: mobileNumber, business_name: form.businessName.trim(),
        barangay: form.barangay.trim(), city_municipality: form.cityMunicipality.trim(),
        province: form.province.trim(), region: form.region.trim(), country: 'Philippines',
      })
      await refreshProfile()
      setEditing(false)
      setToast('Profile saved successfully.')
      if (email !== user?.email?.toLowerCase()) {
        const { error: emailError } = await supabase.auth.updateUser({ email })
        if (emailError) {
          setError(`Profile saved, but your email change could not be requested: ${emailError.message}`)
        } else {
          window.localStorage.setItem(`agriverse-pending-email-${user.id}`, email)
          setMessage('Email change requested. Confirm it from your email inbox before using the new address.')
        }
      }
    } catch (caught) {
      setError(caught.message || 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="buyer-page buyer-profile-page">
      {toast && <div className="profile-save-toast" role="status"><Check size={17} aria-hidden="true" /><span>{toast}</span></div>}
      {/* Marketplace navigation and buyer profile. */}
      <BuyerHeader active="profile" />

      <section className="profile-content" aria-labelledby="profile-title">
        <header className="profile-page-header">
          <h1 id="profile-title">My Profile</h1>
          <p>Keep your contact and delivery information up to date.</p>
        </header>

        <div className="profile-main-card">
          <div className="profile-hero-section">
            <div className="profile-hero-identity">
              <div className="profile-avatar-initials" aria-hidden="true">
                <span>{initials}</span>
              </div>
              <div className="profile-hero-text">
                <h2>{profile?.full_name || 'Buyer User'}</h2>
                <p>{user?.email || 'No email provided'}</p>
                <span className="profile-account-status"><ShieldCheck size={14} aria-hidden="true" /> Verified buyer account</span>
                <small>{memberSince(user?.created_at)}</small>
              </div>
            </div>

            {!editing && (
              <button className="profile-edit-btn" type="button" onClick={startEditing} aria-label="Edit Profile" title="Edit Profile">
                <Pencil size={18} aria-hidden="true" />
                <span>Edit profile</span>
              </button>
            )}
          </div>

          {message && (
            <div className="profile-feedback-alert is-info" role="status">
              <Check size={16} aria-hidden="true" />
              <span>{message}</span>
            </div>
          )}
          {error && !editing && <div className="profile-feedback-alert is-error" role="alert"><X size={16} aria-hidden="true" /><span>{error}</span></div>}

          {/* Profile edit form or saved account details. */}
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
                  label="Business / Store Name"
                  name="businessName"
                  onChange={updateField}
                  placeholder="Your business name (optional)"
                  value={form.businessName}
                />
                <ProfileAddressFields
                  value={{ region: form.region, province: form.province, city_municipality: form.cityMunicipality, barangay: form.barangay }}
                  onChange={(changes) => setForm((current) => ({ ...current,
                    ...(changes.region !== undefined ? { region: changes.region } : {}),
                    ...(changes.province !== undefined ? { province: changes.province } : {}),
                    ...(changes.city_municipality !== undefined ? { cityMunicipality: changes.city_municipality } : {}),
                    ...(changes.barangay !== undefined ? { barangay: changes.barangay } : {}),
                  }))}
                  disabled={saving}
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
            <section className="profile-details-section" aria-labelledby="profile-details-title">
              <header className="profile-details-heading">
                <span>Account details</span>
                <h3 id="profile-details-title">Personal information</h3>
                <p>This information is used for order updates and deliveries.</p>
              </header>
              <div className="profile-details-grid">
              <div className="profile-info-tile">
                <div className="profile-tile-content">
                  <span className="profile-tile-label">Full Name</span>
                  <strong className="profile-tile-value">{profile?.full_name || 'Not provided'}</strong>
                </div>
              </div>

              <div className="profile-info-tile">
                <div className="profile-tile-content">
                  <span className="profile-tile-label">Email Address</span>
                  <div className="profile-tile-value-row">
                    <strong className="profile-tile-value">{user?.email || 'Not provided'}</strong>
                    <span className="profile-verified-badge"><Check size={11} aria-hidden="true" /> Verified</span>
                  </div>
                </div>
              </div>

              <div className="profile-info-tile">
                <div className="profile-tile-content">
                  <span className="profile-tile-label">Contact Number</span>
                  <strong className="profile-tile-value">{profile?.mobile_number || 'Not provided'}</strong>
                </div>
              </div>

              <div className="profile-info-tile">
                <div className="profile-tile-content">
                  <span className="profile-tile-label">Business / Store</span>
                  <strong className="profile-tile-value">{profile?.business_name || 'Not provided'}</strong>
                </div>
              </div>

              <div className="profile-info-tile profile-tile-full">
                <div className="profile-tile-content">
                  <span className="profile-tile-label">Default Delivery Address</span>
                  <strong className="profile-tile-value">{address || 'No delivery address provided yet.'}</strong>
                </div>
              </div>
              </div>
            </section>
          )}
        </div>
      </section>

      <BuyerFooter />
    </main>
  )
}

