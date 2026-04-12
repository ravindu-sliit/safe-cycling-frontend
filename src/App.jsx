import { useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import Profile from './pages/Profile.jsx'
import AdminProfile from './pages/AdminProfile.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import MapDashboard from './pages/MapDashboard.jsx'
import Hazards from './pages/Hazards.jsx'
import Reviews from './pages/Reviews.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { BRAND_LOGO_SRC, BRAND_NAME } from './constants/brand.js'
import { useAuth } from './context/AuthContext.jsx'

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

function Navbar() {
  const { pathname } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!isAuthenticated) {
    return null
  }

  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'
  const isMapPage = pathname === '/dashboard' || pathname === '/admin/map'
  const mapMode = searchParams.get('mode') === 'plan' ? 'plan' : 'explore'

  const handleMapModeChange = (mode) => {
    if (!isMapPage) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('mode', mode)
    setSearchParams(nextParams, { replace: true })
  }

  const accountPath = user?.role === 'admin' ? '/admin/profile' : '/profile'
  const navItems = [
    { to: dashboardPath, label: 'Dashboard', Icon: IconMap },
    ...(user?.role === 'admin' ? [{ to: '/admin/map', label: 'Map', Icon: IconMap }] : []),
    { to: '/hazards', label: 'Hazards', Icon: IconAlert },
    { to: '/reviews', label: 'Reviews', Icon: IconStar },
    { to: accountPath, label: 'Account', Icon: IconUser },
  ]

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <Link to={dashboardPath} className="topnav-logo" onClick={() => setMobileOpen(false)}>
          <div className="topnav-logo-icon">
            <img src={BRAND_LOGO_SRC} alt="" aria-hidden="true" className="topnav-logo-img" />
          </div>
          <div className="topnav-logo-text">{BRAND_NAME}</div>
        </Link>

        <div className="topnav-right">
          <nav className="topnav-links">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`topnav-link${pathname === item.to ? ' active' : ''}`}
              >
                <item.Icon />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="topnav-actions">
            {isMapPage ? (
              <div className="inline-flex items-center rounded-lg border border-white/15 bg-slate-900/70 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleMapModeChange('explore')}
                  className={`rounded-md px-2.5 py-1.5 font-medium transition ${mapMode === 'explore' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}
                >
                  Explore
                </button>
                <button
                  type="button"
                  onClick={() => handleMapModeChange('plan')}
                  className={`rounded-md px-2.5 py-1.5 font-medium transition ${mapMode === 'plan' ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}
                >
                  Plan
                </button>
              </div>
            ) : null}
            <button className="topnav-icon-btn" aria-label="Notifications">
              <span className="notif-dot" />
              <IconBell />
            </button>
            <button
              className="topnav-icon-btn mobile-only"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <nav className="topnav-mobile">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`topnav-mobile-link${pathname === item.to ? ' active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <item.Icon />
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}

function App() {
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password' ||
    location.pathname.startsWith('/reset-password/') ||
    location.pathname.startsWith('/verify-email/')
  const hideNavbar =
    isAuthPage ||
    location.pathname === '/admin/dashboard' ||
    location.pathname === '/admin/profile'

  return (
    <div className="app-shell">
      {!hideNavbar && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to={isAuthenticated ? dashboardPath : '/login'} replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/map"
            element={
              <ProtectedRoute requiredRole="admin">
                <MapDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MapDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hazards"
            element={
              <ProtectedRoute>
                <Hazards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews"
            element={
              <ProtectedRoute>
                <Reviews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              user?.role === 'admin' ? (
                <Navigate to="/admin/profile" replace />
              ) : (
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              )
            }
          />
          <Route path="*" element={<Navigate to={isAuthenticated ? dashboardPath : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
