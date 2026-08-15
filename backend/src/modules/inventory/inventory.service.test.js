const assert = require('node:assert/strict');
const test = require('node:test');

const pool = require('../../config/database');
const repo = require('./inventory.repository');
const service = require('./inventory.service');

const originalGetConnection = pool.getConnection;
const originalRepo = { ...repo };

function scenario(options = {}) {
  const calls = { adjustments: [], audits: [], movements: [], stocks: [] };
  const transaction = { begin: 0, commit: 0, rollback: 0, release: 0 };
  const connection = {
    beginTransaction: async () => transaction.begin++,
    commit: async () => transaction.commit++,
    rollback: async () => transaction.rollback++,
    release: () => transaction.release++,
  };
  const product = Object.hasOwn(options, 'product')
    ? options.product
    : {
        id_producto: 5,
        estado: 'activo',
        existencia: options.stock ?? '7.000',
        costo_promedio: '4.00',
        permite_decimales: options.decimals ?? true,
      };
  pool.getConnection = async () => connection;
  Object.assign(repo, {
    lockProduct: async () => product,
    createAdjustment: async (_c, data) => {
      calls.adjustments.push(data);
      return 31;
    },
    updateStock: async (_c, productId, stock) => {
      calls.stocks.push({ productId, stock });
    },
    createMovement: async (_c, data) => {
      calls.movements.push(data);
      if (options.failAt === 'movement') throw new Error('Fallo movimiento');
    },
    audit: async (_c, data) => {
      calls.audits.push(data);
      if (options.failAt === 'audit') throw new Error('Fallo bitácora');
    },
    listStock: async (_executor, status, low) => [
      { id_producto: 5, estado: status, bajo: Boolean(low) },
    ],
    listMovements: async () => [{ id_movimiento_inventario: 8 }],
    countMovements: async () => 1,
  });
  return { calls, product, transaction };
}

function adjust(nature, quantity, options = {}) {
  return service.adjust(
    {
      id_producto: 5,
      naturaleza: nature,
      cantidad: quantity,
      motivo: 'Conteo',
    },
    { userId: 9, ipAddress: '127.0.0.1', ...options },
  );
}

test('consultas de existencias, inventario bajo e historial', async () => {
  scenario();
  const stock = await service.listStock({ status: 'activo' });
  const low = await service.lowStock();
  const history = await service.movements({ page: '1', limit: '20' });
  assert.equal(stock.inventory.length, 1);
  assert.equal(low.products[0].bajo, true);
  assert.equal(history.movements.length, 1);
  assert.equal(history.pagination.total, 1);
});

test('ajuste de entrada actualiza 7.000 a 9.000 y conserva costo', async () => {
  const context = scenario();
  const result = await adjust('entrada', 2);
  assert.equal(result.existencia_anterior, '7.000');
  assert.equal(result.existencia_posterior, '9.000');
  assert.deepEqual(context.calls.stocks, [{ productId: 5, stock: '9.000' }]);
  assert.equal(context.product.costo_promedio, '4.00');
  assert.equal(context.transaction.commit, 1);
  assert.equal(context.transaction.release, 1);
});

test('ajuste de salida actualiza 9.000 a 8.000', async () => {
  const context = scenario({ stock: '9.000' });
  const result = await adjust('salida', 1);
  assert.equal(result.existencia_posterior, '8.000');
  assert.equal(context.calls.stocks[0].stock, '8.000');
});

test('movimiento y ajuste quedan enlazados por id_ajuste', async () => {
  const context = scenario();
  await adjust('entrada', 2);
  assert.equal(context.calls.movements[0].adjustmentId, 31);
  assert.equal(context.calls.movements[0].nature, 'entrada');
  assert.equal(context.calls.audits[0].adjustmentId, 31);
});

test('repositorio persiste tipo y referencia ajuste con id_ajuste', async () => {
  let sql;
  let values;
  await originalRepo.createMovement(
    {
      execute: async (statement, parameters) => {
        sql = statement;
        values = parameters;
        return [{}];
      },
    },
    {
      productId: 5,
      nature: 'entrada',
      quantity: '2.000',
      previous: '7.000',
      next: '9.000',
      adjustmentId: 31,
      reason: 'Conteo',
      userId: 9,
    },
  );
  assert.match(sql, /'ajuste'/);
  assert.equal(values[5], 31);
});

test('rechaza fracción para unidad no decimal', async () => {
  const context = scenario({ decimals: false });
  await assert.rejects(
    adjust('entrada', 1.5),
    (error) => error.statusCode === 400,
  );
  assert.equal(context.transaction.rollback, 1);
  assert.equal(context.calls.stocks.length, 0);
});

test('rechaza producto inexistente', async () => {
  const context = scenario({ product: null });
  await assert.rejects(
    adjust('entrada', 1),
    (error) => error.statusCode === 404,
  );
  assert.equal(context.transaction.rollback, 1);
});

test('rechaza producto inactivo', async () => {
  const context = scenario({
    product: {
      estado: 'inactivo',
      existencia: '7.000',
      permite_decimales: true,
    },
  });
  await assert.rejects(
    adjust('entrada', 1),
    (error) => error.statusCode === 409,
  );
  assert.equal(context.transaction.rollback, 1);
});

test('rechaza salida que produciría existencia negativa', async () => {
  const context = scenario({ stock: '1.000' });
  await assert.rejects(
    adjust('salida', 2),
    (error) => error.statusCode === 409,
  );
  assert.equal(context.calls.adjustments.length, 0);
  assert.equal(context.transaction.rollback, 1);
});

test('crea ajuste, movimiento y bitácora en orden lógico', async () => {
  const context = scenario();
  await adjust('entrada', 2);
  assert.equal(context.calls.adjustments.length, 1);
  assert.equal(context.calls.stocks.length, 1);
  assert.equal(context.calls.movements.length, 1);
  assert.equal(context.calls.audits.length, 1);
});

for (const failure of ['movement', 'audit']) {
  test(`rollback si falla ${failure}`, async () => {
    const context = scenario({ failAt: failure });
    await assert.rejects(adjust('entrada', 2));
    assert.equal(context.transaction.commit, 0);
    assert.equal(context.transaction.rollback, 1);
    assert.equal(context.transaction.release, 1);
    if (failure === 'movement') assert.equal(context.calls.audits.length, 0);
  });
}

test.after(() => {
  pool.getConnection = originalGetConnection;
  Object.assign(repo, originalRepo);
});
