export function createProductSearchFilters(search) {
  return { page: 1, limit: 20, search: String(search).trim(), status: 'activo', categoryId: '', brandId: '' }
}
