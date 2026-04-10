import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function IconBike() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6h-5l-3 9" />
      <path d="M18.5 14 15 6H9" />
      <path d="M5.5 14 9 6" />
    </svg>
  )
}

export default function SiteFooter() {
  const { isAuthenticated, user } = useAuth()
  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'
  const profilePath = user?.role === 'admin' ? '/admin/profile' : '/profile'
  const year = new Date().getFullYear()

  const primaryLinks = isAuthenticated
    ? [
        { to: dashboardPath, label: 'Dashboard' },
        { to: '/hazards', label: 'Hazards' },
        { to: '/reviews', label: 'Reviews' },
        { to: profilePath, label: 'Profile' },
      ]
    : [
        { to: '/login', label: 'Login' },
        { to: '/register', label: 'Register' },
        { to: '/forgot-password', label: 'Recover Access' },
      ]

  const riderFocus = [
    'Hazard visibility',
    'Route confidence',
    'Verified accounts',
  ]

  const trustSignals = [
    'Live route activity',
    'Community review flow',
    'Safer ride planning',
  ]

  return (
    <footer className="site-footer">
      <div className="site-footer-glow site-footer-glow-left" />
      <div className="site-footer-glow site-footer-glow-right" />

      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <div className="site-footer-logo">
            <div className="site-footer-logo-icon">
              <IconBike />
            </div>
            <div className="site-footer-logo-text">
              Safe<span>Cycling</span>
            </div>
          </div>

          <p className="site-footer-copy">
            A calmer control layer for riders who want cleaner route choices, faster hazard visibility,
            and a stronger cycling community.
          </p>

          <div className="site-footer-badges">
            {riderFocus.map((item) => (
              <span key={item} className="site-footer-badge">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="site-footer-links">
          <div className="site-footer-column">
            <span className="site-footer-column-title">Navigate</span>
            {primaryLinks.map((link) => (
              <Link key={link.to} to={link.to} className="site-footer-link">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="site-footer-column">
            <span className="site-footer-column-title">Platform</span>
            {trustSignals.map((item) => (
              <span key={item} className="site-footer-note">
                {item}
              </span>
            ))}
          </div>

          <div className="site-footer-column">
            <span className="site-footer-column-title">Status</span>
            <div className="site-footer-highlight">
              <strong>Always ride aware</strong>
              <span>Track community reports, route sentiment, and account activity in one place.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>© {year} Safe Cycling. Built for safer everyday rides.</span>
        <div className="site-footer-bottom-links">
          {primaryLinks.slice(0, 3).map((link) => (
            <Link key={link.to} to={link.to} className="site-footer-bottom-link">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
