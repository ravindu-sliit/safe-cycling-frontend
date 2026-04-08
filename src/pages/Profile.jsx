import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext.jsx'

const cyclingStyles = [
  { value: 'commuter', label: 'Commuter' },
  { value: 'fitness', label: 'Fitness Rider' },
  { value: 'adventure', label: 'Adventure Rider' },
  { value: 'casual', label: 'Casual Explorer' },
]

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

const normalizeRoleValue = (value) => {
  const role = String(value || 'user').toLowerCase()
  return role === 'organisation' ? 'organization' : role
}

const supportsCyclingStyle = (role) => normalizeRoleValue(role) === 'user'

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
  const role = normalizeRoleValue(user.role || 'user')

  return {
    ...user,
    id,
    _id: id,
    name: user.name || '',
    email: user.email || '',
    cyclingStyle: supportsCyclingStyle(role) ? (user.cyclingStyle || 'commuter') : '',
    profileImageUrl: user.profileImageUrl || '',
    role,
    isVerified: Boolean(user.isVerified),
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    createdAt: user.createdAt || '',
    updatedAt: user.updatedAt || '',
    preferences: normalizePreferences(user.preferences),
  }
}

const buildProfileState = (profile = {}, fallbackUser = {}) => {
  const id = profile._id || profile.id || fallbackUser._id || fallbackUser.id || ''
  const role = normalizeRoleValue(profile.role || fallbackUser.role || 'user')

  return {
    id,
    _id: id,
    name: profile.name || fallbackUser.name || '',
    email: profile.email || fallbackUser.email || '',
    cyclingStyle: supportsCyclingStyle(role) ? (profile.cyclingStyle || fallbackUser.cyclingStyle || 'commuter') : '',
    profileImageUrl: profile.profileImageUrl || fallbackUser.profileImageUrl || '',
    role,
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

const buildDetailsForm = (profile = {}) => ({
  name: profile.name || '',
  cyclingStyle: supportsCyclingStyle(profile.role) ? (profile.cyclingStyle || 'commuter') : '',
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

const profileSectionItems = [
  { id: 'details', label: 'Profile Details' },
  { id: 'email', label: 'Email & Verification' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'two-factor', label: '2-Step Verification' },
  { id: 'security', label: 'Security' },
  { id: 'photo', label: 'Profile Photo' },
  { id: 'danger', label: 'Danger Zone' },
]

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const currentUserSnapshot = buildStoredUserSnapshot(user)
  const currentUserId = currentUserSnapshot.id
  const sectionRefs = useRef({})

  const [profileDetails, setProfileDetails] = useState(() => buildProfileState({}, currentUserSnapshot))
  const [detailsForm, setDetailsForm] = useState(() => buildDetailsForm(currentUserSnapshot))
  const [emailForm, setEmailForm] = useState(() => buildEmailForm(currentUserSnapshot))
  const [passwordForm, setPasswordForm] = useState(buildPasswordForm)
  const [twoFactorForm, setTwoFactorForm] = useState(() => buildTwoFactorForm(currentUserSnapshot))
  const [preferencesForm, setPreferencesForm] = useState(() => normalizePreferences(currentUserSnapshot.preferences))
  const [activeSection, setActiveSection] = useState(profileSectionItems[0].id)
  const [isEditingDetails, setIsEditingDetails] = useState(false)
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
  const supportsProfileCyclingStyle = supportsCyclingStyle(profileDetails.role)

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
        setTwoFactorForm(buildTwoFactorForm(profile))
        setPreferencesForm(normalizePreferences(profile.preferences))
        updateUser(buildStoredUser(profile, baseUser))
      } catch (requestError) {
        if (!isActive) return
        setError(requestError.response?.data?.message || 'Unable to load your profile.')
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
  // We only reload profile data when the signed-in identity changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId])

  useEffect(() => {
    const sectionNodes = Object.values(sectionRefs.current)
    if (!sectionNodes.length || typeof IntersectionObserver === 'undefined') {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const nextVisibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]

        if (nextVisibleEntry?.target?.dataset?.sectionId) {
          setActiveSection(nextVisibleEntry.target.dataset.sectionId)
        }
      },
      {
        rootMargin: '-120px 0px -52% 0px',
        threshold: [0.2, 0.35, 0.5, 0.7],
      },
    )

    sectionNodes.forEach((node) => observer.observe(node))

    return () => {
      observer.disconnect()
    }
  }, [isLoading])

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
    sectionNode.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
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

  const handleEditStart = () => {
    setError('')
    setSuccessMessage('')
    setDetailsForm(buildDetailsForm(profileDetails))
    setIsEditingDetails(true)
  }

  const handleEditCancel = () => {
    setError('')
    setSuccessMessage('')
    setDetailsForm(buildDetailsForm(profileDetails))
    setIsEditingDetails(false)
  }

  const handleDetailsSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSavingDetails(true)

    try {
      const payload = {
        name: detailsForm.name.trim(),
      }

      if (supportsProfileCyclingStyle) {
        payload.cyclingStyle = detailsForm.cyclingStyle
      }

      const { data } = await api.patch('/users/me', payload)

      const profile = buildProfileState(extractProfilePayload(data), profileDetails)
      setProfileDetails(profile)
      setDetailsForm(buildDetailsForm(profile))
      syncStoredUser(profile)
      setIsEditingDetails(false)
      setSuccessMessage('Profile details updated successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update your profile.')
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
      setSuccessMessage('Preferences saved successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save your preferences.')
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
      setSuccessMessage(data.message || 'Email updated successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to change your email address.')
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
      setSuccessMessage(data.message || 'Password updated successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update your password.')
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
      setTwoFactorForm(buildTwoFactorForm(profile))
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
      setError('Unable to find your profile right now.')
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
      setSuccessMessage(data.message || 'Profile image updated successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update your profile image.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleRemoveProfileImage = async () => {
    if (!profileDetails.id || !profileDetails.profileImageUrl) return

    setError('')
    setSuccessMessage('')
    setIsRemovingImage(true)

    try {
      const { data } = await api.delete(`/users/${profileDetails.id}/profile-image`)
      const profile = buildProfileState(extractProfilePayload(data), profileDetails)
      setProfileDetails(profile)
      syncStoredUser(profile)
      setSuccessMessage(data.message || 'Profile image removed successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to remove your profile image.')
    } finally {
      setIsRemovingImage(false)
    }
  }

  const handleDelete = async () => {
    if (!profileDetails.id) {
      setError('Unable to find your profile right now.')
      return
    }

    if (!globalThis.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      return
    }

    setError('')
    setSuccessMessage('')
    setIsDeleting(true)

    try {
      await api.delete(`/users/${profileDetails.id}`)
      logout()
      navigate('/register', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete your account.')
      setIsDeleting(false)
    }
  }

  const handleProfileImageLoadError = () => {
    const nextProfile = { ...profileDetails, profileImageUrl: '' }
    setProfileDetails(nextProfile)
    syncStoredUser(nextProfile)
  }

  if (isLoading) {
    return (
      <section className="pro-page">
        <div className="pro-loading-state">
          <div className="pro-loading-spinner" />
          <p>Loading your profile...</p>
        </div>
      </section>
    )
  }

  const fullName = profileDetails.name || currentUserSnapshot.name || 'Cyclist'
  const initials = getInitials(fullName) || 'SC'
  const hasProfileImage = Boolean(profileDetails.profileImageUrl)
  const hasPendingTwoFactorAction = Boolean(twoFactorForm.pendingAction)
  const isEnablingTwoFactor = twoFactorForm.pendingAction === 'enable'

  return (
    <section className="pro-page">
      <div className="pro-cover">
        <div className="pro-cover-gradient" />
        <div className="pro-cover-pattern" />
      </div>

      <div className="pro-container">
        {error ? (
          <div className="pro-toast pro-toast--error">
            <span>{error}</span>
            <button className="pro-toast-close" onClick={() => setError('')}>x</button>
          </div>
        ) : null}

        {successMessage ? (
          <div className="pro-toast pro-toast--success">
            <span>{successMessage}</span>
            <button className="pro-toast-close" onClick={() => setSuccessMessage('')}>x</button>
          </div>
        ) : null}

        <div className="pro-grid">
          <aside className="pro-sidebar">
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

                <label className={`pro-avatar-upload-overlay${isUploadingImage || isRemovingImage ? ' pro-avatar-upload-overlay--busy' : ''}`}>
                  Change
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    disabled={!profileDetails.id || isUploadingImage || isRemovingImage}
                    hidden
                  />
                </label>
              </div>

              <h1 className="pro-identity-name">{fullName}</h1>
              <p className="pro-identity-email">{profileDetails.email || '-'}</p>

              <div className={`pro-verification-badge ${profileDetails.isVerified ? 'pro-verification-badge--verified' : 'pro-verification-badge--pending'}`}>
                <span>{profileDetails.isVerified ? 'Verified' : 'Pending verification'}</span>
              </div>

              {!profileDetails.isVerified ? (
                <button
                  type="button"
                  className="pro-btn pro-btn--ghost pro-btn--wide"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                >
                  {isResendingVerification ? 'Sending link...' : 'Resend verification email'}
                </button>
              ) : null}
            </div>

            <div className="pro-sidebar-section">
              <h3 className="pro-sidebar-section-title">Navigate</h3>
              <div className="pro-sidebar-nav">
                {profileSectionItems.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`pro-sidebar-nav-btn${activeSection === section.id ? ' pro-sidebar-nav-btn--active' : ''}`}
                    onClick={() => handleSectionNavigate(section.id)}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pro-sidebar-section">
              <h3 className="pro-sidebar-section-title">Account</h3>
              <div className="pro-quick-info">
                <div className="pro-quick-info-row">
                  <div className="pro-quick-info-content">
                    <span className="pro-quick-info-label">Joined</span>
                    <span className="pro-quick-info-value">{formatDate(profileDetails.createdAt)}</span>
                  </div>
                </div>
                <div className="pro-quick-info-row">
                  <div className="pro-quick-info-content">
                    <span className="pro-quick-info-label">Last updated</span>
                    <span className="pro-quick-info-value">{formatDate(profileDetails.updatedAt)}</span>
                  </div>
                </div>
                <div className="pro-quick-info-row">
                  <div className="pro-quick-info-content">
                    <span className="pro-quick-info-label">Role</span>
                    <span className="pro-quick-info-value">{profileDetails.role}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pro-sidebar-actions">
              <button
                type="button"
                className="pro-sidebar-btn pro-sidebar-btn--logout"
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
              >
                Log Out
              </button>
            </div>
          </aside>

          <main className="pro-main profile-stack">
            <div
              id="profile-section-details"
              ref={registerSection('details')}
              data-section-id="details"
              className="pro-panel pro-panel--section"
            >
              <div className="pro-panel-header">
                <div className="pro-panel-header-left">
                  <div>
                    <h2 className="pro-panel-title">Profile Details</h2>
                    <p className="pro-panel-subtitle">Use the current-user endpoint instead of passing IDs.</p>
                  </div>
                </div>
                {!isEditingDetails ? (
                  <button type="button" className="pro-btn pro-btn--primary" onClick={handleEditStart}>
                    Edit
                  </button>
                ) : null}
              </div>

              <div className="pro-panel-body">
                {!isEditingDetails ? (
                  <div className="pro-detail-list">
                    <div className="pro-detail-row">
                      <div className="pro-detail-content">
                        <span className="pro-detail-label">Full Name</span>
                        <span className="pro-detail-value">{profileDetails.name || 'Not available'}</span>
                      </div>
                    </div>
                    <div className="pro-detail-row">
                      <div className="pro-detail-content">
                        <span className="pro-detail-label">Email Address</span>
                        <span className="pro-detail-value">{profileDetails.email || 'Not available'}</span>
                      </div>
                    </div>
                    {supportsProfileCyclingStyle ? (
                      <div className="pro-detail-row">
                        <div className="pro-detail-content">
                          <span className="pro-detail-label">Cycling Style</span>
                          <span className="pro-detail-value">
                            {cyclingStyles.find((style) => style.value === profileDetails.cyclingStyle)?.label || 'Not selected'}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <form className="pro-edit-form" onSubmit={handleDetailsSubmit}>
                    <div className="pro-form-group">
                      <label className="pro-form-label" htmlFor="profile-name">Full Name</label>
                      <input
                        id="profile-name"
                        className="pro-form-input"
                        type="text"
                        name="name"
                        value={detailsForm.name}
                        onChange={handleDetailsChange}
                        required
                      />
                    </div>

                    {supportsProfileCyclingStyle ? (
                      <div className="pro-form-group">
                        <label className="pro-form-label" htmlFor="profile-style">Cycling Style</label>
                        <select
                          id="profile-style"
                          className="pro-form-input pro-form-select"
                          name="cyclingStyle"
                          value={detailsForm.cyclingStyle}
                          onChange={handleDetailsChange}
                        >
                          {cyclingStyles.map((style) => (
                            <option key={style.value} value={style.value}>
                              {style.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <p className="pro-helper-text">
                      {supportsProfileCyclingStyle
                        ? 'Email address and password now use dedicated secure forms below.'
                        : 'Email address, password, and other account settings use the dedicated secure forms below.'}
                    </p>

                    <div className="pro-form-actions">
                      <button className="pro-btn pro-btn--primary" type="submit" disabled={isSavingDetails}>
                        {isSavingDetails ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button className="pro-btn pro-btn--ghost" type="button" onClick={handleEditCancel} disabled={isSavingDetails}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div
              id="profile-section-email"
              ref={registerSection('email')}
              data-section-id="email"
              className="pro-panel pro-panel--section"
            >
              <div className="pro-panel-header">
                <div>
                  <h2 className="pro-panel-title">Email & Verification</h2>
                  <p className="pro-panel-subtitle">Change your email and trigger re-verification when needed.</p>
                </div>
              </div>

              <div className="pro-panel-body profile-stack">
                <div className="pro-status-line">
                  <span className={`pro-pill ${profileDetails.isVerified ? 'pro-pill--verified' : 'pro-pill--pending'}`}>
                    {profileDetails.isVerified ? 'Verified email' : 'Verification pending'}
                  </span>
                  <span className="pro-muted">{profileDetails.email}</span>
                </div>

                <p className="pro-note">Changing your email marks the account as unverified until you confirm the new address.</p>

                <form className="pro-inline-form-grid" onSubmit={handleEmailSubmit}>
                  <div className="pro-form-group">
                    <label className="pro-form-label" htmlFor="email-address">New Email Address</label>
                    <input
                      id="email-address"
                      className="pro-form-input"
                      type="email"
                      name="email"
                      value={emailForm.email}
                      onChange={handleEmailChange}
                      required
                    />
                  </div>

                  <div className="pro-form-group">
                    <label className="pro-form-label" htmlFor="email-password">Current Password</label>
                    <input
                      id="email-password"
                      className="pro-form-input"
                      type="password"
                      name="currentPassword"
                      value={emailForm.currentPassword}
                      onChange={handleEmailChange}
                      required
                    />
                  </div>

                  <div className="pro-inline-actions">
                    <button className="pro-btn pro-btn--primary" type="submit" disabled={isChangingEmail}>
                      {isChangingEmail ? 'Updating email...' : 'Change Email'}
                    </button>
                    {!profileDetails.isVerified ? (
                      <button type="button" className="pro-btn pro-btn--ghost" onClick={handleResendVerification} disabled={isResendingVerification}>
                        {isResendingVerification ? 'Sending link...' : 'Resend Verification'}
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>

            <div
              id="profile-section-preferences"
              ref={registerSection('preferences')}
              data-section-id="preferences"
              className="pro-panel pro-panel--section"
            >
              <div className="pro-panel-header">
                <div>
                  <h2 className="pro-panel-title">Preferences</h2>
                  <p className="pro-panel-subtitle">Update notification, privacy, language, and theme settings.</p>
                </div>
              </div>

              <div className="pro-panel-body">
                <form className="profile-stack" onSubmit={handlePreferencesSubmit}>
                  <div className="pro-preferences-grid">
                    <div className="pro-panel-section">
                      <h3>Notifications</h3>
                      <label className="pro-toggle-row">
                        <input type="checkbox" checked={preferencesForm.notifications.email} onChange={handlePreferenceToggle('notifications', 'email')} />
                        <span className="pro-toggle-copy">
                          <strong>Email notifications</strong>
                          <span>Receive account and safety updates in your inbox.</span>
                        </span>
                      </label>
                      <label className="pro-toggle-row">
                        <input type="checkbox" checked={preferencesForm.notifications.push} onChange={handlePreferenceToggle('notifications', 'push')} />
                        <span className="pro-toggle-copy">
                          <strong>Push notifications</strong>
                          <span>Keep mobile alerts enabled when the app supports them.</span>
                        </span>
                      </label>
                      <label className="pro-toggle-row">
                        <input type="checkbox" checked={preferencesForm.notifications.marketing} onChange={handlePreferenceToggle('notifications', 'marketing')} />
                        <span className="pro-toggle-copy">
                          <strong>Marketing updates</strong>
                          <span>Receive product announcements and community campaigns.</span>
                        </span>
                      </label>
                    </div>

                    <div className="pro-panel-section">
                      <h3>Privacy</h3>
                      <div className="pro-form-group">
                        <label className="pro-form-label" htmlFor="profile-visibility">Profile visibility</label>
                        <select
                          id="profile-visibility"
                          className="pro-form-input pro-form-select"
                          value={preferencesForm.privacy.profileVisibility}
                          onChange={handlePreferenceSelect('privacy', 'profileVisibility')}
                        >
                          {visibilityOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <label className="pro-toggle-row">
                        <input type="checkbox" checked={preferencesForm.privacy.showEmail} onChange={handlePreferenceToggle('privacy', 'showEmail')} />
                        <span className="pro-toggle-copy">
                          <strong>Show my email</strong>
                          <span>Allow your email to appear where public profile details are shown.</span>
                        </span>
                      </label>
                    </div>

                    <div className="pro-panel-section">
                      <h3>Appearance</h3>
                      <div className="pro-form-group">
                        <label className="pro-form-label" htmlFor="profile-language">Language</label>
                        <select
                          id="profile-language"
                          className="pro-form-input pro-form-select"
                          value={preferencesForm.appearance.language}
                          onChange={handlePreferenceSelect('appearance', 'language')}
                        >
                          {languageOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="pro-form-group">
                        <label className="pro-form-label" htmlFor="profile-theme">Theme</label>
                        <select
                          id="profile-theme"
                          className="pro-form-input pro-form-select"
                          value={preferencesForm.appearance.theme}
                          onChange={handlePreferenceSelect('appearance', 'theme')}
                        >
                          {themeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pro-inline-actions">
                    <button className="pro-btn pro-btn--primary" type="submit" disabled={isSavingPreferences}>
                      {isSavingPreferences ? 'Saving preferences...' : 'Save Preferences'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div
              id="profile-section-two-factor"
              ref={registerSection('two-factor')}
              data-section-id="two-factor"
              className="pro-panel pro-panel--section"
            >
              <div className="pro-panel-header">
                <div>
                  <h2 className="pro-panel-title">2-Step Verification</h2>
                  <p className="pro-panel-subtitle">Protect your account with a one-time email code after your password.</p>
                </div>
              </div>

              <div className="pro-panel-body profile-stack">
                <div className="pro-status-line">
                  <span className={`pro-pill ${profileDetails.twoFactorEnabled ? 'pro-pill--verified' : 'pro-pill--pending'}`}>
                    {profileDetails.twoFactorEnabled ? '2-step verification on' : '2-step verification off'}
                  </span>
                  <span className="pro-muted">{profileDetails.email}</span>
                </div>

                <p className="pro-note">
                  When enabled, we email a 6-digit verification code to your account address each time you sign in.
                </p>

                <button
                  type="button"
                  className={`pro-action-card${hasPendingTwoFactorAction ? ' pro-action-card--active' : ''}`}
                  onClick={() => handleTwoFactorActionStart(!profileDetails.twoFactorEnabled)}
                  disabled={isUpdatingTwoFactor || hasPendingTwoFactorAction}
                >
                  <span className="pro-toggle-copy">
                    <strong>{profileDetails.twoFactorEnabled ? 'Disable 2-step verification' : 'Enable 2-step verification'}</strong>
                    <span>
                      {profileDetails.twoFactorEnabled
                        ? 'Turn off the extra email code prompt for future sign-ins.'
                        : 'Use your verified email as the second sign-in step.'}
                    </span>
                  </span>
                </button>

                {hasPendingTwoFactorAction ? (
                  <form className="pro-inline-form-grid" onSubmit={handleTwoFactorSubmit}>
                    <p className="pro-helper-text">
                      Enter your current password to {isEnablingTwoFactor ? 'turn on' : 'turn off'} 2-step verification.
                    </p>

                    <div className="pro-form-group">
                      <label className="pro-form-label" htmlFor="two-factor-password">Current Password</label>
                      <input
                        id="two-factor-password"
                        className="pro-form-input"
                        type="password"
                        value={twoFactorForm.currentPassword}
                        onChange={handleTwoFactorPasswordChange}
                        required
                      />
                    </div>

                    <div className="pro-inline-actions">
                      <button
                        className="pro-btn pro-btn--primary"
                        type="submit"
                        disabled={isUpdatingTwoFactor || !twoFactorForm.currentPassword.trim()}
                      >
                        {isUpdatingTwoFactor
                          ? 'Saving 2-step settings...'
                          : isEnablingTwoFactor
                            ? 'Turn On 2-Step Verification'
                            : 'Turn Off 2-Step Verification'}
                      </button>
                      <button
                        type="button"
                        className="pro-btn pro-btn--ghost"
                        onClick={handleTwoFactorActionCancel}
                        disabled={isUpdatingTwoFactor}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            </div>

            <div
              id="profile-section-security"
              ref={registerSection('security')}
              data-section-id="security"
              className="pro-panel pro-panel--section"
            >
              <div className="pro-panel-header">
                <div>
                  <h2 className="pro-panel-title">Security</h2>
                  <p className="pro-panel-subtitle">Change your password with the authenticated change-password endpoint.</p>
                </div>
              </div>

              <div className="pro-panel-body">
                <form className="pro-security-grid" onSubmit={handlePasswordSubmit}>
                  <div className="pro-form-group">
                    <label className="pro-form-label" htmlFor="current-password">Current Password</label>
                    <input
                      id="current-password"
                      className="pro-form-input"
                      type="password"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>

                  <div className="pro-form-group">
                    <label className="pro-form-label" htmlFor="new-password">New Password</label>
                    <input
                      id="new-password"
                      className="pro-form-input"
                      type="password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>

                  <div className="pro-form-group">
                    <label className="pro-form-label" htmlFor="confirm-password">Confirm New Password</label>
                    <input
                      id="confirm-password"
                      className="pro-form-input"
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>

                  <div className="pro-inline-actions">
                    <button className="pro-btn pro-btn--primary" type="submit" disabled={isChangingPassword}>
                      {isChangingPassword ? 'Updating password...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div
              id="profile-section-photo"
              ref={registerSection('photo')}
              data-section-id="photo"
              className="pro-panel pro-panel--section"
            >
              <div className="pro-panel-header">
                <div>
                  <h2 className="pro-panel-title">Profile Photo</h2>
                  <p className="pro-panel-subtitle">The image upload flow still uses the current user ID for file endpoints.</p>
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
                    <label className={`pro-btn pro-btn--primary${!profileDetails.id || isUploadingImage || isRemovingImage ? ' pro-btn--disabled' : ''}`}>
                      <span>{isUploadingImage ? 'Uploading...' : hasProfileImage ? 'Change Photo' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                        disabled={!profileDetails.id || isUploadingImage || isRemovingImage}
                        hidden
                      />
                    </label>

                    {hasProfileImage ? (
                      <button type="button" className="pro-btn pro-btn--ghost pro-btn--danger-ghost" onClick={handleRemoveProfileImage} disabled={isRemovingImage || isUploadingImage}>
                        {isRemovingImage ? 'Removing...' : 'Remove'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div
              id="profile-section-danger"
              ref={registerSection('danger')}
              data-section-id="danger"
              className="pro-panel pro-panel--section pro-panel--danger"
            >
              <div className="pro-panel-header">
                <div>
                  <h2 className="pro-panel-title pro-panel-title--danger">Danger Zone</h2>
                  <p className="pro-panel-subtitle">Permanently delete your account and all data.</p>
                </div>
                <button className="pro-btn pro-btn--danger" type="button" disabled={isDeleting} onClick={handleDelete}>
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>
  )
}
