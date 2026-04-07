import { useDeferredValue, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext.jsx'

const TOTAL_ROUTES = 128
const ACTIVE_HAZARDS = 47
const RESOLVED_HAZARDS = 29
const TOTAL_REVIEWS = 312
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

function normalizeRoleValue(value) {
  const role = String(value || 'user').toLowerCase()
  return role === 'organisation' ? 'organization' : role
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

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { logout, updateUser, user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editorMode, setEditorMode] = useState('')
  const [editingUserId, setEditingUserId] = useState('')
  const [form, setForm] = useState(DEFAULT_USER_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase())
  const currentUserId = getUserId(currentUser)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const resetEditor = () => {
    setEditorMode('')
    setEditingUserId('')
    setForm(DEFAULT_USER_FORM)
  }

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleCreateStart = () => {
    setError('')
    setSuccessMessage('')
    setForm(DEFAULT_USER_FORM)
    setEditingUserId('')
    setEditorMode('create')
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
      cyclingStyle: user.cyclingStyle || 'commuter',
      isVerified: Boolean(user.isVerified),
    })
    setEditorMode('edit')
  }

  const handleCancelEditor = () => {
    setError('')
    setSuccessMessage('')
    resetEditor()
  }

  useEffect(() => {
    let isMounted = true

    const loadUsers = async () => {
      setIsLoading(true)
      setError('')

      try {
        const nextUsers = await loadUsersFromApi()

        if (!isMounted) return

        setUsers(nextUsers)
      } catch (requestError) {
        if (!isMounted) return

        setUsers([])
        setError(requestError.response?.data?.message || 'Unable to load users for admin management.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadUsers()

    return () => {
      isMounted = false
    }
  }, [])

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
      getCyclingStyleLabel(user.cyclingStyle),
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
        cyclingStyle: form.cyclingStyle,
        isVerified: Boolean(form.isVerified),
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
          updateUser({
            id: getUserId(refreshedCurrentUser),
            name: refreshedCurrentUser.name || '',
            email: refreshedCurrentUser.email || '',
            cyclingStyle: refreshedCurrentUser.cyclingStyle || 'commuter',
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
      value: TOTAL_ROUTES,
      tone: 'teal',
      Icon: IconRoute,
    },
    {
      label: 'Active Hazards',
      value: ACTIVE_HAZARDS,
      tone: 'red',
      Icon: IconAlert,
    },
    {
      label: 'Resolved Hazards',
      value: RESOLVED_HAZARDS,
      tone: 'green',
      Icon: IconCheckShield,
    },
    {
      label: 'Total Reviews',
      value: TOTAL_REVIEWS,
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

  return (
    <section className="admin-dashboard-page">
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
          <button type="button" className="admin-dashboard-logout" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>

      <div className="admin-overview-grid">
        {overviewCards.map(({ label, value, tone, Icon }) => (
          <article key={label} className="admin-overview-card">
            <div className={`admin-overview-icon admin-overview-icon-${tone}`}>
              <Icon />
            </div>
            <div className="admin-overview-value">{value}</div>
            <div className="admin-overview-label">{label}</div>
          </article>
        ))}
      </div>

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

        {error ? (
          <div className="admin-table-message admin-table-message-error">{error}</div>
        ) : null}

        {successMessage ? (
          <div className="admin-table-message admin-table-message-success">{successMessage}</div>
        ) : null}

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
                    <td>{getCyclingStyleLabel(user.cyclingStyle)}</td>
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
    </section>
  )
}
