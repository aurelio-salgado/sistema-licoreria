import { api } from './client'

function buildQuery(filters) {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  })

  if (filters.search) query.set('search', filters.search)
  if (filters.status) query.set('status', filters.status)
  return query.toString()
}

export const catalogsApi = {
  list: (endpoint, filters) => api.get(`${endpoint}?${buildQuery(filters)}`),
  create: (endpoint, values) => api.post(endpoint, values),
  update: (endpoint, id, values) => api.put(`${endpoint}/${id}`, values),
  updateStatus: (endpoint, id, status) =>
    api.patch(`${endpoint}/${id}/status`, { estado: status }),
}
