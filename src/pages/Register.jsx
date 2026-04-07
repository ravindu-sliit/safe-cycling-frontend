import { startTransition, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

const initialForm = {
  name: '',
  email: '',
  password: '',
  cyclingStyle: 'commuter',
}

const cyclingStyles = [
  { value: 'commuter', label: 'Commuter' },
  { value: 'fitness', label: 'Fitness rider' },
  { value: 'adventure', label: 'Adventure rider' },
  { value: 'casual', label: 'Casual explorer' },
]

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const payload = {
        ...form,
        role: 'user',
      }

      const { data } = await api.post('/users', payload)
      setSuccessMessage(
        data.message || 'Registration successful. Please check your email to verify your account.',
      )
      setForm(initialForm)

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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5.5" cy="17.5" r="3.5" />
              <circle cx="18.5" cy="17.5" r="3.5" />
              <path d="M15 6h-5l-3 9" />
              <path d="M18.5 14l-3.5-8H9" />
              <path d="M5.5 14l4-8" />
            </svg>
          </div>
          <span className="login-brand-name">Safe Cycling</span>
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
            Create your account once, verify your email, and start with the cycling preferences your platform already understands.
          </p>
          <div className="login-brand-stats">
            {[
              { val: '2 min', label: 'Quick setup' },
              { val: '1 email', label: 'Verification flow' },
              { val: '4 styles', label: 'Ride profiles' },
            ].map((item) => (
              <div key={item.label} className="login-stat">
                <div className="login-stat-val">{item.val}</div>
                <div className="login-stat-label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="login-brand-footer">Create your Safe Cycling identity and get ready for safer trips.</p>
      </div>

      <div className="login-form-panel">
        <div className="login-form-inner">
          <div className="login-form-heading">
            <h2>Create account</h2>
            <p>Register your rider profile to access routes, hazards, and community features</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div>
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="input"
                placeholder="Your full name"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input"
                placeholder="Create a secure password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="cyclingStyle">Cycling style</label>
              <select
                id="cyclingStyle"
                name="cyclingStyle"
                className="input auth-select"
                value={form.cyclingStyle}
                onChange={handleChange}
              >
                {cyclingStyles.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
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
