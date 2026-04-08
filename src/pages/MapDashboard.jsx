import { useEffect, useEffectEvent, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Polyline, Popup, Marker, useMap, useMapEvents } from 'react-leaflet'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import 'leaflet/dist/leaflet.css'

function normalizePathCoordinates(pathCoordinates) {
  if (!Array.isArray(pathCoordinates)) return []

  return pathCoordinates
    .map((coord) => {
      if (Array.isArray(coord) && coord.length >= 2) {
        const lng = Number(coord[0])
        const lat = Number(coord[1])

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return [lat, lng]
        }

        return null
      }

      if (coord && typeof coord === 'object') {
        const lat = Number(coord.lat ?? coord.latitude)
        const lng = Number(coord.lng ?? coord.lon ?? coord.longitude)

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return [lat, lng]
        }
      }

      return null
    })
    .filter(Boolean)
}

function normalizeCreatedRoutePayload(payload) {
  if (!payload) return null
  if (payload?.data?.data && typeof payload.data.data === 'object') return payload.data.data
  if (payload?.data && typeof payload.data === 'object') return payload.data
  if (typeof payload === 'object') return payload
  return null
}

function getRouteId(route) {
  return route?._id || route?.id || ''
}

function buildRouteFormFromRoute(route) {
  const startCoordinates = Array.isArray(route?.startLocation?.coordinates) ? route.startLocation.coordinates : []
  const endCoordinates = Array.isArray(route?.endLocation?.coordinates) ? route.endLocation.coordinates : []

  return {
    title: route?.title || '',
    ecoScore: route?.ecoScore != null ? String(route.ecoScore) : '',
    startLng: Number.isFinite(Number(startCoordinates[0])) ? String(startCoordinates[0]) : '',
    startLat: Number.isFinite(Number(startCoordinates[1])) ? String(startCoordinates[1]) : '',
    startAddress: route?.startLocation?.address || '',
    endLng: Number.isFinite(Number(endCoordinates[0])) ? String(endCoordinates[0]) : '',
    endLat: Number.isFinite(Number(endCoordinates[1])) ? String(endCoordinates[1]) : '',
    endAddress: route?.endLocation?.address || '',
  }
}

// 1. Haversine Formula: Calculates distance between two coordinates in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

// 2. Helper Component to smoothly pan the map when user location is found
function MapUpdater({ center, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length === 2) {
      map.fitBounds(bounds, { padding: [50, 50], duration: 1.5 });
    } else if (center) {
      map.flyTo(center, 13, { duration: 1.5 });
    }
  }, [center, bounds, map]);
  return null;
}

