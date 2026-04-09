import { useDeferredValue, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext.jsx'
import { HAZARD_TYPE_OPTIONS } from '../constants/hazardTypes'

const DEFAULT_USER_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'user',
  cyclingStyle: 'commuter',
  isVerified: false,
}

const CYCLING_STYLE_LABELS = {
  commuter: 'Commuter',
  fitness: 'Fitness Rider',
  adventure: 'Adventure Rider',
  casual: 'Casual Explorer',
}

function formatDate(value) {
  if (!value) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function normalizeUsersPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.users)) return payload.users
  if (Array.isArray(payload?.data?.users)) return payload.data.users
  return []
}

function sortUsersByDate(users) {
  return users.slice().sort((left, right) => {
    const leftDate = new Date(left.createdAt || 0).getTime()
    const rightDate = new Date(right.createdAt || 0).getTime()

    if (rightDate !== leftDate) return rightDate - leftDate
    return String(left.name || '').localeCompare(String(right.name || ''))
  })
}

function getUserId(user) {
  return user?._id || user?.id || user?.email || ''
}

function getRouteId(route) {
  return route?._id || route?.id || ''
}

function getHazardId(hazard) {
  return hazard?._id || hazard?.id || ''
}

function getRouteLocationValues(location) {
  const coordinates = Array.isArray(location?.coordinates) ? location.coordinates : []
  const lng = Number(coordinates[0])
  const lat = Number(coordinates[1])

  return {
    lng: Number.isFinite(lng) ? String(lng) : '',
    lat: Number.isFinite(lat) ? String(lat) : '',
    address: location?.address || '',
  }
}

const DEFAULT_ROUTE_FORM = {
  title: '',
  ecoScore: '',
  startLng: '',
  startLat: '',
  startAddress: '',
  endLng: '',
  endLat: '',
  endAddress: '',
}

const DEFAULT_HAZARD_FORM = {
  title: '',
  description: '',
  type: 'other',
  severity: 'medium',
  status: 'reported',
  locationName: '',
  longitude: '',
  latitude: '',
  imageUrl: '',
}

const MAX_HAZARD_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024

function normalizeRoleValue(value) {
  const role = String(value || 'user').toLowerCase()
  return role === 'organisation' ? 'organization' : role
}

function supportsCyclingStyle(role) {
  return normalizeRoleValue(role) === 'user'
}

function getCyclingStyleLabel(value) {
  return CYCLING_STYLE_LABELS[value] || 'Not selected'
}

function getRoleLabel(value) {
  const role = normalizeRoleValue(value)
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function getRoleTone(value) {
  const role = normalizeRoleValue(value)
  if (role === 'admin') return 'admin'
  if (role === 'organization') return 'organization'
  return 'user'
}

function isAdminOrOrganization(value) {
  const role = normalizeRoleValue(value)
  return role === 'admin' || role === 'organization'
}

function isCreatedWithinLastWeek(value) {
  if (!value) return false

  const createdAt = new Date(value)
  if (Number.isNaN(createdAt.getTime())) return false

  const now = new Date()
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000
  return createdAt.getTime() >= sevenDaysAgo
}

function normalizeBoolean(value) {
  return value === true || value === 'true'
}

async function loadUsersFromApi() {
  const { data } = await api.get('/users')
  return sortUsersByDate(normalizeUsersPayload(data))
}

function normalizeRoutesPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.routes)) return payload.routes
  if (Array.isArray(payload?.data?.routes)) return payload.data.routes
  return []
}

function normalizeReviewsPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.reviews)) return payload.reviews
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.reviews)) return payload.data.reviews
  return []
}

function normalizeSingleUserPayload(payload) {
  return payload?.data?.data || payload?.data || payload || null
}

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function formatLocationSummary(location) {
  if (location?.address) return location.address

  const coordinates = location?.coordinates
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    const [lng, lat] = coordinates.map((value) => Number(value))
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }

  return 'Not available'
}

function formatHazardLocation(hazard) {
  return formatLocationSummary(hazard?.location)
}

function getHazardLocationValues(hazard) {
  const coordinates = Array.isArray(hazard?.location?.coordinates) ? hazard.location.coordinates : []
  const lng = Number(coordinates[0])
  const lat = Number(coordinates[1])

  return {
    longitude: Number.isFinite(lng) ? String(lng) : '',
    latitude: Number.isFinite(lat) ? String(lat) : '',
  }
}

function buildHazardFormFromHazard(hazard) {
  const { longitude, latitude } = getHazardLocationValues(hazard)

  return {
    title: hazard?.title || '',
    description: hazard?.description || '',
    type: hazard?.type || 'other',
    severity: hazard?.severity || 'medium',
    status: hazard?.status || 'reported',
    locationName: hazard?.locationName || '',
    longitude,
    latitude,
    imageUrl: hazard?.imageUrl || '',
  }
}

function formatScore(value) {
  const score = Number(value || 0)
  return Number.isFinite(score) ? score.toFixed(1) : '0.0'
}

function formatReviewAverage(review) {
  return formatScore((Number(review?.safetyRating || 0) + Number(review?.ecoRating || 0)) / 2)
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconCheckShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function IconRoute() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 20a2 2 0 1 1-4 0c0-1.11.89-2 2-2s2 .89 2 2Z" />
      <path d="M19 6a2 2 0 1 1-4 0c0-1.11.89-2 2-2s2 .89 2 2Z" />
      <path d="M7 20h4a2 2 0 0 0 2-2v-4" />
      <path d="M17 8v4a2 2 0 0 1-2 2h-4" />
      <path d="M13 10 17 6" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function IconReview() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  )
}

function IconSpark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 1.9 3.86L18 8.76l-3 2.93.71 4.14L12 13.77l-3.71 2.06.71-4.14-3-2.93 4.1-1.9L12 3z" />
    </svg>
  )
}

