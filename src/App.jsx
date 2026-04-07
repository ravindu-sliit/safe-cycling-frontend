import { useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Login from './pages/Login.jsx'
import MapDashboard from './pages/MapDashboard.jsx'
import Hazards from './pages/Hazards.jsx'
import Reviews from './pages/Reviews.jsx'
import './App.css'

/* ── Icons ──────────────────────────────────────────────── */
function IconBike() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6h-5l-3 9" />
      <path d="M18.5 14l-3.5-8H9" />
      <path d="M5.5 14l4-8" />
    </svg>
  )
}
function IconMap() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  )
}
function IconAlert() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
function IconStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}
function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

const NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconMap },
  { to: '/hazards',   label: 'Hazards',   Icon: IconAlert },
  { to: '/reviews',   label: 'Reviews',   Icon: IconStar },
  { to: '/login',     label: 'Account',   Icon: IconUser },
]

function Navbar() {
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <header className="topnav">
        <div className="topnav-inner">
          {/* Logo */}
          <Link to="/dashboard" className="topnav-logo" onClick={() => setMobileOpen(false)}>
            <div className="topnav-logo-icon">
              <IconBike />
            </div>
            <div className="topnav-logo-text">
              Safe<span>Cycling</span>
            </div>
          </Link>

          {/* Nav links + actions – all right aligned */}
          <div className="topnav-right">
            <nav className="topnav-links">
              {NAV.map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`topnav-link${pathname === to ? ' active' : ''}`}
                >
                  <Icon />
                  {label}
                </Link>
              ))}
            </nav>

            <div className="topnav-actions">
              <button className="topnav-icon-btn" aria-label="Notifications">
                <span className="notif-dot" />
                <IconBell />
              </button>
              <div className="topnav-avatar">JD</div>

              {/* Mobile hamburger */}
              <button
                className="topnav-icon-btn mobile-only"
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <IconClose /> : <IconMenu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <nav className="topnav-mobile">
            {NAV.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                className={`topnav-mobile-link${pathname === to ? ' active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon />
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>
    </>
  )
}

function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/"          element={<Navigate to="/dashboard" replace />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/dashboard" element={<MapDashboard />} />
          <Route path="/hazards"   element={<Hazards />} />
          <Route path="/reviews"   element={<Reviews />} />
          <Route path="*"          element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
