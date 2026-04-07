import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../services/api'

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
}

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

function formatDate(dateString) {
  if (!dateString) return 'Unknown date'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString()
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

export default function Hazards() {
  const [hazards, setHazards] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
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
    return hazards.filter(h => String(h.severity || '').toLowerCase() === filter)
  }, [filter, hazards])

  const emptyFilterLabel = filter === 'all' ? 'matching' : filter

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
    setIsModalOpen(true)
    detectCurrentLocation()
  }

  const closeReportModal = () => {
    setIsModalOpen(false)
    setSubmitting(false)
    setFormError('')
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

    const response = await api.post('/hazards/upload-image', uploadBody, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response?.data?.url || ''
  }

  const submitHazard = async (event) => {
    event.preventDefault()
    setFormError('')

    const createdBy = getCurrentUserId()
    if (!createdBy) {
      setFormError('Please log in first. A valid user is required to report hazards.')
      return
    }

    const latitude = Number(currentLocation.latitude)
    const longitude = Number(currentLocation.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setFormError('Current location is required. Click "Use My Location" and allow location permission.')
      return
    }

    setSubmitting(true)

    try {
      const imageUrl = await uploadImageToImageKit()

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        severity: formData.severity,
        locationName: currentLocation.name || '',
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        imageUrl,
        createdBy,
      }

      await api.post('/hazards', payload)
      closeReportModal()
      await fetchHazards()
    } catch (error) {
      console.error('Failed to create hazard:', error)
      setFormError(error?.response?.data?.message || 'Failed to submit hazard report. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
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
          {filtered.map(hazard => (
            <div key={hazard._id} className="card card-col">
              <div className="card-body card-body-grow">
                {hazard.imageUrl && (
                  <div className="hazard-card-image-wrap">
                    <img className="hazard-card-image" src={hazard.imageUrl} alt={hazard.title} loading="lazy" />
                  </div>
                )}
                <div className="card-title-row">
                  <h3 className="card-title">{hazard.title}</h3>
                  <SeverityBadge severity={hazard.severity} />
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
              </div>

              <div className="card-footer">
                <span className="meta-row">Type: {hazard.type || 'other'}</span>
                <span className="meta-row">Status: {hazard.status || 'reported'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !loadError && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">🚲</div>
          <p>No {emptyFilterLabel} hazards found in database.</p>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeReportModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Report Hazard</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeReportModal}>Close</button>
            </div>

            <form className="modal-form" onSubmit={submitHazard}>
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
                    <option value="pothole">Pothole</option>
                    <option value="debris">Debris</option>
                    <option value="lighting">Lighting</option>
                    <option value="collision">Collision</option>
                    <option value="other">Other</option>
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

              <div>
                <label htmlFor="hazardImage">Hazard Image (Live camera or gallery)</label>
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
                  {submitting ? 'Saving Hazard...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
