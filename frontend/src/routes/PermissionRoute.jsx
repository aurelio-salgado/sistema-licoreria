import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function PermissionRoute({ permission, children }) {
  const { hasPermission } = useAuth()

  return hasPermission(permission) ? children : <Navigate to="/forbidden" replace />
}
