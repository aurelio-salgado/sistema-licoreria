import { api } from './client'

function buildMovementQuery(filters) {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  })

  if (filters.product) query.set('product', filters.product)
  if (filters.type) query.set('type', filters.type)
  if (filters.nature) query.set('nature', filters.nature)
  if (filters.referenceType) query.set('reference_type', filters.referenceType)
  if (filters.dateFrom) query.set('date_from', filters.dateFrom)
  if (filters.dateTo) query.set('date_to', filters.dateTo)
  return query.toString()
}

export const inventoryApi = {
  list: (status = 'activo') => api.get(`/inventory?status=${encodeURIComponent(status)}`),
  lowStock: () => api.get('/inventory/low-stock'),
  movements: (filters) => api.get(`/inventory/movements?${buildMovementQuery(filters)}`),
  createAdjustment: (values) => api.post('/inventory/adjustments', values),
}
