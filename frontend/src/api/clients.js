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

export const clientsApi = {
  list: (filters) => api.get(`/clients?${buildQuery(filters)}`),
  create: (values) => api.post('/clients', values),
  update: (id, values) => api.put(`/clients/${id}`, values),
  updateStatus: (id, status) =>
    api.patch(`/clients/${id}/status`, { estado: status }),
}
