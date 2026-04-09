import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../services/api'
import { HAZARD_TYPE_OPTIONS } from '../constants/hazardTypes'

const SEVERITY_CLASS = {
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
}

const INITIAL_FORM = {
  title: '',
  description: '',
  type: 'other',
  severity: 'medium',
  status: 'reported',
  communityComment: '',
}

const EARTH_RADIUS_METERS = 6371000
const COMMUNITY_UPDATE_MAX_DISTANCE_METERS = 5

function SeverityBadge({ severity }) {
  const normalized = String(severity || 'low').toLowerCase()
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1)
  return <span className={`badge ${SEVERITY_CLASS[normalized] ?? 'badge-low'}`}>{label}</span>
}

function getCurrentUserId() {
  try {
    const rawUser = localStorage.getItem('user')
    if (rawUser) {
      const parsed = JSON.parse(rawUser)
      return parsed?.id || parsed?._id || parsed?.userId || null
    }

    const token = localStorage.getItem('token')
    if (!token) return null

    const payload = token.split('.')[1]
    if (!payload) return null

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const decoded = JSON.parse(window.atob(padded))
    return decoded?.id || decoded?.userId || decoded?.sub || null
  } catch {
    return null
  }
}

function getHazardOwnerId(hazard) {
  const createdBy = hazard?.createdBy
  if (!createdBy) return null
  if (typeof createdBy === 'string') return createdBy
  return createdBy?._id || createdBy?.id || null
}

function getHazardCoordinates(hazard) {
  const coordinates = hazard?.location?.coordinates
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return null
  }

  const longitude = Number(coordinates[0])
  const latitude = Number(coordinates[1])
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  return { latitude, longitude }
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180
}

function getDistanceInMeters(first, second) {
  const latitudeDelta = toRadians(Number(second.latitude) - Number(first.latitude))
  const longitudeDelta = toRadians(Number(second.longitude) - Number(first.longitude))
  const firstLatitude = toRadians(Number(first.latitude))
  const secondLatitude = toRadians(Number(second.latitude))

  const haversineFactor = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2

  const angularDistance = 2 * Math.atan2(Math.sqrt(haversineFactor), Math.sqrt(1 - haversineFactor))
  return EARTH_RADIUS_METERS * angularDistance
}

function isWithinDistanceInMeters(first, second, maxDistanceInMeters) {
  return getDistanceInMeters(first, second) <= Number(maxDistanceInMeters)
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown date'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString()
}

function formatDateTime(dateString) {
  if (!dateString) return 'Unknown time'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleString()
}

function formatCoordinates(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'Latitude/Longitude unavailable'
  }

  return `Latitude: ${lat.toFixed(6)}  Longitude: ${lng.toFixed(6)}`
}

function getStatusUpdatesNewestFirst(hazard) {
  const updates = Array.isArray(hazard?.statusUpdates) ? hazard.statusUpdates : []
  return updates
    .slice()
    .sort((left, right) => new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime())
}

