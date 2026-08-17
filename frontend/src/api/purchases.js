import { api } from './client'

function buildQuery(filters) {
  const query = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) })
  if (filters.status) query.set('status', filters.status)
  if (filters.supplier) query.set('supplier', filters.supplier)
  if (filters.dateFrom) query.set('date_from', filters.dateFrom)
  if (filters.dateTo) query.set('date_to', filters.dateTo)
  return query.toString()
}

export const purchasesApi = {
  list: (filters) => api.get(`/purchases?${buildQuery(filters)}`),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (values) => api.post('/purchases', values),
  update: (id, values) => api.put(`/purchases/${id}`, values),
  addItem: (id, values) => api.post(`/purchases/${id}/items`, values),
  updateItem: (id, itemId, values) => api.put(`/purchases/${id}/items/${itemId}`, values),
  removeItem: (id, itemId) => api.delete(`/purchases/${id}/items/${itemId}`),
  confirm: (id) => api.post(`/purchases/${id}/confirm`),
  cancel: (id, reason) => api.post(`/purchases/${id}/cancel`, { motivo: reason }),
}
