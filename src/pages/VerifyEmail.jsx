import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'

export default function VerifyEmail() {
  const { token } = useParams()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Verifying your email address...')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const { data } = await api.get(`/auth/verify/${token}`)
        setStatus('success')
        setMessage(data.message || 'Email successfully verified. You can now log in.')
      } catch (requestError) {
        setStatus('error')
        setMessage(
          requestError.response?.data?.message ||
            'This verification link is invalid or has already expired.',
        )
      }
    }

    if (!token) {
      setStatus('error')
      setMessage('Missing verification token.')
      return
    }

    verifyEmail()
  }, [token])

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
        This page calls your backend verification endpoint and turns the result into a clean frontend experience instead of a raw API response.
      </p>

      <div className={`mt-8 rounded-3xl border px-5 py-5 text-sm font-medium ${accentClasses}`}>
        {message}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/login"
          className="inline-flex items-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Go to login
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
