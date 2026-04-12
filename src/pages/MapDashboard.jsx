import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Popup, Marker, useMap, useMapEvents } from 'react-leaflet'
import { useLocation, useSearchParams } from 'react-router-dom'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import {
  AlertTriangle,
  Ban,
  Bird,
  Car,
  CircleOff,
  CircleSlash,
  CloudFog,
  CloudRain,
  Construction,
  Droplets,
  Route,
  ShieldAlert,
  Snowflake,
  TrafficCone,
  TreePine,
  Waves,
  Wrench,
  Zap,
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { BRAND_NAME } from '../constants/brand.js'
import { HAZARD_TYPE_VALUES } from '../constants/hazardTypes'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const HAZARD_NEAR_ME_RADIUS_KM = 10
const HAZARD_INTERSECTION_RADIUS_KM = 0.05
const MOBILE_BREAKPOINT_PX = 768
const DASHBOARD_MODES = {
  explore: 'explore',
  plan: 'plan',
}
const HAZARD_TYPE_SET = new Set(HAZARD_TYPE_VALUES)
const HAZARD_MARKER_ICON_VERSION = 'v2'
const HAZARD_TYPE_ICON_COMPONENTS = {
  pothole: CircleSlash,
  debris: TrafficCone,
  'construction-zone': Construction,
  'roadside-hazard': AlertTriangle,
  collision: Car,
  grounding: CircleOff,
  'runway-safety': ShieldAlert,
  rain: CloudRain,
  fog: CloudFog,
  snow: Snowflake,
  'black-ice': Droplets,
  wildlife: Bird,
  'equipment-malfunction': Wrench,
  'infrastructure-failure': Route,
  lighting: Zap,
  flooding: Waves,
  'fallen-tree': TreePine,
  'road-closure': Ban,
  'oil-spill': Droplets,
  other: AlertTriangle,
}

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

function MapInteractionLayer({ onMapClick }) {
  useMapEvents({
    click(event) {
      if (typeof onMapClick !== 'function') return

      const { lat, lng } = event.latlng
      onMapClick(lat, lng)
    },
  })

  return null
}

async function geocodeAddress(query) {
  const trimmedQuery = String(query || '').trim()

  if (!trimmedQuery) {
    throw new Error('Please enter a location')
  }

  const endpoint = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(trimmedQuery)}`
  const response = await fetch(endpoint)

  if (!response.ok) {
    throw new Error('Failed to geocode location')
  }

  const results = await response.json()
  const match = Array.isArray(results) ? results[0] : null

  if (!match) {
    throw new Error(`Location not found: ${trimmedQuery}`)
  }

  return {
    lat: Number(match.lat),
    lng: Number(match.lon),
    label: match.display_name || trimmedQuery,
  }
}

async function reverseGeocodeAddress(lat, lng) {
  const endpoint = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
  const response = await fetch(endpoint)

  if (!response.ok) {
    throw new Error('Failed to reverse geocode location')
  }

  const payload = await response.json()
  return payload?.display_name || `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
}

