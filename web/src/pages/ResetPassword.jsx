import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import '../styles/auth.css'

export default function ResetPassword() {
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = form.get('password')
    const confirmPassword = form.get('confirmPassword')

    setError('')
    setMessage('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
    } else {
      setMessage('Password updated. You can now log in with your new password.')
    }

    setLoading(false)
  }

  return (
    <main className="auth-status-page">
      <form className="auth-form-card" onSubmit={handleSubmit}>
        <a className="auth-mini-brand" href="/login">AgriVerse</a>
        <h1>Create a new password</h1>
        <p>Use at least eight characters and avoid reusing an old password.</p>

        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {message && <div className="auth-alert auth-alert-success">{message}</div>}

        <label>
          <span>New password</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </label>
        <label>
          <span>Confirm new password</span>
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        </label>

        <button type="submit" disabled={loading || Boolean(message)}>
          {loading ? 'Updating…' : 'Update password'}
        </button>
        <a className="auth-back-link" href="/login">Return to login</a>
      </form>
    </main>
  )
}

