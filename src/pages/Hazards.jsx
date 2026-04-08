import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../services/api'

const SEVERITY_CLASS = {
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
}

const STATUS_CLASS = {
  reported: 'status-badge-reported',
  pending: 'status-badge-pending',
  resolved: 'status-badge-resolved',
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

function StatusBadge({ status }) {
  const normalized = String(status || 'reported').toLowerCase()
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1)
  return <span className={`status-badge ${STATUS_CLASS[normalized] ?? 'status-badge-reported'}`}>{label}</span>
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

function formatCoordinates(location) {
  const coords = location?.coordinates
  if (!Array.isArray(coords) || coords.length !== 2) {
    return 'Unknown location'
  }

  const [lng, lat] = coords
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'Unknown location'
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
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

function getUserDisplayLabel(userValue, fallback = 'Unknown user') {
  if (!userValue) return fallback
  if (typeof userValue === 'string') return 'User account'
  return userValue.name || userValue.email || fallback
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
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false)
  const [hazardToResolve, setHazardToResolve] = useState(null)
  const [solveResult, setSolveResult] = useState('')
  const [solveError, setSolveError] = useState('')
  const [resolveSubmitting, setResolveSubmitting] = useState(false)
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
  const selectedTypeLabel = formData.type ? `${formData.type.charAt(0).toUpperCase()}${formData.type.slice(1)}` : 'Other'
  const selectedSeverityLabel = formData.severity ? `${formData.severity.charAt(0).toUpperCase()}${formData.severity.slice(1)}` : 'Medium'
  const detectedLatitude = Number(currentLocation.latitude)
  const detectedLongitude = Number(currentLocation.longitude)
  const hasDetectedLocation = Number.isFinite(detectedLatitude) && Number.isFinite(detectedLongitude)

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
        updatedBy: createdBy,
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

  const openResolveModal = (hazard) => {
    setHazardToResolve(hazard)
    setSolveResult('')
    setSolveError('')
    setResolveSubmitting(false)
    setIsResolveModalOpen(true)
  }

  const closeResolveModal = () => {
    setIsResolveModalOpen(false)
    setHazardToResolve(null)
    setSolveResult('')
    setSolveError('')
    setResolveSubmitting(false)
  }

  const submitResolveHazard = async (event) => {
    event.preventDefault()
    setSolveError('')

    if (!hazardToResolve?._id) {
      setSolveError('Please choose a hazard to mark as solved.')
      return
    }

    const actorId = getCurrentUserId()
    if (!actorId) {
      setSolveError('Please log in first. A valid user is required to solve hazards.')
      return
    }

    const normalizedSolveResult = solveResult.trim()
    if (!normalizedSolveResult) {
      setSolveError('Please enter the solve result before marking this hazard as solved.')
      return
    }

    setResolveSubmitting(true)

    try {
      await api.patch(`/hazards/${hazardToResolve._id}/resolve`, {
        solveResult: normalizedSolveResult,
        updatedBy: actorId,
        resolvedBy: actorId,
      })

      closeResolveModal()
      await fetchHazards()
    } catch (error) {
      console.error('Failed to solve hazard:', error)
      setSolveError(error?.response?.data?.message || 'Failed to mark hazard as solved. Please try again.')
      setResolveSubmitting(false)
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
          {filtered.map(hazard => {
            const status = String(hazard.status || 'reported').toLowerCase()
            const isResolved = status === 'resolved'
            const createdByLabel = getUserDisplayLabel(hazard.createdBy, 'Unknown reporter')
            const updatedByLabel = hazard.updatedBy ? getUserDisplayLabel(hazard.updatedBy, 'Unknown updater') : ''
            const resolvedByLabel = hazard.resolvedBy ? getUserDisplayLabel(hazard.resolvedBy, 'Unknown resolver') : ''

            return (
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

                  {isResolved && hazard.solveResult && (
                    <div className="hazard-solve-result">
                      <span className="hazard-solve-result-label">Solve Result:</span>
                      <p>{hazard.solveResult}</p>
                    </div>
                  )}

                  <div className="card-meta">
                    <div className="meta-row">
                      <IconLocation /> {hazard.locationName || 'Location name unavailable'}
                    </div>
                    <div className="meta-row">
                      <IconCalendar /> Reported: {formatDate(hazard.createdAt)}
                    </div>
                    <div className="meta-row">Reported by: {createdByLabel}</div>
                    <div className="meta-row">Last updated: {formatDateTime(hazard.updatedAt)}</div>
                    {updatedByLabel && <div className="meta-row">Updated by: {updatedByLabel}</div>}
                    {isResolved && resolvedByLabel && <div className="meta-row">Solved by: {resolvedByLabel}</div>}
                    {isResolved && hazard.resolvedAt && <div className="meta-row">Solved on: {formatDateTime(hazard.resolvedAt)}</div>}
                  </div>
                </div>

                <div className="card-footer card-footer-stack">
                  <div className="card-footer-status">
                    <span className="meta-row">Type: {hazard.type || 'other'}</span>
                    <StatusBadge status={status} />
                  </div>

                  {!isResolved && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => openResolveModal(hazard)}
                      disabled={resolveSubmitting}
                    >
                      Mark as Solved
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

      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeReportModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Report Hazard</h3>
                <p className="modal-subtitle">Share clear details so nearby riders can plan safer routes.</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={closeReportModal}>Close</button>
            </div>

            <form className="modal-form" onSubmit={submitHazard}>
              <div className="hazard-report-summary" aria-live="polite">
                <span className="summary-chip">Type: {selectedTypeLabel}</span>
                <span className="summary-chip">Severity: {selectedSeverityLabel}</span>
                <span className={`summary-chip${hasDetectedLocation ? ' summary-chip-ready' : ''}`}>
                  Location: {hasDetectedLocation ? 'Captured' : 'Pending'}
                </span>
              </div>

              <section className="form-section">
                <div className="form-section-head">
                  <h4>Hazard Details</h4>
                  <p>Describe the issue clearly so cyclists can decide quickly and safely.</p>
                </div>

                <div className="form-field">
                  <div className="field-label-row">
                    <label htmlFor="title">Title</label>
                    <span className="field-help">Short and specific</span>
                  </div>
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

                <div className="form-field">
                  <div className="field-label-row">
                    <label htmlFor="description">Description</label>
                    <span className="field-help">Include obstacles and lane impact</span>
                  </div>
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
                  <div className="form-field">
                    <label htmlFor="type">Type</label>
                    <select id="type" name="type" className="input" value={formData.type} onChange={onFormChange}>
                      <option value="pothole">Pothole</option>
                      <option value="debris">Debris</option>
                      <option value="lighting">Lighting</option>
                      <option value="collision">Collision</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="severity">Severity</label>
                    <select id="severity" name="severity" className="input" value={formData.severity} onChange={onFormChange}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="form-section">
                <div className="form-section-head">
                  <h4>Location</h4>
                  <p>Use your live position so riders can trust the report.</p>
                </div>

                <div className="location-panel">
                  <div className="location-panel-main">
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
                  <div className="location-panel-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={detectCurrentLocation}
                      disabled={currentLocation.loading || submitting}
                    >
                      {currentLocation.loading ? 'Detecting...' : 'Use My Location'}
                    </button>
                  </div>
                </div>

                {hasDetectedLocation && (
                  <p className="location-coordinates">
                    Coordinates: {detectedLatitude.toFixed(6)}, {detectedLongitude.toFixed(6)}
                  </p>
                )}

                {currentLocation.error && <p className="form-error">{currentLocation.error}</p>}
              </section>

              <section className="form-section">
                <div className="form-section-head">
                  <h4>Photo Evidence</h4>
                  <p>Add an image from camera or gallery to improve report quality.</p>
                </div>

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

                <div className="form-field">
                  <label htmlFor="hazardImage">Hazard Image (Camera or Gallery)</label>
                  <input
                    ref={fileInputRef}
                    id="hazardImage"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="input"
                    onChange={onImageChange}
                  />
                </div>

                {cameraError && <p className="form-error">{cameraError}</p>}

                {imagePreviewUrl && (
                  <div className="hazard-image-preview-wrap">
                    <img src={imagePreviewUrl} alt="Hazard preview" className="hazard-image-preview" />
                  </div>
                )}
              </section>

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

      {isResolveModalOpen && (
        <div className="modal-backdrop" onClick={closeResolveModal}>
          <div className="modal-card modal-card-compact" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Mark Hazard as Solved</h3>
                <p className="modal-subtitle">Provide the solve result so riders know what was fixed.</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={closeResolveModal} disabled={resolveSubmitting}>Close</button>
            </div>

            <form className="modal-form" onSubmit={submitResolveHazard}>
              <section className="form-section">
                <div className="form-field">
                  <label>Hazard</label>
                  <p className="resolve-hazard-title">{hazardToResolve?.title || 'Selected hazard'}</p>
                </div>

                <div className="form-field">
                  <label htmlFor="solveResult">Solve Result</label>
                  <textarea
                    id="solveResult"
                    className="input textarea"
                    value={solveResult}
                    onChange={(event) => setSolveResult(event.target.value)}
                    placeholder="Describe what was fixed and current riding condition"
                    rows={4}
                    required
                  />
                </div>
              </section>

              {solveError && <p className="form-error">{solveError}</p>}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeResolveModal} disabled={resolveSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={resolveSubmitting}>
                  {resolveSubmitting ? 'Saving...' : 'Confirm Solved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