async function fetchCyclingRoute(waypointPoints, apiKey) {
  if (!apiKey) {
    throw new Error('Missing OpenRouteService API key. Set VITE_OPENROUTESERVICE_API_KEY.')
  }

  const coordinates = Array.isArray(waypointPoints)
    ? waypointPoints.map((point) => [point.lng, point.lat])
    : []

  if (coordinates.length < 2) {
    throw new Error('At least a start and destination are required')
  }

  const response = await fetch('https://api.openrouteservice.org/v2/directions/cycling-regular/geojson', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates,
    }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error?.message || 'Failed to fetch cycling route')
  }

  return response.json()
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

  const [dashboardMode, setDashboardMode] = useState(DASHBOARD_MODES.explore)
  const [routes, setRoutes] = useState([])
  const [allHazards, setAllHazards] = useState([])
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // NEW: Filter & Location State
  const [activeFilter, setActiveFilter] = useState('All');
  const [maxDistanceFilter, setMaxDistanceFilter] = useState(5)
  const [minEcoScoreFilter, setMinEcoScoreFilter] = useState(9)
  const [showDistanceSlider, setShowDistanceSlider] = useState(false)
  const [showEcoSlider, setShowEcoSlider] = useState(false)
  const [hazardSeverityFilter, setHazardSeverityFilter] = useState('all')
  const [hazardNearMeOnly, setHazardNearMeOnly] = useState(false)
  const [userLoc, setUserLoc] = useState(null)
  const [mapCenter, setMapCenter] = useState([6.9271, 79.8612]) // Default Colombo
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [routeBounds, setRouteBounds] = useState(null)
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

  const [planStartInput, setPlanStartInput] = useState('')
  const [planDestinationInput, setPlanDestinationInput] = useState('')
  const [planStartLocation, setPlanStartLocation] = useState(null)
  const [planDestinationLocation, setPlanDestinationLocation] = useState(null)
  const [planStopInput, setPlanStopInput] = useState('')
  const [planStops, setPlanStops] = useState([])
  const [planPickMode, setPlanPickMode] = useState('')
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')
  const [plannedRoute, setPlannedRoute] = useState(null)
  const [plannedRouteBounds, setPlannedRouteBounds] = useState(null)
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches
  })
  const [showPlanFormMobile, setShowPlanFormMobile] = useState(true)
  const [showPlanDetailsMobile, setShowPlanDetailsMobile] = useState(false)
  const [showPlanFormDesktop, setShowPlanFormDesktop] = useState(true)
  const [showPlanSummaryDesktop, setShowPlanSummaryDesktop] = useState(false)

  const modeParam = searchParams.get('mode')

  const hazardPinIcons = useMemo(() => new Map(), [])

  const getHazardMarkerIcon = (severity, type) => {
    const key = `${HAZARD_MARKER_ICON_VERSION}-${severity}-${type}`

    if (!hazardPinIcons.has(key)) {
      hazardPinIcons.set(key, createHazardPinIcon(severity, type))
    }

    return hazardPinIcons.get(key)
  }

  const mapHazards = useMemo(
    () => allHazards
      .map((hazard) => ({
        hazard,
        coordinates: getHazardCoordinates(hazard),
      }))
      .filter((entry) => Boolean(entry.coordinates)),
    [allHazards],
  )

  const filteredMapHazards = useMemo(
    () => mapHazards.filter(({ hazard, coordinates }) => {
      const hazardSeverity = normalizeHazardSeverity(hazard?.severity)

      if (hazardSeverityFilter !== 'all' && hazardSeverity !== hazardSeverityFilter) {
        return false
      }

      if (hazardNearMeOnly) {
        if (!userLoc) {
          return false
        }

        const distanceFromUser = calculateDistance(userLoc[0], userLoc[1], coordinates.lat, coordinates.lng)
        return distanceFromUser <= HAZARD_NEAR_ME_RADIUS_KM
      }

      return true
    }),
    [hazardNearMeOnly, hazardSeverityFilter, mapHazards, userLoc],
  )

  const hazardCoordinateEntries = useMemo(
    () => allHazards
      .map((hazard) => ({ hazard, coordinates: getHazardCoordinates(hazard) }))
      .filter((entry) => Boolean(entry.coordinates)),
    [allHazards],
  )

  const activeMapBounds = dashboardMode === DASHBOARD_MODES.plan ? plannedRouteBounds : routeBounds

  useEffect(() => {
    if (modeParam === DASHBOARD_MODES.plan || modeParam === DASHBOARD_MODES.explore) {
      setDashboardMode(modeParam)
      return
    }

    setDashboardMode(DASHBOARD_MODES.explore)
  }, [modeParam])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`)
    const handleChange = (event) => {
      setIsMobileViewport(event.matches)
    }

    setIsMobileViewport(mediaQuery.matches)

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  useEffect(() => {
    if (dashboardMode === DASHBOARD_MODES.explore) {
      setPlanPickMode('')
      setPlannedRoute(null)
      setPlanError('')
      setShowPlanFormMobile(true)
      setShowPlanDetailsMobile(false)
      setShowPlanFormDesktop(true)
      setShowPlanSummaryDesktop(false)
      return
    }

    setShowPlanFormMobile(true)
    setShowPlanDetailsMobile(false)
    setShowPlanFormDesktop(true)
    setShowPlanSummaryDesktop(false)
    setSelectedRoute(null)
    setShowCreatePanel(false)
    setLocationPickMode('')
  }, [dashboardMode])

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

  useEffect(() => {
    const fetchHazards = async () => {
      try {
        const response = await api.get('/hazards')
        const rows = Array.isArray(response?.data) ? response.data : []
        const sortedHazards = rows.slice().sort((left, right) => (
          new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime()
        ))
        setAllHazards(sortedHazards)
      } catch (hazardError) {
        console.error('Failed to fetch hazards for map markers:', hazardError)
        setAllHazards([])
      }
    }

    fetchHazards()
  }, [])

  const requestUserLocation = (onSuccess) => {
    if (!navigator.geolocation) {
      showMessage('error', 'Geolocation is not supported by your browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const nextLocation = [lat, lng]
        setUserLoc(nextLocation)
        setMapCenter(nextLocation)
        if (typeof onSuccess === 'function') {
          onSuccess(nextLocation)
        }
      },
      () => {
        showMessage('error', 'Unable to retrieve your location. Please check browser permissions.')
      },
    )
  }

  const handleHazardNearMeToggle = () => {
    if (hazardNearMeOnly) {
      setHazardNearMeOnly(false)
      return
    }

    if (userLoc) {
      setHazardNearMeOnly(true)
      return
    }

    requestUserLocation(() => setHazardNearMeOnly(true))
  }

  const handleHazardSeverityCycle = () => {
    setHazardSeverityFilter((current) => getNextHazardSeverity(current))
  }

  const clearPlanRoute = () => {
    setPlannedRoute(null)
    setPlannedRouteBounds(null)
    setPlanError('')
    setShowPlanDetailsMobile(false)
    setShowPlanSummaryDesktop(false)
  }

  const requestPlanLocation = async (mode, lat, lng) => {
    const nextLocation = {
      lat,
      lng,
      label: await reverseGeocodeAddress(lat, lng).catch(() => `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`),
    }

    setMapCenter([lat, lng])

    if (mode === 'start') {
      setPlanStartLocation(nextLocation)
      setPlanStartInput(nextLocation.label)
    }

    if (mode === 'destination') {
      setPlanDestinationLocation(nextLocation)
      setPlanDestinationInput(nextLocation.label)
    }

    if (mode === 'stop') {
      setPlanStops((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...nextLocation,
        },
      ])
      setPlanStopInput('')
    }
  }

  const handlePlanAddStop = async () => {
    const trimmedStop = planStopInput.trim()

    if (!trimmedStop) {
      setPlanError('Enter a stop location first.')
      return
    }

    try {
      setPlanError('')
      const stopLocation = await geocodeAddress(trimmedStop)
      setPlanStops((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...stopLocation,
        },
      ])
      setPlanStopInput('')
    } catch (error) {
      setPlanError(error?.message || 'Unable to add stop')
    }
  }

  const handlePlanRemoveStop = (stopId) => {
    setPlanStops((current) => current.filter((stop) => stop.id !== stopId))
  }

  const handlePlanMapClick = async (lat, lng) => {
    if (planPickMode === 'start' || planPickMode === 'destination' || planPickMode === 'stop') {
      await requestPlanLocation(planPickMode, lat, lng)
      setPlanPickMode('')
      setShowPlanFormMobile(true)
      return
    }

    if (dashboardMode === DASHBOARD_MODES.plan) {
      if (isMobileViewport) {
        if (showPlanFormMobile || showPlanDetailsMobile) {
          setShowPlanFormMobile(false)
          setShowPlanDetailsMobile(false)
          return
        }
      } else if (showPlanFormDesktop || showPlanSummaryDesktop) {
        setShowPlanFormDesktop(false)
        setShowPlanSummaryDesktop(false)
        return
      }
    }

    if (dashboardMode === DASHBOARD_MODES.explore) {
      handleMapClickExploreMode(lat, lng)
    }
  }

  const handlePlanUseGps = async () => {
    if (!navigator.geolocation) {
      setPlanError('Geolocation is not supported by your browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const label = await reverseGeocodeAddress(lat, lng).catch(() => 'Current location')
        setMapCenter([lat, lng])
        setPlanStartLocation({ lat, lng, label })
        setPlanStartInput(label)
        setPlanError('')
      },
      () => {
        setPlanError('Unable to retrieve your location. Please check browser permissions.')
      },
    )
  }

  const handlePlanSubmit = async (event) => {
    event.preventDefault()
    setPlanError('')

    try {
      const startPoint = planStartLocation || await geocodeAddress(planStartInput)
      const endPoint = planDestinationLocation || await geocodeAddress(planDestinationInput)
      const waypointPoints = [startPoint, ...planStops, endPoint]

      if (!Number.isFinite(startPoint.lat) || !Number.isFinite(startPoint.lng)) {
        throw new Error('Invalid start location')
      }

      if (!Number.isFinite(endPoint.lat) || !Number.isFinite(endPoint.lng)) {
        throw new Error('Invalid destination')
      }

      if (waypointPoints.length < 2) {
        throw new Error('Add a start and destination')
      }

      clearPlanRoute()
      setPlanLoading(true)
      const response = await fetchCyclingRoute(waypointPoints, import.meta.env.VITE_OPENROUTESERVICE_API_KEY)
      const feature = response?.features?.[0]
      const coordinates = Array.isArray(feature?.geometry?.coordinates) ? feature.geometry.coordinates : []
      const summary = feature?.properties?.summary || feature?.properties?.segments?.[0] || {}
      const routeDistanceKm = Number(summary.distance || 0) / 1000
      const routeDurationMin = Number(summary.duration || 0) / 60
      const routeBoundsCoords = coordinates.map(([lng, lat]) => [lat, lng])
      const hazardMatches = coordinates.reduce((matches, coordinate) => {
        const [lng, lat] = coordinate
        const routeHazards = hazardCoordinateEntries.filter(({ hazard, coordinates: hazardCoordinates }) => {
          const distance = calculateDistance(lat, lng, hazardCoordinates.lat, hazardCoordinates.lng)
          return distance <= HAZARD_INTERSECTION_RADIUS_KM
        })

        routeHazards.forEach(({ hazard }) => {
          const hazardId = hazard?._id || hazard?.id || `${hazard?.title || 'hazard'}-${hazard?.createdAt || ''}`
          if (!matches.some((entry) => entry.key === hazardId)) {
            matches.push({
              key: hazardId,
              title: hazard?.title || 'Unnamed hazard',
              type: formatHazardLabel(hazard?.type, 'Other'),
              severity: formatHazardLabel(hazard?.severity, 'Medium'),
            })
          }
        })

        return matches
      }, [])

      setPlannedRoute({
        coordinates,
        distanceKm: routeDistanceKm,
        durationMin: routeDurationMin,
        startPoint,
        endPoint,
        hazards: hazardMatches,
      })

      if (isMobileViewport) {
        setShowPlanFormMobile(false)
        setShowPlanDetailsMobile(false)
      } else {
        setShowPlanFormDesktop(false)
        setShowPlanSummaryDesktop(true)
      }

      if (routeBoundsCoords.length >= 2) {
        const latitudes = routeBoundsCoords.map(([lat]) => lat)
        const longitudes = routeBoundsCoords.map(([, lng]) => lng)
        setPlannedRouteBounds([
          [Math.min(...latitudes), Math.min(...longitudes)],
          [Math.max(...latitudes), Math.max(...longitudes)],
        ])
      }
    } catch (submitError) {
      setPlanError(submitError?.message || 'Unable to plan this ride')
    } finally {
      setPlanLoading(false)
    }
  }

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
      requestUserLocation(() => setActiveFilter('Near Me'))
    } else {
      setShowDistanceSlider(false)
      setShowEcoSlider(false)
      setActiveFilter(filterName);
    }
  };

  // NEW: The Filtering Engine
  const filteredRoutes = routes.filter((route) => {
    if (dashboardMode !== DASHBOARD_MODES.explore) return false

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
    if (dashboardMode !== DASHBOARD_MODES.explore) {
      return
    }

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

  const handleOpenPlanEditor = () => {
    setShowPlanFormMobile(true)
    setShowPlanDetailsMobile(false)
    setShowPlanFormDesktop(true)
    setShowPlanSummaryDesktop(false)
  }

  const handleCollapsePlanForm = () => {
    if (isMobileViewport) {
      setShowPlanFormMobile(false)
      return
    }

    setShowPlanFormDesktop(false)
  }

  const handleMapClickExploreMode = (lat, lng) => {
    if (locationPickMode === 'start' || locationPickMode === 'end') {
      handlePickRoutePoint(locationPickMode, lat, lng)
      return
    }

    if (dashboardMode === DASHBOARD_MODES.explore) {
      if (showCreatePanel || selectedRoute || createdRouteDetails) {
        setShowCreatePanel(false)
        setLocationPickMode('')
        setEditingRouteId('')
        setSelectedRoute(null)
        setCreatedRouteDetails(null)
      }
    }
  }

  const handleCloseCreatePanel = () => {
    setShowCreatePanel(false)
    setLocationPickMode('')
    setEditingRouteId('')
  }

  const handleShowPlanSummary = () => {
    setShowPlanFormDesktop(false)

    if (isMobileViewport) {
      setShowPlanDetailsMobile(true)
      return
    }

    setShowPlanSummaryDesktop(true)
  }

  const handleClosePlanSummary = () => {
    setShowPlanDetailsMobile(false)
    setShowPlanSummaryDesktop(false)
  }

  const handleStartNewPlan = () => {
    clearPlanRoute()
    setPlanPickMode('')
    setShowPlanFormMobile(true)
    setShowPlanFormDesktop(true)
    setShowPlanSummaryDesktop(false)
  }

  const hidePlanFormForMobilePicking = dashboardMode === DASHBOARD_MODES.plan && isMobileViewport && Boolean(planPickMode)
  const hidePlanFormForMobile = dashboardMode === DASHBOARD_MODES.plan && isMobileViewport && !showPlanFormMobile
  const hidePlanFormForDesktop = dashboardMode === DASHBOARD_MODES.plan && !isMobileViewport && !showPlanFormDesktop

  return (
    <div className="dashboard-page relative">
      <div className="map-section relative">
        <div className="map-container relative">
          <div className="map-overlay" />
          <div className="map-location-pill map-route-hazard-pill">Active Routes: {routes.length} | Hazards: {filteredMapHazards.length}</div>

          <div className="map-hazard-controls">
            <div className="map-hazard-filter-row">
              <button
                type="button"
                className={`filter-pill ${hazardSeverityFilter !== 'all' ? 'active' : ''}`}
                onClick={handleHazardSeverityCycle}
              >
                {formatHazardLabel(hazardSeverityFilter, 'All')}
              </button>
              <button
                type="button"
                className={`filter-pill ${hazardNearMeOnly ? 'active' : ''}`}
                onClick={handleHazardNearMeToggle}
              >
                {hazardNearMeOnly ? 'Near Me (Hazards)' : 'Near Me Hazards'}
              </button>
            </div>
          </div>

          {verificationBanner ? (
            <div className="absolute top-4 left-1/2 z-[1000] -translate-x-1/2 rounded-xl border border-green-500/30 bg-green-500/15 px-4 py-2 text-sm text-green-200 backdrop-blur-sm">
              Email verified. Welcome back to {BRAND_NAME}.
            </div>
          ) : null}

          <div className="map-live-badge absolute bottom-4 left-4 z-[120] pointer-events-none">
            <div className="map-live-dot" />
            <span>Live Map</span>
          </div>

          {dashboardMode === DASHBOARD_MODES.explore ? (
            <div className="map-route-filter-row absolute top-4 left-16 z-[130] pointer-events-auto flex max-w-[calc(100%-2rem)] flex-wrap gap-2 pr-4">
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
          ) : null}

          {dashboardMode === DASHBOARD_MODES.explore && showDistanceSlider && (
            <div className="absolute top-14 left-16 z-[130] pointer-events-auto rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(16,21,33,0.82)] px-3 py-2 shadow-lg backdrop-blur-sm">
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

          {dashboardMode === DASHBOARD_MODES.explore && showEcoSlider && (
            <div className="absolute top-14 left-16 z-[130] pointer-events-auto rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(16,21,33,0.82)] px-3 py-2 shadow-lg backdrop-blur-sm">
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

          {dashboardMode === DASHBOARD_MODES.plan && hidePlanFormForMobilePicking ? (
            <div className="absolute left-1/2 top-4 z-[1000] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-sky-400/25 bg-slate-950/90 px-4 py-3 text-sm text-sky-100 shadow-2xl backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <span>Tap the map to set the {planPickMode === 'start' ? 'start location' : planPickMode === 'stop' ? 'stop location' : 'destination'}.</span>
                <button
                  type="button"
                  onClick={() => setPlanPickMode('')}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-semibold text-white hover:bg-white/20"
                  aria-label="Collapse picking helper"
                >
                  X
                </button>
              </div>
            </div>
          ) : null}

          {dashboardMode === DASHBOARD_MODES.plan && hidePlanFormForMobile && !hidePlanFormForMobilePicking ? (
            <div className="absolute left-4 top-4 z-[1000] flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleOpenPlanEditor}
                className="rounded-xl border border-sky-400/30 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-sky-100 shadow-xl backdrop-blur"
              >
                Edit Plan
              </button>
              {plannedRoute ? (
                <button
                  type="button"
                  onClick={handleShowPlanSummary}
                  className="rounded-xl border border-white/15 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur"
                >
                  View Summary
                </button>
              ) : null}
              {plannedRoute ? (
                <button
                  type="button"
                  onClick={handleStartNewPlan}
                  className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 shadow-xl backdrop-blur"
                >
                  New Plan
                </button>
              ) : null}
            </div>
          ) : null}

          {dashboardMode === DASHBOARD_MODES.plan && hidePlanFormForDesktop ? (
            <div className="absolute left-4 top-4 z-[1000] flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleOpenPlanEditor}
                className="rounded-xl border border-sky-400/30 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-sky-100 shadow-xl backdrop-blur"
              >
                Edit Plan
              </button>
              {plannedRoute ? (
                <button
                  type="button"
                  onClick={handleShowPlanSummary}
                  className="rounded-xl border border-white/15 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur"
                >
                  View Summary
                </button>
              ) : null}
              {plannedRoute ? (
                <button
                  type="button"
                  onClick={handleStartNewPlan}
                  className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 shadow-xl backdrop-blur"
                >
                  New Plan
                </button>
              ) : null}
            </div>
          ) : null}

          {dashboardMode === DASHBOARD_MODES.plan && plannedRoute && !isMobileViewport && showPlanSummaryDesktop ? (
            <div className="absolute left-4 top-4 z-[1000] w-[calc(100%-2rem)] max-w-[30rem] space-y-3 rounded-3xl border border-sky-400/20 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-md max-h-[calc(100vh-8rem)] overflow-y-auto md:left-4 md:top-4 md:w-[30rem]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Trip Summary</div>
                  <div className="mt-1 text-sm text-white">
                    {plannedRoute.distanceKm.toFixed(2)} km · {Math.max(1, Math.round(plannedRoute.durationMin))} min
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlanSummaryDesktop(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold leading-none text-white hover:bg-white/10"
                  aria-label="Close summary"
                >
                  X
                </button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-200">Start: {formatShortLocationLabel(plannedRoute.startPoint.label)}</span>
                <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-200">Destination: {formatShortLocationLabel(plannedRoute.endPoint.label)}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">Stops: {planStops.length}</span>
                <span className={`rounded-full px-3 py-1 ${plannedRoute.hazards.length ? 'bg-amber-500/15 text-amber-200' : 'bg-emerald-500/15 text-emerald-200'}`}>
                  {plannedRoute.hazards.length ? `${plannedRoute.hazards.length} hazard(s) detected` : 'Route cleared of detected hazards'}
                </span>
              </div>
              {planStops.length ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-xs text-slate-300">
                  <div className="mb-2 font-semibold text-slate-100">Route Stops</div>
                  <div className="space-y-1">
                    {planStops.map((stop, index) => (
                      <div key={stop.id}>Stop {index + 1}: {formatShortLocationLabel(stop.label)}</div>
                    ))}
                  </div>
                </div>
              ) : null}
              {plannedRoute?.hazards?.length ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3">
                  <div className="text-sm font-semibold text-red-100">Warning: hazards intersect this route</div>
                  <ul className="mt-2 space-y-1 text-sm text-red-200">
                    {plannedRoute.hazards.slice(0, 6).map((hazard) => (
                      <li key={hazard.key}>• {hazard.title} ({hazard.type}, {hazard.severity})</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {dashboardMode === DASHBOARD_MODES.plan && !hidePlanFormForMobilePicking && !hidePlanFormForMobile && !hidePlanFormForDesktop ? (
            <div className="absolute left-4 top-4 z-[1000] w-[calc(100%-2rem)] max-w-[30rem] space-y-3 rounded-3xl border border-sky-400/20 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-md max-h-[calc(100vh-8rem)] overflow-y-auto md:left-4 md:top-4 md:w-[30rem]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-sky-300/80">Plan Ride</div>
                  <h3 className="mt-1 text-lg font-semibold text-white">Plan a cycling route</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Add a start point, optional stops, and a destination.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCollapsePlanForm}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold leading-none text-white hover:bg-white/10"
                  aria-label="Collapse plan form"
                >
                  X
                </button>
              </div>

              {showPlanFormDesktop || !plannedRoute ? (
              <form className="space-y-4" onSubmit={handlePlanSubmit}>
                <div className="space-y-2 rounded-2xl border border-white/5 bg-white/5 p-3">
                  <label className="mb-1 block text-xs font-medium text-slate-300">Start Location</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={planStartInput}
                      onChange={(event) => {
                        setPlanStartInput(event.target.value)
                        setPlanStartLocation(null)
                      }}
                      placeholder="Enter start address"
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handlePlanUseGps}
                      className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/20 sm:shrink-0"
                    >
                      📍 Use GPS
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPlanPickMode((current) => (current === 'start' ? '' : 'start'))
                        if (isMobileViewport) {
                          setShowPlanFormMobile(false)
                        }
                      }}
                      className={`rounded-xl px-3 py-2 text-xs font-medium transition ${planPickMode === 'start' ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                    >
                      {planPickMode === 'start' ? 'Click map to set start' : 'Pick start on map'}
                    </button>
                  </div>
                </div>
                <div className="space-y-2 rounded-2xl border border-white/5 bg-white/5 p-3">
                  <label className="mb-1 block text-xs font-medium text-slate-300">Destination</label>
                  <input
                    type="text"
                    value={planDestinationInput}
                    onChange={(event) => {
                      setPlanDestinationInput(event.target.value)
                      setPlanDestinationLocation(null)
                    }}
                    placeholder="Enter destination address"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPlanPickMode((current) => (current === 'destination' ? '' : 'destination'))
                        if (isMobileViewport) {
                          setShowPlanFormMobile(false)
                        }
                      }}
                      className={`rounded-xl px-3 py-2 text-xs font-medium transition ${planPickMode === 'destination' ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                    >
                      {planPickMode === 'destination' ? 'Click map to set destination' : 'Pick destination on map'}
                    </button>
                  </div>
                </div>
                <div className="space-y-2 rounded-2xl border border-white/5 bg-white/5 p-3">
                  <label className="mb-1 block text-xs font-medium text-slate-300">Stops</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={planStopInput}
                      onChange={(event) => setPlanStopInput(event.target.value)}
                      placeholder="Add an intermediate stop"
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handlePlanAddStop}
                      className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/20 sm:shrink-0"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPlanPickMode((current) => (current === 'stop' ? '' : 'stop'))
                        if (isMobileViewport) {
                          setShowPlanFormMobile(false)
                        }
                      }}
                      className={`rounded-xl px-3 py-2 text-xs font-medium transition ${planPickMode === 'stop' ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                    >
                      {planPickMode === 'stop' ? 'Click map to add stop' : 'Pick stop on map'}
                    </button>
                  </div>
                  {planStops.length ? (
                    <div className="mt-2 max-h-36 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-2">
                      {planStops.map((stop, index) => (
                        <div key={stop.id} className="flex items-start justify-between gap-2 rounded-xl bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
                          <div>
                            <div className="font-semibold text-white">Stop {index + 1}</div>
                            <div className="text-slate-400">{stop.label}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePlanRemoveStop(stop.id)}
                            className="rounded-full border border-red-500/30 px-2 py-1 text-[11px] font-medium text-red-200 hover:bg-red-500/10"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={planLoading}
                  className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {planLoading ? 'Planning ride...' : 'Plan Ride'}
                </button>
              </form>
              ) : null}

              {planError ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{planError}</div>
              ) : null}

            </div>
          ) : null}

          {dashboardMode === DASHBOARD_MODES.plan && isMobileViewport && plannedRoute && showPlanDetailsMobile ? (
            <div
              className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
              onClick={handleClosePlanSummary}
              role="presentation"
            >
              <div
                className="w-full max-w-sm space-y-3 rounded-2xl border border-white/15 bg-slate-950/95 p-4 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Trip summary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Trip Summary</div>
                    <div className="mt-1 text-sm text-white">
                      {plannedRoute.distanceKm.toFixed(2)} km · {Math.max(1, Math.round(plannedRoute.durationMin))} min
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClosePlanSummary}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-semibold leading-none text-white hover:bg-white/10"
                    aria-label="Close trip summary"
                  >
                    X
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-200">Start: {formatShortLocationLabel(plannedRoute.startPoint.label)}</span>
                  <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-200">Destination: {formatShortLocationLabel(plannedRoute.endPoint.label)}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">Stops: {planStops.length}</span>
                </div>
                {planStops.length ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-slate-300">
                    <div className="mb-1 font-semibold text-slate-100">Stops</div>
                    {planStops.map((stop, index) => (
                      <div key={stop.id}>Stop {index + 1}: {formatShortLocationLabel(stop.label)}</div>
                    ))}
                  </div>
                ) : null}
                {plannedRoute?.hazards?.length ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2">
                    <div className="text-sm font-semibold text-red-100">Warning: hazards intersect this route</div>
                    <ul className="mt-1 space-y-1 text-xs text-red-200">
                      {plannedRoute.hazards.slice(0, 4).map((hazard) => (
                        <li key={hazard.key}>• {hazard.title} ({hazard.type}, {hazard.severity})</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2 text-xs text-emerald-200">
                    Route cleared of detected hazards.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {dashboardMode === DASHBOARD_MODES.explore && isAdmin && showCreatePanel && (
            <div className="absolute top-14 left-16 z-[1000] pointer-events-auto w-96 bg-[#1c2333] border border-[rgba(100,200,255,0.2)] rounded-xl shadow-2xl p-5 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold text-white">{editingRouteId ? 'Edit Route' : 'Create New Route'}</h3>
                <button
                  type="button"
                  onClick={handleCloseCreatePanel}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white hover:bg-white/10"
                  aria-label="Close create panel"
                >
                  X
                </button>
              </div>
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

          {dashboardMode === DASHBOARD_MODES.explore && selectedRoute && (
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
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white hover:bg-white/10"
                  aria-label="Close route details"
                >
                  X
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
            <div className={`absolute bottom-28 right-4 z-[1000] px-4 py-3 rounded-lg shadow-lg pointer-events-none ${
              actionMessage.type === 'success'
                ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                : 'bg-red-600/20 text-red-400 border border-red-500/30'
            }`}>
              {actionMessage.text}
            </div>
          )}

          {dashboardMode === DASHBOARD_MODES.explore && createdRouteDetails && (
            <div className="absolute top-16 right-4 z-[1000] w-[30rem] max-w-[calc(100%-2rem)] bg-[#1c2333] border border-[rgba(255,255,255,0.12)] rounded-xl shadow-2xl overflow-hidden pointer-events-auto">
              <div className="bg-[#232d42] px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Created Route Details</h3>
                  <p className="text-xs text-gray-300">Full API response payload</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatedRouteDetails(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white hover:bg-white/10"
                  aria-label="Close created route details"
                >
                  X
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
            <MapContainer center={mapCenter} zoom={13} className={`leaflet-map z-0 ${(dashboardMode === DASHBOARD_MODES.explore && (showCreatePanel || selectedRoute || createdRouteDetails)) || (dashboardMode === DASHBOARD_MODES.plan && (showPlanSummaryDesktop && !isMobileViewport)) ? 'opacity-40' : ''}`}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              
              {/* This smoothly pans the map if mapCenter changes! */}
              <MapUpdater center={mapCenter} bounds={activeMapBounds} />
              <MapInteractionLayer onMapClick={handlePlanMapClick} />

              {/* Draw User Location Marker if they clicked Near Me */}
              {userLoc && (
                <Marker position={userLoc}>
                  <Popup><strong>You are here</strong></Popup>
                </Marker>
              )}

              {dashboardMode === DASHBOARD_MODES.explore && showCreatePanel && newRouteForm.startLat && newRouteForm.startLng && (
                <Marker position={[Number(newRouteForm.startLat), Number(newRouteForm.startLng)]}>
                  <Popup><strong>Start point</strong></Popup>
                </Marker>
              )}

              {dashboardMode === DASHBOARD_MODES.explore && showCreatePanel && newRouteForm.endLat && newRouteForm.endLng && (
                <Marker position={[Number(newRouteForm.endLat), Number(newRouteForm.endLng)]}>
                  <Popup><strong>End point</strong></Popup>
                </Marker>
              )}

              {filteredMapHazards.map(({ hazard, coordinates: hazardCoordinates }, index) => {

                const severity = normalizeHazardSeverity(hazard?.severity)
                const hazardTypeKey = normalizeHazardType(hazard?.type)
                const markerIcon = getHazardMarkerIcon(severity, hazardTypeKey)
                const hazardType = formatHazardLabel(hazard?.type, 'Other')
                const hazardSeverity = formatHazardLabel(hazard?.severity, 'Medium')
                const hazardStatus = normalizeHazardStatus(hazard?.status)
                const currentStatus = formatHazardLabel(hazard?.status, 'Reported')
                const latestUpdate = getLatestHazardUpdate(hazard)
                const latestUpdatedAt = latestUpdate?.createdAt || hazard?.updatedAt || hazard?.createdAt
                const uploadTime = formatHazardUploadTime(latestUpdatedAt)
                const hazardId = hazard?._id || hazard?.id
                const markerEventHandlers = isMobileViewport
                  ? {
                    click: (event) => event.target.openPopup(),
                  }
                  : {
                    mouseover: (event) => event.target.openPopup(),
                    mouseout: (event) => event.target.closePopup(),
                  }

                return (
                  <Marker
                    key={hazardId || `hazard-${index}`}
                    position={[hazardCoordinates.lat, hazardCoordinates.lng]}
                    icon={markerIcon}
                    eventHandlers={markerEventHandlers}
                  >
                    <Popup closeButton={false} autoPan={false} className="hazard-hover-popup">
                      <div className="card card-col map-hazard-popup-card">
                        <div className="card-body card-body-grow">
                          <div className="card-title-row">
                            <h3 className="card-title">{hazard?.title || 'Hazard report'}</h3>
                          </div>
                          <div className="map-hazard-popup-tags">
                            <span className={`badge badge-${severity}`}>{hazardSeverity}</span>
                            <span className={`badge map-hazard-status-badge map-hazard-status-${hazardStatus}`}>{currentStatus}</span>
                          </div>
                          <div className="card-meta">
                            <span className="meta-row"><strong>Type:</strong> {hazardType}</span>
                            <span className="meta-row"><strong>Upload time:</strong> {uploadTime}</span>
                          </div>
                        </div>
                        {hazard?.imageUrl ? (
                          <div className="hazard-card-image-wrap">
                            <img
                              className="hazard-card-image"
                              src={hazard.imageUrl}
                              alt={hazard?.title || 'Hazard image'}
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <p className="hazard-popup-no-image">No current image uploaded</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
              
              {dashboardMode === DASHBOARD_MODES.explore ? (
                filteredRoutes.map((route, index) => {
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
                  )
                })
              ) : null}

              {dashboardMode === DASHBOARD_MODES.plan && plannedRoute?.coordinates?.length ? (
                <Polyline
                  positions={plannedRoute.coordinates.map(([lng, lat]) => [lat, lng])}
                  color={plannedRoute.hazards.length ? '#f59e0b' : '#3b82f6'}
                  weight={7}
                  eventHandlers={{
                    click: () => {
                      if (isMobileViewport) {
                        setShowPlanDetailsMobile(true)
                      } else {
                        setShowPlanSummaryDesktop(true)
                      }
                    },
                  }}
                />
              ) : null}

              {dashboardMode === DASHBOARD_MODES.plan && planStartLocation ? (
                <Marker position={[planStartLocation.lat, planStartLocation.lng]}>
                  <Popup><strong>Start location</strong><br />{planStartLocation.label}</Popup>
                </Marker>
              ) : null}

              {dashboardMode === DASHBOARD_MODES.plan && planStops.map((stop, index) => (
                <Marker key={stop.id} position={[stop.lat, stop.lng]}>
                  <Popup><strong>Stop {index + 1}</strong><br />{stop.label}</Popup>
                </Marker>
              ))}

              {dashboardMode === DASHBOARD_MODES.plan && planDestinationLocation ? (
                <Marker position={[planDestinationLocation.lat, planDestinationLocation.lng]}>
                  <Popup><strong>Destination</strong><br />{planDestinationLocation.label}</Popup>
                </Marker>
              ) : null}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  )
}

function getHazardCoordinates(hazard) {
  const coordinates = Array.isArray(hazard?.location?.coordinates) ? hazard.location.coordinates : []

  const rawLng = coordinates[0]
    ?? hazard?.location?.longitude
    ?? hazard?.location?.lng
    ?? hazard?.longitude
    ?? hazard?.lng
  const rawLat = coordinates[1]
    ?? hazard?.location?.latitude
    ?? hazard?.location?.lat
    ?? hazard?.latitude
    ?? hazard?.lat

  const lng = Number(rawLng)
  const lat = Number(rawLat)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null
  }

  return { lat, lng }
}

function normalizeHazardSeverity(severity) {
  const value = String(severity || 'medium').toLowerCase()
  if (value === 'high') return 'high'
  if (value === 'low') return 'low'
  return 'medium'
}

function normalizeHazardType(type) {
  const value = String(type || 'other').toLowerCase()
  if (HAZARD_TYPE_SET.has(value)) {
    return value
  }
  return 'other'
}

function normalizeHazardStatus(status) {
  const value = String(status || 'reported').toLowerCase().trim()

  if (value === 'pending' || value === 'resolved' || value === 'reported') {
    return value
  }

  return 'reported'
}

function getLatestHazardUpdate(hazard) {
  const updates = Array.isArray(hazard?.statusUpdates) ? hazard.statusUpdates : []
  if (updates.length === 0) return null

  return updates
    .slice()
    .sort((left, right) => new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime())[0]
}

function getNextHazardSeverity(current) {
  const severityCycle = ['all', 'high', 'medium', 'low']
  const currentIndex = severityCycle.indexOf(String(current || 'all').toLowerCase())

  if (currentIndex === -1 || currentIndex === severityCycle.length - 1) {
    return severityCycle[0]
  }

  return severityCycle[currentIndex + 1]
}

function getHazardTypeIconComponent(type) {
  return HAZARD_TYPE_ICON_COMPONENTS[type] || AlertTriangle
}

function getHazardTypeIconInnerMarkup(type, color) {
  const HazardTypeIcon = getHazardTypeIconComponent(type)
  const iconMarkup = renderToStaticMarkup(
    <HazardTypeIcon size={9} strokeWidth={2.3} color={color} />,
  )

  return iconMarkup
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '')
    .replace(/currentColor/g, color)
}

function getHazardPinColor(severity) {
  if (severity === 'high') return '#ef4444'
  if (severity === 'low') return '#facc15'
  return '#f97316'
}

function formatHazardLabel(value, fallback) {
  const normalized = String(value || fallback)
    .replace(/[_-]+/g, ' ')
    .trim()

  if (!normalized) return fallback

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatHazardUploadTime(value) {
  if (!value) return 'Unknown time'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'

  return date.toLocaleString()
}

function formatShortLocationLabel(value) {
  const parts = String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return 'Location unavailable'
  if (parts.length === 1) return parts[0]

  return parts.slice(0, 2).join(', ')
}

function createHazardPinIcon(severity, type) {
  const pinColor = getHazardPinColor(severity)
  const normalizedType = normalizeHazardType(type)
  const iconInnerMarkup = getHazardTypeIconInnerMarkup(normalizedType, pinColor)
  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" viewBox="0 0 22 30" fill="none">
      <path d="M11 29C11 29 20 19.6 20 11C20 6.03 15.97 2 11 2C6.03 2 2 6.03 2 11C2 19.6 11 29 11 29Z" fill="${pinColor}" stroke="white" stroke-width="2"/>
      <circle cx="11" cy="11" r="4.2" fill="white"/>
      <g transform="translate(6.6 6.6) scale(0.37)">${iconInnerMarkup}</g>
    </svg>
  `.trim()

  const iconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMarkup)}`

  return L.icon({
    iconUrl,
    iconSize: [22, 30],
    iconAnchor: [11, 30],
    popupAnchor: [0, -28],
  })
}
