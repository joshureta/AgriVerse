import { useEffect, useMemo, useState } from 'react'
import {
  BriefcaseBusiness,
  Check,
  Mail,
  MapPin,
  Pencil,
  Phone,
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

function ProfileRow({ icon: Icon, label, children }) {
  return (
    <div className="profile-info-row">
      <Icon aria-hidden="true" />
      <strong>{label}</strong>
      <span>{children}</span>
    </div>
  )
}

function ProfileField({ label, name, value, onChange, type = 'text', required = false, autoComplete }) {
  return (
    <label className="profile-form-field">
      <span>{label}</span>
      <input
        autoComplete={autoComplete}
        name={name}
        onChange={onChange}
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
      <BuyerHeader cartCount={1} />

      <section className="profile-content" aria-labelledby="profile-title">
        <h1 id="profile-title">My Profile</h1>

        <div className={`profile-card ${editing ? 'is-editing' : ''}`}>
          <aside className="profile-identity" aria-label="Profile picture and actions">
            <div className="profile-avatar-large"><UserRound aria-hidden="true" /></div>
            {!editing && (
              <button className="profile-edit-button" type="button" onClick={startEditing}>
                <Pencil aria-hidden="true" /> Edit Profile
              </button>
            )}
          </aside>

          <section className="profile-information" id="profile-details" aria-label="Profile information">
            {editing ? (
              <form className="profile-edit-form" onSubmit={saveProfile}>
                <div className="profile-form-heading">
                  <h2>Edit Profile</h2>
                  <button type="button" onClick={cancelEditing} aria-label="Cancel editing"><X aria-hidden="true" /></button>
                </div>

                <div className="profile-form-grid">
                  <ProfileField label="Full Name" name="fullName" value={form.fullName} onChange={updateField} required autoComplete="name" />
                  <ProfileField label="Email" name="email" value={form.email} onChange={updateField} type="email" required autoComplete="email" />
                  <ProfileField label="Phone" name="mobileNumber" value={form.mobileNumber} onChange={updateField} autoComplete="tel" />
                  <label className="profile-form-field is-readonly">
                    <span>Business Name</span>
                    <input value="Juan's Fresh Market" readOnly aria-describedby="business-name-note" />
                    <small id="business-name-note">Business name editing is not available for this account.</small>
                  </label>
                  <ProfileField label="Barangay" name="barangay" value={form.barangay} onChange={updateField} autoComplete="address-level3" />
                  <ProfileField label="City / Municipality" name="cityMunicipality" value={form.cityMunicipality} onChange={updateField} autoComplete="address-level2" />
                  <ProfileField label="Province" name="province" value={form.province} onChange={updateField} autoComplete="address-level1" />
                  <ProfileField label="Region" name="region" value={form.region} onChange={updateField} />
                  <ProfileField label="Country" name="country" value={form.country} onChange={updateField} autoComplete="country-name" />
                </div>

                {error && <p className="profile-form-alert is-error" role="alert">{error}</p>}
                <div className="profile-form-actions">
                  <button className="profile-cancel-button" type="button" onClick={cancelEditing} disabled={saving}>Cancel</button>
                  <button className="profile-save-button" type="submit" disabled={saving}><Check aria-hidden="true" /> {saving ? 'Saving…' : 'Save Changes'}</button>
                </div>
              </form>
            ) : (
              <>
                <h2>{profile?.full_name || 'Juan Dela Cruz'}</h2>
                <div className="profile-info-list">
                  <ProfileRow icon={Mail} label="Email">{user?.email || 'juan.delacruz@email.com'}</ProfileRow>
                  <ProfileRow icon={Phone} label="Phone">{profile?.mobile_number || '+63 912 345 6789'}</ProfileRow>
                  <ProfileRow icon={MapPin} label="Business Name">Juan&apos;s Fresh Market</ProfileRow>
                  <ProfileRow icon={BriefcaseBusiness} label="Address">{address || '123 Market Street, Manila City Metro Manila, Philippines'}</ProfileRow>
                </div>
                {message && <p className="profile-form-alert is-success" role="status"><Check aria-hidden="true" /> {message}</p>}
              </>
            )}
          </section>
        </div>
      </section>

      <BuyerFooter />
    </main>
  )
}
