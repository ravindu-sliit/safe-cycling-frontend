import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext.jsx'

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'si', label: 'Sinhala' },
  { value: 'ta', label: 'Tamil' },
]

const themeOptions = [
  { value: 'system', label: 'System default' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const visibilityOptions = [
  { value: 'public', label: 'Public profile' },
  { value: 'private', label: 'Private profile' },
]

const defaultPreferences = {
  notifications: {
    email: true,
    push: true,
    marketing: false,
  },
  privacy: {
    profileVisibility: 'public',
    showEmail: false,
  },
  appearance: {
    language: 'en',
    theme: 'system',
  },
}

const extractProfilePayload = (payload) => payload?.data || payload?.user || payload?.profile || payload || {}

const normalizePreferences = (preferences = {}) => ({
  notifications: {
    ...defaultPreferences.notifications,
    ...(preferences.notifications || {}),
  },
  privacy: {
    ...defaultPreferences.privacy,
    ...(preferences.privacy || {}),
  },
  appearance: {
    ...defaultPreferences.appearance,
    ...(preferences.appearance || {}),
  },
})

const buildStoredUserSnapshot = (user = {}) => {
  const id = user.id || user._id || ''

  return {
    ...user,
    id,
    _id: id,
    name: user.name || '',
    email: user.email || '',
    cyclingStyle: '',
    profileImageUrl: user.profileImageUrl || '',
    role: user.role || 'admin',
    isVerified: Boolean(user.isVerified),
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    createdAt: user.createdAt || '',
    updatedAt: user.updatedAt || '',
    preferences: normalizePreferences(user.preferences),
  }
}

const resolveProfileImageUrl = (profile = {}, fallbackUser = {}) => (
  Object.prototype.hasOwnProperty.call(profile, 'profileImageUrl')
    ? (profile.profileImageUrl ?? '')
    : (fallbackUser.profileImageUrl || '')
)

const buildProfileState = (profile = {}, fallbackUser = {}) => {
  const id = profile._id || profile.id || fallbackUser._id || fallbackUser.id || ''

  return {
    id,
    _id: id,
    name: profile.name || fallbackUser.name || '',
    email: profile.email || fallbackUser.email || '',
    cyclingStyle: '',
    profileImageUrl: resolveProfileImageUrl(profile, fallbackUser),
    role: profile.role || fallbackUser.role || 'admin',
    isVerified: Boolean(profile.isVerified ?? fallbackUser.isVerified),
    twoFactorEnabled: Boolean(profile.twoFactorEnabled ?? fallbackUser.twoFactorEnabled),
    createdAt: profile.createdAt || fallbackUser.createdAt || '',
    updatedAt: profile.updatedAt || fallbackUser.updatedAt || '',
    preferences: normalizePreferences(profile.preferences || fallbackUser.preferences),
  }
}

const buildStoredUser = (profile = {}, fallbackUser = {}) => {
  const nextProfile = buildProfileState(profile, fallbackUser)

  return {
    ...fallbackUser,
    ...nextProfile,
    id: nextProfile.id,
    _id: nextProfile.id,
  }
}

const buildDetailsForm = (profile = {}) => ({
  name: profile.name || '',
})

const buildEmailForm = (profile = {}) => ({
  email: profile.email || '',
  currentPassword: '',
})

const buildPasswordForm = () => ({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const buildTwoFactorForm = () => ({
  currentPassword: '',
  pendingAction: '',
})

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')

const formatDate = (value) => {
  if (!value) return 'Not available'

  const nextDate = new Date(value)
  if (Number.isNaN(nextDate.getTime())) return 'Not available'

  return nextDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const normalizeRoleValue = (value) => {
  const role = String(value || 'admin').toLowerCase()
  return role === 'organisation' ? 'organization' : role
}

const getRoleLabel = (value) => {
  const role = normalizeRoleValue(value)
  return role.charAt(0).toUpperCase() + role.slice(1)
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

function IconSpark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 1.9 3.86L18 8.76l-3 2.93.71 4.14L12 13.77l-3.71 2.06.71-4.14-3-2.93 4.1-1.9L12 3z" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function IconDanger() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

const sectionItems = [
  { id: 'overview', label: 'Overview', note: 'Identity and verification snapshot.', Icon: IconGrid },
  { id: 'details', label: 'Details', note: 'Name and cycling style settings.', Icon: IconProfile },
  { id: 'preferences', label: 'Preferences', note: 'Notification, privacy, and appearance.', Icon: IconSpark },
  { id: 'security', label: 'Security', note: 'Email, password, and 2-step verification.', Icon: IconShield },
  { id: 'danger', label: 'Danger Zone', note: 'Delete the admin account permanently.', Icon: IconDanger },
]

export default function AdminProfile() {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const currentUserSnapshot = buildStoredUserSnapshot(user)
  const currentUserId = currentUserSnapshot.id
  const sectionRefs = useRef({})

  const [profileDetails, setProfileDetails] = useState(() => buildProfileState({}, currentUserSnapshot))
  const [detailsForm, setDetailsForm] = useState(() => buildDetailsForm(currentUserSnapshot))
  const [emailForm, setEmailForm] = useState(() => buildEmailForm(currentUserSnapshot))
  const [passwordForm, setPasswordForm] = useState(buildPasswordForm)
  const [twoFactorForm, setTwoFactorForm] = useState(buildTwoFactorForm)
  const [preferencesForm, setPreferencesForm] = useState(() => normalizePreferences(currentUserSnapshot.preferences))
  const [activeSection, setActiveSection] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isUpdatingTwoFactor, setIsUpdatingTwoFactor] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isRemovingImage, setIsRemovingImage] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const syncStoredUser = (profile) => {
    updateUser(buildStoredUser(profile, buildStoredUserSnapshot(user)))
  }

  useEffect(() => {
    let isActive = true

    const loadProfile = async () => {
      try {
        const baseUser = buildStoredUserSnapshot(user)
        const { data } = await api.get('/users/me')
        if (!isActive) return

        const profile = buildProfileState(extractProfilePayload(data), baseUser)
        setProfileDetails(profile)
        setDetailsForm(buildDetailsForm(profile))
        setEmailForm(buildEmailForm(profile))
        setPreferencesForm(normalizePreferences(profile.preferences))
        updateUser(buildStoredUser(profile, baseUser))
      } catch (requestError) {
        if (!isActive) return
        setError(requestError.response?.data?.message || 'Unable to load the admin profile.')
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      isActive = false
    }
  // We only refetch when the authenticated identity changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId])

  const registerSection = (sectionId) => (node) => {
    if (node) {
      sectionRefs.current[sectionId] = node
      return
    }

    delete sectionRefs.current[sectionId]
  }

  const handleSectionNavigate = (sectionId) => {
    const sectionNode = sectionRefs.current[sectionId]
    if (!sectionNode) return

    setActiveSection(sectionId)
    sectionNode.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleDetailsChange = (event) => {
    const { name, value } = event.target
    setDetailsForm((current) => ({ ...current, [name]: value }))
  }

  const handleEmailChange = (event) => {
    const { name, value } = event.target
    setEmailForm((current) => ({ ...current, [name]: value }))
  }

  const handlePasswordChange = (event) => {
    const { name, value } = event.target
    setPasswordForm((current) => ({ ...current, [name]: value }))
  }

  const handleTwoFactorPasswordChange = (event) => {
    const { value } = event.target
    setTwoFactorForm((current) => ({ ...current, currentPassword: value }))
  }

  const handleTwoFactorActionStart = (nextEnabled) => {
    setError('')
    setSuccessMessage('')
    setTwoFactorForm({
      currentPassword: '',
      pendingAction: nextEnabled ? 'enable' : 'disable',
    })
  }

  const handleTwoFactorActionCancel = () => {
    setTwoFactorForm(buildTwoFactorForm())
  }

  const handlePreferenceToggle = (section, field) => (event) => {
    const { checked } = event.target
    setPreferencesForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: checked,
      },
    }))
  }

  const handlePreferenceSelect = (section, field) => (event) => {
    const { value } = event.target
    setPreferencesForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }))
  }

  const handleDetailsSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSavingDetails(true)

    try {
      const { data } = await api.patch('/users/me', {
        name: detailsForm.name.trim(),
      })

      const profile = buildProfileState(extractProfilePayload(data), profileDetails)
      setProfileDetails(profile)
      setDetailsForm(buildDetailsForm(profile))
      syncStoredUser(profile)
      setSuccessMessage('Admin profile details updated successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update the admin profile details.')
    } finally {
      setIsSavingDetails(false)
    }
  }

  const handlePreferencesSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSavingPreferences(true)

    try {
      const { data } = await api.patch('/users/me', { preferences: preferencesForm })
      const profile = buildProfileState(extractProfilePayload(data), profileDetails)
      setProfileDetails(profile)
      setPreferencesForm(normalizePreferences(profile.preferences))
      syncStoredUser(profile)
      setSuccessMessage('Admin preferences saved successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save the admin preferences.')
    } finally {
      setIsSavingPreferences(false)
    }
  }

  const handleEmailSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsChangingEmail(true)

    try {
      const { data } = await api.patch('/users/me/email', {
        email: emailForm.email.trim(),
        currentPassword: emailForm.currentPassword,
      })

      const profile = buildProfileState(extractProfilePayload(data), profileDetails)
      setProfileDetails(profile)
      setEmailForm(buildEmailForm(profile))
      syncStoredUser(profile)
      setSuccessMessage(data.message || 'Admin email updated successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update the admin email address.')
    } finally {
      setIsChangingEmail(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New password and confirmation password must match.')
      return
    }

    setIsChangingPassword(true)

    try {
      const { data } = await api.patch('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })

      setPasswordForm(buildPasswordForm())
      setSuccessMessage(data.message || 'Admin password updated successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update the admin password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleResendVerification = async () => {
    if (profileDetails.isVerified || !profileDetails.email) return

    setError('')
    setSuccessMessage('')
    setIsResendingVerification(true)

    try {
      const { data } = await api.post('/auth/resend-verification', {
        email: profileDetails.email,
      })

      setSuccessMessage(data.message || 'Verification email sent.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to resend the verification email.')
    } finally {
      setIsResendingVerification(false)
    }
  }

  const handleTwoFactorSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    const nextEnabled =
      twoFactorForm.pendingAction === 'enable'
        ? true
        : twoFactorForm.pendingAction === 'disable'
          ? false
          : null

    if (nextEnabled === null) {
      setError('Choose whether to enable or disable 2-step verification first.')
      return
    }

    setIsUpdatingTwoFactor(true)

    try {
      const { data } = await api.patch('/users/me/two-factor', {
        enabled: nextEnabled,
        currentPassword: twoFactorForm.currentPassword,
      })

      const profile = buildProfileState(extractProfilePayload(data), profileDetails)
      setProfileDetails(profile)
      setTwoFactorForm(buildTwoFactorForm())
      syncStoredUser(profile)
      setSuccessMessage(data.message || '2-step verification updated successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update 2-step verification right now.')
    } finally {
      setIsUpdatingTwoFactor(false)
    }
  }

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return
    if (!profileDetails.id) {
      setError('Unable to find the admin profile right now.')
      return
    }

    setError('')
    setSuccessMessage('')
    setIsUploadingImage(true)

    try {
      const uploadBody = new FormData()
      uploadBody.append('profileImage', file)

      const { data } = await api.post(`/users/${profileDetails.id}/profile-image`, uploadBody)
      const profile = buildProfileState(extractProfilePayload(data), profileDetails)
      setProfileDetails(profile)
      syncStoredUser(profile)
      setSuccessMessage(data.message || 'Admin profile image updated successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update the admin profile image.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleRemoveProfileImage = async () => {
    if (!profileDetails.id || !profileDetails.profileImageUrl) return

    const previousProfile = profileDetails
    const optimisticProfile = {
      ...previousProfile,
      profileImageUrl: '',
    }

    setError('')
    setSuccessMessage('')
    setProfileDetails(optimisticProfile)
    syncStoredUser(optimisticProfile)
    setIsRemovingImage(true)

    try {
      const { data } = await api.delete(`/users/${profileDetails.id}/profile-image`)
      const profile = buildProfileState(
        {
          ...extractProfilePayload(data),
          profileImageUrl: '',
        },
        previousProfile,
      )
      setProfileDetails(profile)
      syncStoredUser(profile)
      setSuccessMessage(data.message || 'Admin profile image removed successfully.')
    } catch (requestError) {
      setProfileDetails(previousProfile)
      syncStoredUser(previousProfile)
      setError(requestError.response?.data?.message || 'Unable to remove the admin profile image.')
    } finally {
      setIsRemovingImage(false)
    }
  }

  const handleDelete = async () => {
    if (!profileDetails.id) {
      setError('Unable to find the admin profile right now.')
      return
    }

    if (!globalThis.confirm('Are you sure you want to delete this admin account? This cannot be undone.')) {
      return
    }

    setError('')
    setSuccessMessage('')
    setIsDeleting(true)

    try {
      await api.delete(`/users/${profileDetails.id}`)
      logout()
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete the admin account.')
      setIsDeleting(false)
    }
  }

  const handleProfileImageLoadError = () => {
    const nextProfile = { ...profileDetails, profileImageUrl: '' }
    setProfileDetails(nextProfile)
    syncStoredUser(nextProfile)
  }

  const handleBackToDashboard = () => {
    navigate('/admin/dashboard')
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (isLoading) {
    return (
      <section className="admin-dashboard-page">
        <div className="admin-management-panel">
          <div className="admin-management-header">
            <div>
              <h2>Loading Admin Profile</h2>
              <p>Fetching the dedicated admin account workspace.</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const fullName = profileDetails.name || currentUserSnapshot.name || 'Admin'
  const initials = getInitials(fullName) || 'AD'
  const hasProfileImage = Boolean(profileDetails.profileImageUrl)
  const isProfileImageActionDisabled = !profileDetails.id || isUploadingImage || isRemovingImage
  const hasPendingTwoFactorAction = Boolean(twoFactorForm.pendingAction)
  const isEnablingTwoFactor = twoFactorForm.pendingAction === 'enable'

  return (
    <section className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-card admin-account-sidebar-card">
            <span className="admin-section-kicker">Admin Account</span>

            <div className="admin-account-identity">
              <div className="admin-account-avatar-shell">
                {hasProfileImage ? (
                  <img
                    className="admin-account-avatar-image"
                    src={profileDetails.profileImageUrl}
                    alt={`${fullName} profile`}
                    onError={handleProfileImageLoadError}
                  />
                ) : (
                  <div className="admin-account-avatar-fallback">{initials}</div>
                )}

                {hasProfileImage ? (
                  <button
                    type="button"
                    className="admin-account-avatar-remove"
                    onClick={handleRemoveProfileImage}
                    disabled={isRemovingImage || isUploadingImage}
                    aria-label="Remove profile photo"
                    title="Remove profile photo"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                ) : null}
              </div>

              <div className="admin-account-sidebar-copy">
                <h1>{fullName}</h1>
                <p>{profileDetails.email || 'No email available'}</p>
              </div>
            </div>

            <div className="admin-account-avatar-actions">
              <label className={`admin-primary-button admin-account-upload-button${isProfileImageActionDisabled ? ' admin-account-upload-button-disabled' : ''}`}>
                <span>{isUploadingImage ? 'Uploading...' : hasProfileImage ? 'Change Photo' : 'Upload Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  disabled={isProfileImageActionDisabled}
                  hidden
                />
              </label>
            </div>

            <div className="admin-data-summary-row">
              <span className="admin-data-summary-pill">{getRoleLabel(profileDetails.role)}</span>
              <span className="admin-data-summary-pill">{profileDetails.isVerified ? 'Verified' : 'Verification pending'}</span>
              <span className="admin-data-summary-pill">{profileDetails.twoFactorEnabled ? '2-step on' : '2-step off'}</span>
            </div>
          </div>

          <div className="admin-sidebar-card">
            <div className="admin-sidebar-nav-header">
              <span className="admin-sidebar-nav-title">Account Sections</span>
              <span className="admin-sidebar-nav-caption">Admin only</span>
            </div>

            <div className="admin-sidebar-nav-list">
              {sectionItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-sidebar-link${activeSection === item.id ? ' active' : ''}`}
                  onClick={() => handleSectionNavigate(item.id)}
                >
                  <span className="admin-sidebar-link-icon">
                    <item.Icon />
                  </span>
                  <span className="admin-sidebar-link-content">
                    <span className="admin-sidebar-link-label">{item.label}</span>
                    <span className="admin-sidebar-link-note">{item.note}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="admin-sidebar-card">
            <div className="admin-editor-actions">
              <button type="button" className="admin-secondary-button" onClick={handleBackToDashboard}>
                Back to Dashboard
              </button>
              <button type="button" className="admin-dashboard-logout" onClick={handleLogout}>
                Log Out
              </button>
            </div>
          </div>
        </aside>

        <div className="admin-dashboard-main">
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

          <div ref={registerSection('overview')} className="admin-management-panel">
            <div className="admin-management-header">
              <div>
                <h2>Admin Profile Workspace</h2>
                <p>A dedicated admin-only account screen, separate from the rider profile experience.</p>
              </div>

              <div className="admin-dashboard-actions">
                <div className="admin-dashboard-meta">
                  <span>{getRoleLabel(profileDetails.role)}</span>
                  <span>Joined {formatDate(profileDetails.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="admin-profile-grid">
              <article className="admin-profile-card">
                <span className="admin-profile-label">Full Name</span>
                <strong className="admin-profile-value">{fullName}</strong>
              </article>
              <article className="admin-profile-card">
                <span className="admin-profile-label">Email Address</span>
                <strong className="admin-profile-value admin-profile-value-wrap">{profileDetails.email || 'Not available'}</strong>
              </article>
              <article className="admin-profile-card">
                <span className="admin-profile-label">Verification</span>
                <strong className="admin-profile-value">{profileDetails.isVerified ? 'Verified account' : 'Awaiting verification'}</strong>
              </article>
              <article className="admin-profile-card">
                <span className="admin-profile-label">2-Step Verification</span>
                <strong className="admin-profile-value">{profileDetails.twoFactorEnabled ? 'Enabled' : 'Disabled'}</strong>
              </article>
              <article className="admin-profile-card">
                <span className="admin-profile-label">Last Updated</span>
                <strong className="admin-profile-value">{formatDate(profileDetails.updatedAt)}</strong>
              </article>
            </div>
          </div>

          <div ref={registerSection('details')} className="admin-management-panel">
            <div className="admin-management-header">
              <div>
                <h2>Account Details</h2>
                <p>Update the admin display name and cycling style without entering the rider-facing profile page.</p>
              </div>
            </div>

            <div className="admin-account-panel-body">
              <div className="admin-editor-panel">
                <form className="admin-editor-form" onSubmit={handleDetailsSubmit}>
                  <label className="admin-editor-field">
                    <span>Full Name</span>
                    <input
                      type="text"
                      name="name"
                      className="admin-editor-input"
                      value={detailsForm.name}
                      onChange={handleDetailsChange}
                      placeholder="Admin full name"
                      required
                    />
                  </label>

                  <label className="admin-editor-field">
                    <span>Role</span>
                    <input type="text" className="admin-editor-input" value={getRoleLabel(profileDetails.role)} disabled />
                  </label>

                  <label className="admin-editor-field">
                    <span>Current Email</span>
                    <input type="text" className="admin-editor-input" value={profileDetails.email || 'Not available'} disabled />
                  </label>

                  <div className="admin-editor-actions">
                    <button type="submit" className="admin-primary-button" disabled={isSavingDetails}>
                      {isSavingDetails ? 'Saving Details...' : 'Save Details'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div ref={registerSection('preferences')} className="admin-management-panel">
            <div className="admin-management-header">
              <div>
                <h2>Preferences</h2>
                <p>Keep admin notifications, privacy, language, and theme settings separate from the rider profile route.</p>
              </div>
            </div>

            <div className="admin-account-panel-body">
              <div className="admin-editor-panel">
                <form className="admin-editor-form" onSubmit={handlePreferencesSubmit}>
                  <label className="admin-editor-field">
                    <span>Profile Visibility</span>
                    <select
                      className="admin-editor-input"
                      value={preferencesForm.privacy.profileVisibility}
                      onChange={handlePreferenceSelect('privacy', 'profileVisibility')}
                    >
                      {visibilityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="admin-editor-field">
                    <span>Language</span>
                    <select
                      className="admin-editor-input"
                      value={preferencesForm.appearance.language}
                      onChange={handlePreferenceSelect('appearance', 'language')}
                    >
                      {languageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="admin-editor-field">
                    <span>Theme</span>
                    <select
                      className="admin-editor-input"
                      value={preferencesForm.appearance.theme}
                      onChange={handlePreferenceSelect('appearance', 'theme')}
                    >
                      {themeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="admin-account-toggle-grid">
                    <label className="admin-account-toggle-row">
                      <input
                        type="checkbox"
                        checked={preferencesForm.notifications.email}
                        onChange={handlePreferenceToggle('notifications', 'email')}
                      />
                      <span>
                        <strong>Email notifications</strong>
                        <span>Receive admin account and platform updates in your inbox.</span>
                      </span>
                    </label>

                    <label className="admin-account-toggle-row">
                      <input
                        type="checkbox"
                        checked={preferencesForm.notifications.push}
                        onChange={handlePreferenceToggle('notifications', 'push')}
                      />
                      <span>
                        <strong>Push notifications</strong>
                        <span>Enable browser or device alerts when supported.</span>
                      </span>
                    </label>

                    <label className="admin-account-toggle-row">
                      <input
                        type="checkbox"
                        checked={preferencesForm.notifications.marketing}
                        onChange={handlePreferenceToggle('notifications', 'marketing')}
                      />
                      <span>
                        <strong>Marketing updates</strong>
                        <span>Receive release notes and community campaign announcements.</span>
                      </span>
                    </label>

                    <label className="admin-account-toggle-row">
                      <input
                        type="checkbox"
                        checked={preferencesForm.privacy.showEmail}
                        onChange={handlePreferenceToggle('privacy', 'showEmail')}
                      />
                      <span>
                        <strong>Show my email</strong>
                        <span>Allow your email to appear in the limited places where public profile details are shown.</span>
                      </span>
                    </label>
                  </div>

                  <div className="admin-editor-actions">
                    <button type="submit" className="admin-primary-button" disabled={isSavingPreferences}>
                      {isSavingPreferences ? 'Saving Preferences...' : 'Save Preferences'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div ref={registerSection('security')} className="admin-management-panel">
            <div className="admin-management-header">
              <div>
                <h2>Security</h2>
                <p>Manage the admin email address, password, and 2-step verification from one secure workspace.</p>
              </div>
            </div>

            <div className="admin-account-panel-body">
              <div className="admin-editor-panel">
                <div className="admin-editor-header">
                  <div>
                    <h3 className="admin-editor-title">Email & Verification</h3>
                    <p className="admin-editor-subtitle">Changing the email address requires the current password and triggers re-verification.</p>
                  </div>
                </div>

                <form className="admin-editor-form" onSubmit={handleEmailSubmit}>
                  <label className="admin-editor-field">
                    <span>New Email Address</span>
                    <input
                      type="email"
                      name="email"
                      className="admin-editor-input"
                      value={emailForm.email}
                      onChange={handleEmailChange}
                      required
                    />
                  </label>

                  <label className="admin-editor-field">
                    <span>Current Password</span>
                    <input
                      type="password"
                      name="currentPassword"
                      className="admin-editor-input"
                      value={emailForm.currentPassword}
                      onChange={handleEmailChange}
                      required
                    />
                  </label>

                  <div className="admin-editor-actions">
                    <button type="submit" className="admin-primary-button" disabled={isChangingEmail}>
                      {isChangingEmail ? 'Updating Email...' : 'Change Email'}
                    </button>
                    {!profileDetails.isVerified ? (
                      <button type="button" className="admin-secondary-button" onClick={handleResendVerification} disabled={isResendingVerification}>
                        {isResendingVerification ? 'Sending Link...' : 'Resend Verification'}
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>

              <div className="admin-editor-panel">
                <div className="admin-editor-header">
                  <div>
                    <h3 className="admin-editor-title">Password</h3>
                    <p className="admin-editor-subtitle">Use the authenticated password change endpoint for the admin account.</p>
                  </div>
                </div>

                <form className="admin-editor-form" onSubmit={handlePasswordSubmit}>
                  <label className="admin-editor-field">
                    <span>Current Password</span>
                    <input
                      type="password"
                      name="currentPassword"
                      className="admin-editor-input"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                  </label>

                  <label className="admin-editor-field">
                    <span>New Password</span>
                    <input
                      type="password"
                      name="newPassword"
                      className="admin-editor-input"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                  </label>

                  <label className="admin-editor-field">
                    <span>Confirm Password</span>
                    <input
                      type="password"
                      name="confirmPassword"
                      className="admin-editor-input"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                  </label>

                  <div className="admin-editor-actions">
                    <button type="submit" className="admin-primary-button" disabled={isChangingPassword}>
                      {isChangingPassword ? 'Updating Password...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="admin-editor-panel">
                <div className="admin-editor-header">
                  <div>
                    <h3 className="admin-editor-title">2-Step Verification</h3>
                    <p className="admin-editor-subtitle">A one-time email code is sent after password authentication.</p>
                  </div>
                </div>

                <div className="admin-data-summary-row">
                  <span className="admin-data-summary-pill">{profileDetails.twoFactorEnabled ? 'Currently enabled' : 'Currently disabled'}</span>
                  <span className="admin-data-summary-pill">{profileDetails.email || 'No email available'}</span>
                </div>

                <p className="admin-account-muted">
                  When enabled, the admin account requires a 6-digit email verification code at sign-in.
                </p>

                <div className="admin-editor-actions">
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => handleTwoFactorActionStart(!profileDetails.twoFactorEnabled)}
                    disabled={isUpdatingTwoFactor || hasPendingTwoFactorAction}
                  >
                    {profileDetails.twoFactorEnabled ? 'Disable 2-Step Verification' : 'Enable 2-Step Verification'}
                  </button>
                </div>

                {hasPendingTwoFactorAction ? (
                  <form className="admin-editor-form admin-account-inline-form" onSubmit={handleTwoFactorSubmit}>
                    <label className="admin-editor-field">
                      <span>Current Password</span>
                      <input
                        type="password"
                        className="admin-editor-input"
                        value={twoFactorForm.currentPassword}
                        onChange={handleTwoFactorPasswordChange}
                        required
                      />
                    </label>

                    <div className="admin-editor-actions">
                      <button
                        type="submit"
                        className="admin-primary-button"
                        disabled={isUpdatingTwoFactor || !twoFactorForm.currentPassword.trim()}
                      >
                        {isUpdatingTwoFactor
                          ? 'Saving 2-Step Settings...'
                          : isEnablingTwoFactor
                            ? 'Turn On 2-Step Verification'
                            : 'Turn Off 2-Step Verification'}
                      </button>
                      <button type="button" className="admin-secondary-button" onClick={handleTwoFactorActionCancel} disabled={isUpdatingTwoFactor}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            </div>
          </div>

          <div ref={registerSection('danger')} className="admin-management-panel">
            <div className="admin-management-header">
              <div>
                <h2>Danger Zone</h2>
                <p>Delete the signed-in admin account and remove access immediately.</p>
              </div>
            </div>

            <div className="admin-account-panel-body">
              <div className="admin-editor-panel">
                <div className="admin-editor-header">
                  <div>
                    <h3 className="admin-editor-title">Delete Admin Account</h3>
                    <p className="admin-editor-subtitle">This removes the account permanently and logs you out right away.</p>
                  </div>
                </div>

                <div className="admin-editor-actions">
                  <button type="button" className="admin-action-button admin-action-button-danger" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? 'Deleting Admin Account...' : 'Delete Admin Account'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
