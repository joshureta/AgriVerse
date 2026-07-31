import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { supabase } from '../lib/supabase.js'
import {
  getCityMunicipalityBarangays,
  getProvinceCitiesMunicipalities,
  getRegionCitiesMunicipalities,
  getRegionProvinces,
  getRegions,
} from '../services/psgc.js'
import jtoledoLogo from '../assets/Jtoledologo.png'
import '../styles/register.css'

function Field({
  autoComplete,
  disabled,
  label,
  name,
  onChange,
  placeholder,
  type = 'text',
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'

  return (
    <label className="register-field">
      <span>{label}</span>
      <div className={isPassword ? 'register-input-shell' : undefined}>
        <input
          name={name}
          type={isPassword && showPassword ? 'text' : type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          onChange={onChange}
          required
        />
        {isPassword && (
          <button
            className={`register-password-toggle${showPassword ? ' is-visible' : ''}`}
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={showPassword}
            disabled={disabled}
          />
        )}
      </div>
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
  const formRef = useRef(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [passwordValue, setPasswordValue] = useState('')
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('')
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
  const passwordChecks = [
    { label: '8+ characters', met: passwordValue.length >= 8 },
    { label: '1 uppercase letter', met: /[A-Z]/.test(passwordValue) },
    { label: '1 number', met: /\d/.test(passwordValue) },
    { label: '1 special character', met: /[^A-Za-z0-9]/.test(passwordValue) },
  ]
  const passwordScore = passwordChecks.filter((check) => check.met).length
  const registrationSteps = ['Personal info', 'Security', 'Location']

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

  function validateCurrentStep() {
    setError('')
    const stepElement = formRef.current?.querySelector(
      `[data-register-step="${currentStep}"]`,
    )
    const fields = Array.from(
      stepElement?.querySelectorAll('input, select') ?? [],
    ).filter((field) => !field.disabled)

    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity()
        return false
      }
    }

    if (currentStep === 1 && passwordScore < passwordChecks.length) {
      setError('Create a password that meets all four security requirements.')
      return false
    }

    if (currentStep === 1 && passwordValue !== confirmPasswordValue) {
      setError('Passwords do not match.')
      return false
    }

    return true
  }

  function handleNextStep() {
    if (validateCurrentStep()) {
      setCurrentStep((step) => Math.min(step + 1, registrationSteps.length - 1))
    }
  }

  function handlePreviousStep() {
    setError('')
    setCurrentStep((step) => Math.max(step - 1, 0))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const email = form.get('email').trim()
    const password = form.get('password')
    const confirmPassword = form.get('confirmPassword')

    setError('')
    setMessage('')

    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      setError('Create a password that meets all four security requirements.')
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
      setCurrentStep(0)
      setPasswordValue('')
      setConfirmPasswordValue('')
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
              <img src={jtoledoLogo} alt="Jtoledo Trading" />
            </div>

            <h1 className="register-heading" id="register-title">Create Account</h1>
            <p className="register-subtitle">
              Complete three quick steps to get started.
            </p>

            <ol className="register-steps" aria-label="Account creation progress">
              {registrationSteps.map((step, index) => (
                <li
                  key={step}
                  className={[
                    index === currentStep ? 'is-current' : '',
                    index < currentStep ? 'is-complete' : '',
                  ].filter(Boolean).join(' ')}
                  aria-current={index === currentStep ? 'step' : undefined}
                >
                  <span>{index < currentStep ? '✓' : index + 1}</span>
                  <small>{step}</small>
                </li>
              ))}
            </ol>

            <form ref={formRef} className="register-form" onSubmit={handleSubmit}>
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

              <fieldset
                className="register-section"
                data-register-step="0"
                hidden={currentStep !== 0}
              >
                <legend>Personal information</legend>
                <div className="register-row">
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
                </div>
                <Field
                  label="Mobile number"
                  name="mobileNumber"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+63 900 000 0000"
                  disabled={submitting}
                />
              </fieldset>

              <fieldset
                className="register-section"
                data-register-step="1"
                hidden={currentStep !== 1}
              >
                <legend>Security</legend>
                <div className="register-row">
                  <Field
                    label="Password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    disabled={submitting}
                    onChange={(event) => setPasswordValue(event.target.value)}
                  />
                  <Field
                    label="Confirm password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    disabled={submitting}
                    onChange={(event) => setConfirmPasswordValue(event.target.value)}
                  />
                </div>
                {confirmPasswordValue && confirmPasswordValue !== passwordValue && (
                  <p className="register-inline-error" role="alert">
                    Passwords do not match.
                  </p>
                )}
                <div className="register-password-guide" aria-live="polite">
                  <div className="register-strength-bar" aria-hidden="true">
                    {passwordChecks.map((check, index) => (
                      <span
                        key={check.label}
                        className={index < passwordScore ? 'is-met' : ''}
                      />
                    ))}
                  </div>
                  <p>
                    Password strength:{' '}
                    {['Not set', 'Weak', 'Fair', 'Good', 'Strong'][passwordScore]}
                  </p>
                  <ul>
                    {passwordChecks.map((check) => (
                      <li key={check.label} className={check.met ? 'is-met' : ''}>
                        {check.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </fieldset>

              <fieldset
                className="register-section"
                data-register-step="2"
                hidden={currentStep !== 2}
              >
                <legend>Location</legend>
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
                <label className="register-consent">
                  <input
                    name="termsAccepted"
                    type="checkbox"
                    required
                    disabled={submitting}
                  />
                  <span>
                    I agree to the <strong>Terms of Service</strong> and{' '}
                    <strong>Privacy Policy</strong>.
                  </span>
                </label>
              </fieldset>

              <div className={`register-actions${currentStep === 0 ? ' is-single' : ''}`}>
                {currentStep > 0 && (
                  <button
                    className="register-back"
                    type="button"
                    onClick={handlePreviousStep}
                    disabled={submitting}
                  >
                    Back
                  </button>
                )}

                {currentStep < registrationSteps.length - 1 ? (
                  <button
                    className="register-next"
                    type="button"
                    onClick={handleNextStep}
                    disabled={submitting}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    className="register-button"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting && (
                      <span className="register-spinner" aria-hidden="true" />
                    )}
                    <span>{submitting ? 'Creating account…' : 'Sign up'}</span>
                  </button>
                )}
              </div>
            </form>

            <p className="register-login">
              Already have an account? <a href="/login">Sign in</a>
            </p>
          </div>
        </div>

        <aside className="register-hero" aria-label="Welcome to Jtoledo Trading">
          <div className="register-hero-content">
            <h2>Welcome to<br />Jtoledo Trading</h2>
            <p className="register-hero-copy">
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
