import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext.jsx'

const cyclingStyles = [
  { value: 'commuter', label: 'Commuter' },
  { value: 'fitness', label: 'Fitness Rider' },
  { value: 'adventure', label: 'Adventure Rider' },
  { value: 'casual', label: 'Casual Explorer' },
]

const getCyclingStyleLabel = (value) =>
  cyclingStyles.find((style) => style.value === value)?.label || 'Not selected'

const formatDate = (value) => {
  if (!value) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleString()
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const [profileDetails, setProfileDetails] = useState({
    id: user?.id || '',
    name: user?.name || '',
    email: user?.email || '',
    cyclingStyle: user?.cyclingStyle || 'commuter',
    isVerified: false,
    createdAt: '',
    updatedAt: '',
  })
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    cyclingStyle: user?.cyclingStyle || 'commuter',
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      try {
        const { data } = await api.get(`/users/${user.id}`)
        const profile = data.data

        const nextProfile = {
          id: profile._id || user.id,
          name: profile.name || '',
          email: profile.email || '',
          cyclingStyle: profile.cyclingStyle || 'commuter',
          isVerified: Boolean(profile.isVerified),
          createdAt: profile.createdAt || '',
          updatedAt: profile.updatedAt || '',
        }

        setProfileDetails(nextProfile)
        setForm({
          name: nextProfile.name,
          email: nextProfile.email,
          cyclingStyle: nextProfile.cyclingStyle,
        })

        updateUser({
          id: nextProfile.id,
          name: nextProfile.name,
          email: nextProfile.email,
          cyclingStyle: nextProfile.cyclingStyle,
          role: user.role,
        })
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load your profile.')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [updateUser, user?.cyclingStyle, user?.email, user?.id, user?.name, user?.role])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleEditStart = () => {
    setError('')
    setSuccessMessage('')
    setForm({
      name: profileDetails.name,
      email: profileDetails.email,
      cyclingStyle: profileDetails.cyclingStyle,
    })
    setIsEditing(true)
  }

  const handleEditCancel = () => {
    setError('')
    setSuccessMessage('')
    setForm({
      name: profileDetails.name,
      email: profileDetails.email,
      cyclingStyle: profileDetails.cyclingStyle,
    })
    setIsEditing(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSaving(true)

    try {
      const { data } = await api.put(`/users/${user.id}`, form)
      const profile = data.data

      const nextProfile = {
        id: profile._id || user.id,
        name: profile.name || '',
        email: profile.email || '',
        cyclingStyle: profile.cyclingStyle || 'commuter',
        isVerified: Boolean(profile.isVerified),
        createdAt: profile.createdAt || profileDetails.createdAt,
        updatedAt: profile.updatedAt || profileDetails.updatedAt,
      }

      setProfileDetails(nextProfile)
      setForm({
        name: nextProfile.name,
        email: nextProfile.email,
        cyclingStyle: nextProfile.cyclingStyle,
      })

      updateUser({
        id: nextProfile.id,
        name: nextProfile.name,
        email: nextProfile.email,
        cyclingStyle: nextProfile.cyclingStyle,
        role: user.role,
      })

      setIsEditing(false)
      setSuccessMessage('Profile updated successfully.')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update your profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This cannot be undone.')) return

    setError('')
    setSuccessMessage('')
    setIsDeleting(true)

    try {
      await api.delete(`/users/${user.id}`)
      logout()
      navigate('/register', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete your account.')
      setIsDeleting(false)
    }
  }

  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'
  const fullName = profileDetails.name || user?.name || 'Cyclist'
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
  const verificationLabel = profileDetails.isVerified ? 'Verified' : 'Not verified'

  return (
    <section className="profile-page">
      <div className="profile-container">
        <div className="profile-header-card">
          <div className="profile-avatar">{initials || 'SC'}</div>
          <div className="profile-header-info">
            <h1 className="profile-name">{fullName}</h1>
            <p className="profile-email">{profileDetails.email || user?.email || '-'}</p>
            <span className="profile-role-badge">{verificationLabel}</span>
          </div>
          <div className="profile-header-actions">
            <Link to={dashboardPath} className="profile-btn profile-btn-outline">
              Dashboard
            </Link>
            <button
              type="button"
              className="profile-btn profile-btn-outline"
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {error && <div className="profile-message profile-message-error">{error}</div>}
        {successMessage && <div className="profile-message profile-message-success">{successMessage}</div>}

        <div className="profile-panel">
          <div className="profile-panel-heading">
            <h2 className="profile-panel-title">Profile Details</h2>
            {!isEditing ? (
              <button type="button" className="profile-btn profile-btn-primary" onClick={handleEditStart}>
                Edit Details
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <div className="profile-loading">
              <div className="profile-loading-bar" />
              <div className="profile-loading-bar profile-loading-bar-short" />
            </div>
          ) : !isEditing ? (
            <div className="profile-summary-grid">
              <div className="profile-summary-card">
                <span className="profile-summary-label">Full Name</span>
                <strong className="profile-summary-value">{profileDetails.name || 'Not available'}</strong>
              </div>
              <div className="profile-summary-card">
                <span className="profile-summary-label">Email</span>
                <strong className="profile-summary-value">{profileDetails.email || 'Not available'}</strong>
              </div>
              <div className="profile-summary-card">
                <span className="profile-summary-label">Cycling Style</span>
                <strong className="profile-summary-value">{getCyclingStyleLabel(profileDetails.cyclingStyle)}</strong>
              </div>
              <div className="profile-summary-card">
                <span className="profile-summary-label">Email Status</span>
                <strong className="profile-summary-value">{verificationLabel}</strong>
              </div>
              <div className="profile-summary-card">
                <span className="profile-summary-label">Account Created</span>
                <strong className="profile-summary-value">{formatDate(profileDetails.createdAt)}</strong>
              </div>
              <div className="profile-summary-card">
                <span className="profile-summary-label">Last Updated</span>
                <strong className="profile-summary-value">{formatDate(profileDetails.updatedAt)}</strong>
              </div>
            </div>
          ) : (
            <form className="profile-form" onSubmit={handleSubmit}>
              <label className="profile-field">
                <span>Full Name</span>
                <input
                  className="profile-input"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </label>

              <label className="profile-field">
                <span>Email</span>
                <input
                  className="profile-input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  required
                />
              </label>

              <label className="profile-field">
                <span>Cycling Style</span>
                <select
                  className="profile-input"
                  name="cyclingStyle"
                  value={form.cyclingStyle}
                  onChange={handleChange}
                >
                  {cyclingStyles.map((style) => (
                    <option key={style.value} value={style.value}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="profile-form-actions">
                <button className="profile-btn profile-btn-primary" type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="profile-btn profile-btn-outline"
                  type="button"
                  onClick={handleEditCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="profile-panel profile-danger-panel">
          <div className="profile-danger-content">
            <h3>Delete Account</h3>
            <p>Permanently remove your profile and all associated data.</p>
          </div>
          <button
            className="profile-btn profile-btn-danger"
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </section>
  )
}

