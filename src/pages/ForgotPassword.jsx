import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const { data } = await api.post('/auth/forgotpassword', { email })
      setSuccessMessage(data.message || 'Password reset email sent.')
      setEmail('')
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'Unable to send a password reset email right now. Please try again.',
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
            <span>Account Recovery</span>
          </div>
          <h1 className="login-brand-heading">
            Recover access
            <br />
            <span className="login-brand-accent">without losing progress</span>
          </h1>
          <p className="login-brand-desc">
            Send a secure reset link to the email linked to your account, then choose a fresh password and get back on the road.
          </p>
          <div className="login-brand-stats">
            {[
              { val: '1 email', label: 'Recovery request' },
              { val: 'Secure', label: 'Reset flow' },
              { val: 'Fast', label: 'Back to login' },
            ].map((item) => (
              <div key={item.label} className="login-stat">
                <div className="login-stat-val">{item.val}</div>
                <div className="login-stat-label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="login-brand-footer">Request a recovery email and reset your password in a few simple steps.</p>
      </div>

      <div className="login-form-panel">
        <div className="login-form-inner">
          <div className="login-form-heading">
            <h2>Forgot password</h2>
            <p>Enter the email address you used for Safe Cycling and we will send reset instructions</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
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
                  Sending email...
                </>
              ) : (
                'Send reset email'
              )}
            </button>
          </form>

          <p className="login-signup-text">
            Remembered your password?{' '}
            <Link to="/login" className="btn-link">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
