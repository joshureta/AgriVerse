import { useState } from 'react'
import RecoveryLayout from '../components/RecoveryLayout.jsx'
import { supabase } from '../lib/supabase.js'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) throw resetError
      setMessage('If an account exists for this email, a password reset link is on its way.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send the reset link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <RecoveryLayout
      title="Forgot your password?"
      description="Enter your account email and we’ll send you a link to create a new password."
    >
      <form className="login-form recovery-form" onSubmit={handleSubmit}>
        {error && <div className="login-alert" role="alert">{error}</div>}
        {message && <div className="login-alert recovery-success" role="status">{message}</div>}

        <label className="login-field">
          <span>Email address</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            disabled={loading}
            required
          />
        </label>

        <button className="login-button" type="submit" disabled={loading}>
          {loading && <span className="login-spinner" aria-hidden="true" />}
          <span>{loading ? 'Sending…' : 'Send reset link'}</span>
        </button>
      </form>
      <p className="recovery-secondary"><a href="/login">Back to sign in</a></p>
    </RecoveryLayout>
  )
}
