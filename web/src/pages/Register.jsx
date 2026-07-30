import '../styles/register.css'

function Field({ label, name, type = 'text', autoComplete, placeholder }) {
  return (
    <label className="register-field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
      />
    </label>
  )
}

export default function Register() {
  function handleSubmit(event) {
    event.preventDefault()
    // Supabase Buyer registration will be connected here later.
  }

  return (
    <main className="register-page">
      <section className="register-shell" aria-labelledby="register-title">
        <div className="register-form-panel">
          <div className="register-form-wrap">
            <div className="register-brand">
              <span className="register-brand-mark" aria-hidden="true">A</span>
              <span>AgriVerse</span>
            </div>

            <h1 className="register-heading" id="register-title">Create Account</h1>
            <p className="register-subtitle">
              Join the agricultural community and get started.
            </p>

            <form className="register-form" onSubmit={handleSubmit}>
              <Field
                label="Full name"
                name="fullName"
                autoComplete="name"
                placeholder="Enter your full name"
              />

              <Field
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
              />

              <Field
                label="Mobile number"
                name="mobileNumber"
                type="tel"
                autoComplete="tel"
                placeholder="+63 900 000 0000"
              />

              <div className="register-row">
                <Field
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
                <Field
                  label="Confirm password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat password"
                />
              </div>

              <div className="register-row">
                <Field
                  label="Country"
                  name="country"
                  autoComplete="country-name"
                  placeholder="Enter your country"
                />
                <Field
                  label="Region"
                  name="region"
                  autoComplete="address-level1"
                  placeholder="Enter your region"
                />
              </div>

              <button className="register-button" type="submit">
                Create account
              </button>
            </form>

            <p className="register-login">
              Already have an account? <a href="/login">Log in</a>
            </p>
          </div>
        </div>

        <aside className="register-hero" aria-label="Welcome to AgriVerse">
          <div className="register-hero-content">
            <p className="register-hero-eyebrow">Grow · Connect · Prosper</p>
            <h2>Welcome to AgriVerse</h2>
            <p className="register-hero-copy">
              A shared digital space for farmers, workers, sellers, drivers,
              and buyers to build stronger agricultural communities.
            </p>
            <span className="register-image-note">
              Your supplied farm image will appear in this panel
            </span>
          </div>
        </aside>
      </section>
    </main>
  )
}
