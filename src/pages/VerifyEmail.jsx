import { useEffect, useEffectEvent, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext.jsx'

const extractProfilePayload = (payload) => payload?.data || payload?.user || payload?.profile || payload || {}

const mergeStoredUser = (currentUser = {}, profile = {}) => {
  const nextId = profile._id || profile.id || currentUser._id || currentUser.id || ''

  return {
    ...currentUser,
    ...profile,
    id: nextId,
    _id: nextId,
    profileImageUrl: profile.profileImageUrl || currentUser.profileImageUrl || '',
    isVerified: Boolean(profile.isVerified ?? currentUser.isVerified),
    twoFactorEnabled: Boolean(profile.twoFactorEnabled ?? currentUser.twoFactorEnabled),
    preferences: profile.preferences || currentUser.preferences,
  }
}

export default function VerifyEmail() {
  const navigate = useNavigate()
  const { token } = useParams()
  const { isAuthenticated, updateUser, user } = useAuth()
  const [status, setStatus] = useState(() => (token ? 'loading' : 'error'))
  const [message, setMessage] = useState(() =>
    token ? 'Verifying your email address...' : 'Missing verification token.',
  )
  const [redirectPath, setRedirectPath] = useState('/login')

  const syncUser = useEffectEvent((profile) => {
    updateUser(mergeStoredUser(user, profile))
  })

  useEffect(() => {
    if (!token) {
      return undefined
    }

    let isActive = true
    let redirectTimer

    const verifyEmail = async () => {
      try {
        const { data } = await api.get(`/auth/verify/${token}`)

        if (!isActive) {
          return
        }

        setStatus('success')

        if (isAuthenticated) {
          try {
            const currentUserResponse = await api.get('/users/me')
            if (isActive) {
              syncUser(extractProfilePayload(currentUserResponse.data))
            }
          } catch {
            // Keep the redirect flow working even if refreshing the user fails.
          }

          setRedirectPath('/dashboard?verified=1')
          setMessage(data.message || 'Email successfully verified. Redirecting to your dashboard...')
          redirectTimer = window.setTimeout(() => {
            navigate('/dashboard?verified=1', { replace: true })
          }, 1200)
          return
        }

        setRedirectPath('/login?verified=1')
        setMessage(data.message || 'Email successfully verified. Redirecting to login...')
        redirectTimer = window.setTimeout(() => {
          navigate('/login?verified=1', { replace: true })
        }, 1200)
      } catch (requestError) {
        if (!isActive) {
          return
        }

        setStatus('error')
        setRedirectPath('/login')
        setMessage(
          requestError.response?.data?.message ||
          'This verification link is invalid or has already expired.',
        )
      }
    }

    verifyEmail()

    return () => {
      isActive = false
      window.clearTimeout(redirectTimer)
    }
  }, [isAuthenticated, navigate, token])

  const accentClasses =
    status === 'success'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
      : status === 'error'
        ? 'border-rose-100 bg-rose-50 text-rose-700'
        : 'border-sky-100 bg-sky-50 text-sky-700'

  return (
    <section className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 text-left shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-10">
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">
        Email verification
      </span>

      <h1 className="mt-6 text-4xl font-black tracking-[-0.04em] text-slate-900">
        Confirming your account access.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
        Older frontend verification links still work here. Once the backend confirms the token, you are moved into the right next step automatically.
      </p>

      <div className={`mt-8 rounded-3xl border px-5 py-5 text-sm font-medium ${accentClasses}`}>
        {message}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to={redirectPath}
          className="inline-flex items-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Continue
        </Link>
        <Link
          to="/register"
          className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Back to register
        </Link>
      </div>
    </section>
  )
}
