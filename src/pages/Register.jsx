import { startTransition, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PasswordField from '../components/PasswordField.jsx'
import api from '../services/api'
import { BRAND_LOGO_SRC, BRAND_NAME } from '../constants/brand.js'

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const emptyFieldErrors = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validateField = (name, value, formState) => {
  switch (name) {
    case 'name': {
      const trimmedName = value.trim()

      if (!trimmedName) return 'Full name is required.'
      if (trimmedName.length < 2) return 'Full name must be at least 2 characters.'
      return ''
    }

    case 'email': {
      const trimmedEmail = value.trim()

      if (!trimmedEmail) return 'Email address is required.'
      if (!emailPattern.test(trimmedEmail)) return 'Enter a valid email address.'
      return ''
    }

    case 'password': {
      if (!value) return 'Password is required.'
      if (value.length < 8) return 'Password must be at least 8 characters.'
      if (!/[a-z]/.test(value)) return 'Password must include at least one lowercase letter.'
      if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter.'
      if (!/\d/.test(value)) return 'Password must include at least one number.'
      return ''
    }

    case 'confirmPassword':
      if (!value) return 'Please confirm your password.'
      if (value !== formState.password) return 'Passwords do not match.'
      return ''

    default:
      return ''
  }
}

const validateForm = (formState) => ({
  name: validateField('name', formState.name, formState),
  email: validateField('email', formState.email, formState),
  password: validateField('password', formState.password, formState),
  confirmPassword: validateField('confirmPassword', formState.confirmPassword, formState),
})

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [fieldErrors, setFieldErrors] = useState(emptyFieldErrors)
  const [touchedFields, setTouchedFields] = useState({})
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setError('')

    setForm((current) => {
      const nextForm = {
        ...current,
        [name]: value,
      }

      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        ...(touchedFields[name] ? { [name]: validateField(name, value, nextForm) } : {}),
        ...(name === 'password' && touchedFields.confirmPassword
          ? { confirmPassword: validateField('confirmPassword', nextForm.confirmPassword, nextForm) }
          : {}),
      }))

      return nextForm
    })
  }

  const handleBlur = (event) => {
    const { name, value } = event.target

    setTouchedFields((current) => ({
      ...current,
      [name]: true,
    }))

    setFieldErrors((current) => ({
      ...current,
      [name]: validateField(name, value, form),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    const nextFieldErrors = validateForm(form)
    const hasValidationError = Object.values(nextFieldErrors).some(Boolean)

    setFieldErrors(nextFieldErrors)
    setTouchedFields({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    })

    if (hasValidationError) {
      setError('Please fix the highlighted fields and try again.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: 'user',
      }

      const { data } = await api.post('/users', payload)
      setSuccessMessage(
        data.message || 'Registration successful. Please check your email to verify your account.',
      )
      setForm(initialForm)
      setFieldErrors(emptyFieldErrors)
      setTouchedFields({})

      setTimeout(() => {
        startTransition(() => {
          navigate('/login')
        })
      }, 1400)
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'Unable to create your account right now. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-blob login-blob-1" />
        <div className="login-blob login-blob-2" />

        <div className="login-brand-logo">
          <div className="login-brand-icon">
            <img src={BRAND_LOGO_SRC} alt="" aria-hidden="true" className="login-brand-img" />
          </div>
          <span className="login-brand-name">{BRAND_NAME}</span>
        </div>

        <div className="login-brand-copy">
          <div className="login-brand-pill">
            <div className="login-brand-dot" />
            <span>New Rider Setup</span>
          </div>
          <h1 className="login-brand-heading">
            Build your rider
            <br />
            <span className="login-brand-accent">profile the right way</span>
          </h1>
          <p className="login-brand-desc">
            Create your account once, verify your email, and choose ride preferences later from your profile.
          </p>
          <div className="login-brand-stats">
            {[
              { val: '2 min', label: 'Quick setup' },
              { val: '1 email', label: 'Verification flow' },
              { val: 'Later', label: 'Profile setup' },
            ].map((item) => (
              <div key={item.label} className="login-stat">
                <div className="login-stat-val">{item.val}</div>
                <div className="login-stat-label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="login-brand-footer">Create your {BRAND_NAME} identity and get ready for safer trips.</p>
      </div>

      <div className="login-form-panel">
        <div className="login-form-inner">
          <div className="login-form-heading">
            <h2>Create account</h2>
            <p>Register your rider profile to access routes, hazards, and community features</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div>
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className={`input${fieldErrors.name ? ' input-error' : ''}`}
                placeholder="Your full name"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={fieldErrors.name ? 'true' : 'false'}
                aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
              />
              {fieldErrors.name ? (
                <span id="register-name-error" className="auth-field-error">{fieldErrors.name}</span>
              ) : null}
            </div>

            <div>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={`input${fieldErrors.email ? ' input-error' : ''}`}
                placeholder="you@example.com"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={fieldErrors.email ? 'true' : 'false'}
                aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
              />
              {fieldErrors.email ? (
                <span id="register-email-error" className="auth-field-error">{fieldErrors.email}</span>
              ) : null}
            </div>

            <div>
              <label htmlFor="password">Password</label>
              <PasswordField
                id="password"
                name="password"
                required
                className={`input${fieldErrors.password ? ' input-error' : ''}`}
                placeholder="Create a secure password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={fieldErrors.password ? 'true' : 'false'}
                aria-describedby={fieldErrors.password ? 'register-password-help register-password-error' : 'register-password-help'}
              />
              <span id="register-password-help" className="auth-field-hint">
                Use at least 8 characters with uppercase, lowercase, and a number.
              </span>
              {fieldErrors.password ? (
                <span id="register-password-error" className="auth-field-error">{fieldErrors.password}</span>
              ) : null}
            </div>

            <div>
              <label htmlFor="confirmPassword">Confirm password</label>
              <PasswordField
                id="confirmPassword"
                name="confirmPassword"
                required
                className={`input${fieldErrors.confirmPassword ? ' input-error' : ''}`}
                placeholder="Confirm your password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={fieldErrors.confirmPassword ? 'true' : 'false'}
                aria-describedby={fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined}
              />
              {fieldErrors.confirmPassword ? (
                <span id="register-confirm-password-error" className="auth-field-error">{fieldErrors.confirmPassword}</span>
              ) : null}
            </div>

            <div className="login-oauth-grid">
                <button type="button" className="btn btn-ghost">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
                <button type="button" className="btn btn-ghost">
                  <svg width="18" height="18" fill="var(--text-primary)" viewBox="0 0 24 24">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </button>
              </div>

            {error ? (
              <div className="login-message login-message-error">{error}</div>
            ) : null}

            {successMessage ? (
              <div className="login-message login-message-success">{successMessage}</div>
            ) : null}

            <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin-icon">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" />
                    <path d="M21 12a9 9 0 00-9-9" />
                  </svg>
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="login-signup-text">
            Already registered?{' '}
            <Link to="/login" className="btn-link">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
