const assert = require('node:assert/strict');
const test = require('node:test');

const pool = require('../config/database');
const requirePermission = require('./requirePermission');

const originalExecute = pool.execute;

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function run(rows, clientData = {}) {
  const req = {
    user: { id_usuario: 9, roles: clientData.jwtRoles ?? [] },
    body: clientData.body ?? {},
    headers: clientData.headers ?? {},
    params: clientData.params ?? {},
  };
  const res = response();
  let nextCalls = 0;
  pool.execute = async (sql, values) => {
    assert.match(sql, /u\.estado = \?/);
    assert.match(sql, /r\.estado = \?/);
    assert.deepEqual(values, [9, 'activo', 'activo']);
    return [rows];
  };
  await requirePermission('ventas.anular')(req, res, () => {
    nextCalls += 1;
  });
  return { nextCalls, res };
}

test('requirePermission permite un permiso efectivo presente', async () => {
  const result = await run([{ codigo: 'ventas.anular' }]);
  assert.equal(result.nextCalls, 1);
  assert.equal(result.res.statusCode, null);
});

test('requirePermission rechaza permiso ausente o inexistente', async () => {
  const result = await run([{ codigo: 'ventas.ver' }]);
  assert.equal(result.nextCalls, 0);
  assert.equal(result.res.statusCode, 403);
  assert.equal(result.res.body.message, 'Acceso denegado');
});

test('requirePermission rechaza usuario inactivo según consulta efectiva', async () => {
  const result = await run([]);
  assert.equal(result.res.statusCode, 403);
});

test('requirePermission rechaza rol inactivo según consulta efectiva', async () => {
  const result = await run([]);
  assert.equal(result.res.statusCode, 403);
});

test('requirePermission ignora permisos y roles controlados por cliente', async () => {
  const result = await run([], {
    jwtRoles: ['Administrador'],
    body: { permisos: ['ventas.anular'] },
    headers: { 'x-permissions': 'ventas.anular' },
    params: { permiso: 'ventas.anular' },
  });
  assert.equal(result.res.statusCode, 403);
  assert.equal(result.nextCalls, 0);
});

test('requirePermission refleja cambios de permisos sin depender del JWT', async () => {
  const middleware = requirePermission('ventas.anular');
  const req = { user: { id_usuario: 9, roles: ['Administrador'] } };
  let granted = true;
  pool.execute = async () => [granted ? [{ codigo: 'ventas.anular' }] : []];

  const firstResponse = response();
  let nextCalls = 0;
  await middleware(req, firstResponse, () => nextCalls++);
  assert.equal(nextCalls, 1);

  granted = false;
  const secondResponse = response();
  await middleware(req, secondResponse, () => nextCalls++);
  assert.equal(nextCalls, 1);
  assert.equal(secondResponse.statusCode, 403);
});

test('requirePermission rechaza identidad ausente con 401', async () => {
  const res = response();
  let nextCalls = 0;
  await requirePermission('ventas.anular')({}, res, () => nextCalls++);
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalls, 0);
});

test.after(() => {
  pool.execute = originalExecute;
});
