const configuredUrl = import.meta.env.VITE_API_URL?.trim()

export const API_URL = (configuredUrl || 'http://localhost:3000/api/v1').replace(
  /\/$/,
  '',
)

const UNAUTHORIZED_EVENT = 'liquorix:unauthorized'
let accessToken = null

export class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export function setAccessToken(token) {
  accessToken = typeof token === 'string' && token ? token : null
}

export function subscribeToUnauthorized(callback) {
  window.addEventListener(UNAUTHORIZED_EVENT, callback)
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, callback)
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function apiRequest(
  path,
  { auth = true, handleUnauthorized = true, headers, body, ...options } = {},
) {
  const requestHeaders = new Headers(headers)
  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  if (auth && accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.',
    )
  }

  const data = await parseResponse(response)
  if (!response.ok || data?.success === false) {
    if (response.status === 401 && handleUnauthorized) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    throw new ApiError(data?.message || 'No fue posible completar la solicitud.', {
      status: response.status,
      data,
    })
  }
  return data
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) =>
    apiRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options) =>
    apiRequest(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) =>
    apiRequest(path, { ...options, method: 'PATCH', body }),
}
