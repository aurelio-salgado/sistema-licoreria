import { API_URL, api } from './client'

function query(filters) {
  const params = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) })
  if (filters.search) params.set('search', filters.search)
  if (filters.categoryId) params.set('id_categoria', filters.categoryId)
  if (filters.brandId) params.set('id_marca', filters.brandId)
  return params.toString()
}

export function publicImageUrl(path) {
  if (!path) return null
  const apiOrigin = new URL(API_URL, window.location.origin).origin
  return new URL(path, apiOrigin).toString()
}

export const publicCatalogApi = {
  list: (filters) => api.get(`/public/catalog?${query(filters)}`, { auth: false, handleUnauthorized: false }),
}
