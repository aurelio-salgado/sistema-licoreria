import assert from 'node:assert/strict'
import test from 'node:test'
import { createProductSearchFilters } from './productSearch.js'

test('construye lista inicial y búsquedas remotas de productos activos', () => {
  for (const search of ['', 'Ron', 'RON-007', '7430001234567']) {
    assert.deepEqual(createProductSearchFilters(` ${search} `), { page: 1, limit: 20, search, status: 'activo', categoryId: '', brandId: '' })
  }
})
