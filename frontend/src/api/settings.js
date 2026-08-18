import { api } from './client'

export const settingsApi = {
  list: () => api.get('/settings'),
  update: (key, value) => api.put(`/settings/${encodeURIComponent(key)}`, { valor: value }),
}