function IconMap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  )
}

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { logout, updateUser, user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [hazards, setHazards] = useState([])
  const [routes, setRoutes] = useState([])
  const [reviews, setReviews] = useState([])
  const [reviewAverages, setReviewAverages] = useState({ safety: 0, eco: 0, overall: 0 })
  const [adminProfile, setAdminProfile] = useState(currentUser || null)
  const [isLoading, setIsLoading] = useState(true)
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true)
  const [error, setError] = useState('')
  const [workspaceError, setWorkspaceError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editorMode, setEditorMode] = useState('')
  const [editingUserId, setEditingUserId] = useState('')
  const [form, setForm] = useState(DEFAULT_USER_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState('')
  const [deletingHazardId, setDeletingHazardId] = useState('')
  const [deletingRouteId, setDeletingRouteId] = useState('')
  const [hazardEditorMode, setHazardEditorMode] = useState('')
  const [editingHazardId, setEditingHazardId] = useState('')
  const [hazardForm, setHazardForm] = useState(DEFAULT_HAZARD_FORM)
  const [hazardImageFile, setHazardImageFile] = useState(null)
  const [isHazardImageUploading, setIsHazardImageUploading] = useState(false)
  const [isHazardSubmitting, setIsHazardSubmitting] = useState(false)
  const [routeEditorMode, setRouteEditorMode] = useState('')
  const [editingRouteId, setEditingRouteId] = useState('')
  const [routeForm, setRouteForm] = useState(DEFAULT_ROUTE_FORM)
  const [isRouteSubmitting, setIsRouteSubmitting] = useState(false)
  const [activeAdminSection, setActiveAdminSection] = useState('overview')
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase())
  const currentUserId = getUserId(currentUser)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleManageProfile = () => {
    navigate('/admin/profile')
  }

  const resetEditor = () => {
    setEditorMode('')
    setEditingUserId('')
    setForm(DEFAULT_USER_FORM)
  }

  const handleAdminSectionChange = (sectionId) => {
    setActiveAdminSection(sectionId)
  }

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => {
      const nextValue = type === 'checkbox' ? checked : value

      if (name === 'role') {
        return {
          ...current,
          role: nextValue,
          cyclingStyle: supportsCyclingStyle(nextValue)
            ? (current.cyclingStyle || 'commuter')
            : '',
        }
      }

      return {
        ...current,
        [name]: nextValue,
      }
    })
  }

  const handleCreateStart = () => {
    setError('')
    setSuccessMessage('')
    setForm(DEFAULT_USER_FORM)
    setEditingUserId('')
    setEditorMode('create')
    handleAdminSectionChange('users')
  }

  const handleEditStart = (user) => {
    setError('')
    setSuccessMessage('')
    setEditingUserId(getUserId(user))
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: normalizeRoleValue(user.role),
      cyclingStyle: supportsCyclingStyle(user.role) ? (user.cyclingStyle || 'commuter') : '',
      isVerified: Boolean(user.isVerified),
    })
    setEditorMode('edit')
    handleAdminSectionChange('users')
  }

  const handleCancelEditor = () => {
    setError('')
    setSuccessMessage('')
    resetEditor()
  }

  const resetRouteEditor = () => {
    setRouteEditorMode('')
    setEditingRouteId('')
    setRouteForm(DEFAULT_ROUTE_FORM)
  }

  const resetHazardEditor = () => {
    setHazardEditorMode('')
    setEditingHazardId('')
    setHazardForm(DEFAULT_HAZARD_FORM)
    setHazardImageFile(null)
    setIsHazardImageUploading(false)
  }

  const handleCreateHazardStart = () => {
    setError('')
    setSuccessMessage('')
    setHazardForm(DEFAULT_HAZARD_FORM)
    setHazardImageFile(null)
    setEditingHazardId('')
    setHazardEditorMode('create')
    handleAdminSectionChange('hazards')
  }

  const handleEditHazardStart = (hazard) => {
    setError('')
    setSuccessMessage('')
    setEditingHazardId(getHazardId(hazard))
    setHazardForm(buildHazardFormFromHazard(hazard))
    setHazardImageFile(null)
    setHazardEditorMode('edit')
    handleAdminSectionChange('hazards')
  }

  const handleHazardFormChange = (event) => {
    const { name, value } = event.target
    setHazardForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleHazardImageFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null

    if (!nextFile) {
      setHazardImageFile(null)
      return
    }

    if (!nextFile.type.startsWith('image/')) {
      setError('Only image files are allowed for hazard uploads.')
      setHazardImageFile(null)
      event.target.value = ''
      return
    }

    if (nextFile.size > MAX_HAZARD_IMAGE_UPLOAD_BYTES) {
      setError('Image size must be 5MB or less.')
      setHazardImageFile(null)
      event.target.value = ''
      return
    }

    setError('')
    setHazardImageFile(nextFile)
  }

  const uploadHazardImage = async (file, { showSuccessMessage = true } = {}) => {
    if (!file) {
      throw new Error('Please select an image before uploading.')
    }

    const multipartPayload = new FormData()
    multipartPayload.append('image', file)

    setIsHazardImageUploading(true)

    try {
      const response = await api.post('/hazards/upload-image', multipartPayload)
      const uploadedUrl = String(response?.data?.url || '').trim()

      if (!uploadedUrl) {
        throw new Error('Image upload succeeded but no image URL was returned.')
      }

      setHazardForm((current) => ({
        ...current,
        imageUrl: uploadedUrl,
      }))
      setHazardImageFile(null)

      if (showSuccessMessage) {
        setSuccessMessage('Hazard image uploaded successfully.')
      }

      return uploadedUrl
    } catch (requestError) {
      const message = extractErrorMessage(requestError, 'Unable to upload hazard image right now.')
      setError(message)
      throw requestError
    } finally {
      setIsHazardImageUploading(false)
    }
  }

  const handleHazardImageUpload = async () => {
    setError('')
    setSuccessMessage('')

    try {
      await uploadHazardImage(hazardImageFile)
    } catch {
      // Error state is already handled in uploadHazardImage.
    }
  }

  const handleHazardCancelEditor = () => {
    setError('')
    setSuccessMessage('')
    resetHazardEditor()
  }

  const isHazardModalBusy = isHazardSubmitting || isHazardImageUploading

  const handleHazardModalBackdropClick = (event) => {
    if (event.target !== event.currentTarget || isHazardModalBusy) {
      return
    }

    handleHazardCancelEditor()
  }

  const handleEditRouteStart = (route) => {
    setError('')
    setSuccessMessage('')
    setEditingRouteId(getRouteId(route))

    const startLocation = getRouteLocationValues(route?.startLocation)
    const endLocation = getRouteLocationValues(route?.endLocation)

    setRouteForm({
      title: route?.title || '',
      ecoScore: route?.ecoScore?.toString?.() || '',
      startLng: startLocation.lng,
      startLat: startLocation.lat,
      startAddress: startLocation.address,
      endLng: endLocation.lng,
      endLat: endLocation.lat,
      endAddress: endLocation.address,
    })
    setRouteEditorMode('edit')
    handleAdminSectionChange('routes')
  }

  const handleRouteFormChange = (event) => {
    const { name, value } = event.target
    setRouteForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleRouteCancelEditor = () => {
    setError('')
    setSuccessMessage('')
    resetRouteEditor()
  }

  useEffect(() => {
    let isMounted = true

    const loadDashboard = async () => {
      setIsLoading(true)
      setIsWorkspaceLoading(true)
      setError('')
      setWorkspaceError('')

      const results = await Promise.allSettled([
        loadUsersFromApi(),
        api.get('/hazards'),
        api.get('/routes'),
        api.get('/reviews'),
        currentUserId ? api.get(`/users/${currentUserId}`) : Promise.resolve({ data: currentUser }),
      ])

      if (!isMounted) return

      const [usersResult, hazardsResult, routesResult, reviewsResult, profileResult] = results
      const workspaceMessages = []

      if (usersResult.status === 'fulfilled') {
        setUsers(usersResult.value)
      } else {
        setUsers([])
        setError(extractErrorMessage(usersResult.reason, 'Unable to load users for admin management.'))
      }

      if (hazardsResult.status === 'fulfilled') {
        const nextHazards = Array.isArray(hazardsResult.value?.data) ? hazardsResult.value.data : []
        setHazards(nextHazards)
      } else {
        setHazards([])
        workspaceMessages.push(extractErrorMessage(hazardsResult.reason, 'Unable to load hazards.'))
      }

      if (routesResult.status === 'fulfilled') {
        setRoutes(normalizeRoutesPayload(routesResult.value?.data))
      } else {
        setRoutes([])
        workspaceMessages.push(extractErrorMessage(routesResult.reason, 'Unable to load routes.'))
      }

      if (reviewsResult.status === 'fulfilled') {
        const payload = reviewsResult.value?.data
        setReviews(normalizeReviewsPayload(payload))
        setReviewAverages(payload?.averages || { safety: 0, eco: 0, overall: 0 })
      } else {
        setReviews([])
        setReviewAverages({ safety: 0, eco: 0, overall: 0 })
        workspaceMessages.push(extractErrorMessage(reviewsResult.reason, 'Unable to load reviews.'))
      }

      if (profileResult.status === 'fulfilled') {
        setAdminProfile(normalizeSingleUserPayload(profileResult.value?.data) || currentUser || null)
      } else {
        setAdminProfile(currentUser || null)
        workspaceMessages.push(extractErrorMessage(profileResult.reason, 'Unable to load admin profile.'))
      }

      setWorkspaceError(workspaceMessages.join(' '))
      setIsLoading(false)
      setIsWorkspaceLoading(false)
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [currentUser, currentUserId])

  useEffect(() => {
    if (!hazardEditorMode) return undefined

    const handleEscapeClose = (event) => {
      if (event.key !== 'Escape' || isHazardModalBusy) {
        return
      }

      handleHazardCancelEditor()
    }

    window.addEventListener('keydown', handleEscapeClose)

    return () => {
      window.removeEventListener('keydown', handleEscapeClose)
    }
  }, [hazardEditorMode, isHazardModalBusy])

  const filteredUsers = users.filter((user) => {
    const userRole = normalizeRoleValue(user.role)
    const matchesRole =
      roleFilter === 'all' ||
      userRole === roleFilter ||
      (roleFilter === 'organization' && userRole === 'organisation')

    const haystack = [
      user.name,
      user.email,
      getRoleLabel(userRole),
      supportsCyclingStyle(userRole) ? getCyclingStyleLabel(user.cyclingStyle) : '',
      user.isVerified ? 'verified' : 'not verified',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const matchesSearch = !deferredSearchQuery || haystack.includes(deferredSearchQuery)

    return matchesRole && matchesSearch
  })

  const totalUsers = users.length
  const verifiedUsers = users.filter((user) => Boolean(user.isVerified)).length
  const adminOrganizations = users.filter((user) => isAdminOrOrganization(user.role)).length
  const newSignupsThisWeek = users.filter((user) => isCreatedWithinLastWeek(user.createdAt)).length
  const activeHazards = hazards.filter((hazard) => String(hazard.status || '').toLowerCase() !== 'resolved').length
  const resolvedHazards = hazards.filter((hazard) => String(hazard.status || '').toLowerCase() === 'resolved').length
  const highSeverityHazards = hazards.filter((hazard) => String(hazard.severity || '').toLowerCase() === 'high').length
  const averageRouteDistance = routes.length
    ? routes.reduce((sum, route) => sum + Number(route.distance || 0), 0) / routes.length
    : 0
  const averageRouteEcoScore = routes.length
    ? routes.reduce((sum, route) => sum + Number(route.ecoScore || 0), 0) / routes.length
    : 0
  const recentHazards = hazards.slice(0, 8)
  const recentRoutes = routes.slice(0, 8)
  const recentReviews = reviews.slice(0, 8)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (editorMode === 'create' && !form.password.trim()) {
      setError('Password is required when creating a user.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: normalizeRoleValue(form.role),
        isVerified: Boolean(form.isVerified),
      }

      if (supportsCyclingStyle(form.role)) {
        payload.cyclingStyle = form.cyclingStyle
      }

      if (form.password.trim()) {
        payload.password = form.password
      }

      if (editorMode === 'create') {
        await api.post('/users', payload)
      } else if (editingUserId) {
        await api.put(`/users/${editingUserId}`, payload)
      }

      const refreshedUsers = await loadUsersFromApi()
      setUsers(refreshedUsers)

      if (editingUserId && editingUserId === currentUserId) {
        const refreshedCurrentUser = refreshedUsers.find((user) => getUserId(user) === currentUserId)

        if (refreshedCurrentUser) {
          setAdminProfile(refreshedCurrentUser)
          updateUser({
            id: getUserId(refreshedCurrentUser),
            name: refreshedCurrentUser.name || '',
            email: refreshedCurrentUser.email || '',
            cyclingStyle: supportsCyclingStyle(refreshedCurrentUser.role) ? (refreshedCurrentUser.cyclingStyle || 'commuter') : '',
            role: normalizeRoleValue(refreshedCurrentUser.role),
          })
        }
      }

      setSuccessMessage(editorMode === 'create' ? 'User created successfully.' : 'User updated successfully.')
      resetEditor()
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          (editorMode === 'create' ? 'Unable to create user right now.' : 'Unable to update user right now.'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (user) => {
    const targetUserId = getUserId(user)
    if (!targetUserId) return

    const confirmed = window.confirm(`Delete ${user.name || user.email || 'this user'}? This cannot be undone.`)
    if (!confirmed) return

    setError('')
    setSuccessMessage('')
    setDeletingUserId(targetUserId)

    try {
      await api.delete(`/users/${targetUserId}`)

      if (targetUserId === currentUserId) {
        logout()
        navigate('/login', { replace: true })
        return
      }

      const refreshedUsers = await loadUsersFromApi()
      setUsers(refreshedUsers)

      if (editingUserId === targetUserId) {
        resetEditor()
      }

      setSuccessMessage('User deleted successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete user right now.')
    } finally {
      setDeletingUserId('')
    }
  }

  const handleDeleteRoute = async (route) => {
    const targetRouteId = getRouteId(route)
    if (!targetRouteId) return

    const routeName = route?.title || 'this route'
    const confirmed = window.confirm(`Delete ${routeName}? This cannot be undone.`)
    if (!confirmed) return

    setError('')
    setSuccessMessage('')
    setDeletingRouteId(targetRouteId)

    try {
      await api.delete(`/routes/${targetRouteId}`)
      const refreshedRoutesResponse = await api.get('/routes')
      setRoutes(normalizeRoutesPayload(refreshedRoutesResponse?.data))
      setSuccessMessage('Route deleted successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete route right now.')
    } finally {
      setDeletingRouteId('')
    }
  }

  const handleDeleteHazard = async (hazard) => {
    const targetHazardId = getHazardId(hazard)
    if (!targetHazardId) return

    const hazardName = hazard?.title || 'this hazard report'
    const confirmed = window.confirm(`Delete ${hazardName}? This cannot be undone.`)
    if (!confirmed) return

    setError('')
    setSuccessMessage('')
    setDeletingHazardId(targetHazardId)

    try {
      await api.delete(`/hazards/${targetHazardId}`)
      const refreshedHazardsResponse = await api.get('/hazards')
      const nextHazards = Array.isArray(refreshedHazardsResponse?.data) ? refreshedHazardsResponse.data : []
      setHazards(nextHazards)
      setSuccessMessage('Hazard report deleted successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete hazard report right now.')
    } finally {
      setDeletingHazardId('')
    }
  }

  const handleHazardSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!hazardForm.title.trim()) {
      setError('Hazard title is required.')
      return
    }

    if (!hazardForm.description.trim()) {
      setError('Hazard description is required.')
      return
    }

    const longitude = Number(hazardForm.longitude)
    const latitude = Number(hazardForm.latitude)

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      setError('Longitude and latitude must be valid numbers.')
      return
    }

    if (longitude < -180 || longitude > 180) {
      setError('Longitude must be between -180 and 180.')
      return
    }

    if (latitude < -90 || latitude > 90) {
      setError('Latitude must be between -90 and 90.')
      return
    }

    if (hazardEditorMode === 'edit' && !editingHazardId) {
      setError('Select a hazard to edit first.')
      return
    }

    setIsHazardSubmitting(true)

    try {
      let imageUrl = hazardForm.imageUrl.trim()
      if (hazardImageFile) {
        imageUrl = await uploadHazardImage(hazardImageFile, { showSuccessMessage: false })
      }

      const payload = {
        title: hazardForm.title.trim(),
        description: hazardForm.description.trim(),
        type: hazardForm.type,
        severity: hazardForm.severity,
        status: hazardForm.status,
        locationName: hazardForm.locationName.trim(),
        imageUrl,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      }

      if (hazardEditorMode === 'create') {
        await api.post('/hazards', payload)
      } else {
        await api.put(`/hazards/${editingHazardId}`, payload)
      }

      const refreshedHazardsResponse = await api.get('/hazards')
      const nextHazards = Array.isArray(refreshedHazardsResponse?.data) ? refreshedHazardsResponse.data : []
      setHazards(nextHazards)
      setSuccessMessage(hazardEditorMode === 'create' ? 'Hazard created successfully.' : 'Hazard updated successfully.')
      resetHazardEditor()
    } catch (requestError) {
      setError(
        requestError.response?.data?.message
          || (hazardEditorMode === 'create' ? 'Unable to create hazard right now.' : 'Unable to update hazard right now.'),
      )
    } finally {
      setIsHazardSubmitting(false)
    }
  }

  const handleRouteSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!editingRouteId) {
      setError('Select a route to edit first.')
      return
    }

    if (!routeForm.title.trim()) {
      setError('Route title is required.')
      return
    }

    if (!routeForm.ecoScore || Number(routeForm.ecoScore) < 1 || Number(routeForm.ecoScore) > 10) {
      setError('Eco score must be between 1 and 10.')
      return
    }

    const startLng = Number(routeForm.startLng)
    const startLat = Number(routeForm.startLat)
    const endLng = Number(routeForm.endLng)
    const endLat = Number(routeForm.endLat)

    if (![startLng, startLat, endLng, endLat].every((value) => Number.isFinite(value))) {
      setError('Start and end coordinates must be valid numbers.')
      return
    }

    if (!routeForm.startAddress.trim() || !routeForm.endAddress.trim()) {
      setError('Start and end addresses are required.')
      return
    }

    setIsRouteSubmitting(true)

    try {
      await api.put(`/routes/${editingRouteId}`, {
        title: routeForm.title.trim(),
        ecoScore: Number(routeForm.ecoScore),
        startLocation: {
          type: 'Point',
          coordinates: [startLng, startLat],
          address: routeForm.startAddress.trim(),
        },
        endLocation: {
          type: 'Point',
          coordinates: [endLng, endLat],
          address: routeForm.endAddress.trim(),
        },
      })

      const refreshedRoutesResponse = await api.get('/routes')
      setRoutes(normalizeRoutesPayload(refreshedRoutesResponse?.data))
      setSuccessMessage('Route updated successfully.')
      resetRouteEditor()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update route right now.')
    } finally {
      setIsRouteSubmitting(false)
    }
  }

  const overviewCards = [
    {
      label: 'Total Users',
      value: totalUsers,
      tone: 'blue',
      Icon: IconUsers,
    },
    {
      label: 'Verified Users',
      value: verifiedUsers,
      tone: 'green',
      Icon: IconCheckShield,
    },
    {
      label: 'Admins / Organizations',
      value: adminOrganizations,
      tone: 'amber',
      Icon: IconSpark,
    },
    {
      label: 'Total Routes',
      value: routes.length,
      tone: 'teal',
      Icon: IconRoute,
    },
    {
      label: 'Active Hazards',
      value: activeHazards,
      tone: 'red',
      Icon: IconAlert,
    },
    {
      label: 'Resolved Hazards',
      value: resolvedHazards,
      tone: 'green',
      Icon: IconCheckShield,
    },
    {
      label: 'Total Reviews',
      value: reviews.length,
      tone: 'violet',
      Icon: IconReview,
    },
    {
      label: 'New Signups This Week',
      value: newSignupsThisWeek,
      tone: 'blue',
      Icon: IconSpark,
    },
  ]

  const adminSidebarLinks = [
    {
      id: 'overview',
      label: 'Overview',
      note: 'Platform totals and operational snapshot.',
      badge: `${overviewCards.length} tiles`,
      Icon: IconGrid,
      onClick: () => handleAdminSectionChange('overview'),
      isActive: activeAdminSection === 'overview',
    },
    {
      id: 'users',
      label: 'User Management',
      note: 'Create, edit, verify, and delete accounts.',
      badge: `${totalUsers} users`,
      Icon: IconUsers,
      onClick: () => handleAdminSectionChange('users'),
      isActive: activeAdminSection === 'users',
    },
    {
      id: 'hazards',
      label: 'Hazards',
      note: 'Review live hazard reports from the backend.',
      badge: `${activeHazards} active`,
      Icon: IconAlert,
      onClick: () => handleAdminSectionChange('hazards'),
      isActive: activeAdminSection === 'hazards',
    },
    {
      id: 'routes',
      label: 'Routes',
      note: 'Browse stored route records and eco scores.',
      badge: `${routes.length} routes`,
      Icon: IconRoute,
      onClick: () => handleAdminSectionChange('routes'),
      isActive: activeAdminSection === 'routes',
    },
    {
      id: 'map',
      label: 'View Map',
      note: 'Create and manage routes visually on the map.',
      badge: 'Interactive',
      Icon: IconMap,
      onClick: () => navigate('/admin/map'),
      isActive: false,
    },
    {
      id: 'reviews',
      label: 'Reviews',
      note: 'Inspect admin-wide route feedback records.',
      badge: `${reviews.length} reviews`,
      Icon: IconReview,
      onClick: () => handleAdminSectionChange('reviews'),
      isActive: activeAdminSection === 'reviews',
    },
    {
      id: 'profile',
      label: 'Admin Profile',
      note: 'Review your account summary and jump to full settings.',
      badge: getRoleLabel(adminProfile?.role || currentUser?.role || 'admin'),
      Icon: IconProfile,
      onClick: () => handleAdminSectionChange('profile'),
      isActive: activeAdminSection === 'profile',
    },
  ]

  const activeSidebarLink = adminSidebarLinks.find((item) => item.id === activeAdminSection)

  return (
    <section className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-card">
            <div className="admin-sidebar-nav-header">
              <span className="admin-sidebar-nav-title">Workspace Navigation</span>
              <span className="admin-sidebar-nav-caption">Single panel mode</span>
            </div>

            <div className="admin-sidebar-nav-list">
              {adminSidebarLinks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-sidebar-link${item.isActive ? ' active' : ''}`}
                  onClick={item.onClick}
                >
                  <span className="admin-sidebar-link-icon">
                    <item.Icon />
                  </span>
                  <span className="admin-sidebar-link-content">
                    <span className="admin-sidebar-link-label">{item.label}</span>
                    <span className="admin-sidebar-link-note">{item.note}</span>
                  </span>
                  <span className="admin-sidebar-link-badge">{item.badge}</span>
                </button>
              ))}
            </div>

            <div className="admin-sidebar-active-panel">
              <span className="admin-sidebar-active-label">Active Panel</span>
              <strong className="admin-sidebar-active-value">{activeSidebarLink?.label || 'Overview'}</strong>
            </div>
          </div>
        </aside>

        <div className="admin-dashboard-main">
          <div className="admin-dashboard-header">
            <div>
              <h1>Admin Dashboard</h1>
              <p>Track platform totals and manage user access from one searchable workspace.</p>
            </div>
            <div className="admin-dashboard-actions">
              <div className="admin-dashboard-meta">
                <span>{totalUsers} users loaded</span>
                <span>{formatDate(new Date().toISOString())}</span>
              </div>
              <button type="button" className="admin-secondary-button" onClick={handleManageProfile}>
                Manage Profile
              </button>
              <button type="button" className="admin-dashboard-logout" onClick={handleLogout}>
                Log Out
              </button>
            </div>
          </div>

          {workspaceError ? (
            <div className="admin-table-message admin-table-message-error admin-workspace-message">
              {workspaceError}
            </div>
          ) : null}

          {error ? (
            <div className="admin-table-message admin-table-message-error">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="admin-table-message admin-table-message-success">
              {successMessage}
            </div>
          ) : null}

          {activeAdminSection === 'overview' ? (
          <div className="admin-section-block">
            <div className="admin-section-heading">
              <span className="admin-section-kicker">Overview</span>
              <h2>Operational snapshot</h2>
              <p>Watch platform totals, rider verification, route coverage, and safety activity at a glance.</p>
            </div>

            <div className="admin-overview-grid">
              {overviewCards.map((card) => (
                <article key={card.label} className="admin-overview-card">
                  <div className={`admin-overview-icon admin-overview-icon-${card.tone}`}>
                    <card.Icon />
                  </div>
                  <div className="admin-overview-value">{card.value}</div>
                  <div className="admin-overview-label">{card.label}</div>
                </article>
              ))}
            </div>
          </div>
          ) : null}

          {activeAdminSection === 'users' ? (
          <div className="admin-management-panel">
            <div className="admin-management-header">
              <div>
                <h2>User Management</h2>
                <p>Search, filter by role, and manage rider accounts from this table.</p>
              </div>

              <div className="admin-table-controls">
                <label className="admin-search-field">
                  <span className="admin-search-label">Search users</span>
                  <input
                    type="search"
                    className="admin-search-input"
                    placeholder="Search by name, email, role, style..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </label>

                <label className="admin-filter-field">
                  <span className="admin-search-label">Filter by role</span>
                  <select
                    className="admin-filter-select"
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                  >
                    <option value="all">All roles</option>
                    <option value="user">Users</option>
                    <option value="admin">Admins</option>
                    <option value="organization">Organizations</option>
                  </select>
                </label>

                <button type="button" className="admin-primary-button" onClick={handleCreateStart}>
                  Add User
                </button>
              </div>
            </div>

            {editorMode ? (
              <div className="admin-editor-panel">
                <div className="admin-editor-header">
                  <div>
                    <h3 className="admin-editor-title">
                      {editorMode === 'create' ? 'Add User' : 'Edit User'}
                    </h3>
                    <p className="admin-editor-subtitle">
                      {editorMode === 'create'
                        ? 'Create a new rider, admin, or organization account.'
                        : 'Update account details, role, cycling style, or verification status.'}
                    </p>
                  </div>
                </div>

                <form className="admin-editor-form" onSubmit={handleSubmit}>
                  <label className="admin-editor-field">
                    <span>Full Name</span>
                    <input
                      type="text"
                      name="name"
                      className="admin-editor-input"
                      value={form.name}
                      onChange={handleFormChange}
                      placeholder="Enter full name"
                      required
                    />
                  </label>

                  <label className="admin-editor-field">
                    <span>Email Address</span>
                    <input
                      type="email"
                      name="email"
                      className="admin-editor-input"
                      value={form.email}
                      onChange={handleFormChange}
                      placeholder="you@example.com"
                      required
                    />
                  </label>

                  <label className="admin-editor-field">
                    <span>{editorMode === 'create' ? 'Password' : 'New Password'}</span>
                    <input
                      type="password"
                      name="password"
                      className="admin-editor-input"
                      value={form.password}
                      onChange={handleFormChange}
                      placeholder={editorMode === 'create' ? 'Create a password' : 'Leave blank to keep current password'}
                      required={editorMode === 'create'}
                    />
                  </label>

                  <label className="admin-editor-field">
                    <span>Role</span>
                    <select
                      name="role"
                      className="admin-editor-input admin-filter-select"
                      value={form.role}
                      onChange={handleFormChange}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="organization">Organization</option>
                    </select>
                  </label>

                  {supportsCyclingStyle(form.role) ? (
                    <label className="admin-editor-field">
                      <span>Cycling Style</span>
                      <select
                        name="cyclingStyle"
                        className="admin-editor-input admin-filter-select"
                        value={form.cyclingStyle}
                        onChange={handleFormChange}
                      >
                        {Object.entries(CYCLING_STYLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <label className="admin-editor-field admin-editor-check">
                    <span>Verification</span>
                    <div className="admin-editor-check-row">
                      <input
                        type="checkbox"
                        name="isVerified"
                        className="checkbox"
                        checked={normalizeBoolean(form.isVerified)}
                        onChange={handleFormChange}
                      />
                      <strong>{form.isVerified ? 'Verified account' : 'Not verified yet'}</strong>
                    </div>
                  </label>

                  <div className="admin-editor-actions">
                    <button type="submit" className="admin-primary-button" disabled={isSubmitting}>
                      {isSubmitting
                        ? editorMode === 'create'
                          ? 'Creating...'
                          : 'Saving...'
                        : editorMode === 'create'
                          ? 'Create User'
                          : 'Save Changes'}
                    </button>
                    <button type="button" className="admin-secondary-button" onClick={handleCancelEditor} disabled={isSubmitting}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : null}

            <div className="admin-table-toolbar">
              <span>
                {isLoading
                  ? 'Loading users...'
                  : `${filteredUsers.length} of ${totalUsers} user${totalUsers === 1 ? '' : 's'} shown`}
              </span>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-user-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Cycling Style</th>
                    <th>Verification</th>
                    <th>Joined Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="7" className="admin-table-empty">
                        Loading user records...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="admin-table-empty">
                        No users matched your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user._id || user.id || user.email}>
                        <td>
                          <div className="admin-user-primary">{user.name || 'Unnamed user'}</div>
                        </td>
                        <td>
                          <div className="admin-user-secondary">{user.email || 'Not available'}</div>
                        </td>
                        <td>
                          <span className={`admin-pill admin-pill-role-${getRoleTone(user.role)}`}>
                            {getRoleLabel(String(user.role || 'user'))}
                          </span>
                        </td>
                        <td>{supportsCyclingStyle(user.role) ? getCyclingStyleLabel(user.cyclingStyle) : 'Not applicable'}</td>
                        <td>
                          <span className={`admin-pill ${user.isVerified ? 'admin-pill-verified' : 'admin-pill-pending'}`}>
                            {user.isVerified ? 'Verified' : 'Not verified'}
                          </span>
                        </td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>
                          <div className="admin-action-group">
                            <button
                              type="button"
                              className="admin-action-button"
                              onClick={() => handleEditStart(user)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="admin-action-button admin-action-button-danger"
                              onClick={() => handleDeleteUser(user)}
                              disabled={deletingUserId === getUserId(user)}
                            >
                              {deletingUserId === getUserId(user) ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          ) : null}

          {activeAdminSection === 'hazards' ? (
          <div className="admin-management-panel">
            <div className="admin-management-header">
              <div>
                <h2>Hazard Reports</h2>
                <p>Live rider-reported hazards pulled from the backend database.</p>
              </div>
              <div className="admin-table-controls">
                <div className="admin-data-summary-row">
                  <span className="admin-data-summary-pill">{hazards.length} total</span>
                  <span className="admin-data-summary-pill">{highSeverityHazards} high severity</span>
                  <span className="admin-data-summary-pill">{resolvedHazards} resolved</span>
                </div>
                <button type="button" className="admin-primary-button" onClick={handleCreateHazardStart}>
                  Add Hazard
                </button>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-user-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Reporter</th>
                    <th>Location</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isWorkspaceLoading ? (
                    <tr>
                      <td colSpan="8" className="admin-table-empty">
                        Loading hazard reports...
                      </td>
                    </tr>
                  ) : recentHazards.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="admin-table-empty">
                        No hazard reports found in the backend database.
                      </td>
                    </tr>
                  ) : (
                    recentHazards.map((hazard) => (
                      <tr key={getHazardId(hazard) || `${hazard?.title || 'hazard'}-${hazard?.createdAt || ''}`}>
                        <td>
                          <div className="admin-cell-stack">
                            <strong>{hazard.title || 'Untitled hazard'}</strong>
                            <span>{hazard.description || 'No description provided.'}</span>
                          </div>
                        </td>
                        <td>{String(hazard.type || 'other').replace(/^\w/, (value) => value.toUpperCase())}</td>
                        <td>
                          <span className={`admin-pill admin-pill-severity-${String(hazard.severity || 'medium').toLowerCase()}`}>
                            {String(hazard.severity || 'medium').replace(/^\w/, (value) => value.toUpperCase())}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-pill admin-pill-status-${String(hazard.status || 'reported').toLowerCase()}`}>
                            {String(hazard.status || 'reported').replace(/^\w/, (value) => value.toUpperCase())}
                          </span>
                        </td>
                        <td>
                          <div className="admin-cell-stack">
                            <strong>{hazard.createdBy?.name || 'Unknown user'}</strong>
                            <span>{hazard.createdBy?.email || 'No email available'}</span>
                          </div>
                        </td>
                        <td>{formatHazardLocation(hazard)}</td>
                        <td>{formatDate(hazard.createdAt)}</td>
                        <td>
                          <div className="admin-action-group">
                            <button
                              type="button"
                              className="admin-action-button"
                              onClick={() => handleEditHazardStart(hazard)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="admin-action-button admin-action-button-danger"
                              onClick={() => handleDeleteHazard(hazard)}
                              disabled={deletingHazardId === getHazardId(hazard)}
                            >
                              {deletingHazardId === getHazardId(hazard) ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          ) : null}

          {activeAdminSection === 'routes' ? (
          <div className="admin-management-panel">
            <div className="admin-management-header">
              <div>
                <h2>Routes Database</h2>
                <p>Stored route records, path data, and eco scoring from the backend.</p>
              </div>
              <div className="admin-data-summary-row">
                <span className="admin-data-summary-pill">{routes.length} total routes</span>
                <span className="admin-data-summary-pill">{formatScore(averageRouteDistance)} km avg</span>
                <span className="admin-data-summary-pill">Eco {formatScore(averageRouteEcoScore)}</span>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-user-table">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Distance</th>
                    <th>Eco Score</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isWorkspaceLoading ? (
                    <tr>
                      <td colSpan="7" className="admin-table-empty">
                        Loading routes...
                      </td>
                    </tr>
                  ) : recentRoutes.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="admin-table-empty">
                        No route records found in the backend database.
                      </td>
                    </tr>
                  ) : (
                    recentRoutes.map((route) => {
                      const routeId = getRouteId(route)
                      const isDeletingRoute = deletingRouteId === routeId

                      return (
                      <tr key={routeId || route.title}>
                        <td>
                          <div className="admin-cell-stack">
                            <strong>{route.title || 'Untitled route'}</strong>
                            <span>{Array.isArray(route.pathCoordinates) ? `${route.pathCoordinates.length} path points` : 'No path points stored'}</span>
                          </div>
                        </td>
                        <td>{formatLocationSummary(route.startLocation)}</td>
                        <td>{formatLocationSummary(route.endLocation)}</td>
                        <td>{formatScore(route.distance)} km</td>
                        <td>{formatScore(route.ecoScore)}</td>
                        <td>{formatDate(route.createdAt)}</td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              className="admin-action-button"
                              onClick={() => navigate('/admin/map', { state: { routeId: routeId } })}
                            >
                              View on Map
                            </button>
                            <button
                              type="button"
                              className="admin-action-button"
                              onClick={() => navigate('/admin/map', { state: { routeId: routeId, mode: 'edit' } })}
                            >
                              Edit on Map
                            </button>
                            <button
                              type="button"
                              className="admin-action-button"
                              onClick={() => handleEditRouteStart(route)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="admin-action-button admin-action-button-danger"
                              onClick={() => handleDeleteRoute(route)}
                              disabled={Boolean(isDeletingRoute) || isWorkspaceLoading}
                            >
                              {isDeletingRoute ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>
          </div>
          ) : null}

          {activeAdminSection === 'routes' && routeEditorMode ? (
            <div className="admin-editor-panel">
              <div className="admin-editor-header">
                <div>
                  <h3 className="admin-editor-title">Edit Route</h3>
                  <p className="admin-editor-subtitle">
                    Update title, start and end locations, or eco score. Distance and path geometry will be regenerated by the backend.
                  </p>
                </div>
              </div>

              <form className="admin-editor-form" onSubmit={handleRouteSubmit}>
                <label className="admin-editor-field">
                  <span>Route Title</span>
                  <input
                    type="text"
                    name="title"
                    className="admin-editor-input"
                    value={routeForm.title}
                    onChange={handleRouteFormChange}
                    placeholder="Enter route title"
                    required
                  />
                </label>

                <label className="admin-editor-field">
                  <span>Eco Score</span>
                  <input
                    type="number"
                    name="ecoScore"
                    className="admin-editor-input"
                    value={routeForm.ecoScore}
                    onChange={handleRouteFormChange}
                    placeholder="1 to 10"
                    min="1"
                    max="10"
                    step="1"
                    required
                  />
                </label>

                <label className="admin-editor-field">
                  <span>Start Longitude</span>
                  <input
                    type="number"
                    name="startLng"
                    className="admin-editor-input"
                    value={routeForm.startLng}
                    onChange={handleRouteFormChange}
                    placeholder="Longitude"
                    step="any"
                    required
                  />
                </label>

                <label className="admin-editor-field">
                  <span>Start Latitude</span>
                  <input
                    type="number"
                    name="startLat"
                    className="admin-editor-input"
                    value={routeForm.startLat}
                    onChange={handleRouteFormChange}
                    placeholder="Latitude"
                    step="any"
                    required
                  />
                </label>

                <label className="admin-editor-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Start Address</span>
                  <input
                    type="text"
                    name="startAddress"
                    className="admin-editor-input"
                    value={routeForm.startAddress}
                    onChange={handleRouteFormChange}
                    placeholder="Start address"
                    required
                  />
                </label>

                <label className="admin-editor-field">
                  <span>End Longitude</span>
                  <input
                    type="number"
                    name="endLng"
                    className="admin-editor-input"
                    value={routeForm.endLng}
                    onChange={handleRouteFormChange}
                    placeholder="Longitude"
                    step="any"
                    required
                  />
                </label>

                <label className="admin-editor-field">
                  <span>End Latitude</span>
                  <input
                    type="number"
                    name="endLat"
                    className="admin-editor-input"
                    value={routeForm.endLat}
                    onChange={handleRouteFormChange}
                    placeholder="Latitude"
                    step="any"
                    required
                  />
                </label>

                <label className="admin-editor-field" style={{ gridColumn: '1 / -1' }}>
                  <span>End Address</span>
                  <input
                    type="text"
                    name="endAddress"
                    className="admin-editor-input"
                    value={routeForm.endAddress}
                    onChange={handleRouteFormChange}
                    placeholder="End address"
                    required
                  />
                </label>

                <div className="admin-editor-actions">
                  <button type="submit" className="admin-primary-button" disabled={isRouteSubmitting}>
                    {isRouteSubmitting ? 'Updating Route...' : 'Update Route'}
                  </button>
                  <button type="button" className="admin-secondary-button" onClick={handleRouteCancelEditor}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {activeAdminSection === 'reviews' ? (
          <div className="admin-management-panel">
            <div className="admin-management-header">
              <div>
                <h2>Reviews Database</h2>
                <p>Admin-wide route review history aggregated from backend review records.</p>
              </div>
              <div className="admin-data-summary-row">
                <span className="admin-data-summary-pill">{reviews.length} total reviews</span>
                <span className="admin-data-summary-pill">Safety {formatScore(reviewAverages.safety)}</span>
                <span className="admin-data-summary-pill">Eco {formatScore(reviewAverages.eco)}</span>
                <span className="admin-data-summary-pill">Overall {formatScore(reviewAverages.overall)}</span>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-user-table">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Reviewer</th>
                    <th>Ratings</th>
                    <th>Comment</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {isWorkspaceLoading ? (
                    <tr>
                      <td colSpan="5" className="admin-table-empty">
                        Loading reviews...
                      </td>
                    </tr>
                  ) : recentReviews.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="admin-table-empty">
                        No reviews found in the backend database.
                      </td>
                    </tr>
                  ) : (
                    recentReviews.map((review) => (
                      <tr key={review._id}>
                        <td>
                          <div className="admin-cell-stack">
                            <strong>{review.route?.title || 'Unknown route'}</strong>
                            <span>{review.route ? `${formatScore(review.route.distance)} km route` : 'Route data unavailable'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="admin-cell-stack">
                            <strong>{review.user?.name || 'Unknown user'}</strong>
                            <span>{review.user?.email || 'No email available'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="admin-rating-stack">
                            <span className="admin-rating-pill">Safety {formatScore(review.safetyRating)}</span>
                            <span className="admin-rating-pill">Eco {formatScore(review.ecoRating)}</span>
                            <span className="admin-rating-pill">Avg {formatReviewAverage(review)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="admin-comment-cell">
                            {review.comment || 'No comment provided.'}
                          </div>
                        </td>
                        <td>{formatDate(review.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          ) : null}

          {activeAdminSection === 'profile' ? (
          <div className="admin-management-panel">
            <div className="admin-management-header">
              <div>
                <h2>Admin Profile Snapshot</h2>
                <p>The signed-in admin account details loaded directly from the backend database, with a shortcut to full profile management.</p>
              </div>
              <div className="admin-data-summary-row">
                <span className="admin-data-summary-pill">{getRoleLabel(adminProfile?.role || 'admin')}</span>
                <span className="admin-data-summary-pill">{adminProfile?.isVerified ? 'Verified' : 'Pending verification'}</span>
              </div>
            </div>

            <div className="admin-profile-grid">
              <article className="admin-profile-card">
                <span className="admin-profile-label">Full Name</span>
                <strong className="admin-profile-value">{adminProfile?.name || 'Not available'}</strong>
              </article>
              <article className="admin-profile-card">
                <span className="admin-profile-label">Email Address</span>
                <strong className="admin-profile-value admin-profile-value-wrap">{adminProfile?.email || 'Not available'}</strong>
              </article>
              <article className="admin-profile-card">
                <span className="admin-profile-label">Role</span>
                <strong className="admin-profile-value">{getRoleLabel(adminProfile?.role || 'admin')}</strong>
              </article>
              <article className="admin-profile-card">
                <span className="admin-profile-label">Verification</span>
                <strong className="admin-profile-value">{adminProfile?.isVerified ? 'Verified account' : 'Awaiting verification'}</strong>
              </article>
              <article className="admin-profile-card">
                <span className="admin-profile-label">Joined Date</span>
                <strong className="admin-profile-value">{formatDate(adminProfile?.createdAt)}</strong>
              </article>
            </div>

            <div className="admin-editor-actions">
              <button type="button" className="admin-primary-button" onClick={handleManageProfile}>
                Open Account Settings
              </button>
              <button type="button" className="admin-secondary-button" onClick={() => handleAdminSectionChange('overview')}>
                Back to Overview
              </button>
            </div>
          </div>
          ) : null}

          {hazardEditorMode ? (
            <div className="admin-hazard-modal-backdrop" onClick={handleHazardModalBackdropClick}>
              <div className="admin-hazard-modal" role="dialog" aria-modal="true" aria-labelledby="admin-hazard-modal-title">
                <div className="admin-hazard-modal-header">
                  <div>
                    <h3 id="admin-hazard-modal-title" className="admin-editor-title">
                      {hazardEditorMode === 'create' ? 'Add Hazard' : 'Edit Hazard'}
                    </h3>
                    <p className="admin-editor-subtitle">
                      Create a hazard manually or update its longitude and latitude coordinates.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-hazard-modal-close"
                    onClick={handleHazardCancelEditor}
                    disabled={isHazardModalBusy}
                    aria-label="Close hazard form"
                  >
                    x
                  </button>
                </div>

                <form className="admin-editor-form admin-hazard-editor-form" onSubmit={handleHazardSubmit}>
                  <label className="admin-editor-field admin-editor-field-full">
                    <span>Title</span>
                    <input
                      type="text"
                      name="title"
                      className="admin-editor-input"
                      value={hazardForm.title}
                      onChange={handleHazardFormChange}
                      placeholder="Pothole near bridge entrance"
                      required
                    />
                  </label>

                  <label className="admin-editor-field admin-editor-field-full">
                    <span>Description</span>
                    <textarea
                      name="description"
                      className="admin-editor-input admin-editor-textarea"
                      value={hazardForm.description}
                      onChange={handleHazardFormChange}
                      placeholder="Describe the hazard details"
                      rows={4}
                      required
                    />
                  </label>

                  <label className="admin-editor-field">
                    <span>Type</span>
                    <select
                      name="type"
                      className="admin-editor-input admin-filter-select"
                      value={hazardForm.type}
                      onChange={handleHazardFormChange}
                    >
                      {HAZARD_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="admin-editor-field">
                    <span>Severity</span>
                    <select
                      name="severity"
                      className="admin-editor-input admin-filter-select"
                      value={hazardForm.severity}
                      onChange={handleHazardFormChange}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>

                  <label className="admin-editor-field">
                    <span>Status</span>
                    <select
                      name="status"
                      className="admin-editor-input admin-filter-select"
                      value={hazardForm.status}
                      onChange={handleHazardFormChange}
                    >
                      <option value="reported">Reported</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </label>

                  <label className="admin-editor-field">
                    <span>Location Name</span>
                    <input
                      type="text"
                      name="locationName"
                      className="admin-editor-input"
                      value={hazardForm.locationName}
                      onChange={handleHazardFormChange}
                      placeholder="Street, city, or landmark"
                    />
                  </label>

                  <label className="admin-editor-field">
                    <span>Longitude</span>
                    <input
                      type="number"
                      name="longitude"
                      className="admin-editor-input"
                      value={hazardForm.longitude}
                      onChange={handleHazardFormChange}
                      step="any"
                      placeholder="79.8612"
                      required
                    />
                  </label>

                  <label className="admin-editor-field">
                    <span>Latitude</span>
                    <input
                      type="number"
                      name="latitude"
                      className="admin-editor-input"
                      value={hazardForm.latitude}
                      onChange={handleHazardFormChange}
                      step="any"
                      placeholder="6.9271"
                      required
                    />
                  </label>

                  <label className="admin-editor-field admin-editor-field-full">
                    <span>Upload Image (optional)</span>
                    <input
                      type="file"
                      className="admin-editor-input admin-editor-file-input"
                      accept="image/*"
                      onChange={handleHazardImageFileChange}
                      disabled={isHazardModalBusy}
                    />

                    <div className="admin-editor-upload-row">
                      <span className="admin-editor-upload-text">
                        {hazardImageFile
                          ? `Selected file: ${hazardImageFile.name}`
                          : 'Choose an image file to upload and auto-fill the image URL field.'}
                      </span>
                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={handleHazardImageUpload}
                        disabled={!hazardImageFile || isHazardModalBusy}
                      >
                        {isHazardImageUploading ? 'Uploading Image...' : 'Upload Selected Image'}
                      </button>
                    </div>
                  </label>

                  <label className="admin-editor-field admin-editor-field-full">
                    <span>Image URL (optional)</span>
                    <input
                      type="url"
                      name="imageUrl"
                      className="admin-editor-input"
                      value={hazardForm.imageUrl}
                      onChange={handleHazardFormChange}
                      placeholder="https://ik.imagekit.io/..."
                    />

                    {hazardForm.imageUrl.trim() ? (
                      <a
                        href={hazardForm.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-editor-upload-link"
                      >
                        Preview uploaded image
                      </a>
                    ) : null}
                  </label>

                  <div className="admin-editor-actions">
                    <button type="submit" className="admin-primary-button" disabled={isHazardModalBusy}>
                      {isHazardSubmitting
                        ? hazardEditorMode === 'create'
                          ? 'Creating...'
                          : 'Saving...'
                        : hazardEditorMode === 'create'
                          ? 'Create Hazard'
                          : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={handleHazardCancelEditor}
                      disabled={isHazardModalBusy}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
