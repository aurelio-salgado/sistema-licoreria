import { api } from './client'

function buildQuery(filters) {
  const query = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) })
  if (filters.status) query.set('status', filters.status)
  if (filters.dateFrom) query.set('date_from', filters.dateFrom)
  if (filters.dateTo) query.set('date_to', filters.dateTo)
  return query.toString()
}

export const cashApi = {
  current: () => api.get('/cash/current'),
  list: (filters) => api.get(`/cash?${buildQuery(filters)}`),
  getById: (id) => api.get(`/cash/${id}`),
  open: (values) => api.post('/cash/open', values),
  createMovement: (id, values) => api.post(`/cash/${id}/movements`, values),
  close: (id, values) => api.post(`/cash/${id}/close`, values),
}
