import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateDiscountAmount, calculateLineSubtotal, calculateMaxDiscount, exceedsMaxDiscount, generateDiscountOptions, resolveDiscountPercent, resolveSaleUnitPrice } from './salesDiscount.js'

test('resuelve el precio según el modelo de catálogo o línea sin acceder a null', () => {
  assert.equal(resolveSaleUnitPrice(null, undefined, ''), null)
  assert.equal(resolveSaleUnitPrice(null, { id_producto: 5, precio_venta: '100.00' }, '5'), '100.00')
  assert.equal(resolveSaleUnitPrice({ producto: { id_producto: 5 }, precio_unitario: '90.00' }, { id_producto: 5, precio_venta: '100.00' }, '5'), '90.00')
  assert.equal(resolveSaleUnitPrice({ producto: { id_producto: 5 }, precio_unitario: '90.00' }, { id_producto: 8, precio_venta: '120.00' }, '8'), '120.00')
  assert.equal(resolveSaleUnitPrice({ producto: { id_producto: 5 }, precio_unitario: '90.00' }, undefined, '5'), '90.00')
})

test('calcula el máximo para cantidades enteras y decimales sin floats', () => {
  assert.equal(calculateMaxDiscount('100.00', '1', '10.00'), '10.00')
  assert.equal(calculateMaxDiscount('100.00', '2', '10.00'), '20.00')
  assert.equal(calculateMaxDiscount('100.00', '0.5', '10.00'), '5.00')
})

test('acepta el máximo exacto y detecta un exceso de un centavo', () => {
  assert.equal(exceedsMaxDiscount('20.00', '20.00'), false)
  assert.equal(exceedsMaxDiscount('20.01', '20.00'), true)
})

test('datos incompletos no calculan ni producen un exceso falso', () => {
  assert.equal(calculateMaxDiscount(null, '2', '10.00'), null)
  assert.equal(calculateMaxDiscount('100.00', '', '10.00'), null)
  assert.equal(calculateMaxDiscount('100.00', '2', undefined), null)
  assert.equal(exceedsMaxDiscount('20.01', null), false)
})

test('genera incrementos de cinco e incluye siempre el máximo exacto', () => {
  assert.deepEqual(generateDiscountOptions('10.00'), ['0.00', '5.00', '10.00'])
  assert.deepEqual(generateDiscountOptions('7.50'), ['0.00', '5.00', '7.50'])
  assert.deepEqual(generateDiscountOptions('3.00'), ['0.00', '3.00'])
  assert.deepEqual(generateDiscountOptions('12.00'), ['0.00', '5.00', '10.00', '12.00'])
})

test('edición selecciona una opción exacta o conserva un importe especial', () => {
  const options = generateDiscountOptions('10.00')
  assert.equal(resolveDiscountPercent('0.00', '100.00', '2', options), '0.00')
  assert.equal(resolveDiscountPercent('10.00', '100.00', '2', options), '5.00')
  assert.equal(resolveDiscountPercent('20.00', '100.00', '2', options), '10.00')
  assert.equal(resolveDiscountPercent('7.00', '100.00', '2', options), 'current')
})

test('subtotal y máximo se recalculan al cambiar cantidad', () => {
  assert.equal(calculateLineSubtotal('100.00', '1'), '100.00')
  assert.equal(calculateLineSubtotal('100.00', '2'), '200.00')
  assert.equal(calculateMaxDiscount('100.00', '1', '10.00'), '10.00')
  assert.equal(calculateMaxDiscount('100.00', '2', '10.00'), '20.00')
  assert.equal(calculateDiscountAmount('100.00', '2', '5.00'), '10.00')
})