function MapLocationPicker({ mode, onPick }) {
  useMapEvents({
    click(event) {
      if (!mode) return

      const { lat, lng } = event.latlng
      onPick(mode, lat, lng)
    },
  })

  return null
}

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
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, user, updateUser } = useAuth()
  const verificationBanner = searchParams.get('verified') === '1'
  const isAdmin = user?.role === 'admin' || user?.role === 'organization'
  const focusRouteId = location.state?.routeId || ''
  const focusRouteMode = location.state?.mode || ''

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

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // NEW: Filter & Location State
  const [activeFilter, setActiveFilter] = useState('All');
  const [maxDistanceFilter, setMaxDistanceFilter] = useState(5)
  const [minEcoScoreFilter, setMinEcoScoreFilter] = useState(9)
  const [showDistanceSlider, setShowDistanceSlider] = useState(false)
  const [showEcoSlider, setShowEcoSlider] = useState(false)
  const [userLoc, setUserLoc] = useState(null);
  const [mapCenter, setMapCenter] = useState([6.9271, 79.8612]); // Default Colombo
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [routeBounds, setRouteBounds] = useState(null)

  // Admin CRUD State
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [newRouteForm, setNewRouteForm] = useState({
    title: '',
    ecoScore: '',
    startLng: '',
    startLat: '',
    startAddress: '',
    endLng: '',
    endLat: '',
    endAddress: '',
  })
  const [actionMessage, setActionMessage] = useState({ type: '', text: '', visible: false })
  const [createdRouteDetails, setCreatedRouteDetails] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [locationPickMode, setLocationPickMode] = useState('')
  const [editingRouteId, setEditingRouteId] = useState('')

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await api.get('/routes');
        const payload = response?.data
        const routeRows = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : []
        setRoutes(routeRows);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch cycling routes.');
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  // NEW: Handle Filter Clicks & Geolocation
  const handleFilterClick = (filterName) => {
    setSelectedRoute(null)

    if (filterName === 'Distance') {
      setShowDistanceSlider(true)
      setShowEcoSlider(false)
      setActiveFilter('Distance')
      return
    }

    if (filterName === 'Eco') {
      setShowDistanceSlider(false)
      setShowEcoSlider(true)
      setActiveFilter('Eco')
      return
    }

    if (filterName === 'Near Me') {
      setShowDistanceSlider(false)
      setShowEcoSlider(false)
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
      }
      // Ask browser for location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLoc([lat, lng]);
          setMapCenter([lat, lng]); // Pan map to user
          setActiveFilter('Near Me');
        },
        () => {
          alert("Unable to retrieve your location. Please check browser permissions.");
        }
      );
    } else {
      setShowDistanceSlider(false)
      setShowEcoSlider(false)
      setActiveFilter(filterName);
    }
  };

  // NEW: The Filtering Engine
  const filteredRoutes = routes.filter((route) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Distance') return Number(route.distance) <= Number(maxDistanceFilter);
    if (activeFilter === 'Eco') return Number(route.ecoScore) >= Number(minEcoScoreFilter);
    if (activeFilter === 'Near Me') {
      if (!userLoc) return false;
      const normalizedPath = normalizePathCoordinates(route.pathCoordinates)
      if (normalizedPath.length === 0) return false

      const [routeStartLat, routeStartLng] = normalizedPath[0]
      
      // Calculate distance from user to start of route
      const distanceToRoute = calculateDistance(userLoc[0], userLoc[1], routeStartLat, routeStartLng);
      return distanceToRoute <= 10; // Only show routes within 10km of user
    }
    return true;
  });

  useEffect(() => {
    if (!selectedRoute) return

    const isVisible = filteredRoutes.some((route) => (route._id || route.id) === (selectedRoute._id || selectedRoute.id))
    if (!isVisible) {
      setSelectedRoute(null)
    }
  }, [filteredRoutes, selectedRoute])

  useEffect(() => {
    if (!focusRouteId || routes.length === 0) return

    const routeToFocus = routes.find((route) => (route._id || route.id) === focusRouteId)
    if (!routeToFocus) return

    setSelectedRoute(routeToFocus)
    const normalizedPath = normalizePathCoordinates(routeToFocus.pathCoordinates)
    if (normalizedPath.length >= 2) {
      const latitudes = normalizedPath.map(([lat]) => lat)
      const longitudes = normalizedPath.map(([, lng]) => lng)
      const bounds = [[Math.min(...latitudes), Math.min(...longitudes)], [Math.max(...latitudes), Math.max(...longitudes)]]
      setRouteBounds(bounds)
    }

    if (focusRouteMode === 'edit') {
      setEditingRouteId(routeToFocus._id || routeToFocus.id)
      setNewRouteForm(buildRouteFormFromRoute(routeToFocus))
      setShowCreatePanel(true)
      setLocationPickMode('')
    }
  }, [focusRouteId, routes])

  const handleStartNewRoute = () => {
    setError('')
    setActionMessage({ type: '', text: '', visible: false })
    setEditingRouteId('')
    setNewRouteForm({
      title: '',
      ecoScore: '',
      startLng: '',
      startLat: '',
      startAddress: '',
      endLng: '',
      endLat: '',
      endAddress: '',
    })
    setLocationPickMode('')
    setShowCreatePanel((current) => !current)
  }

  const handleStartRouteEdit = (route) => {
    setError('')
    setActionMessage({ type: '', text: '', visible: false })
    setEditingRouteId(route?._id || route?.id || '')
    setNewRouteForm(buildRouteFormFromRoute(route))
    setShowCreatePanel(true)
    setLocationPickMode('')

    const normalizedPath = normalizePathCoordinates(route?.pathCoordinates)
    if (normalizedPath.length >= 2) {
      const latitudes = normalizedPath.map(([lat]) => lat)
      const longitudes = normalizedPath.map(([, lng]) => lng)
      const bounds = [[Math.min(...latitudes), Math.min(...longitudes)], [Math.max(...latitudes), Math.max(...longitudes)]]
      setRouteBounds(bounds)
    }
  }

  // Admin: Create Route Handler
  const handleCreateRoute = async () => {
    if (!newRouteForm.title.trim()) {
      showMessage('error', 'Please enter a route title')
      return
    }
    if (!newRouteForm.ecoScore || Number(newRouteForm.ecoScore) < 1 || Number(newRouteForm.ecoScore) > 10) {
      showMessage('error', 'Eco Score must be between 1 and 10')
      return
    }

    const startLng = Number(newRouteForm.startLng)
    const startLat = Number(newRouteForm.startLat)
    const endLng = Number(newRouteForm.endLng)
    const endLat = Number(newRouteForm.endLat)

    if (![startLng, startLat, endLng, endLat].every((value) => Number.isFinite(value))) {
      showMessage('error', 'Please enter valid start and end coordinates')
      return
    }

    if (!newRouteForm.startAddress.trim() || !newRouteForm.endAddress.trim()) {
      showMessage('error', 'Please enter both start and end addresses')
      return
    }

    try {
      const routePayload = {
        title: newRouteForm.title.trim(),
        ecoScore: Number(newRouteForm.ecoScore),
        startLocation: {
          type: 'Point',
          coordinates: [startLng, startLat],
          address: newRouteForm.startAddress.trim(),
        },
        endLocation: {
          type: 'Point',
          coordinates: [endLng, endLat],
          address: newRouteForm.endAddress.trim(),
        },
      }

      const createResponse = editingRouteId
        ? await api.put(`/routes/${editingRouteId}`, routePayload)
        : await api.post('/routes', routePayload)

      setCreatedRouteDetails(normalizeCreatedRoutePayload(createResponse?.data))
      showMessage('success', editingRouteId ? 'Route updated successfully!' : 'Route created successfully!')
      setNewRouteForm({
        title: '',
        ecoScore: '',
        startLng: '',
        startLat: '',
        startAddress: '',
        endLng: '',
        endLat: '',
        endAddress: '',
      })
      setEditingRouteId('')
      setShowCreatePanel(false)
      // Reload routes
      const response = await api.get('/routes')
      const payload = response?.data
      const routeRows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
      setRoutes(routeRows)

      const createdOrUpdatedRouteId = getRouteId(normalizeCreatedRoutePayload(createResponse?.data))
      const refreshedRoute = routeRows.find((route) => getRouteId(route) === createdOrUpdatedRouteId)
      if (refreshedRoute) {
        setSelectedRoute(refreshedRoute)

        const normalizedPath = normalizePathCoordinates(refreshedRoute.pathCoordinates)
        if (normalizedPath.length >= 2) {
          const latitudes = normalizedPath.map(([lat]) => lat)
          const longitudes = normalizedPath.map(([, lng]) => lng)
          setRouteBounds([[Math.min(...latitudes), Math.min(...longitudes)], [Math.max(...latitudes), Math.max(...longitudes)]])
        }
      }
    } catch (err) {
      showMessage('error', err?.response?.data?.message || (editingRouteId ? 'Failed to update route' : 'Failed to create route'))
    }
  }

  // Admin: Delete Route Handler
  const handleDeleteRoute = async (routeId) => {
    if (!window.confirm('Delete this route? This action cannot be undone.')) {
      return
    }

    setDeleteLoading(true)
    try {
      await api.delete(`/routes/${routeId}`)
      showMessage('success', 'Route deleted successfully!')
      setSelectedRoute(null)
      // Reload routes
      const response = await api.get('/routes')
      const payload = response?.data
      const routeRows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
      setRoutes(routeRows)
    } catch (err) {
      showMessage('error', err?.response?.data?.message || 'Failed to delete route')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Show action message
  const showMessage = (type, text) => {
    setActionMessage({ type, text, visible: true })
    setTimeout(() => setActionMessage({ ...actionMessage, visible: false }), 3000)
  }

  // Admin: Pan map to selected route
  const handleCenterOnRoute = () => {
    if (!selectedRoute) return
    const normalizedPath = normalizePathCoordinates(selectedRoute.pathCoordinates)
    if (normalizedPath.length === 0) {
      showMessage('error', 'Route has no valid coordinates')
      return
    }
    // Calculate bounds from all coordinates
    const latitudes = normalizedPath.map(coord => coord[0])
    const longitudes = normalizedPath.map(coord => coord[1])
    const minLat = Math.min(...latitudes)
    const maxLat = Math.max(...latitudes)
    const minLng = Math.min(...longitudes)
    const maxLng = Math.max(...longitudes)
    const bounds = [[minLat, minLng], [maxLat, maxLng]]
    setRouteBounds(bounds)
  }

  const handlePickRoutePoint = (mode, lat, lng) => {
    if (mode === 'start') {
      setNewRouteForm((current) => ({
        ...current,
        startLat: lat.toFixed(6),
        startLng: lng.toFixed(6),
      }))
      showMessage('success', 'Start point selected from map')
    }

    if (mode === 'end') {
      setNewRouteForm((current) => ({
        ...current,
        endLat: lat.toFixed(6),
        endLng: lng.toFixed(6),
      }))
      showMessage('success', 'End point selected from map')
    }

    setLocationPickMode('')
  }

  return (
    <div className="dashboard-page relative" style={{ height: '100%', minHeight: '100%' }}>
      <div className="map-section relative" style={{ padding: 0, height: '100%' }}>
        <div className="map-container relative" style={{ height: '100%', minHeight: '100%' }}>
          <div className="map-overlay">
            <div className="map-location-pill ml-auto">Active Routes: {routes.length}</div>
          </div>

          {verificationBanner ? (
            <div className="absolute top-4 left-1/2 z-[1000] -translate-x-1/2 rounded-xl border border-green-500/30 bg-green-500/15 px-4 py-2 text-sm text-green-200 backdrop-blur-sm">
              Email verified. Welcome back to Safe Cycling.
            </div>
          ) : null}

          <div className="map-live-badge absolute bottom-4 left-4 z-[1000] pointer-events-none">
            <div className="map-live-dot" />
            <span>Live Map</span>
          </div>

          <div className="absolute top-4 left-16 z-[1000] pointer-events-auto flex flex-wrap gap-2 pr-4 max-w-[calc(100%-2rem)]">
            {[
              { key: 'All', label: 'All' },
              { key: 'Distance', label: `<= ${maxDistanceFilter}km` },
              { key: 'Eco', label: `Eco ${minEcoScoreFilter}+` },
              { key: 'Near Me', label: userLoc ? '📍 Near Me (Active)' : 'Near Me' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => handleFilterClick(f.key)}
                className={`filter-pill ${activeFilter === f.key ? 'active' : ''}`}
              >
                {f.label}
              </button>
            ))}
            {isAdmin && (
              <button
                type="button"
                onClick={handleStartNewRoute}
                className="filter-pill"
                style={{
                  background: showCreatePanel ? 'var(--brand-500)' : 'rgba(16, 185, 129, 0.15)',
                  borderColor: 'var(--brand-500)',
                  color: showCreatePanel ? '#fff' : 'var(--brand-400)',
                  fontWeight: '600',
                }}
              >
                ✚ New Route
              </button>
            )}
          </div>

          {showDistanceSlider && (
            <div className="absolute top-14 left-16 z-[1000] pointer-events-auto rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(16,21,33,0.82)] px-3 py-2 shadow-lg backdrop-blur-sm">
              <label className="flex items-center gap-3 text-xs font-medium text-gray-200">
                <span>Distance {maxDistanceFilter}km</span>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={maxDistanceFilter}
                  onChange={(event) => {
                    setMaxDistanceFilter(Number(event.target.value))
                    setActiveFilter('Distance')
                  }}
                  className="w-28 cursor-pointer"
                  style={{ accentColor: '#10b981' }}
                />
              </label>
            </div>
          )}

          {showEcoSlider && (
            <div className="absolute top-14 left-16 z-[1000] pointer-events-auto rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(16,21,33,0.82)] px-3 py-2 shadow-lg backdrop-blur-sm">
              <label className="flex items-center gap-3 text-xs font-medium text-gray-200">
                <span>Eco Score {minEcoScoreFilter}+</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={minEcoScoreFilter}
                  onChange={(event) => {
                    setMinEcoScoreFilter(Number(event.target.value))
                    setActiveFilter('Eco')
                  }}
                  className="w-28 cursor-pointer"
                  style={{ accentColor: '#10b981' }}
                />
              </label>
            </div>
          )}

          {isAdmin && showCreatePanel && (
            <div className="absolute top-14 left-16 z-[1000] pointer-events-auto w-96 bg-[#1c2333] border border-[rgba(100,200,255,0.2)] rounded-xl shadow-2xl p-5 backdrop-blur-sm">
              <h3 className="text-lg font-bold text-white mb-4">{editingRouteId ? 'Edit Route' : 'Create New Route'}</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Route Title"
                  value={newRouteForm.title}
                  onChange={(e) => setNewRouteForm({ ...newRouteForm, title: e.target.value })}
                  className="w-full bg-[#0f1419] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50"
                />
                <input
                  type="number"
                  placeholder="Eco Score (1-10)"
                  min="1"
                  max="10"
                  value={newRouteForm.ecoScore}
                  onChange={(e) => setNewRouteForm({ ...newRouteForm, ecoScore: e.target.value })}
                  className="w-full bg-[#0f1419] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Start Longitude"
                    value={newRouteForm.startLng}
                    onChange={(e) => setNewRouteForm({ ...newRouteForm, startLng: e.target.value })}
                    className="w-full bg-[#0f1419] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Start Latitude"
                    value={newRouteForm.startLat}
                    onChange={(e) => setNewRouteForm({ ...newRouteForm, startLat: e.target.value })}
                    className="w-full bg-[#0f1419] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setLocationPickMode((current) => (current === 'start' ? '' : 'start'))}
                  className={`btn ${locationPickMode === 'start' ? 'btn-primary' : 'btn-ghost'} w-full`}
                >
                  {locationPickMode === 'start' ? 'Click map to set start point' : 'Pick Start Point From Map'}
                </button>
                <input
                  type="text"
                  placeholder="Start Address"
                  value={newRouteForm.startAddress}
                  onChange={(e) => setNewRouteForm({ ...newRouteForm, startAddress: e.target.value })}
                  className="w-full bg-[#0f1419] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="End Longitude"
                    value={newRouteForm.endLng}
                    onChange={(e) => setNewRouteForm({ ...newRouteForm, endLng: e.target.value })}
                    className="w-full bg-[#0f1419] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="End Latitude"
                    value={newRouteForm.endLat}
                    onChange={(e) => setNewRouteForm({ ...newRouteForm, endLat: e.target.value })}
                    className="w-full bg-[#0f1419] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setLocationPickMode((current) => (current === 'end' ? '' : 'end'))}
                  className={`btn ${locationPickMode === 'end' ? 'btn-primary' : 'btn-ghost'} w-full`}
                >
                  {locationPickMode === 'end' ? 'Click map to set end point' : 'Pick End Point From Map'}
                </button>
                <input
                  type="text"
                  placeholder="End Address"
                  value={newRouteForm.endAddress}
                  onChange={(e) => setNewRouteForm({ ...newRouteForm, endAddress: e.target.value })}
                  className="w-full bg-[#0f1419] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50"
                />
                <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(15,20,25,0.55)] px-3 py-2 text-[11px] text-gray-300 leading-relaxed">
                  <p>Send start/end points only. The server builds the cycling path automatically.</p>
                  <p>Coordinates must be in [longitude, latitude] order.</p>
                  <p>Example start: 79.9192 / 6.9006</p>
                  {locationPickMode ? <p>Map picking active: click on map to set the {locationPickMode} point.</p> : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateRoute}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium rounded-lg px-3 py-2 text-sm transition-all"
                  >
                    {editingRouteId ? 'Update Route' : 'Create Route'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreatePanel(false)
                      setLocationPickMode('')
                      setEditingRouteId('')
                    }}
                    className="flex-1 bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] text-white font-medium rounded-lg px-3 py-2 text-sm transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedRoute && (
            <div className="absolute top-16 right-4 z-[1000] w-80 bg-[#1c2333] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto max-w-[calc(100%-2rem)]">
              <div className="bg-[#232d42] p-4 flex justify-between items-start border-b border-[rgba(255,255,255,0.06)]">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{selectedRoute.title || 'Untitled route'}</h3>
                  <div className="flex gap-2">
                    <span className="badge badge-low">Eco: {selectedRoute.ecoScore ?? '-'} / 10</span>
                    <span className="badge badge-medium">{selectedRoute.distance ?? '-'} km</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRoute(null)}
                  className="text-gray-400 hover:text-white transition-colors bg-[rgba(255,255,255,0.05)] rounded-full p-1"
                  aria-label="Close route details"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="p-5 flex flex-col gap-4">
                <p className="text-sm text-gray-300">
                  This route is highlighted for safer lanes and rider-friendly road conditions.
                </p>
                <button type="button" className="btn btn-primary w-full mt-1">
                  Read Full Reviews
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleStartRouteEdit(selectedRoute)}
                    className="btn btn-ghost w-full"
                  >
                    Edit Route
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleCenterOnRoute}
                    className="btn btn-ghost w-full"
                  >
                    Center on Map
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRoute(selectedRoute._id || selectedRoute.id)}
                    disabled={deleteLoading}
                    className="btn btn-danger w-full"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete Route'}
                  </button>
                )}
              </div>
            </div>
          )}

          {actionMessage.visible && (
            <div className={`absolute bottom-4 right-4 z-[1000] px-4 py-3 rounded-lg shadow-lg pointer-events-none ${
              actionMessage.type === 'success'
                ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                : 'bg-red-600/20 text-red-400 border border-red-500/30'
            }`}>
              {actionMessage.text}
            </div>
          )}

          {createdRouteDetails && (
            <div className="absolute top-16 right-4 z-[1000] w-[30rem] max-w-[calc(100%-2rem)] bg-[#1c2333] border border-[rgba(255,255,255,0.12)] rounded-xl shadow-2xl overflow-hidden pointer-events-auto">
              <div className="bg-[#232d42] px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Created Route Details</h3>
                  <p className="text-xs text-gray-300">Full API response payload</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatedRouteDetails(null)}
                  className="btn btn-ghost"
                >
                  Close
                </button>
              </div>
              <div className="p-3 max-h-72 overflow-auto">
                <pre className="m-0 text-xs leading-relaxed text-green-300 whitespace-pre-wrap break-words font-mono">
                  {JSON.stringify(createdRouteDetails, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {loading ? (
            <div className="map-loading">
              <span>Loading route data...</span>
            </div>
          ) : error ? (
             <div className="map-loading text-red-500"><span>{error}</span></div>
          ) : (
            <MapContainer center={mapCenter} zoom={13} className="leaflet-map z-0">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              
              {/* This smoothly pans the map if mapCenter changes! */}
              <MapUpdater center={mapCenter} bounds={routeBounds} />
              <MapLocationPicker mode={locationPickMode} onPick={handlePickRoutePoint} />

              {/* Draw User Location Marker if they clicked Near Me */}
              {userLoc && (
                <Marker position={userLoc}>
                  <Popup><strong>You are here</strong></Popup>
                </Marker>
              )}

              {showCreatePanel && newRouteForm.startLat && newRouteForm.startLng && (
                <Marker position={[Number(newRouteForm.startLat), Number(newRouteForm.startLng)]}>
                  <Popup><strong>Start point</strong></Popup>
                </Marker>
              )}

              {showCreatePanel && newRouteForm.endLat && newRouteForm.endLng && (
                <Marker position={[Number(newRouteForm.endLat), Number(newRouteForm.endLng)]}>
                  <Popup><strong>End point</strong></Popup>
                </Marker>
              )}
              
              {/* Draw Filtered Routes */}
              {filteredRoutes.map((route, index) => {
                const safePositions = normalizePathCoordinates(route.pathCoordinates)

                if (safePositions.length === 0) return null;

                const routeId = route._id || route.id
                const selectedRouteId = selectedRoute?._id || selectedRoute?.id
                const isSelected = selectedRouteId && routeId === selectedRouteId

                return (
                  <Polyline
                    key={routeId || `${route.title || 'route'}-${index}`}
                    positions={safePositions}
                    color={isSelected ? '#34d399' : '#10b981'}
                    weight={isSelected ? 8 : 5}
                    eventHandlers={{
                      click: () => {
                        setSelectedRoute(route)
                      },
                    }}
                  />
                );
              })}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  )
}