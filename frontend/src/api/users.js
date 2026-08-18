import { api } from './client'

function buildQuery(filters) {
  const query = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) })
  if (filters.search) query.set('search', filters.search)
  if (filters.status) query.set('status', filters.status)
  if (filters.role) query.set('role', filters.role)
  return query.toString()
}

export const usersApi = {
  list: (filters) => api.get(`/users?${buildQuery(filters)}`),
  getById: (id) => api.get(`/users/${id}`),
  create: (values) => api.post('/users', values),
  update: (id, values) => api.put(`/users/${id}`, values),
  updateStatus: (id, status) => api.patch(`/users/${id}/status`, { estado: status }),
  updateRole: (id, roleId) => api.put(`/users/${id}/role`, { id_rol: roleId }),
}
