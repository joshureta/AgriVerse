import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import '../styles/auth.css'

export default function AuthConfirm() {
  const { loading, user } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      const redirect = setTimeout(() => window.location.replace('/buyer'), 1200)
      return () => clearTimeout(redirect)
    }
  }, [loading, user])

  if (loading) {
    return (
      <main className="auth-status-page">
        <div className="auth-status-card">
          <div className="auth-spinner" aria-hidden="true" />
          <h1>Verifying your email</h1>
          <p>Please wait while Supabase confirms your account.</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="auth-status-page">
        <div className="auth-status-card auth-status-error">
          <h1>Verification link unavailable</h1>
          <p>The link may be invalid or expired. Try logging in or registering again.</p>
          <a href="/login">Go to login</a>
        </div>
      </main>
    )
  }

  return (
    <main className="auth-status-page">
      <div className="auth-status-card auth-status-success">
        <span className="auth-status-icon" aria-hidden="true">✓</span>
        <h1>Email verified</h1>
        <p>Your Buyer account is ready. Redirecting you to AgriVerse.</p>
        <a href="/buyer">Continue now</a>
      </div>
    </main>
  )
}
