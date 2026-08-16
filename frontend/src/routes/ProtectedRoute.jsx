import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ErrorState, LoadingState } from '../components/FeedbackStates'

export function ProtectedRoute() {
  const location = useLocation()
  const {
    isAuthenticated,
    isInitializing,
    restoreError,
    restoreSession,
  } = useAuth()

  if (isInitializing) {
    return <LoadingState message="Validando tu sesión…" fullPage />
  }

  if (restoreError) {
    return (
      <ErrorState
        title="No pudimos validar tu sesión"
        message={restoreError}
        actionLabel="Reintentar"
        onAction={restoreSession}
        fullPage
      />
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
