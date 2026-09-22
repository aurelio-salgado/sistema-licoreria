const assert = require('node:assert/strict');
const test = require('node:test');
const validation = require('./backup.validation');
const fs = require('node:fs');
const path = require('node:path');

test('valida exclusivamente los filtros aprobados', () => {
  assert.deepEqual(validation.list({ tipo: 'manual', operacion: 'respaldo', estado: 'exitoso', fecha_desde: '2026-08-01', fecha_hasta: '2026-08-20' }), {
    page: 1, limit: 20, type: 'manual', operation: 'respaldo', status: 'exitoso', dateFrom: '2026-08-01', dateTo: '2026-08-20',
  });
  assert.throws(() => validation.list({ usuario: '1' }), /no es un filtro permitido/);
});

test('la ruta de restauracion exige el permiso dedicado', () => {
  const routes = fs.readFileSync(path.join(__dirname, 'backup.routes.js'), 'utf8');
  assert.match(routes, /router\.post\('\/:id\/restore',requirePermission\('respaldos\.restaurar'\),controller\.restore\)/);
});

test('exige confirmacion RESTAURAR exacta y body de creacion vacio', () => {
  assert.doesNotThrow(() => validation.restore({ confirmacion: 'RESTAURAR' }));
  assert.throws(() => validation.restore({ confirmacion: 'restaurar' }), /RESTAURAR/);
  assert.doesNotThrow(() => validation.create({}));
  assert.throws(() => validation.create({ ruta: '../externo.sql' }), /objeto vacio/);
});
