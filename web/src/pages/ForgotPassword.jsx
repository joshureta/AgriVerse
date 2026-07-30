import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import '../styles/auth.css'

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

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
    } else {
      setMessage('Check your email for the password reset link.')
    }

    setLoading(false)
  }

  return (
    <main className="auth-status-page">
      <form className="auth-form-card" onSubmit={handleSubmit}>
        <a className="auth-mini-brand" href="/login">AgriVerse</a>
        <h1>Forgot your password?</h1>
        <p>Enter your email and Supabase will send you a secure reset link.</p>

        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {message && <div className="auth-alert auth-alert-success">{message}</div>}

        <label>
          <span>Email address</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
        <a className="auth-back-link" href="/login">Back to login</a>
      </form>
    </main>
  )
}

