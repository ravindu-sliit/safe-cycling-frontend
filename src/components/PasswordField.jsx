import { useState } from 'react'

function EyeIcon({ off = false }) {
  if (off) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.58 10.58a2 2 0 102.83 2.83" />
        <path d="M9.88 5.09A10.94 10.94 0 0112 5c5 0 9.27 3.11 11 7-1 2.24-2.78 4.17-5.07 5.4" />
        <path d="M6.61 6.61C4.62 7.88 3.1 9.77 2 12c1.73 3.89 6 7 10 7 1.57 0 3.07-.31 4.43-.88" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export default function PasswordField({ className = '', ...inputProps }) {
  const [isVisible, setIsVisible] = useState(false)
  const toggleLabel = isVisible ? 'Hide password' : 'Show password'

  return (
    <div className="password-field">
      <input
        {...inputProps}
        type={isVisible ? 'text' : 'password'}
        className={[className, 'password-field-input'].filter(Boolean).join(' ')}
      />
      <button
        type="button"
        className="password-field-toggle"
        onClick={() => setIsVisible((current) => !current)}
        aria-label={toggleLabel}
        aria-pressed={isVisible}
        title={toggleLabel}
      >
        <EyeIcon off={isVisible} />
        <span>{isVisible ? 'Hide' : 'Show'}</span>
      </button>
    </div>
  )
}
