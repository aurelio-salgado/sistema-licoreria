const SESSION_KEY = 'liquorix.session.v1'

function isStringArray(value) {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && item.trim())
  )
}

export function readStoredSession() {
  try {
    const value = JSON.parse(window.localStorage.getItem(SESSION_KEY))
    if (
      !value ||
      typeof value.token !== 'string' ||
      !value.token ||
      !value.user ||
      typeof value.user !== 'object' ||
      !isStringArray(value.roles) ||
      !isStringArray(value.permissions)
    ) {
      return null
    }
    return value
  } catch {
    return null
  }
}

export function writeStoredSession(session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearStoredSession() {
  window.localStorage.removeItem(SESSION_KEY)
  window.sessionStorage.removeItem(SESSION_KEY)
}

export const sessionStorageKey = SESSION_KEY
