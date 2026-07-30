import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { supabase } from '../lib/supabase.js'
import '../styles/login.css'

export default function Login() {
  const { loading: sessionLoading, user } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
              <span className="login-brand-mark" aria-hidden="true">A</span>
              <span>AgriVerse</span>
            </div>

            <div className="login-heading-group">
              <p className="login-kicker">Welcome back</p>
              <h1 className="login-heading" id="login-title">Log in to your account</h1>
              <p className="login-subtitle">
                Enter your account details to continue to AgriVerse.
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
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={loading}
                  required
                />
              </label>

              <div className="login-options">
                <label className="login-remember">
                  <input name="rememberMe" type="checkbox" />
                  <span>Remember me</span>
                </label>
                <a href="/forgot-password">Forgot password?</a>
              </div>

              <button className="login-button" type="submit" disabled={loading}>
                {loading ? 'Logging in…' : 'Log in'}
              </button>
            </form>

            <p className="login-register">
              Don&apos;t have an account? <a href="/register">Sign up</a>
            </p>
          </div>
        </div>

        <aside className="login-hero" aria-label="AgriVerse community">
          <div className="login-hero-content">
            <p className="login-hero-eyebrow">Your agricultural community</p>
            <h2>Grow better, together.</h2>
            <p className="login-hero-copy">
              Access trusted sellers, agricultural products, farm updates,
              and the people who help every harvest move forward.
            </p>

            <div className="login-highlights">
              <div>
                <strong>Connect</strong>
                <span>with local agricultural partners</span>
              </div>
              <div>
                <strong>Discover</strong>
                <span>products and farm opportunities</span>
              </div>
              <div>
                <strong>Support</strong>
                <span>stronger farming communities</span>
              </div>
            </div>

            <span className="login-image-note">
              Your supplied farm image will appear in this panel
            </span>
          </div>
        </aside>
      </section>
    </main>
  )
}
