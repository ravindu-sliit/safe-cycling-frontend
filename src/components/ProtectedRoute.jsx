import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ children, requiredRole }) {
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    const nextParams = new URLSearchParams()

    if (new URLSearchParams(location.search).get('verified') === '1') {
      nextParams.set('verified', '1')
    }

    const loginPath = nextParams.toString() ? `/login?${nextParams}` : '/login'

    return <Navigate to={loginPath} replace state={{ from: location }} />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
