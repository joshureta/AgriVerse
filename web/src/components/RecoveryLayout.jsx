import AuthHero from './AuthHero.jsx'
import '../styles/login.css'
import '../styles/recovery.css'

export default function RecoveryLayout({ title, description, children }) {
  return (
    <main className="login-page recovery-page">
      <section className="login-shell" aria-labelledby="recovery-title">
        <div className="login-form-panel">
          <div className="login-form-wrap">
            <div className="login-heading-group">
              <h1 className="login-heading" id="recovery-title">{title}</h1>
              <p className="login-subtitle">{description}</p>
            </div>
            {children}
          </div>
        </div>
        <AuthHero />
      </section>
    </main>
  )
}
