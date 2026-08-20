const assert = require('node:assert/strict');
const test = require('node:test');
const validation = require('./backup.validation');

test('valida exclusivamente los filtros aprobados', () => {
  assert.deepEqual(validation.list({ tipo: 'manual', operacion: 'respaldo', estado: 'exitoso', fecha_desde: '2026-08-01', fecha_hasta: '2026-08-20' }), {
    page: 1, limit: 20, type: 'manual', operation: 'respaldo', status: 'exitoso', dateFrom: '2026-08-01', dateTo: '2026-08-20',
  });
  assert.throws(() => validation.list({ usuario: '1' }), /no es un filtro permitido/);
});

test('exige confirmacion RESTAURAR exacta y body de creacion vacio', () => {
  assert.doesNotThrow(() => validation.restore({ confirmacion: 'RESTAURAR' }));
  assert.throws(() => validation.restore({ confirmacion: 'restaurar' }), /RESTAURAR/);
  assert.doesNotThrow(() => validation.create({}));
  assert.throws(() => validation.create({ ruta: '../externo.sql' }), /objeto vacio/);
});
