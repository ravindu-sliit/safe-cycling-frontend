
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Popup, Marker } from 'react-leaflet'
import api from '../services/api' // Your Axios instance
import 'leaflet/dist/leaflet.css'

// Teammate's custom UI Stats Array
const STATS = [
  {
    label: 'Active Routes',
    value: '6', // We can make this dynamic later!
    delta: '+2 this week',
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
  // YOUR LOGIC: State management
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetchedRef = useRef(false);
  const routesEndpoint = import.meta.env.VITE_ROUTES_ENDPOINT || '/routes';

  // YOUR LOGIC: Center of Colombo
  const mapCenter = [6.9271, 79.8612]; 

  // YOUR LOGIC: API Fetching
  useEffect(() => {
    // React StrictMode calls effects twice in development.
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;

    const fetchRoutes = async () => {
      try {
        const response = await api.get(routesEndpoint);
        const routeData = response?.data?.data ?? response?.data ?? [];
        setRoutes(Array.isArray(routeData) ? routeData : []);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (err?.response?.status === 404) {
          setError(`Route API not found: ${routesEndpoint}. Update VITE_ROUTES_ENDPOINT.`);
        } else {
          setError('Failed to fetch cycling routes.');
        }
        setLoading(false);
      }
    };
    fetchRoutes();
  }, [routesEndpoint]);

  return (
    <div className="dashboard-page">
      {/* TEAMMATE'S UI: Stats strip */}
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
          {/* TEAMMATE'S UI: Overlay bar */}
          <div className="map-overlay">
            <div className="map-live-badge">
              <div className="map-live-dot" />
              <span>Live Map</span>
            </div>
            <div className="map-location-pill">Colombo, LK</div>
          </div>

          {loading ? (
            <div className="map-loading">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="spin-icon spin-icon-lg">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" />
                <path d="M21 12a9 9 0 00-9-9" />
              </svg>
              <span>Loading route data from database…</span>
            </div>
          ) : error ? (
             <div className="map-loading text-red-500">
               <span>{error}</span>
             </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={13}
              className="leaflet-map"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              
              {/* YOUR LOGIC: The safe rendering of the dynamic blue lines */}
              {Array.isArray(routes) && routes.map((route) => {
                if (!Array.isArray(route.pathCoordinates) || route.pathCoordinates.length === 0) return null; 

                // Backend returns pathCoordinates as array of { lng, lat } objects
                const safePositions = route.pathCoordinates
                  .filter(coord => typeof coord === 'object' && coord.lat !== undefined && coord.lng !== undefined)
                  .map(coord => [coord.lat, coord.lng]); // Convert to Leaflet [lat, lng] format

                if (safePositions.length === 0) return null;

                return (
                  <Polyline key={route._id} positions={safePositions} color="#10b981" weight={6}>
                    <Popup>
                      <div className="p-2 text-gray-800">
                        <h3 className="font-bold text-lg">{route.title}</h3>
                        <p className="text-sm">Eco-Score: {route.ecoScore}/10</p>
                        <p className="text-sm">Distance: {route.distance} km</p>
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  )
}