import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext.jsx'

const cyclingStyles = [
  { value: 'commuter', label: 'Commuter', icon: '🏙️' },
  { value: 'fitness', label: 'Fitness Rider', icon: '💪' },
  { value: 'adventure', label: 'Adventure Rider', icon: '🏔️' },
  { value: 'casual', label: 'Casual Explorer', icon: '🚲' },
]

const getCyclingStyleLabel = (value) =>
  cyclingStyles.find((style) => style.value === value)?.label || 'Not selected'

const getCyclingStyleIcon = (value) =>
  cyclingStyles.find((style) => style.value === value)?.icon || '🚲'

const getInitials = (value = '') =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('')

const extractProfilePayload = (payload) => payload?.data || payload?.user || payload?.profile || payload || {}

const hasOwn = (value, key) => Object.hasOwn(value || {}, key)

const buildProfileState = (profile = {}, fallbackUser = {}) => {
  const profileSource = profile && typeof profile === 'object' ? profile : {}

  return {
    id: profileSource._id || profileSource.id || fallbackUser.id || fallbackUser._id || '',
    name: profileSource.name || fallbackUser.name || '',
    email: profileSource.email || fallbackUser.email || '',
    cyclingStyle: profileSource.cyclingStyle || fallbackUser.cyclingStyle || 'commuter',
    profileImageUrl: hasOwn(profileSource, 'profileImageUrl')
      ? profileSource.profileImageUrl || ''
      : fallbackUser.profileImageUrl || '',
    isVerified: Boolean(profileSource.isVerified ?? fallbackUser.isVerified),
    createdAt: profileSource.createdAt || fallbackUser.createdAt || '',
    updatedAt: profileSource.updatedAt || fallbackUser.updatedAt || '',
  }
}

const buildStoredUser = (profile = {}, fallbackUser = {}) => {
  const nextProfile = buildProfileState(profile, fallbackUser)

  return {
    ...fallbackUser,
    id: nextProfile.id,
    _id: nextProfile.id || fallbackUser._id || fallbackUser.id || '',
    name: nextProfile.name,
    email: nextProfile.email,
    cyclingStyle: nextProfile.cyclingStyle,
    profileImageUrl: nextProfile.profileImageUrl,
    role: fallbackUser.role || profile.role || '',
    isVerified: nextProfile.isVerified,
    createdAt: nextProfile.createdAt || fallbackUser.createdAt || '',
    updatedAt: nextProfile.updatedAt || fallbackUser.updatedAt || '',
  }
}

const buildCurrentUserSnapshot = ({
  id = '',
  name = '',
  email = '',
  cyclingStyle = 'commuter',
  profileImageUrl = '',
  role = '',
  isVerified = false,
  createdAt = '',
  updatedAt = '',
}) => ({
  id,
  _id: id,
  name,
  email,
  cyclingStyle,
  profileImageUrl,
  role,
  isVerified,
  createdAt,
  updatedAt,
})

const buildFormState = (profile = {}, fallbackUser = {}) => {
  const nextProfile = buildProfileState(profile, fallbackUser)

  return {
    name: nextProfile.name,
    email: nextProfile.email,
    cyclingStyle: nextProfile.cyclingStyle,
  }
}

