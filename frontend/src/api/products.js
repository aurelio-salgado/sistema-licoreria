import { api } from './client'

function buildQuery(filters) {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  })

  if (filters.search) query.set('search', filters.search)
  if (filters.status) query.set('status', filters.status)
  if (filters.categoryId) query.set('id_categoria', filters.categoryId)
  if (filters.brandId) query.set('id_marca', filters.brandId)
  return query.toString()
}

export const productsApi = {
  list: (filters) => api.get(`/products?${buildQuery(filters)}`),
  getById: (id) => api.get(`/products/${id}`),
  create: (values) => api.post('/products', values),
  update: (id, values) => api.put(`/products/${id}`, values),
  updateStatus: (id, status) =>
    api.patch(`/products/${id}/status`, { estado: status }),
}
