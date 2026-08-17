import { api } from './client'

function buildQuery(filters) {
  const query = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) })
  if (filters.status) query.set('status', filters.status)
  if (filters.client) query.set('client', filters.client)
  if (filters.seller) query.set('seller', filters.seller)
  if (filters.dateFrom) query.set('date_from', filters.dateFrom)
  if (filters.dateTo) query.set('date_to', filters.dateTo)
  return query.toString()
}

export const salesApi = {
  list: (filters) => api.get(`/sales?${buildQuery(filters)}`),
  getById: (id) => api.get(`/sales/${id}`),
  getPaymentMethods: () => api.get('/sales/payment-methods'),
  create: (values) => api.post('/sales', values),
  update: (id, values) => api.put(`/sales/${id}`, values),
  addItem: (id, values) => api.post(`/sales/${id}/items`, values),
  updateItem: (id, itemId, values) => api.put(`/sales/${id}/items/${itemId}`, values),
  removeItem: (id, itemId) => api.delete(`/sales/${id}/items/${itemId}`),
  confirm: (id, payments) => api.post(`/sales/${id}/confirm`, { pagos: payments }),
  cancel: (id, reason) => api.post(`/sales/${id}/cancel`, { motivo: reason }),
}
