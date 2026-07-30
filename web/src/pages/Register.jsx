import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { supabase } from '../lib/supabase.js'
import {
  getCityMunicipalityBarangays,
  getProvinceCitiesMunicipalities,
  getRegionCitiesMunicipalities,
  getRegionProvinces,
  getRegions,
} from '../services/psgc.js'
import '../styles/register.css'

function Field({
  autoComplete,
  disabled,
  label,
  name,
  placeholder,
  type = 'text',
}) {
  return (
    <label className="register-field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        required
      />
    </label>
  )
}

function SelectField({
  disabled,
  label,
  name,
  onChange,
  options,
  placeholder,
  value,
}) {
  return (
    <label className="register-field">
      <span>{label}</span>
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function Register() {
  const { loading: sessionLoading, user } = useAuth()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [regions, setRegions] = useState([])
  const [provinces, setProvinces] = useState([])
  const [citiesMunicipalities, setCitiesMunicipalities] = useState([])
  const [barangays, setBarangays] = useState([])
  const [regionCode, setRegionCode] = useState('')
  const [provinceCode, setProvinceCode] = useState('')
  const [cityMunicipalityCode, setCityMunicipalityCode] = useState('')
  const [barangayCode, setBarangayCode] = useState('')
  const [loadingRegions, setLoadingRegions] = useState(true)
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadingBarangays, setLoadingBarangays] = useState(false)
  const provinceNotApplicable = regionCode && !loadingProvinces && provinces.length === 0

  useEffect(() => {
    if (!sessionLoading && user) {
      window.location.replace('/buyer')
    }
  }, [sessionLoading, user])

  useEffect(() => {
    let active = true

    getRegions()
      .then((items) => {
        if (active) {
          setRegions(items)
          setAddressError('')
        }
      })
      .catch((loadError) => {
        if (active) {
          setAddressError(loadError.message)
        }
      })
      .finally(() => {
        if (active) {
          setLoadingRegions(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    setProvinceCode('')
    setCityMunicipalityCode('')
    setBarangayCode('')
    setProvinces([])
    setCitiesMunicipalities([])
    setBarangays([])

    if (!regionCode) {
      return () => {
        active = false
      }
    }

    setLoadingProvinces(true)
    setLoadingCities(true)

    Promise.all([
      getRegionProvinces(regionCode),
      getRegionCitiesMunicipalities(regionCode),
    ])
      .then(([provinceItems, cityItems]) => {
        if (active) {
          setProvinces(provinceItems)
          if (provinceItems.length === 0) {
            setCitiesMunicipalities(cityItems)
          }
          setAddressError('')
        }
      })
      .catch((loadError) => {
        if (active) {
          setAddressError(loadError.message)
        }
      })
      .finally(() => {
        if (active) {
          setLoadingProvinces(false)
          setLoadingCities(false)
        }
      })

    return () => {
      active = false
    }
  }, [regionCode])

  useEffect(() => {
    let active = true

    setCityMunicipalityCode('')
    setBarangayCode('')
    setCitiesMunicipalities([])
    setBarangays([])

    if (!provinceCode) {
      return () => {
        active = false
      }
    }

    setLoadingCities(true)
    getProvinceCitiesMunicipalities(provinceCode)
      .then((items) => {
        if (active) {
          setCitiesMunicipalities(items)
          setAddressError('')
        }
      })
      .catch((loadError) => {
        if (active) {
          setAddressError(loadError.message)
        }
      })
      .finally(() => {
        if (active) {
          setLoadingCities(false)
        }
      })

    return () => {
      active = false
    }
  }, [provinceCode])

  useEffect(() => {
    let active = true

    setBarangayCode('')
    setBarangays([])

    if (!cityMunicipalityCode) {
      return () => {
        active = false
      }
    }

    setLoadingBarangays(true)
    getCityMunicipalityBarangays(cityMunicipalityCode)
      .then((items) => {
        if (active) {
          setBarangays(items)
          setAddressError('')
        }
      })
      .catch((loadError) => {
        if (active) {
          setAddressError(loadError.message)
        }
      })
      .finally(() => {
        if (active) {
          setLoadingBarangays(false)
        }
      })

    return () => {
      active = false
    }
  }, [cityMunicipalityCode])

  async function handleSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const email = form.get('email').trim()
    const password = form.get('password')
    const confirmPassword = form.get('confirmPassword')

    setError('')
    setMessage('')

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const selectedRegion = regions.find((item) => item.code === regionCode)
    const selectedProvince = provinces.find((item) => item.code === provinceCode)
    const selectedCityMunicipality = citiesMunicipalities.find(
      (item) => item.code === cityMunicipalityCode,
    )
    const selectedBarangay = barangays.find((item) => item.code === barangayCode)

    if (!selectedRegion || !selectedCityMunicipality || !selectedBarangay) {
      setError('Complete the guided address fields before creating your account.')
      return
    }

    if (!provinceNotApplicable && !selectedProvince) {
      setError('Select your province before creating your account.')
      return
    }

    setSubmitting(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: form.get('fullName').trim(),
          mobile_number: form.get('mobileNumber').trim(),
          country: 'Philippines',
          region: selectedRegion.name,
          province: selectedProvince?.name ?? null,
          city_municipality: selectedCityMunicipality.name,
          barangay: selectedBarangay.name,
        },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
    } else if (data.session) {
      window.location.replace('/buyer')
    } else {
      formElement.reset()
      setMessage(
        'Account created. Check your email and click the verification link before logging in.',
      )
    }

    setSubmitting(false)
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
              {error && (
                <div className="register-alert register-alert-error" role="alert">
                  {error}
                </div>
              )}
              {message && (
                <div className="register-alert register-alert-success" role="status">
                  {message}
                </div>
              )}

              <Field
                label="Full name"
                name="fullName"
                autoComplete="name"
                placeholder="Enter your full name"
                disabled={submitting}
              />

              <Field
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                disabled={submitting}
              />

              <Field
                label="Mobile number"
                name="mobileNumber"
                type="tel"
                autoComplete="tel"
                placeholder="+63 900 000 0000"
                disabled={submitting}
              />

              <div className="register-row">
                <Field
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  disabled={submitting}
                />
                <Field
                  label="Confirm password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  disabled={submitting}
                />
              </div>

              {addressError && (
                <div className="register-alert register-alert-error" role="alert">
                  {addressError}
                </div>
              )}

              <div className="register-row">
                <label className="register-field">
                  <span>Country</span>
                  <select value="Philippines" disabled>
                    <option value="Philippines">Philippines</option>
                  </select>
                </label>
                <SelectField
                  label="Region"
                  name="regionCode"
                  value={regionCode}
                  onChange={(event) => setRegionCode(event.target.value)}
                  options={regions}
                  placeholder={loadingRegions ? 'Loading regions…' : 'Select region'}
                  disabled={loadingRegions || submitting}
                />
              </div>

              <div className="register-row">
                {provinceNotApplicable ? (
                  <label className="register-field">
                    <span>Province</span>
                    <select value="not-applicable" disabled>
                      <option value="not-applicable">Not applicable</option>
                    </select>
                  </label>
                ) : (
                  <SelectField
                    label="Province"
                    name="provinceCode"
                    value={provinceCode}
                    onChange={(event) => setProvinceCode(event.target.value)}
                    options={provinces}
                    placeholder={
                      loadingProvinces ? 'Loading provinces…' : 'Select province'
                    }
                    disabled={!regionCode || loadingProvinces || submitting}
                  />
                )}
                <SelectField
                  label="City / Municipality"
                  name="cityMunicipalityCode"
                  value={cityMunicipalityCode}
                  onChange={(event) => setCityMunicipalityCode(event.target.value)}
                  options={citiesMunicipalities}
                  placeholder={
                    loadingCities
                      ? 'Loading cities…'
                      : 'Select city or municipality'
                  }
                  disabled={
                    !regionCode ||
                    (!provinceNotApplicable && !provinceCode) ||
                    loadingCities ||
                    submitting
                  }
                />
              </div>

              <SelectField
                label="Barangay"
                name="barangayCode"
                value={barangayCode}
                onChange={(event) => setBarangayCode(event.target.value)}
                options={barangays}
                placeholder={
                  loadingBarangays ? 'Loading barangays…' : 'Select barangay'
                }
                disabled={!cityMunicipalityCode || loadingBarangays || submitting}
              />

              <button className="register-button" type="submit" disabled={submitting}>
                {submitting ? 'Creating account…' : 'Create account'}
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
