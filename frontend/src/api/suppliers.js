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

export const suppliersApi = {
  list: (filters) => api.get(`/suppliers?${buildQuery(filters)}`),
  create: (values) => api.post('/suppliers', values),
  update: (id, values) => api.put(`/suppliers/${id}`, values),
  updateStatus: (id, status) =>
    api.patch(`/suppliers/${id}/status`, { estado: status }),
}
