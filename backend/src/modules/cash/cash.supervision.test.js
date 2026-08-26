const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repo = require('./cash.repository');
const service = require('./cash.service');
const { validateSupervisionQuery } = require('./cash.validation');

const originalRepo = { ...repo };

test('valida responsable, fechas, resultado y paginacion de supervision', () => {
  assert.deepEqual(
    validateSupervisionQuery({
      page: '2', limit: '10', user: '7', date_from: '2026-08-01',
      date_to: '2026-08-26', result: 'faltante',
    }),
    { page: 2, limit: 10, requestedUser: 7, dateFrom: '2026-08-01', dateTo: '2026-08-26', result: 'faltante' },
  );
  assert.throws(() => validateSupervisionQuery({ result: 'otro' }), /result/);
  assert.throws(() => validateSupervisionQuery({ status: 'cerrada' }), /no es permitido/);
  assert.throws(() => validateSupervisionQuery({ date_from: '2026-09-01', date_to: '2026-08-01' }), /posterior/);
});

for (const [result, predicate] of [
  ['faltante', 'c.diferencia<0'],
  ['sobrante', 'c.diferencia>0'],
  ['cuadrada', 'c.diferencia=0'],
]) {
  test(`repositorio limita la supervision a cerradas con resultado ${result}`, async () => {
    let received;
    const executor = { execute: async (sql, values) => { received = { sql, values }; return [[]]; } };
    await repo.listClosedForSupervision(executor, {
      page: 2, limit: 10, requestedUser: 7, dateFrom: '2026-08-01', dateTo: '2026-08-26', result,
    });
    assert.match(received.sql, /c\.estado='cerrada'/);
    assert.match(received.sql, new RegExp(predicate.replace(/[.=<>]/g, '\\$&')));
    assert.match(received.sql, /c\.id_usuario=\?/);
    assert.match(received.sql, /c\.fecha_cierre>=\?/);
    assert.deepEqual(received.values, [7, '2026-08-01 00:00:00', '2026-08-26 00:00:00', 10, 10]);
  });
}

test('lista global devuelve responsables, cajas y paginacion', async () => {
  Object.assign(repo, {
    listClosedForSupervision: async () => [{ id_caja: 22, id_usuario: 8, estado: 'cerrada', diferencia: '-3.00', usuario_nombre: 'Ana', usuario_apellido: 'Lopez', nombre_usuario: 'alopez' }],
    countClosedForSupervision: async () => 21,
    listSupervisionUsers: async () => [{ id_usuario: 8, nombre: 'Ana', apellido: 'Lopez', nombre_usuario: 'alopez' }],
  });
  const result = await service.listClosedCash({ page: '2', limit: '10', result: 'faltante' });
  assert.equal(result.cash[0].usuario.id_usuario, 8);
  assert.equal(result.cash[0].usuario_nombre, undefined);
  assert.equal(result.responsibles.length, 1);
  assert.deepEqual(result.pagination, { page: 2, limit: 10, total: 21, total_pages: 3 });
});

test('detalle administrativo permite consultar el cierre de otro usuario', async () => {
  Object.assign(repo, {
    findClosedByIdForSupervision: async (_executor, id) => ({ id_caja: id, id_usuario: 18, estado: 'cerrada', usuario_nombre: 'Luis', usuario_apellido: 'Diaz', nombre_usuario: 'ldiaz' }),
    listMovements: async () => [{ id_movimiento_caja: 90, id_caja: 22 }],
  });
  const result = await service.getClosedCash('22');
  assert.equal(result.usuario.id_usuario, 18);
  assert.equal(result.movements.length, 1);
});

test('detalle administrativo no expone una caja inexistente o abierta', async () => {
  repo.findClosedByIdForSupervision = async () => null;
  await assert.rejects(service.getClosedCash('22'), (error) => error.statusCode === 404);
});

test('rutas de supervision exigen el permiso nuevo y preservan las rutas propias', () => {
  const source = fs.readFileSync(path.join(__dirname, 'cash.routes.js'), 'utf8');
  assert.match(source, /'\/supervision'[\s\S]*requirePermission\('caja\.supervisar'\)/);
  assert.match(source, /'\/supervision\/:id'[\s\S]*requirePermission\('caja\.supervisar'\)/);
  assert.match(source, /router\.get\('\/', requirePermission\('caja\.movimientos'\), cashController\.listCash\)/);
  assert.match(source, /'\/:id'[\s\S]*requirePermission\('caja\.movimientos'\)/);
});

test('seed asigna caja.supervisar por el conjunto total del Administrador solamente', () => {
  const seed = fs.readFileSync(path.resolve(__dirname, '../../../../database/seed.sql'), 'utf8');
  assert.equal((seed.match(/caja\.supervisar/g) || []).length, 1);
  assert.match(seed, /Administrador[\s\S]*CROSS JOIN permisos/);
  const vendedor = seed.slice(seed.indexOf("WHERE r.nombre = 'Vendedor'"), seed.indexOf("WHERE r.nombre = 'Consulta'"));
  const consulta = seed.slice(seed.indexOf("WHERE r.nombre = 'Consulta'"));
  assert.doesNotMatch(vendedor, /caja\.supervisar/);
  assert.doesNotMatch(consulta, /caja\.supervisar/);
});

test.after(() => {
  Object.assign(repo, originalRepo);
});
