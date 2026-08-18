import { api } from './client'

export const rolesApi = {
  list: () => api.get('/roles'),
  getById: (id) => api.get(`/roles/${id}`),
  listPermissions: () => api.get('/permissions'),
  updatePermissions: (id, permissionIds) => api.put(`/roles/${id}/permissions`, { permission_ids: permissionIds }),
}
