const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repo = require('./sale.repository');
const service = require('./sale.service');

const originalRepo = { ...repo };

function sale(id, sellerId) {
  return {
    id_venta: id,
    estado: 'completada',
    usuario: { id_usuario: sellerId, nombre: 'Usuario' },
  };
}

function stubList(rows = []) {
  const received = [];
  repo.list = async (_executor, filters) => {
    received.push({ operation: 'list', filters: { ...filters } });
    return rows;
  };
  repo.count = async (_executor, filters) => {
    received.push({ operation: 'count', filters: { ...filters } });
    return rows.length;
  };
  return received;
}

test('vendedor lista unicamente ventas propias', async () => {
  const received = stubList([sale(1, 20)]);
  const result = await service.listSales({}, { userId: 20, canSupervise: false });
  assert.equal(result.sales.length, 1);
  assert.equal(received[0].filters.sellerId, 20);
  assert.equal(received[1].filters.sellerId, 20);
});

test('vendedor no puede forzar el identificador de otro vendedor', async () => {
  let queried = false;
  repo.list = async () => { queried = true; return []; };
  repo.count = repo.list;
  await assert.rejects(
    service.listSales({ seller: '21' }, { userId: 20, canSupervise: false }),
    (error) => error.statusCode === 403,
  );
  assert.equal(queried, false);
});

test('vendedor no consulta detalle de venta ajena', async () => {
  repo.findById = async () => sale(4, 21);
  repo.listItems = async () => [];
  repo.listPayments = async () => [];
  await assert.rejects(
    service.getSale('4', { userId: 20, canSupervise: false }),
    (error) => error.statusCode === 404,
  );
});

test('permiso global lista todas las ventas y admite filtro por vendedor', async () => {
  const received = stubList([sale(1, 20), sale(2, 21)]);
  const all = await service.listSales({}, { userId: 1, canSupervise: true });
  assert.equal(all.sales.length, 2);
  assert.equal(received[0].filters.sellerId, null);
  await service.listSales({ seller: '21' }, { userId: 1, canSupervise: true });
  assert.equal(received[2].filters.sellerId, 21);
});

test('permiso global consulta detalle de cualquier vendedor', async () => {
  repo.findById = async () => sale(5, 21);
  repo.listItems = async () => [];
  repo.listPayments = async () => [];
  const result = await service.getSale('5', { userId: 1, canSupervise: true });
  assert.equal(result.usuario.id_usuario, 21);
});

test('lectura conserva ventas.ver y el alcance no depende del nombre del rol', () => {
  const routes = fs.readFileSync(path.join(__dirname, 'sale.routes.js'), 'utf8');
  const controller = fs.readFileSync(path.join(__dirname, 'sale.controller.js'), 'utf8');
  assert.match(routes, /router\.get\('\/', requirePermission\('ventas\.ver'\), controller\.listSales\)/);
  assert.match(routes, /router\.get\('\/:id', requirePermission\('ventas\.ver'\), controller\.getSale\)/);
  assert.match(controller, /permisos\.includes\('ventas\.supervisar'\)/);
  assert.doesNotMatch(controller, /Administrador|Vendedor|Consulta/);
});

test('seed deja Vendedor restringido y otorga supervision a Consulta', () => {
  const seed = fs.readFileSync(path.resolve(__dirname, '../../../../database/seed.sql'), 'utf8');
  const sellerBlock = seed.slice(seed.indexOf('-- Permisos operativos'), seed.indexOf('-- Permisos de solo consulta'));
  const readerBlock = seed.slice(seed.indexOf('-- Permisos de solo consulta'), seed.indexOf('-- Métodos de pago'));
  assert.doesNotMatch(sellerBlock, /ventas\.supervisar/);
  assert.match(readerBlock, /ventas\.supervisar/);
});

test.after(() => Object.assign(repo, originalRepo));
