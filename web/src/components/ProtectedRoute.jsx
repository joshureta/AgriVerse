import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import '../styles/auth.css'

export default function ProtectedRoute({ children, allowedRoles, allowedWorkerCategories }) {
  const { loading, profile, profileError, user } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      window.location.replace('/login')
    }
  }, [loading, user])

  if (loading || !user) {
    return (
      <main className="auth-status-page">
        <div className="auth-status-card">
          <div className="auth-spinner" aria-hidden="true" />
          <h1>Checking your account</h1>
          <p>Please wait while AgriVerse verifies your session.</p>
        </div>
      </main>
    )
  }

  if (profileError || !profile) {
    return (
      <main className="auth-status-page">
        <div className="auth-status-card auth-status-error">
          <h1>Profile unavailable</h1>
          <p>
            Your account is signed in, but its AgriVerse profile could not be
            loaded. Make sure the database migration has been applied.
          </p>
          <a href="/login">Return to login</a>
        </div>
      </main>
    )
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <main className="auth-status-page">
        <div className="auth-status-card auth-status-error">
          <h1>Access denied</h1>
          <p>This account does not have permission to open this page.</p>
        </div>
      </main>
    )
  }

  if (
    allowedWorkerCategories &&
    !allowedWorkerCategories.includes(profile.worker_category)
  ) {
    return (
      <main className="auth-status-page">
        <div className="auth-status-card auth-status-error">
          <h1>Access denied</h1>
          <p>This farm worker category does not have permission to open this page.</p>
        </div>
      </main>
    )
  }

  return children
}
