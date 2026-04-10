import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../services/api'

const AVATAR_CLASSES = ['avatar-green', 'avatar-orange', 'avatar-purple']
const DIFFICULTY_CLASS = { Easy: 'badge-easy', Medium: 'badge-medium', Hard: 'badge-hard' }
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard']
const INITIAL_FORM = {
  route: '',
  rating: 5,
  difficulty: 'Easy',
  distance: '',
  comment: '',
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function extractCurrentUserId(user) {
  return user?._id || user?.id || user?.userId || null
}

function getDisplayName(user) {
  if (!user || typeof user === 'string') return 'Community rider'
  const name = typeof user.name === 'string' ? user.name.trim() : ''
  if (name) return name
  const email = typeof user.email === 'string' ? user.email.trim() : ''
  if (email) return email
  return 'Community rider'
}

function getInitials(name) {
  const normalized = String(name || '').trim()
  if (!normalized) return 'CR'
  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function extractRequestErrorMessage(error, fallback) {
  const payload = error?.response?.data
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message
  if (typeof payload === 'string' && payload.trim()) return payload
  if (typeof error?.message === 'string' && error.message.trim()) return error.message
  return fallback
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown date'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString()
}

function getRouteDistanceValue(route) {
  const numericDistance = Number(route?.distance)
  return Number.isFinite(numericDistance) && numericDistance >= 0 ? numericDistance : 0
}

function StarRating({ rating }) {
  return (
    <div className="stars">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 20 20" fill={i < rating ? '#f59e0b' : 'var(--border-light)'}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function DifficultyBadge({ difficulty }) {
  return <span className={`badge ${DIFFICULTY_CLASS[difficulty] ?? 'badge-easy'}`}>{difficulty}</span>
}

function IconHeart() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
}
function IconComment() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
}
function IconShare() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
}
function IconPlus() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}
function IconRoute() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15" /><circle cx="18" cy="5" r="3" /></svg>
}