const formatDate = (value) => {
  if (!value) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/* ── SVG Icon Components ────────────────────────── */

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const AlertTriangleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const BikeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5.5" cy="17.5" r="3.5" />
    <circle cx="18.5" cy="17.5" r="3.5" />
    <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2" />
  </svg>
)

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const currentUserId = user?.id || user?._id || ''
  const currentUserName = user?.name || ''
  const currentUserEmail = user?.email || ''
  const currentUserCyclingStyle = user?.cyclingStyle || 'commuter'
  const currentUserProfileImageUrl = user?.profileImageUrl || ''
  const currentUserRole = user?.role || ''
  const currentUserIsVerified = Boolean(user?.isVerified)
  const currentUserCreatedAt = user?.createdAt || ''
  const currentUserUpdatedAt = user?.updatedAt || ''

  const [profileDetails, setProfileDetails] = useState({
    id: currentUserId,
    name: currentUserName,
    email: currentUserEmail,
    cyclingStyle: currentUserCyclingStyle,
    profileImageUrl: '',
    isVerified: false,
    createdAt: '',
    updatedAt: '',
  })
  const [form, setForm] = useState({
    name: currentUserName,
    email: currentUserEmail,
    cyclingStyle: currentUserCyclingStyle,
  })
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isRemovingImage, setIsRemovingImage] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUserId) {
        setIsLoading(false)
        return
      }

      try {
        const fallbackUser = buildCurrentUserSnapshot({
          id: currentUserId,
          name: currentUserName,
          email: currentUserEmail,
          cyclingStyle: currentUserCyclingStyle,
          profileImageUrl: currentUserProfileImageUrl,
          role: currentUserRole,
          isVerified: currentUserIsVerified,
          createdAt: currentUserCreatedAt,
          updatedAt: currentUserUpdatedAt,
        })

        const { data } = await api.get(`/users/${currentUserId}`)
        const profile = extractProfilePayload(data)
        const nextProfile = buildProfileState(profile, fallbackUser)

        setProfileDetails(nextProfile)
        setForm(buildFormState(nextProfile, fallbackUser))
        updateUser(buildStoredUser(nextProfile, fallbackUser))
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load your profile.')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [
    currentUserCreatedAt,
    currentUserCyclingStyle,
    currentUserEmail,
    currentUserId,
    currentUserIsVerified,
    currentUserName,
    currentUserProfileImageUrl,
    currentUserRole,
    currentUserUpdatedAt,
    updateUser,
  ])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleEditStart = () => {
    setError('')
    setSuccessMessage('')
    setForm(buildFormState(profileDetails))
    setIsEditingDetails(true)
  }

  const handleEditCancel = () => {
    setError('')
    setSuccessMessage('')
    setForm(buildFormState(profileDetails))
    setIsEditingDetails(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSavingDetails(true)

    try {
      const fallbackUser = buildCurrentUserSnapshot({
        id: currentUserId,
        name: currentUserName,
        email: currentUserEmail,
        cyclingStyle: currentUserCyclingStyle,
        profileImageUrl: currentUserProfileImageUrl,
        role: currentUserRole,
        isVerified: currentUserIsVerified,
        createdAt: currentUserCreatedAt,
        updatedAt: currentUserUpdatedAt,
      })
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        cyclingStyle: form.cyclingStyle,
      }

      const { data } = await api.put(`/users/${currentUserId}`, payload)
      const profile = extractProfilePayload(data)
      const nextProfile = {
        ...buildProfileState(profile, fallbackUser),
        createdAt: profile.createdAt || profileDetails.createdAt || fallbackUser.createdAt || '',
        updatedAt: profile.updatedAt || profileDetails.updatedAt || fallbackUser.updatedAt || '',
      }

      setProfileDetails(nextProfile)
      setForm(buildFormState(nextProfile))
      updateUser(buildStoredUser(nextProfile, fallbackUser))

      setIsEditingDetails(false)
      setSuccessMessage('Profile details updated successfully.')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to update your profile.')
    } finally {
      setIsSavingDetails(false)
    }
  }

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    event.target.value = ''

    if (!currentUserId) {
      setError('Unable to find your profile right now.')
      return
    }

    setError('')
    setSuccessMessage('')
    setIsUploadingImage(true)

    try {
      const fallbackUser = buildCurrentUserSnapshot({
        id: currentUserId,
        name: currentUserName,
        email: currentUserEmail,
        cyclingStyle: currentUserCyclingStyle,
        profileImageUrl: currentUserProfileImageUrl,
        role: currentUserRole,
        isVerified: currentUserIsVerified,
        createdAt: currentUserCreatedAt,
        updatedAt: currentUserUpdatedAt,
      })
      const uploadBody = new FormData()
      uploadBody.append('profileImage', file)

      const { data } = await api.post(`/users/${currentUserId}/profile-image`, uploadBody)
      const profile = extractProfilePayload(data)
      const nextProfile = {
        ...buildProfileState(profile, fallbackUser),
        createdAt: profile.createdAt || profileDetails.createdAt || fallbackUser.createdAt || '',
        updatedAt: profile.updatedAt || profileDetails.updatedAt || fallbackUser.updatedAt || '',
      }

      setProfileDetails(nextProfile)
      updateUser(buildStoredUser(nextProfile, fallbackUser))
      setSuccessMessage(data.message || 'Profile image updated successfully.')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update your profile image.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleRemoveProfileImage = async () => {
    if (!currentUserId || !profileDetails.profileImageUrl) return

    setError('')
    setSuccessMessage('')
    setIsRemovingImage(true)

    try {
      const fallbackUser = buildCurrentUserSnapshot({
        id: currentUserId,
        name: currentUserName,
        email: currentUserEmail,
        cyclingStyle: currentUserCyclingStyle,
        profileImageUrl: currentUserProfileImageUrl,
        role: currentUserRole,
        isVerified: currentUserIsVerified,
        createdAt: currentUserCreatedAt,
        updatedAt: currentUserUpdatedAt,
      })
      const { data } = await api.delete(`/users/${currentUserId}/profile-image`)
      const profile = extractProfilePayload(data)
      const nextProfile = {
        ...buildProfileState(profile, fallbackUser),
        createdAt: profile.createdAt || profileDetails.createdAt || fallbackUser.createdAt || '',
        updatedAt: profile.updatedAt || profileDetails.updatedAt || fallbackUser.updatedAt || '',
      }

      setProfileDetails(nextProfile)
      updateUser(buildStoredUser(nextProfile, fallbackUser))
      setSuccessMessage(data.message || 'Profile image removed successfully.')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to remove your profile image.')
    } finally {
      setIsRemovingImage(false)
    }
  }

  const handleProfileImageLoadError = () => {
    setProfileDetails((current) => {
      if (!current.profileImageUrl) {
        return current
      }

      return {
        ...current,
        profileImageUrl: '',
      }
    })

    if (currentUserProfileImageUrl) {
      updateUser(
        buildStoredUser(
          {
            ...profileDetails,
            profileImageUrl: '',
          },
          buildCurrentUserSnapshot({
            id: currentUserId,
            name: currentUserName,
            email: currentUserEmail,
            cyclingStyle: currentUserCyclingStyle,
            profileImageUrl: '',
            role: currentUserRole,
            isVerified: currentUserIsVerified,
            createdAt: currentUserCreatedAt,
            updatedAt: currentUserUpdatedAt,
          }),
        ),
      )
    }
  }

  const handleDelete = async () => {
    if (!globalThis.confirm('Are you sure you want to delete your account? This cannot be undone.')) return

    setError('')
    setSuccessMessage('')
    setIsDeleting(true)

    try {
      await api.delete(`/users/${currentUserId}`)
      logout()
      navigate('/register', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete your account.')
      setIsDeleting(false)
    }
  }

  const fullName = profileDetails.name || user?.name || 'Cyclist'
  const initials = getInitials(fullName) || 'SC'
  const hasProfileImage = Boolean(profileDetails.profileImageUrl)
  const verificationLabel = profileDetails.isVerified ? 'Verified' : 'Not verified'
  const isImageBusy = isUploadingImage || isRemovingImage
  const isViewingDetails = !isEditingDetails

  let uploadButtonText = 'Upload Photo'
  if (isUploadingImage) {
    uploadButtonText = 'Uploading...'
  } else if (hasProfileImage) {
    uploadButtonText = 'Change Photo'
  }

  /* ── Loading State ──────────────────────── */
  if (isLoading) {
    return (
      <section className="pro-page">
        <div className="pro-loading-state">
          <div className="pro-loading-spinner" />
          <p>Loading your profile…</p>
        </div>
      </section>
    )
  }

  /* ── Main Render ────────────────────────── */
  return (
    <section className="pro-page">
      {/* ── Cover Banner ──────────────────── */}
      <div className="pro-cover">
        <div className="pro-cover-gradient" />
        <div className="pro-cover-pattern" />
      </div>

      <div className="pro-container">
        {/* ── Toast Messages ──────────────── */}
        {error && (
          <div className="pro-toast pro-toast--error">
            <XIcon />
            <span>{error}</span>
            <button className="pro-toast-close" onClick={() => setError('')}>×</button>
          </div>
        )}
        {successMessage && (
          <div className="pro-toast pro-toast--success">
            <CheckCircleIcon />
            <span>{successMessage}</span>
            <button className="pro-toast-close" onClick={() => setSuccessMessage('')}>×</button>
          </div>
        )}

        <div className="pro-grid">
          {/* ═══════════════════════════════════ */}
          {/* ──  LEFT SIDEBAR  ──────────────── */}
          {/* ═══════════════════════════════════ */}
          <aside className="pro-sidebar">
            {/* ── Identity Card ────────────── */}
            <div className="pro-identity-card">
              <div className="pro-avatar-wrapper">
                <div className="pro-avatar-ring">
                  {hasProfileImage ? (
                    <img
                      className="pro-avatar-img"
                      src={profileDetails.profileImageUrl}
                      alt={`${fullName} profile`}
                      onError={handleProfileImageLoadError}
                    />
                  ) : (
                    <div className="pro-avatar-initials">{initials}</div>
                  )}
                </div>

                {/* Camera overlay for quick upload */}
                <label className={`pro-avatar-upload-overlay${isImageBusy ? ' pro-avatar-upload-overlay--busy' : ''}`}>
                  <CameraIcon />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    disabled={!currentUserId || isImageBusy}
                    hidden
                  />
                </label>
              </div>

              <h1 className="pro-identity-name">{fullName}</h1>
              <p className="pro-identity-email">{profileDetails.email || user?.email || '-'}</p>

              <div className={`pro-verification-badge ${profileDetails.isVerified ? 'pro-verification-badge--verified' : 'pro-verification-badge--pending'}`}>
                {profileDetails.isVerified ? <CheckCircleIcon /> : <ClockIcon />}
                <span>{verificationLabel}</span>
              </div>

              <div className="pro-identity-style">
                <span className="pro-identity-style-icon">{getCyclingStyleIcon(profileDetails.cyclingStyle)}</span>
                <span>{getCyclingStyleLabel(profileDetails.cyclingStyle)}</span>
              </div>
            </div>

            {/* ── Quick Info ───────────────── */}
            <div className="pro-sidebar-section">
              <h3 className="pro-sidebar-section-title">Account</h3>
              <div className="pro-quick-info">
                <div className="pro-quick-info-row">
                  <CalendarIcon />
                  <div className="pro-quick-info-content">
                    <span className="pro-quick-info-label">Joined</span>
                    <span className="pro-quick-info-value">{formatDate(profileDetails.createdAt)}</span>
                  </div>
                </div>
                <div className="pro-quick-info-row">
                  <ClockIcon />
                  <div className="pro-quick-info-content">
                    <span className="pro-quick-info-label">Last updated</span>
                    <span className="pro-quick-info-value">{formatDate(profileDetails.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sidebar Actions ─────────── */}
            <div className="pro-sidebar-actions">
              <button
                type="button"
                className="pro-sidebar-btn pro-sidebar-btn--logout"
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
              >
                <LogoutIcon />
                <span>Log Out</span>
              </button>
            </div>
          </aside>

          {/* ═══════════════════════════════════ */}
          {/* ──  MAIN CONTENT  ─────────────── */}
          {/* ═══════════════════════════════════ */}
          <main className="pro-main">

            {/* ── Profile Details Panel ────── */}
            <div className="pro-panel">
              <div className="pro-panel-header">
                <div className="pro-panel-header-left">
                  <div className="pro-panel-icon">
                    <UserIcon />
                  </div>
                  <div>
                    <h2 className="pro-panel-title">Profile Details</h2>
                    <p className="pro-panel-subtitle">Your personal information</p>
                  </div>
                </div>
                {isViewingDetails && (
                  <button type="button" className="pro-btn pro-btn--primary" onClick={handleEditStart}>
                    <EditIcon />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              <div className="pro-panel-body">
                {isViewingDetails ? (
                  <div className="pro-detail-list">
                    <div className="pro-detail-row">
                      <div className="pro-detail-icon-wrap"><UserIcon /></div>
                      <div className="pro-detail-content">
                        <span className="pro-detail-label">Full Name</span>
                        <span className="pro-detail-value">{profileDetails.name || 'Not available'}</span>
                      </div>
                    </div>
                    <div className="pro-detail-row">
                      <div className="pro-detail-icon-wrap"><MailIcon /></div>
                      <div className="pro-detail-content">
                        <span className="pro-detail-label">Email Address</span>
                        <span className="pro-detail-value">{profileDetails.email || 'Not available'}</span>
                      </div>
                    </div>
                    <div className="pro-detail-row">
                      <div className="pro-detail-icon-wrap"><BikeIcon /></div>
                      <div className="pro-detail-content">
                        <span className="pro-detail-label">Cycling Style</span>
                        <span className="pro-detail-value">
                          {getCyclingStyleIcon(profileDetails.cyclingStyle)} {getCyclingStyleLabel(profileDetails.cyclingStyle)}
                        </span>
                      </div>
                    </div>
                    <div className="pro-detail-row">
                      <div className="pro-detail-icon-wrap"><ShieldIcon /></div>
                      <div className="pro-detail-content">
                        <span className="pro-detail-label">Email Status</span>
                        <span className={`pro-detail-value pro-detail-value--status ${profileDetails.isVerified ? 'pro-detail-value--verified' : 'pro-detail-value--pending'}`}>
                          {profileDetails.isVerified ? <CheckCircleIcon /> : <ClockIcon />}
                          {verificationLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form className="pro-edit-form" onSubmit={handleSubmit}>
                    <div className="pro-form-group">
                      <label className="pro-form-label" htmlFor="profile-name">Full Name</label>
                      <input
                        id="profile-name"
                        className="pro-form-input"
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="pro-form-group">
                      <label className="pro-form-label" htmlFor="profile-email">Email Address</label>
                      <input
                        id="profile-email"
                        className="pro-form-input"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="Enter your email address"
                        required
                      />
                    </div>

                    <div className="pro-form-group">
                      <label className="pro-form-label" htmlFor="profile-style">Cycling Style</label>
                      <select
                        id="profile-style"
                        className="pro-form-input pro-form-select"
                        name="cyclingStyle"
                        value={form.cyclingStyle}
                        onChange={handleChange}
                      >
                        {cyclingStyles.map((style) => (
                          <option key={style.value} value={style.value}>
                            {style.icon} {style.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pro-form-actions">
                      <button
                        className="pro-btn pro-btn--primary"
                        type="submit"
                        disabled={isSavingDetails}
                      >
                        {isSavingDetails ? (
                          <>
                            <span className="pro-btn-spinner" />
                            Saving…
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                      <button
                        className="pro-btn pro-btn--ghost"
                        type="button"
                        onClick={handleEditCancel}
                        disabled={isSavingDetails}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* ── Profile Photo Panel ──────── */}
            <div className="pro-panel">
              <div className="pro-panel-header">
                <div className="pro-panel-header-left">
                  <div className="pro-panel-icon">
                    <CameraIcon />
                  </div>
                  <div>
                    <h2 className="pro-panel-title">Profile Photo</h2>
                    <p className="pro-panel-subtitle">Manage your profile picture</p>
                  </div>
                </div>
              </div>

              <div className="pro-panel-body">
                <div className="pro-photo-section">
                  <div className="pro-photo-preview">
                    <div className="pro-photo-frame">
                      {hasProfileImage ? (
                        <img
                          className="pro-photo-img"
                          src={profileDetails.profileImageUrl}
                          alt={`${fullName} profile`}
                          onError={handleProfileImageLoadError}
                        />
                      ) : (
                        <div className="pro-photo-placeholder">{initials}</div>
                      )}
                    </div>
                    <div className="pro-photo-info">
                      <strong>{hasProfileImage ? 'Your profile photo is live' : 'Add a profile photo'}</strong>
                      <p>Upload a JPG, PNG, GIF, or WEBP image up to 5 MB.</p>
                    </div>
                  </div>

                  <div className="pro-photo-actions">
                    <label className={`pro-btn pro-btn--primary${!currentUserId || isImageBusy ? ' pro-btn--disabled' : ''}`}>
                      <CameraIcon />
                      <span>{uploadButtonText}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                        disabled={!currentUserId || isImageBusy}
                        hidden
                      />
                    </label>

                    {hasProfileImage && (
                      <button
                        type="button"
                        className="pro-btn pro-btn--ghost pro-btn--danger-ghost"
                        onClick={handleRemoveProfileImage}
                        disabled={isImageBusy}
                      >
                        <TrashIcon />
                        <span>{isRemovingImage ? 'Removing…' : 'Remove'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Danger Zone Panel ──────── */}
            <div className="pro-panel pro-panel--danger">
              <div className="pro-panel-header">
                <div className="pro-panel-header-left">
                  <div className="pro-panel-icon pro-panel-icon--danger">
                    <AlertTriangleIcon />
                  </div>
                  <div>
                    <h2 className="pro-panel-title pro-panel-title--danger">Danger Zone</h2>
                    <p className="pro-panel-subtitle">Permanently delete your account and all data</p>
                  </div>
                </div>
                <button
                  className="pro-btn pro-btn--danger"
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  <TrashIcon />
                  <span>{isDeleting ? 'Deleting…' : 'Delete Account'}</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>
  )
}
