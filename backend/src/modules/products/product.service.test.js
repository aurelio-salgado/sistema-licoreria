const assert = require('node:assert/strict');
const { after, test } = require('node:test');

const pool = require('../../config/database');
const repository = require('./product.repository');
const service = require('./product.service');

const originalGetConnection = pool.getConnection;
const originalRepository = { ...repository };

after(() => {
  pool.getConnection = originalGetConnection;
  Object.assign(repository, originalRepository);
});

function productInput(overrides = {}) {
  return {
    codigo: 'PROD-001',
    codigo_barras: null,
    nombre: 'Producto de prueba',
    descripcion: null,
    id_categoria: 1,
    id_marca: 2,
    id_unidad: 3,
    costo_promedio: 4,
    precio_venta: 10,
    existencia_minima: 1,
    porcentaje_impuesto: 0,
    ...overrides,
  };
}

function scenario(options = {}) {
  const calls = { audits: [], creates: [], updates: [], order: [] };
  const transaction = { begin: 0, commit: 0, rollback: 0, release: 0 };
  const connection = {
    beginTransaction: async () => transaction.begin++,
    commit: async () => transaction.commit++,
    rollback: async () => transaction.rollback++,
    release: () => transaction.release++,
  };
  const current = {
    id_producto: 5,
    codigo: 'PROD-001',
    costo_promedio: options.averageCost ?? '4.00',
    existencia: options.stock ?? '0.000',
    estado: 'activo',
  };

  pool.getConnection = async () => connection;
  Object.assign(repository, {
    findCategory: async () => ({ id_categoria: 1, estado: 'activo' }),
    findBrand: async () => ({ id_marca: 2, estado: 'activo' }),
    findUnit: async () => ({ id_unidad: 3, estado: 'activo' }),
    findByCode: async () => null,
    findByBarcode: async () => null,
    findByIdForUpdate: async () => {
      calls.order.push('lock');
      return current;
    },
    findById: async () => {
      const written = calls.updates.at(-1)?.data ?? calls.creates.at(-1);
      return {
        ...current,
        id_producto: 5,
        costo_promedio: written?.averageCost ?? current.costo_promedio,
      };
    },
    create: async (_connection, data) => {
      calls.creates.push(data);
      calls.order.push('create');
      return 5;
    },
    update: async (_connection, productId, data) => {
      calls.order.push('update');
      calls.updates.push({ productId, data: { ...data } });
      if (options.failAt === 'update') throw new Error('Fallo de actualización');
    },
    createAudit: async (_connection, data) => {
      calls.order.push('audit');
      calls.audits.push(data);
      if (options.failAt === 'audit') throw new Error('Fallo de bitácora');
    },
  });
  return { calls, current, transaction };
}

const actor = { userId: 9, ipAddress: '127.0.0.1' };

test('creación acepta un costo promedio válido', async () => {
  const context = scenario();
  const result = await service.createProduct(productInput(), actor);
  assert.equal(context.calls.creates[0].averageCost, '4.00');
  assert.equal(result.costo_promedio, '4.00');
  assert.equal(context.transaction.commit, 1);
});

test('creación sin costo promedio utiliza 0.00', async () => {
  const context = scenario();
  const input = productInput();
  delete input.costo_promedio;
  await service.createProduct(input, actor);
  assert.equal(context.calls.creates[0].averageCost, '0.00');
});

test('rechaza costo promedio negativo con 400', async () => {
  scenario();
  await assert.rejects(
    service.createProduct(productInput({ costo_promedio: -1 }), actor),
    (error) => error.statusCode === 400,
  );
});

test('rechaza costo promedio con más de dos decimales', async () => {
  scenario();
  await assert.rejects(
    service.createProduct(productInput({ costo_promedio: 1.234 }), actor),
    (error) => error.statusCode === 400,
  );
});

test('permite editar costo promedio cuando la existencia es cero', async () => {
  const context = scenario({ stock: '0.000' });
  const result = await service.updateProduct(
    5,
    productInput({ costo_promedio: 6.25 }),
    actor,
  );
  assert.equal(context.calls.updates[0].data.averageCost, '6.25');
  assert.equal(result.costo_promedio, '6.25');
});

test('con existencia positiva permite enviar el mismo costo', async () => {
  const context = scenario({ stock: '3.000', averageCost: '4.00' });
  await service.updateProduct(5, productInput({ costo_promedio: 4 }), actor);
  assert.equal(context.calls.updates[0].data.averageCost, '4.00');
  assert.equal(context.transaction.commit, 1);
});

test('con existencia positiva rechaza cambiar el costo con 409', async () => {
  const context = scenario({ stock: '3.000', averageCost: '4.00' });
  await assert.rejects(
    service.updateProduct(5, productInput({ costo_promedio: 4.01 }), actor),
    (error) => error.statusCode === 409,
  );
  assert.equal(context.calls.updates.length, 0);
  assert.equal(context.calls.audits.length, 0);
  assert.equal(context.transaction.rollback, 1);
});

test('PUT sin costo promedio conserva exactamente el valor vigente', async () => {
  const context = scenario({ stock: '8.000', averageCost: '7.35' });
  const input = productInput();
  delete input.costo_promedio;
  await service.updateProduct(5, input, actor);
  assert.equal(context.calls.updates[0].data.averageCost, '7.35');
});

test('hace rollback si falla la actualización', async () => {
  const context = scenario({ failAt: 'update' });
  await assert.rejects(service.updateProduct(5, productInput(), actor));
  assert.equal(context.transaction.commit, 0);
  assert.equal(context.transaction.rollback, 1);
  assert.equal(context.transaction.release, 1);
  assert.equal(context.calls.audits.length, 0);
});

test('bloquea antes de actualizar y registra la bitácora normal', async () => {
  const context = scenario({ stock: '0.000', averageCost: '4.00' });
  await service.updateProduct(
    5,
    productInput({ costo_promedio: 5 }),
    actor,
  );
  assert.deepEqual(context.calls.order.slice(0, 2), ['lock', 'update']);
  assert.equal(context.calls.order.at(-1), 'audit');
  assert.equal(context.calls.audits.length, 1);
  assert.equal(context.calls.audits[0].action, 'actualizar');
  assert.equal(context.calls.audits[0].previousData.costo_promedio, '4.00');
  assert.equal(context.calls.audits[0].newData.costo_promedio, '5.00');
});
