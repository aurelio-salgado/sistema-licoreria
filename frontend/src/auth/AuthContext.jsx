import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError, setAccessToken, subscribeToUnauthorized } from '../api/client'
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from '../utils/sessionStorage'
import { AuthContext } from './authContextValue'

function normalizeSession(payload) {
  const user = payload?.data?.user
  const token = payload?.data?.token

  if (!token || !user) {
    throw new Error('La respuesta de inicio de sesión no es válida.')
  }

  return {
    token,
    user,
    roles: Array.isArray(user.roles) ? user.roles : [],
    permissions: Array.isArray(user.permisos) ? user.permisos : [],
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [session, setSession] = useState(() => readStoredSession())
  const [isInitializing, setIsInitializing] = useState(true)
  const [restoreError, setRestoreError] = useState('')

  const clearSession = useCallback(() => {
    clearStoredSession()
    setAccessToken(null)
    setSession(null)
    setRestoreError('')
    setIsInitializing(false)
  }, [])

  const terminateSession = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true, state: { loggedOut: true } })
  }, [clearSession, navigate])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', undefined, { handleUnauthorized: false })
      terminateSession()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        terminateSession()
        return
      }
      throw error
    }
  }, [terminateSession])

  const restoreSession = useCallback(async () => {
    const storedSession = readStoredSession()

    if (!storedSession) {
      clearSession()
      setIsInitializing(false)
      return
    }

    setIsInitializing(true)
    setRestoreError('')
    setAccessToken(storedSession.token)

    try {
      const response = await api.get('/auth/me')
      const currentUser = response?.data?.user

      if (!currentUser) {
        throw new Error('No se pudo validar la sesión actual.')
      }

      const refreshedSession = {
        ...storedSession,
        user: { ...storedSession.user, ...currentUser },
        roles: Array.isArray(currentUser.roles) ? currentUser.roles : [],
        permissions: Array.isArray(currentUser.permisos)
          ? currentUser.permisos
          : storedSession.permissions,
      }

      writeStoredSession(refreshedSession)
      setSession(refreshedSession)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        terminateSession()
      } else {
        setSession(null)
        setRestoreError(
          error.message || 'No fue posible validar la sesión con el servidor.',
        )
      }
    } finally {
      setIsInitializing(false)
    }
  }, [clearSession, terminateSession])

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  useEffect(() => subscribeToUnauthorized(terminateSession), [terminateSession])

  useEffect(() => {
    const synchronizeSession = () => {
      const storedSession = readStoredSession()
      setAccessToken(storedSession?.token)
      setSession(storedSession)
    }

    window.addEventListener('storage', synchronizeSession)
    return () => window.removeEventListener('storage', synchronizeSession)
  }, [])

  const login = useCallback(async (credentials) => {
    const response = await api.post('/auth/login', credentials, {
      auth: false,
      handleUnauthorized: false,
    })
    const nextSession = normalizeSession(response)

    writeStoredSession(nextSession)
    setAccessToken(nextSession.token)
    setSession(nextSession)
    setRestoreError('')

    return nextSession
  }, [])

  const hasPermission = useCallback(
    (permission) => !permission || session?.permissions.includes(permission),
    [session],
  )

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      roles: session?.roles ?? [],
      permissions: session?.permissions ?? [],
      isAuthenticated: Boolean(session?.token),
      isInitializing,
      restoreError,
      login,
      logout,
      restoreSession,
      hasPermission,
    }),
    [
      session,
      isInitializing,
      restoreError,
      login,
      logout,
      restoreSession,
      hasPermission,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
