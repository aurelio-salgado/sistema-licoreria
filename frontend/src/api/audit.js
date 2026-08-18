import { api } from './client'

function buildQuery(filters) {
  const query = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) })
  if (filters.user) query.set('user', filters.user)
  if (filters.module) query.set('module', filters.module)
  if (filters.action) query.set('action', filters.action)
  if (filters.entity) query.set('entity', filters.entity)
  if (filters.entityId) query.set('entity_id', filters.entityId)
  if (filters.result) query.set('result', filters.result)
  if (filters.dateFrom) query.set('date_from', filters.dateFrom)
  if (filters.dateTo) query.set('date_to', filters.dateTo)
  return query.toString()
}

export const auditApi = {
  list: (filters) => api.get(`/audit?${buildQuery(filters)}`),
  getById: (id) => api.get(`/audit/${id}`),
}
