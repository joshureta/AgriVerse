import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { supabase } from '../lib/supabase.js'
import jtoledoLogo from '../assets/Jtoledologo.png'
import '../styles/login.css'

export default function Login() {
  const { loading: sessionLoading, user } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!sessionLoading && user) {
      window.location.replace('/buyer')
    }
  }, [sessionLoading, user])

  async function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.get('email').trim(),
      password: form.get('password'),
    })

    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes('email not confirmed')
          ? 'Verify your email before logging in. Check your inbox for the confirmation message.'
          : signInError.message,
      )
      setLoading(false)
      return
    }

    window.location.replace('/buyer')
  }

  return (
    <main className="login-page">
      <section className="login-shell" aria-labelledby="login-title">
        <div className="login-form-panel">
          <div className="login-form-wrap">
            <div className="login-brand">
              <img src={jtoledoLogo} alt="Jtoledo Trading" />
            </div>

            <div className="login-heading-group">
              <p className="login-kicker">Welcome back</p>
              <h1 className="login-heading" id="login-title">Sign in to your account</h1>
              <p className="login-subtitle">
                Enter your account details.
              </p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {error && (
                <div className="login-alert" role="alert">
                  {error}
                </div>
              )}

              <label className="login-field">
                <span>Email address</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  disabled={loading}
                  required
                />
              </label>

              <label className="login-field">
                <span>Password</span>
                <div className="login-input-shell">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={loading}
                    required
                  />
                  <button
                    className={`login-password-toggle${showPassword ? ' is-visible' : ''}`}
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    disabled={loading}
                  />
                </div>
              </label>

              <div className="login-options">
                <label className="login-remember">
                  <input name="rememberMe" type="checkbox" />
                  <span>Remember me</span>
                </label>
                <a href="/forgot-password">Forgot password?</a>
              </div>

              <button className="login-button" type="submit" disabled={loading}>
                {loading && <span className="login-spinner" aria-hidden="true" />}
                <span>{loading ? 'Signing in…' : 'Sign in'}</span>
              </button>
            </form>

            <p className="login-register">
              Don&apos;t have an account? <a href="/register">Sign up</a>
            </p>
          </div>
        </div>

        <aside className="login-hero" aria-label="Welcome to Jtoledo Trading">
          <div className="login-hero-content">
            <h2>Welcome to<br />Jtoledo Trading</h2>
            <p className="login-hero-copy">
              JToledo Trading is a privately owned agricultural enterprise in
              Tagaytay specializing in pineapple farming and distribution, with
              over 25 years of farming operations managed by Joseph Toledo.
            </p>
          </div>
        </aside>
      </section>
    </main>
  )
}