async function reverseGeocodeLocationName(latitude, longitude) {
  const endpoint = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`
  const response = await fetch(endpoint)

  if (!response.ok) {
    throw new Error('Failed to reverse geocode location')
  }

  const payload = await response.json()
  return payload?.display_name || 'Location name unavailable'
}

function IconLocation() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconMore() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  )
}

export default function Hazards() {
  const [hazards, setHazards] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isStatusUpdateMode, setIsStatusUpdateMode] = useState(false)
  const [isOwnerEditMode, setIsOwnerEditMode] = useState(false)
  const [editingHazardId, setEditingHazardId] = useState('')
  const [editingHazardImageUrl, setEditingHazardImageUrl] = useState('')
  const [editingHazardLocation, setEditingHazardLocation] = useState(null)
  const [activeMenuHazardId, setActiveMenuHazardId] = useState('')
  const [selectedHazardDetails, setSelectedHazardDetails] = useState(null)
  const [deletingHazardId, setDeletingHazardId] = useState('')
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentLocation, setCurrentLocation] = useState({
    latitude: null,
    longitude: null,
    loading: false,
    error: '',
    name: '',
    resolvingName: false,
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [cameraStream, setCameraStream] = useState(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const fileInputRef = useRef(null)
  const cameraVideoRef = useRef(null)
  const currentUserId = useMemo(() => getCurrentUserId(), [])

  const fetchHazards = async () => {
    setLoading(true)
    setLoadError('')

    try {
      const response = await api.get('/hazards')
      const rows = Array.isArray(response.data) ? response.data : []
      const sorted = rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      setHazards(sorted)
    } catch (error) {
      console.error('Failed to load hazards:', error)
      setLoadError('Failed to load hazards from backend. Please try again.')
      setHazards([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHazards()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return hazards
    if (filter === 'my') {
      return hazards.filter((hazard) => getHazardOwnerId(hazard) === currentUserId)
    }
    return hazards.filter(h => String(h.severity || '').toLowerCase() === filter)
  }, [filter, hazards])

  const currentCoordinatesText = useMemo(
    () => formatCoordinates(currentLocation.latitude, currentLocation.longitude),
    [currentLocation.latitude, currentLocation.longitude],
  )

  const emptyFilterLabel = filter === 'all' ? 'matching' : filter
  const selectedHazardUpdates = useMemo(
    () => getStatusUpdatesNewestFirst(selectedHazardDetails),
    [selectedHazardDetails],
  )

  const onFormChange = (event) => {
    const { name, value } = event.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const stopCameraStream = () => {
    setCameraStream((prevStream) => {
      if (prevStream) {
        prevStream.getTracks().forEach(track => track.stop())
      }
      return null
    })
    setIsCameraOpen(false)
  }

  const openCamera = async () => {
    setCameraError('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported by this browser/device.')
      return
    }

    try {
      stopCameraStream()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      })

      setCameraStream(stream)
      setIsCameraOpen(true)
    } catch (error) {
      setCameraError(error?.message || 'Unable to access camera. Please allow camera permissions.')
    }
  }

  const captureFromCamera = () => {
    const video = cameraVideoRef.current
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
      setCameraError('Camera is not ready yet. Please wait a moment and try again.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setCameraError('Unable to capture image from camera.')
      return
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('Failed to capture image. Please try again.')
        return
      }

      const capturedFile = new File([blob], `hazard-${Date.now()}.jpg`, { type: 'image/jpeg' })
      setImageFile(capturedFile)
      setImagePreviewUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl)
        }

        return URL.createObjectURL(capturedFile)
      })
      setCameraError('')
      stopCameraStream()
    }, 'image/jpeg', 0.92)
  }

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setCurrentLocation({
        latitude: null,
        longitude: null,
        loading: false,
        error: 'Geolocation is not supported by this browser.',
        name: '',
        resolvingName: false,
      })
      return
    }

    setCurrentLocation(prev => ({ ...prev, loading: true, error: '', name: '', resolvingName: false }))

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude

        setCurrentLocation({
          latitude,
          longitude,
          loading: false,
          error: '',
          name: '',
          resolvingName: true,
        })

        try {
          const locationName = await reverseGeocodeLocationName(latitude, longitude)
          setCurrentLocation(prev => ({
            ...prev,
            name: locationName,
            resolvingName: false,
          }))
        } catch {
          setCurrentLocation(prev => ({
            ...prev,
            name: 'Location name unavailable',
            resolvingName: false,
          }))
        }
      },
      (error) => {
        setCurrentLocation({
          latitude: null,
          longitude: null,
          loading: false,
          error: error?.message || 'Unable to read current location. Please enable location access.',
          name: '',
          resolvingName: false,
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    )
  }

  const onImageChange = (event) => {
    const nextFile = event.target.files?.[0] || null
    setImageFile(nextFile)
    setCameraError('')

    setImagePreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl)
      }

      return nextFile ? URL.createObjectURL(nextFile) : ''
    })
  }

  const openReportModal = () => {
    setFormError('')
    setIsStatusUpdateMode(false)
    setIsOwnerEditMode(false)
    setEditingHazardId('')
    setEditingHazardImageUrl('')
    setEditingHazardLocation(null)
    setFormData(INITIAL_FORM)
    setImageFile(null)
    setImagePreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl)
      }
      return ''
    })
    setCurrentLocation({
      latitude: null,
      longitude: null,
      loading: false,
      error: '',
      name: '',
      resolvingName: false,
    })
    setCameraError('')
    stopCameraStream()
    setActiveMenuHazardId('')
    setIsModalOpen(true)
    detectCurrentLocation()
  }

  const openUpdateModal = (hazard) => {
    const ownerId = getHazardOwnerId(hazard)
    if (!currentUserId || !ownerId || currentUserId === ownerId) {
      return
    }

    setFormError('')
    setIsStatusUpdateMode(true)
    setIsOwnerEditMode(false)
    setEditingHazardId(hazard?._id || '')
    setEditingHazardImageUrl('')
    setEditingHazardLocation(getHazardCoordinates(hazard))
    setFormData({
      ...INITIAL_FORM,
      status: hazard?.status || 'reported',
      communityComment: '',
    })
    setImageFile(null)
    setImagePreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl)
      }
      return ''
    })
    setCameraError('')
    stopCameraStream()
    setActiveMenuHazardId('')
    setIsModalOpen(true)
    detectCurrentLocation()
  }

  const openOwnerEditModal = (hazard) => {
    const ownerId = getHazardOwnerId(hazard)
    if (!currentUserId || ownerId !== currentUserId) {
      return
    }

    const hazardCoordinates = getHazardCoordinates(hazard)

    setFormError('')
    setIsStatusUpdateMode(false)
    setIsOwnerEditMode(true)
    setEditingHazardId(hazard?._id || '')
    setEditingHazardImageUrl(hazard?.imageUrl || '')
    setEditingHazardLocation(null)
    setFormData({
      ...INITIAL_FORM,
      title: hazard?.title || '',
      description: hazard?.description || '',
      type: hazard?.type || 'other',
      severity: hazard?.severity || 'medium',
      status: hazard?.status || 'reported',
      communityComment: '',
    })
    setImageFile(null)
    setImagePreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl)
      }
      return ''
    })
    setCurrentLocation({
      latitude: hazardCoordinates?.latitude ?? null,
      longitude: hazardCoordinates?.longitude ?? null,
      loading: false,
      error: '',
      name: hazard?.locationName || '',
      resolvingName: false,
    })
    setCameraError('')
    stopCameraStream()
    setActiveMenuHazardId('')
    setIsModalOpen(true)
  }

  const openHazardDetailsModal = (hazard) => {
    setSelectedHazardDetails(hazard || null)
  }

  const closeHazardDetailsModal = () => {
    setSelectedHazardDetails(null)
  }

  const handleDeleteHazard = async (hazard) => {
    const hazardId = hazard?._id
    if (!hazardId) return

    const ownerId = getHazardOwnerId(hazard)
    if (!currentUserId || ownerId !== currentUserId) return

    const confirmed = window.confirm(`Delete ${hazard?.title || 'this hazard'}? This cannot be undone.`)
    if (!confirmed) return

    setActiveMenuHazardId('')
    setDeletingHazardId(hazardId)
    setFormError('')

    try {
      await api.delete(`/hazards/${hazardId}`)
      if (editingHazardId === hazardId) {
        closeReportModal()
      }
      if ((selectedHazardDetails?._id || '') === hazardId) {
        closeHazardDetailsModal()
      }
      await fetchHazards()
    } catch (error) {
      setFormError(error?.response?.data?.message || 'Failed to delete hazard report. Please try again.')
    } finally {
      setDeletingHazardId('')
    }
  }

  const closeReportModal = () => {
    setIsModalOpen(false)
    setSubmitting(false)
    setFormError('')
    setIsStatusUpdateMode(false)
    setIsOwnerEditMode(false)
    setEditingHazardId('')
    setEditingHazardImageUrl('')
    setEditingHazardLocation(null)
    setFormData(INITIAL_FORM)
    setCurrentLocation({
      latitude: null,
      longitude: null,
      loading: false,
      error: '',
      name: '',
      resolvingName: false,
    })
    setCameraError('')
    stopCameraStream()
    setImageFile(null)
    setImagePreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl)
      }
      return ''
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    const closeMenuOnOutsideClick = (event) => {
      if (!event.target.closest('.hazard-actions-menu')) {
        setActiveMenuHazardId('')
      }
    }

    document.addEventListener('click', closeMenuOnOutsideClick)
    return () => document.removeEventListener('click', closeMenuOnOutsideClick)
  }, [])

  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream
    }
  }, [cameraStream])

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [cameraStream, imagePreviewUrl])

  const uploadImageToImageKit = async () => {
    if (!imageFile) {
      return ''
    }

    const uploadBody = new FormData()
    uploadBody.append('image', imageFile)

    const response = await api.post('/hazards/upload-image', uploadBody)
    const uploadedUrl = response?.data?.url || ''

    if (!uploadedUrl) {
      throw new Error('Image upload failed. Please try again.')
    }

    return uploadedUrl
  }

  const submitHazard = async (event) => {
    event.preventDefault()
    setFormError('')

    if (isStatusUpdateMode) {
      if (!editingHazardId) {
        setFormError('Invalid hazard selected for community update.')
        return
      }

      const latitude = Number(currentLocation.latitude)
      const longitude = Number(currentLocation.longitude)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        setFormError('Turn on location services and allow location access before updating hazard status.')
        return
      }

      if (!editingHazardLocation) {
        setFormError('Hazard location is unavailable for validation.')
        return
      }

      const isSameLocation = isWithinDistanceInMeters(
        { latitude, longitude },
        editingHazardLocation,
        COMMUNITY_UPDATE_MAX_DISTANCE_METERS,
      )

      if (!isSameLocation) {
        setFormError('You can post this update only when you are within about 5 meters of the hazard location.')
        return
      }

      const communityComment = formData.communityComment.trim()
      if (!communityComment) {
        setFormError('Please add a comment about the current hazard situation.')
        return
      }

      if (!imageFile) {
        setFormError('Please upload a current hazard image before submitting your update.')
        return
      }

      setSubmitting(true)

      try {
        const imageUrl = await uploadImageToImageKit()
        const payload = {
          status: formData.status,
          comment: communityComment,
          imageUrl,
          location: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
        }

        await api.put(`/hazards/${editingHazardId}`, payload)
        closeReportModal()
        await fetchHazards()
      } catch (error) {
        console.error('Failed to post hazard community update:', error)
        setFormError(error?.response?.data?.message || 'Failed to post hazard community update. Please try again.')
        setSubmitting(false)
      }

      return
    }

    const latitude = Number(currentLocation.latitude)
    const longitude = Number(currentLocation.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setFormError('Turn on location services and allow location access before creating a hazard report.')
      return
    }

    const createdBy = getCurrentUserId()
    if (!createdBy) {
      setFormError('Please log in first. A valid user is required to report hazards.')
      return
    }

    setSubmitting(true)

    try {
      const imageUrl = await uploadImageToImageKit()

      if (isOwnerEditMode && !editingHazardId) {
        setFormError('Invalid hazard selected for editing.')
        setSubmitting(false)
        return
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        severity: formData.severity,
        status: formData.status,
        locationName: currentLocation.name || '',
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        imageUrl: imageUrl || editingHazardImageUrl,
      }

      if (isOwnerEditMode) {
        await api.put(`/hazards/${editingHazardId}`, payload)
      } else {
        payload.createdBy = createdBy
        await api.post('/hazards', payload)
      }

      closeReportModal()
      await fetchHazards()
    } catch (error) {
      console.error('Failed to save hazard:', error)
      setFormError(error?.response?.data?.message || 'Failed to save hazard report. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="page hazards-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Cycling Hazards</h1>
            <p>Report and track cycling hazards from the live backend database.</p>
          </div>
          <button className="btn btn-primary" onClick={openReportModal}>
            <IconPlus /> Report Hazard
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="filter-bar">
        {[
          { label: 'All', value: 'all' },
          { label: 'My', value: 'my' },
          { label: 'High', value: 'high' },
          { label: 'Medium', value: 'medium' },
          { label: 'Low', value: 'low' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`filter-pill${filter === f.value ? ' active' : ''}`}
          >
            {f.label}
          </button>
        ))}
        <span className="filter-count">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading && (
        <div className="empty-state">
          <p>Loading hazards from backend...</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="empty-state">
          <p>{loadError}</p>
          <button className="btn btn-ghost" onClick={fetchHazards}>Retry</button>
        </div>
      )}

      {/* Cards grid */}
      {!loading && !loadError && (
        <div className="hazard-grid">
          {filtered.map(hazard => {
            const hazardId = hazard?._id || ''
            const ownerId = getHazardOwnerId(hazard)
            const isOwnHazard = Boolean(currentUserId && ownerId && ownerId === currentUserId)
            const canCommunityUpdate = Boolean(currentUserId && ownerId && ownerId !== currentUserId)
            const recentUpdates = getStatusUpdatesNewestFirst(hazard)
            const latestUpdate = recentUpdates[0]

            return (
            <div
              key={hazard._id}
              className="card card-col hazard-card-clickable"
              role="button"
              tabIndex={0}
              onClick={() => openHazardDetailsModal(hazard)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openHazardDetailsModal(hazard)
                }
              }}
            >
              <div className="card-body card-body-grow">
                {hazard.imageUrl && (
                  <div className="hazard-card-image-wrap">
                    <img className="hazard-card-image" src={hazard.imageUrl} alt={hazard.title} loading="lazy" />
                  </div>
                )}
                <div className="card-title-row">
                  <h3 className="card-title">{hazard.title}</h3>
                  <div className="card-title-actions">
                    <SeverityBadge severity={hazard.severity} />
                    {isOwnHazard && (
                      <div className="hazard-actions-menu" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          className="hazard-menu-trigger"
                          aria-label="Hazard actions"
                          onClick={() => setActiveMenuHazardId((current) => (current === hazardId ? '' : hazardId))}
                        >
                          <IconMore />
                        </button>
                        {activeMenuHazardId === hazardId && (
                          <div className="hazard-menu-popover">
                            <button type="button" onClick={() => openOwnerEditModal(hazard)}>Edit</button>
                            <button
                              type="button"
                              className="hazard-menu-delete"
                              onClick={() => handleDeleteHazard(hazard)}
                              disabled={deletingHazardId === hazardId}
                            >
                              {deletingHazardId === hazardId ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <p className="card-desc">{hazard.description}</p>
                <div className="card-meta">
                  <div className="meta-row">
                    <IconLocation /> {hazard.locationName || 'Location name unavailable'}
                  </div>
                  <div className="meta-row">
                    <IconCalendar /> {formatDate(hazard.createdAt)}
                  </div>
                </div>
                {latestUpdate?.comment && (
                  <div className="hazard-latest-comment">
                    <strong>{latestUpdate?.user?.name || 'Community rider'}:</strong> {latestUpdate.comment}
                  </div>
                )}
                {canCommunityUpdate && (
                  <div className="community-update-label">Community status update enabled</div>
                )}
              </div>

              <div className="card-footer">
                <span className="meta-row">Type: {hazard.type || 'other'}</span>
                <span className="meta-row">Status: {hazard.status || 'reported'}</span>
                {canCommunityUpdate && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={(event) => {
                      event.stopPropagation()
                      openUpdateModal(hazard)
                    }}
                  >
                    Add Update
                  </button>
                )}
              </div>
            </div>
            )
          })}
        </div>
      )}

      {!loading && !loadError && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">🚲</div>
          <p>No {emptyFilterLabel} hazards found in database.</p>
        </div>
      )}

      {selectedHazardDetails && (
        <div className="modal-backdrop" onClick={closeHazardDetailsModal}>
          <div className="modal-card hazard-details-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Hazard Roadmap</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeHazardDetailsModal}>Close</button>
            </div>

            <div className="hazard-details-grid">
              <section className="hazard-details-section">
                <h4>{selectedHazardDetails?.title || 'Hazard details'}</h4>

                {selectedHazardDetails?.imageUrl ? (
                  <div className="hazard-history-item">
                    <img
                      className="hazard-history-image"
                      src={selectedHazardDetails.imageUrl}
                      alt={selectedHazardDetails?.title || 'Hazard image'}
                    />
                  </div>
                ) : (
                  <p className="hazard-popup-no-image">No image uploaded yet.</p>
                )}

                <p className="card-desc">{selectedHazardDetails?.description || 'No description provided.'}</p>

                <div className="card-meta">
                  <span className="meta-row">Type: {selectedHazardDetails?.type || 'other'}</span>
                  <span className="meta-row">Severity: {selectedHazardDetails?.severity || 'medium'}</span>
                  <span className="meta-row">Current Status: {selectedHazardDetails?.status || 'reported'}</span>
                  <span className="meta-row">Reported: {formatDateTime(selectedHazardDetails?.createdAt)}</span>
                  <span className="meta-row">Last Updated: {formatDateTime(selectedHazardDetails?.updatedAt || selectedHazardDetails?.createdAt)}</span>
                </div>
              </section>

              <section className="hazard-details-section">
                <h4>Previous Updates</h4>

                {selectedHazardUpdates.length === 0 ? (
                  <div className="hazard-comment-item">
                    <p>No community updates available yet.</p>
                  </div>
                ) : (
                  <div className="hazard-comment-list">
                    {selectedHazardUpdates.map((update, index) => (
                      <article className="hazard-comment-item" key={update?._id || `${update?.createdAt || 'update'}-${index}`}>
                        <div className="hazard-comment-head">
                          <strong>{update?.user?.name || update?.user?.email || 'Community rider'}</strong>
                          <span>{formatDateTime(update?.createdAt)}</span>
                        </div>

                        {update?.status ? (
                          <span className="hazard-time-badge">Status: {update.status}</span>
                        ) : null}

                        <p>{update?.comment || 'No update comment provided.'}</p>

                        {update?.imageUrl ? (
                          <img
                            className="hazard-history-image"
                            src={update.imageUrl}
                            alt="Hazard update"
                            loading="lazy"
                          />
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeReportModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{isStatusUpdateMode ? 'Add Hazard Update' : 'Report Hazard'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeReportModal}>Close</button>
            </div>

            <form className="modal-form" onSubmit={submitHazard}>
              {isStatusUpdateMode ? (
                <>
                  <p className="card-desc">Add a current image and a situation comment for this hazard. New updates appear first.</p>

                  <div>
                    <label htmlFor="status">Current Hazard Status</label>
                    <select
                      id="status"
                      name="status"
                      className="input"
                      value={formData.status}
                      onChange={onFormChange}
                    >
                      <option value="reported">Reported</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="communityComment">Current Situation Comment</label>
                    <textarea
                      id="communityComment"
                      name="communityComment"
                      className="input textarea"
                      value={formData.communityComment}
                      onChange={onFormChange}
                      placeholder="Road edge is still blocked with debris, riders should slow down."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="location-panel">
                    <div>
                      <label>Your Current Location (required)</label>
                      <div className="location-readout">
                        <IconLocation />
                        {currentLocation.loading
                          ? 'Detecting current location...'
                          : currentLocation.resolvingName
                            ? 'Resolving location name...'
                            : currentLocation.name || 'Location not detected yet'}
                      </div>
                      <div className="location-coordinates">{currentCoordinatesText}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={detectCurrentLocation}
                      disabled={currentLocation.loading || submitting}
                    >
                      {currentLocation.loading ? 'Detecting...' : 'Use My Location'}
                    </button>
                  </div>

                  {currentLocation.error && <p className="form-error">{currentLocation.error}</p>}
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="title">Title</label>
                    <input
                      id="title"
                      name="title"
                      className="input"
                      value={formData.title}
                      onChange={onFormChange}
                      placeholder="Pothole near bridge entrance"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="description">Description</label>
                    <textarea
                      id="description"
                      name="description"
                      className="input textarea"
                      value={formData.description}
                      onChange={onFormChange}
                      placeholder="Describe the hazard so other riders can avoid it"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="modal-grid-two">
                    <div>
                      <label htmlFor="type">Type</label>
                      <select id="type" name="type" className="input" value={formData.type} onChange={onFormChange}>
                        {HAZARD_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="severity">Severity</label>
                      <select id="severity" name="severity" className="input" value={formData.severity} onChange={onFormChange}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>

                  <div className="location-panel">
                    <div>
                      <label>Current Location</label>
                      <div className="location-readout">
                        <IconLocation />
                        {currentLocation.loading
                          ? 'Detecting current location...'
                          : currentLocation.resolvingName
                            ? 'Resolving location name...'
                            : currentLocation.name || 'Location not detected yet'}
                      </div>
                      <div className="location-coordinates">{currentCoordinatesText}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={detectCurrentLocation}
                      disabled={currentLocation.loading || submitting}
                    >
                      {currentLocation.loading ? 'Detecting...' : 'Use My Location'}
                    </button>
                  </div>

                  {currentLocation.error && <p className="form-error">{currentLocation.error}</p>}
                </>
              )}

              <div>
                <label htmlFor="hazardImage">{isStatusUpdateMode ? 'Current Hazard Image (required)' : 'Hazard Image (Live camera or gallery)'}</label>
                <div className="camera-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={openCamera}
                    disabled={submitting || isCameraOpen}
                  >
                    {isCameraOpen ? 'Camera Open' : 'Open Device Camera'}
                  </button>

                  {isCameraOpen && (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={captureFromCamera}
                        disabled={submitting}
                      >
                        Capture Photo
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={stopCameraStream}
                        disabled={submitting}
                      >
                        Close Camera
                      </button>
                    </>
                  )}
                </div>

                {isCameraOpen && (
                  <div className="camera-preview-wrap">
                    <video ref={cameraVideoRef} className="camera-preview" autoPlay playsInline muted />
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  id="hazardImage"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="input"
                  onChange={onImageChange}
                />

                {cameraError && <p className="form-error">{cameraError}</p>}

                {imagePreviewUrl && (
                  <div className="hazard-image-preview-wrap">
                    <img src={imagePreviewUrl} alt="Hazard preview" className="hazard-image-preview" />
                  </div>
                )}
              </div>

              {formError && <p className="form-error">{formError}</p>}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeReportModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving Hazard...' : isStatusUpdateMode ? 'Post Update' : isOwnerEditMode ? 'Save Changes' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