export default function Reviews() {
  const [routes, setRoutes] = useState([])
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [reviews, setReviews] = useState([])
  const [averages, setAverages] = useState({ rating: 0 })
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingReviewId, setEditingReviewId] = useState('')
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('newest')
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [routeSearch, setRouteSearch] = useState('')
  const [isRouteDropdownOpen, setIsRouteDropdownOpen] = useState(false)
  const routeDropdownRef = useRef(null)

  const currentUser = useMemo(() => getCurrentUser(), [])
  const currentUserId = useMemo(() => extractCurrentUserId(currentUser), [currentUser])
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin'
  const filteredRouteOptions = useMemo(() => {
    const query = routeSearch.trim().toLowerCase()
    if (!query) return routes
    return routes.filter((route) => String(route?.title || '').toLowerCase().includes(query))
  }, [routeSearch, routes])
  const selectedRouteLabel = useMemo(() => {
    const selectedRoute = routes.find((route) => (route?._id || route?.id || '') === selectedRouteId)
    return selectedRoute?.title || 'Select route'
  }, [routes, selectedRouteId])

  const selectRoute = (routeId) => {
    const nextRoute = routes.find((route) => (route?._id || route?.id || '') === routeId)
    setSelectedRouteId(routeId)
    setFormData((prev) => ({ ...prev, route: routeId, distance: getRouteDistanceValue(nextRoute) }))
    setIsRouteDropdownOpen(false)
    setRouteSearch('')
  }

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await api.get('/routes')
        const payload = response?.data
        const routeRows = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : []
        setRoutes(routeRows)
        const firstRouteId = routeRows[0]?._id || routeRows[0]?.id || ''
        const firstRouteDistance = getRouteDistanceValue(routeRows[0])
        setSelectedRouteId(firstRouteId)
        setFormData((prev) => ({ ...prev, route: firstRouteId, distance: firstRouteDistance }))
      } catch (error) {
        setLoadError(extractRequestErrorMessage(error, 'Failed to load routes.'))
      }
    }

    fetchRoutes()
  }, [])

  useEffect(() => {
    const fetchRouteReviews = async () => {
      if (!selectedRouteId) {
        setReviews([])
        setAverages({ rating: 0 })
        setCount(0)
        setLoading(false)
        return
      }

      setLoading(true)
      setLoadError('')
      try {
        const response = await api.get(`/reviews/route/${selectedRouteId}`)
        const payload = response?.data || {}
        setReviews(Array.isArray(payload.reviews) ? payload.reviews : [])
        setAverages(payload.averages || { rating: 0 })
        setCount(Number(payload.count) || 0)
      } catch (error) {
        setLoadError(extractRequestErrorMessage(error, 'Failed to load route reviews.'))
        setReviews([])
        setAverages({ rating: 0 })
        setCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchRouteReviews()
  }, [selectedRouteId])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!routeDropdownRef.current?.contains(event.target)) {
        setIsRouteDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = (filter === 'All' ? reviews : reviews.filter(r => r.difficulty === filter))
    .slice().sort((a, b) => (
      sort === 'newest'
        ? new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        : Number(b.likes || 0) - Number(a.likes || 0)
    ))

  const resetForm = (routeId = selectedRouteId) => {
    const selectedRoute = routes.find((route) => (route?._id || route?.id || '') === routeId)
    const routeDistance = getRouteDistanceValue(selectedRoute)
    setEditingReviewId('')
    setFormData({
      ...INITIAL_FORM,
      route: routeId || '',
      distance: routeDistance,
    })
    setFormError('')
  }

  const onFormChange = (event) => {
    const { name, value } = event.target
    if (name === 'route') {
      const selectedRoute = routes.find((route) => (route?._id || route?.id || '') === value)
      const routeDistance = getRouteDistanceValue(selectedRoute)
      setFormData((prev) => ({
        ...prev,
        route: value,
        distance: routeDistance,
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: name === 'rating' || name === 'distance' ? Number(value) : value,
    }))
  }

  const handleEdit = (review) => {
    setEditingReviewId(review?._id || review?.id || '')
    setFormError('')
    setFormData({
      route: review?.route?._id || review?.route || selectedRouteId,
      rating: Number(review?.rating || 5),
      difficulty: review?.difficulty || 'Easy',
      distance: Number(review?.distance || 0),
      comment: review?.comment || '',
    })
    setIsReviewModalOpen(true)
  }

  const openWriteReviewModal = () => {
    resetForm(selectedRouteId)
    setIsReviewModalOpen(true)
  }

  const closeWriteReviewModal = () => {
    resetForm(selectedRouteId)
    setIsReviewModalOpen(false)
  }

  const canEditReview = (review) => {
    const ownerId = review?.user?._id || review?.user?.id || review?.user
    return Boolean(currentUserId && ownerId && (ownerId === currentUserId || isAdmin))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError('')

    const payload = {
      route: formData.route || selectedRouteId,
      rating: Number(formData.rating),
      difficulty: formData.difficulty,
      distance: Number(formData.distance),
      comment: String(formData.comment || '').trim(),
    }

    if (!payload.route) {
      setFormError('Please select a route.')
      setSubmitting(false)
      return
    }

    try {
      if (editingReviewId) {
        await api.put(`/reviews/${editingReviewId}`, payload)
      } else {
        await api.post('/reviews', payload)
      }

      resetForm(payload.route)
      setIsReviewModalOpen(false)
      if (payload.route !== selectedRouteId) {
        setSelectedRouteId(payload.route)
      } else {
        const response = await api.get(`/reviews/route/${selectedRouteId}`)
        const body = response?.data || {}
        setReviews(Array.isArray(body.reviews) ? body.reviews : [])
        setAverages(body.averages || { rating: 0 })
        setCount(Number(body.count) || 0)
      }
    } catch (error) {
      setFormError(extractRequestErrorMessage(error, 'Failed to save review.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (reviewId) => {
    if (!isAdmin) return
    const confirmed = window.confirm('Delete this review? This action cannot be undone.')
    if (!confirmed) return

    try {
      await api.delete(`/reviews/${reviewId}`)
      const response = await api.get(`/reviews/route/${selectedRouteId}`)
      const body = response?.data || {}
      setReviews(Array.isArray(body.reviews) ? body.reviews : [])
      setAverages(body.averages || { rating: 0 })
      setCount(Number(body.count) || 0)
    } catch (error) {
      setFormError(extractRequestErrorMessage(error, 'Failed to delete review.'))
    }
  }

  const handleLike = async (reviewId, currentLikes) => {
    if (!currentUserId) {
      setFormError('Please log in first to like reviews.')
      return
    }

    const nextLikes = Number(currentLikes || 0) + 1

    setReviews((previous) => previous.map((review) => (
      (review?._id || review?.id) === reviewId
        ? { ...review, likes: nextLikes }
        : review
    )))

    try {
      await api.post(`/reviews/${reviewId}/like`)
    } catch (error) {
      setReviews((previous) => previous.map((review) => (
        (review?._id || review?.id) === reviewId
          ? { ...review, likes: Number(currentLikes || 0) }
          : review
      )))
      setFormError(extractRequestErrorMessage(error, 'Failed to like this review.'))
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Route Reviews</h1>
            <p>Discover and share cycling route experiences with the community.</p>
          </div>
          <div className="filter-bar-spacer" style={{ display: 'flex', gap: '0.5rem' }}>
            <div ref={routeDropdownRef} style={{ position: 'relative', minWidth: '260px' }}>
              <button
                type="button"
                className="sort-select"
                style={{ width: '100%', textAlign: 'left', height: '2.7rem' }}
                onClick={() => setIsRouteDropdownOpen((prev) => !prev)}
              >
                {selectedRouteLabel}
              </button>
              {isRouteDropdownOpen && (
                <div
                  className="card"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 0.35rem)',
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    padding: '0.5rem',
                  }}
                >
                  <input
                    type="text"
                    className="input"
                    placeholder="Search route..."
                    value={routeSearch}
                    onChange={(event) => setRouteSearch(event.target.value)}
                    autoFocus
                  />
                  <div style={{ marginTop: '0.35rem', maxHeight: '220px', overflowY: 'auto' }}>
                    {filteredRouteOptions.length === 0 ? (
                      <div className="card-desc" style={{ padding: '0.4rem 0.2rem' }}>
                        No routes found.
                      </div>
                    ) : (
                      filteredRouteOptions.map((route) => {
                        const routeId = route?._id || route?.id || ''
                        const isSelected = routeId === selectedRouteId
                        return (
                          <button
                            key={routeId || route?.title}
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ width: '100%', justifyContent: 'flex-start' }}
                            onClick={() => selectRoute(routeId)}
                          >
                            {isSelected ? '✓ ' : ''}{route?.title || 'Untitled route'}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={openWriteReviewModal}>
              <IconPlus /> Write Review
            </button>
          </div>
        </div>
      </div>

      {isReviewModalOpen && (
        <div className="modal-backdrop" onClick={closeWriteReviewModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingReviewId ? 'Edit Review' : 'Write Review'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeWriteReviewModal}>Close</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="modal-grid-two">
                <div>
                  <label htmlFor="route">Route</label>
                  <select id="route" name="route" className="input" value={formData.route} onChange={onFormChange} required>
                    {routes.map((route) => {
                      const routeId = route?._id || route?.id || ''
                      return (
                        <option key={routeId || route?.title} value={routeId}>
                          {route?.title || 'Untitled route'}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div>
                  <label htmlFor="rating">Rating</label>
                  <select id="rating" name="rating" className="input" value={formData.rating} onChange={onFormChange} required>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-grid-two">
                <div>
                  <label htmlFor="difficulty">Difficulty</label>
                  <select id="difficulty" name="difficulty" className="input" value={formData.difficulty} onChange={onFormChange} required>
                    {DIFFICULTY_OPTIONS.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="distance">Distance (km)</label>
                  <input
                    id="distance"
                    name="distance"
                    type="number"
                    min="0"
                    step="0.1"
                    className="input"
                    value={formData.distance}
                    readOnly
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="comment">Comment</label>
                <textarea
                  id="comment"
                  name="comment"
                  className="input textarea"
                  value={formData.comment}
                  onChange={onFormChange}
                  rows={3}
                  maxLength={1000}
                  placeholder="Share your route experience..."
                />
              </div>

              {formError ? <p className="form-error">{formError}</p> : null}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeWriteReviewModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <IconPlus /> {submitting ? 'Saving...' : editingReviewId ? 'Update Review' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="filter-bar">
        {['All', 'Easy', 'Medium', 'Hard'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`filter-pill${filter === f ? ' active' : ''}`}
          >
            {f}
          </button>
        ))}
        <div className="filter-bar-spacer">
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Newest first</option>
            <option value="popular">Most liked</option>
          </select>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="review-summary-grid">
        {[
          { label: 'Total Reviews', value: count, icon: '📝' },
          { label: 'Avg. Rating', value: `${Number(averages?.rating || 0).toFixed(1)} ★`, icon: '⭐' },
          { label: 'Total Likes', value: reviews.reduce((a, r) => a + Number(r.likes || 0), 0), icon: '❤️' },
        ].map(s => (
          <div key={s.label} className="summary-tile">
            <span className="summary-icon">{s.icon}</span>
            <div>
              <div className="summary-value">{s.value}</div>
              <div className="summary-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Review cards */}
      {loading && (
        <div className="empty-state">
          <p>Loading reviews...</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="empty-state">
          <p>{loadError}</p>
        </div>
      )}

      <div className="review-list">
        {!loading && !loadError && filtered.map((review, i) => {
          const reviewId = review?._id || review?.id
          const routeTitle = review?.route?.title || review?.routeName || 'Route'
          const author = getDisplayName(review?.user)
          const initials = getInitials(author)
          return (
          <div key={reviewId} className="card">
            <div className="card-body">
              <div className="review-row">
                {/* Avatar */}
                <div className={`review-avatar ${AVATAR_CLASSES[i % AVATAR_CLASSES.length]}`}>
                  {initials}
                </div>

                {/* Content */}
                <div className="review-content">
                  <div className="review-meta-row">
                    <div>
                      <h3 className="review-route-name">{author}</h3>
                      <div className="review-tags">
                        <StarRating rating={Number(review.rating || 0)} />
                        <DifficultyBadge difficulty={review.difficulty} />
                        <div className="meta-row">
                          <IconRoute /> {Number(review.distance || 0)} km
                        </div>
                      </div>
                    </div>
                    <div className="review-date-col">
                      <div className="review-date">Updated - {formatDate(review.updatedAt)}</div>
                      <div className="review-date">Created - {formatDate(review.createdAt)}</div>
                    </div>
                  </div>

                  <p className="review-comment">{review.comment}</p>

                  <div className="review-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleLike(reviewId, review.likes)}>
                      <IconHeart /> {Number(review.likes || 0)}
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled><IconComment /> Reply</button>
                    <button className="btn btn-ghost btn-sm"><IconShare /> Share</button>
                    {canEditReview(review) && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(review)}>
                        Edit
                      </button>
                    )}
                    {isAdmin && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(reviewId)}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      {!loading && !loadError && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">🗺️</div>
          <p>No reviews found for this filter.</p>
        </div>
      )}
    </div>
  )
}
