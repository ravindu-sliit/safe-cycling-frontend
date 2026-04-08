import { useEffect, useEffectEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'
import { useAuth } from '../context/AuthContext.jsx'

const STATS = [
  {
    label: 'Active Routes',
    value: '128',
    delta: '+12 this week',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </svg>
    ),
    cls: 'stat-icon-green',
  },
  {
    label: 'Hazards Reported',
    value: '47',
    delta: '+3 today',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    cls: 'stat-icon-red',
  },
  {
    label: 'Community Reviews',
    value: '312',
    delta: '+28 this week',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    cls: 'stat-icon-blue',
  },
]

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

export default function MapDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, user, updateUser } = useAuth()
  const verificationBanner = searchParams.get('verified') === '1'

  const syncUser = useEffectEvent((profile) => {
    updateUser(mergeStoredUser(user, profile))
  })

  useEffect(() => {
    if (!verificationBanner) {
      return undefined
    }

    let isActive = true
    const removeBannerTimer = window.setTimeout(() => {
      if (!isActive) return

      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('verified')
      setSearchParams(nextParams, { replace: true })
    }, 6000)

    const refreshCurrentUser = async () => {
      if (!isAuthenticated) return

      try {
        const { data } = await api.get('/users/me')
        if (!isActive) return

        syncUser(extractProfilePayload(data))
      } catch {
        // Keep the dashboard usable even if profile refresh fails.
      }
    }

    refreshCurrentUser()

    return () => {
      isActive = false
      window.clearTimeout(removeBannerTimer)
    }
  }, [isAuthenticated, searchParams, setSearchParams, verificationBanner])

  return (
    <div className="dashboard-page">
      {verificationBanner ? (
        <div className="dashboard-banner dashboard-banner--success">
          <div className="dashboard-banner-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <strong>Email verified</strong>
            <p>Your account is ready to use. Welcome back to Safe Cycling.</p>
          </div>
        </div>
      ) : null}

      <div className="stats-grid">
        {STATS.map((stat) => (
          <div key={stat.label} className="stat-tile">
            <div className={`stat-icon ${stat.cls}`}>{stat.icon}</div>
            <div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-delta">{stat.delta}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="map-section">
        <div className="map-container">
          <div className="map-overlay">
            <div className="map-live-badge">
              <div className="map-live-dot" />
              <span>Live Map</span>
            </div>
            <div className="map-location-pill">London, UK</div>
          </div>

          <MapContainer center={[51.505, -0.09]} zoom={13} className="leaflet-map">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Marker position={[51.505, -0.09]}>
              <Popup>
                <strong>Safe Cycling HQ</strong>
                <br />
                Central London marker
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
