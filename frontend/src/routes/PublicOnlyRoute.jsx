import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { LoadingState } from '../components/FeedbackStates'

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth()

  if (isInitializing) {
    return <LoadingState message="Preparando Liquorix…" fullPage />
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}
