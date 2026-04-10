import { startTransition, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext.jsx'

const initialForm = {
  email: '',
  password: '',
}

const initialTwoFactorState = {
  required: false,
  token: '',
  email: '',
  expiresAt: '',
}

const isVerificationError = (message = '') =>
  String(message).toLowerCase().includes('verify your email')

const formatTwoFactorExpiry = (value) => {
  if (!value) return 'in 10 minutes'

  const nextDate = new Date(value)
  if (Number.isNaN(nextDate.getTime())) {
    return 'in 10 minutes'
  }

  return `at ${nextDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [formData, setFormData] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [resendingVerification, setResendingVerification] = useState(false)
  const [twoFactorState, setTwoFactorState] = useState(initialTwoFactorState)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [verifyingTwoFactor, setVerifyingTwoFactor] = useState(false)
  const [resendingTwoFactor, setResendingTwoFactor] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showResendVerification, setShowResendVerification] = useState(false)

  useEffect(() => {
    if (searchParams.get('verified') === '1') {
      setSuccessMessage('Your email has been verified. Sign in to continue.')
    }
  }, [searchParams])

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleTwoFactorCodeChange = (event) => {
    setTwoFactorCode(event.target.value)
  }

  const getTargetPath = (nextUser) => {
    return nextUser?.role === 'admin' ? '/admin/dashboard' : '/dashboard'
  }

  const resetTwoFactorState = () => {
    setTwoFactorState(initialTwoFactorState)
    setTwoFactorCode('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage(searchParams.get('verified') === '1' ? 'Your email has been verified. Sign in to continue.' : '')
    setShowResendVerification(false)

    try {
      const { data } = await api.post('/auth/login', formData)

      if (data.requiresTwoFactor) {
        setTwoFactorState({
          required: true,
          token: data.twoFactorToken || '',
          email: data.user?.email || formData.email.trim(),
          expiresAt: data.twoFactorCodeExpiresAt || '',
        })
        setTwoFactorCode('')
        setSuccessMessage(data.message || 'Check your email for the verification code.')
        return
      }

      login({ token: data.token, user: data.user })
      setSuccessMessage(data.message || 'Login successful.')
      resetTwoFactorState()

      startTransition(() => {
        navigate(getTargetPath(data.user), { replace: true })
      })
    } catch (requestError) {
      const nextError =
        requestError.response?.data?.message ||
        'Unable to sign in right now. Please check your details and try again.'

      setError(nextError)
      setShowResendVerification(isVerificationError(nextError))
    } finally {
      setLoading(false)
    }
  }

  const handleTwoFactorSubmit = async (event) => {
    event.preventDefault()
    setVerifyingTwoFactor(true)
    setError('')

    try {
      const { data } = await api.post('/auth/verify-2fa', {
        twoFactorToken: twoFactorState.token,
        code: twoFactorCode.trim(),
      })

      login({ token: data.token, user: data.user })
      setSuccessMessage(data.message || '2-step verification successful.')
      resetTwoFactorState()

      startTransition(() => {
        navigate(getTargetPath(data.user), { replace: true })
      })
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to verify the code right now. Please try again.',
      )
    } finally {
      setVerifyingTwoFactor(false)
    }
  }

  const handleResendVerification = async () => {
    const email = formData.email.trim()

    if (!email) {
      setError('Enter your email address first so we know where to send the verification link.')
      return
    }

    setResendingVerification(true)
    setError('')

    try {
      const { data } = await api.post('/auth/resend-verification', { email })
      setSuccessMessage(data.message || 'Verification email sent. Please check your inbox.')
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to resend the verification email right now.',
      )
    } finally {
      setResendingVerification(false)
    }
  }

  const handleResendTwoFactor = async () => {
    if (!twoFactorState.token) {
      setError('Your 2-step verification session has expired. Please sign in again.')
      return
    }

    setResendingTwoFactor(true)
    setError('')

    try {
      const { data } = await api.post('/auth/resend-2fa', {
        twoFactorToken: twoFactorState.token,
      })

      setTwoFactorState((current) => ({
        ...current,
        token: data.twoFactorToken || current.token,
        expiresAt: data.twoFactorCodeExpiresAt || current.expiresAt,
      }))
      setSuccessMessage(data.message || 'A new verification code has been sent.')
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to resend the verification code right now.',
      )
    } finally {
      setResendingTwoFactor(false)
    }
  }

  const handleBackToSignIn = () => {
    setError('')
    setSuccessMessage('')
    resetTwoFactorState()
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
            <span>Community Platform</span>
          </div>
          <h1 className="login-brand-heading">
            Safer roads
            <br />
            <span className="login-brand-accent">for every cyclist</span>
          </h1>
          <p className="login-brand-desc">
            Report hazards, discover safe routes, and connect with your cycling community.
          </p>
          <div className="login-brand-stats">
            {[
              { val: '12K+', label: 'Active riders' },
              { val: '3.4K', label: 'Hazards mapped' },
              { val: '98%', label: 'Safety rate' },
            ].map((item) => (
              <div key={item.label} className="login-stat">
                <div className="login-stat-val">{item.val}</div>
                <div className="login-stat-label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="login-brand-footer">© 2026 Safe Cycling. All rights reserved.</p>
      </div>

      <div className="login-form-panel">
        <div className="login-form-inner">
          <div className="login-form-heading">
            <h2>{twoFactorState.required ? 'Check your email' : 'Welcome back'}</h2>
            <p>
              {twoFactorState.required
                ? 'Enter the 6-digit verification code to finish signing in.'
                : 'Sign in to your account to continue'}
            </p>
          </div>

          {error ? (
            <div className="login-message login-message-error">{error}</div>
          ) : null}

          {successMessage ? (
            <div className="login-message login-message-success">{successMessage}</div>
          ) : null}

          {!twoFactorState.required ? (
            <>
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
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <div className="login-password-row">
                    <label htmlFor="password" className="label-inline">Password</label>
                    <Link to="/forgot-password" className="btn-link">Forgot password?</Link>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="input"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>

                {showResendVerification ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-full"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                  >
                    {resendingVerification ? 'Sending verification email...' : 'Resend verification email'}
                  </button>
                ) : null}

                

                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin-icon">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" />
                        <path d="M21 12a9 9 0 00-9-9" />
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              <div className="sep-text">or continue with</div>

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

              <p className="login-signup-text">
                Don't have an account?{' '}
                <Link to="/register" className="btn-link">Create one free</Link>
              </p>
            </>
          ) : (
            <form onSubmit={handleTwoFactorSubmit} className="login-form">
              <div>
                <label htmlFor="two-factor-code">Verification code</label>
                <input
                  id="two-factor-code"
                  name="twoFactorCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  className="input"
                  placeholder="Enter the 6-digit code"
                  value={twoFactorCode}
                  onChange={handleTwoFactorCodeChange}
                />
              </div>

              <div className="login-message login-message-success">
                Code sent to {twoFactorState.email}. It expires {formatTwoFactorExpiry(twoFactorState.expiresAt)}.
              </div>

              <button type="submit" className="btn btn-primary btn-full" disabled={verifyingTwoFactor}>
                {verifyingTwoFactor ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin-icon">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" />
                      <path d="M21 12a9 9 0 00-9-9" />
                    </svg>
                    Verifying code...
                  </>
                ) : (
                  'Verify and continue'
                )}
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-full"
                onClick={handleResendTwoFactor}
                disabled={resendingTwoFactor}
              >
                {resendingTwoFactor ? 'Sending a new code...' : 'Resend verification code'}
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-full"
                onClick={handleBackToSignIn}
                disabled={verifyingTwoFactor || resendingTwoFactor}
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
