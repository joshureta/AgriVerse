import { BriefcaseBusiness, Mail, MapPin, Pencil, Phone, UserRound } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/buyerProfile.css'

function ProfileRow({ icon: Icon, label, children }) {
  return (
    <div className="profile-info-row">
      <Icon aria-hidden="true" />
      <strong>{label}</strong>
      <span>{children}</span>
    </div>
  )
}

export default function BuyerProfile() {
  const { profile, user } = useAuth()
  const address = [
    profile?.barangay,
    profile?.city_municipality,
    profile?.province,
    profile?.region,
    profile?.country,
  ].filter(Boolean).join(', ')

  return (
    <main className="buyer-page buyer-profile-page">
      <BuyerHeader cartCount={1} />

      <section className="profile-content" aria-labelledby="profile-title">
        <h1 id="profile-title">My Profile</h1>

        <div className="profile-card">
          <aside className="profile-identity" aria-label="Profile picture and actions">
            <div className="profile-avatar-large"><UserRound aria-hidden="true" /></div>
            <button className="profile-edit-button" type="button"><Pencil aria-hidden="true" /> Edit Profile</button>
          </aside>

          <section className="profile-information" id="profile-details" aria-label="Profile information">
            <h2>{profile?.full_name || 'Juan Dela Cruz'}</h2>
            <div className="profile-info-list">
              <ProfileRow icon={Mail} label="Email">{user?.email || 'juan.delacruz@email.com'}</ProfileRow>
              <ProfileRow icon={Phone} label="Phone">{profile?.mobile_number || '+63 912 345 6789'}</ProfileRow>
              <ProfileRow icon={MapPin} label="Business Name">Juan&apos;s Fresh Market</ProfileRow>
              <ProfileRow icon={BriefcaseBusiness} label="Address">{address || '123 Market Street, Manila City Metro Manila, Philippines'}</ProfileRow>
            </div>
          </section>
        </div>
      </section>

      <BuyerFooter />
    </main>
  )
}
