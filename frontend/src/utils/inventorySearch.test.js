import assert from 'node:assert/strict'
import test from 'node:test'
import { filterInventoryByProductName } from './inventorySearch.js'

const inventory = [
  { id_producto: 1, nombre: 'Flor de Caña 18 Años' },
  { id_producto: 2, nombre: 'Don Julio Blanco' },
  { id_producto: 3, nombre: 'Vino Reserva' },
]

test('filtra inventario por coincidencia parcial sin distinguir mayúsculas', () => {
  assert.deepEqual(filterInventoryByProductName(inventory, ' flor '), [inventory[0]])
  assert.deepEqual(filterInventoryByProductName(inventory, 'CAÑA'), [inventory[0]])
  assert.deepEqual(filterInventoryByProductName(inventory, 'don'), [inventory[1]])
})

test('maneja ausencia de coincidencias y restaura todos al limpiar', () => {
  assert.deepEqual(filterInventoryByProductName(inventory, 'whisky'), [])
  assert.equal(filterInventoryByProductName(inventory, '   '), inventory)
})

test('filtra solo sobre el conjunto de productos permitido por el formulario', () => {
  const allowedProducts = inventory.slice(1)

  assert.deepEqual(filterInventoryByProductName(allowedProducts, 'flor'), [])
  assert.equal(filterInventoryByProductName(allowedProducts, 'don')[0], inventory[1])
})
