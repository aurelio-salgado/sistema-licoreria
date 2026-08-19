import { api } from './client'
const query = (filters) => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null)).toString()
export const dashboardApi = { overview: () => api.get('/dashboard'), charts: (filters) => api.get(`/dashboard/charts?${query(filters)}`) }
