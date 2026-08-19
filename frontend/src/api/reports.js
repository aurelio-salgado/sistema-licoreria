import { api, apiDownload } from './client'
const query = (filters) => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null)).toString()
export const reportsApi = { get: (type, filters) => api.get(`/reports/${type}?${query(filters)}`), export: (type, filters) => apiDownload(`/reports/${type}/export?${query(filters)}`) }
