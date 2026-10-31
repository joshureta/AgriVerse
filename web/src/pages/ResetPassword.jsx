import { useEffect, useState } from 'react'
import RecoveryLayout from '../components/RecoveryLayout.jsx'
import { initialAuthFragment, supabase } from '../lib/supabase.js'

export default function ResetPassword() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const passwordChecks = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: '1 uppercase letter', met: /[A-Z]/.test(password) },
    { label: '1 number', met: /\d/.test(password) },
    { label: '1 special character', met: /[^A-Za-z0-9]/.test(password) },
  ]
  const passwordScore = passwordChecks.filter((check) => check.met).length

  useEffect(() => {
    let active = true
    const params = new URLSearchParams(initialAuthFragment)

    if (params.has('error')) {
      setError(params.get('error_description') || 'This reset link is invalid or has expired.')
      return undefined
    }

    if (params.get('type') !== 'recovery') {
      setError('Open the password reset link from your email to continue.')
      return undefined
    }

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError || !data.session || data.session.access_token !== params.get('access_token')) {
        setError('This reset link is invalid or has expired. Please request a new one.')
      } else {
        setReady(true)
      }
    })

    return () => { active = false }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (passwordScore < passwordChecks.length) {
      setError('Create a password that meets all four security requirements.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setReady(false)
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      setMessage(signOutError
        ? 'Password updated. Please sign out before signing in again.'
        : 'Password updated. You can now sign in with your new password.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update your password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <RecoveryLayout
      title="Create a new password"
      description="Create a strong password that meets all four security requirements below."
    >
      <form className="login-form recovery-form" onSubmit={handleSubmit}>
        {error && <div className="login-alert" role="alert">{error}</div>}
        {message && <div className="login-alert recovery-success" role="status">{message}</div>}
        {!ready && !error && !message && <div className="login-alert" role="status">Checking your reset link…</div>}
        {ready && !message && (
          <>
            <label className="login-field">
              <span>New password</span>
              <div className="login-input-shell">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError('')
                  }}
                  disabled={loading}
                  required
                />
                <button
                  className={`login-password-toggle${showPassword ? ' is-visible' : ''}`}
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                  aria-pressed={showPassword}
                  disabled={loading}
                />
              </div>
            </label>
            <label className="login-field">
              <span>Confirm new password</span>
              <div className="login-input-shell">
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setError('')
                  }}
                  disabled={loading}
                  required
                />
                <button
                  className={`login-password-toggle${showConfirmPassword ? ' is-visible' : ''}`}
                  type="button"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                  aria-pressed={showConfirmPassword}
                  disabled={loading}
                />
              </div>
            </label>
            {confirmPassword && confirmPassword !== password && (
              <p className="recovery-inline-error" role="alert">Passwords do not match.</p>
            )}
            <div className="recovery-password-guide" aria-live="polite">
              <div className="recovery-strength-bar" aria-hidden="true">
                {passwordChecks.map((check, index) => (
                  <span key={check.label} className={index < passwordScore ? 'is-met' : ''} />
                ))}
              </div>
              <p>Password strength: {['Not set', 'Weak', 'Fair', 'Good', 'Strong'][passwordScore]}</p>
              <ul>
                {passwordChecks.map((check) => (
                  <li key={check.label} className={check.met ? 'is-met' : ''}>{check.label}</li>
                ))}
              </ul>
            </div>
            <button className="login-button" type="submit" disabled={loading}>
              {loading && <span className="login-spinner" aria-hidden="true" />}
              <span>{loading ? 'Updating…' : 'Update password'}</span>
            </button>
          </>
        )}
      </form>
      <p className="recovery-secondary">
        <a href={message ? '/login' : '/forgot-password'}>
          {message ? 'Return to sign in' : 'Request a new reset link'}
        </a>
      </p>
    </RecoveryLayout>
  )
}
