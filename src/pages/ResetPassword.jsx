import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'

const initialForm = {
  password: '',
  confirmPassword: '',
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const { token } = useParams()
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

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const { data } = await api.put(`/auth/resetpassword/${token}`, {
        password: form.password,
      })

      setSuccessMessage(data.message || 'Password has been successfully reset.')
      setForm(initialForm)

      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'Unable to reset your password right now. Please request a new link and try again.',
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
            <span>Secure Recovery</span>
          </div>
          <h1 className="login-brand-heading">
            Set a fresh password
            <br />
            <span className="login-brand-accent">and return confidently</span>
          </h1>
          <p className="login-brand-desc">
            This recovery screen uses your reset token from the URL and sends the new password to the backend endpoint that restores account access.
          </p>
          <div className="login-brand-stats">
            {[
              { val: '1 token', label: 'Protected link' },
              { val: '2 fields', label: 'Fast reset' },
              { val: 'Ready', label: 'Back to login' },
            ].map((item) => (
              <div key={item.label} className="login-stat">
                <div className="login-stat-val">{item.val}</div>
                <div className="login-stat-label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="login-brand-footer">Choose a strong new password and continue with a safer account.</p>
      </div>

      <div className="login-form-panel">
        <div className="login-form-inner">
          <div className="login-form-heading">
            <h2>Reset password</h2>
            <p>Enter and confirm the new password you want to use for your Safe Cycling account</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div>
              <label htmlFor="password">New password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input"
                placeholder="Enter a new password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="input"
                placeholder="Repeat the new password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange}
              />
            </div>

            {!token ? (
              <div className="login-message login-message-error">
                Reset token is missing or invalid. Request a new reset link to continue.
              </div>
            ) : null}

            {error ? (
              <div className="login-message login-message-error">{error}</div>
            ) : null}

            {successMessage ? (
              <div className="login-message login-message-success">{successMessage}</div>
            ) : null}

            <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting || !token}>
              {isSubmitting ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin-icon">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" />
                    <path d="M21 12a9 9 0 00-9-9" />
                  </svg>
                  Resetting password...
                </>
              ) : (
                'Reset password'
              )}
            </button>
          </form>

          <p className="login-signup-text">
            Need another email?{' '}
            <Link to="/forgot-password" className="btn-link">Request a new link</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
