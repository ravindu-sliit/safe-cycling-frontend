import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

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

export default function MapDashboard() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => { setIsClient(true) }, [])

  return (
    <div className="dashboard-page">
      {/* Stats strip */}
      <div className="stats-grid">
        {STATS.map(s => (
          <div key={s.label} className="stat-tile">
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-delta">{s.delta}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Map wrapper */}
      <div className="map-section">
        <div className="map-container">
          {/* Overlay bar */}
          <div className="map-overlay">
            <div className="map-live-badge">
              <div className="map-live-dot" />
              <span>Live Map</span>
            </div>
            <div className="map-location-pill">London, UK</div>
          </div>

          {!isClient ? (
            <div className="map-loading">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="spin-icon spin-icon-lg">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" />
                <path d="M21 12a9 9 0 00-9-9" />
              </svg>
              <span>Loading map…</span>
            </div>
          ) : (
            <MapContainer
              center={[51.505, -0.09]}
              zoom={13}
              className="leaflet-map"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <Marker position={[51.505, -0.09]}>
                <Popup>
                  <strong>Safe Cycling HQ</strong><br />
                  Central London marker
                </Popup>
              </Marker>
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  )
}
