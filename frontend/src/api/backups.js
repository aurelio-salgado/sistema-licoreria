import { api, apiDownload } from './client'

function query(filters) {
  const params = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) })
  if (filters.type) params.set('tipo', filters.type)
  if (filters.operation) params.set('operacion', filters.operation)
  if (filters.status) params.set('estado', filters.status)
  if (filters.dateFrom) params.set('fecha_desde', filters.dateFrom)
  if (filters.dateTo) params.set('fecha_hasta', filters.dateTo)
  return params.toString()
}

export const backupsApi = {
  list: (filters) => api.get(`/backups?${query(filters)}`),
  create: () => api.post('/backups', {}),
  download: (id) => apiDownload(`/backups/${id}/download`),
  restore: (id, confirmation) => api.post(`/backups/${id}/restore`, { confirmacion: confirmation }),
}
