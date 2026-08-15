const assert = require('node:assert/strict');
const test = require('node:test');

const pool = require('../../config/database');
const repo = require('./purchase.repository');
const service = require('./purchase.service');

const originalGetConnection = pool.getConnection;
const originalRepo = { ...repo };
const actor = { userId: 9, ipAddress: '127.0.0.1' };

function purchase(overrides = {}) {
  return {
    id_compra: 11,
    numero_compra: 'C-11',
    id_proveedor: 3,
    estado: 'borrador',
    observacion: null,
    subtotal: '0.00',
    descuento: '0.00',
    impuesto: '0.00',
    total: '0.00',
    ...overrides,
  };
}

function item(overrides = {}) {
  return {
    id_detalle_compra: 21,
    id_producto: 5,
    cantidad: '2.000',
    costo_unitario: '10.00',
    descuento: '0.00',
    impuesto: '0.00',
    subtotal: '20.00',
    ...overrides,
  };
}

function scenario(options = {}) {
  const calls = {
    audits: [],
    cancellationMovements: [],
    confirmedItems: [],
    createdItems: [],
    inventoryMovements: [],
    productInventory: [],
    productStocks: [],
    totals: [],
  };
  const transaction = { begin: 0, commit: 0, rollback: 0, release: 0 };
  const connection = {
    beginTransaction: async () => transaction.begin++,
    commit: async () => transaction.commit++,
    rollback: async () => transaction.rollback++,
    release: () => transaction.release++,
  };
  const currentPurchase = purchase({ estado: options.state ?? 'borrador' });
  const confirmationItems = Object.hasOwn(options, 'items')
    ? options.items
    : [item()];
  const products = Object.hasOwn(options, 'products')
    ? options.products
    : [
        {
          id_producto: 5,
          existencia: options.stock ?? '10.000',
          costo_promedio: options.averageCost ?? '4.00',
          estado: options.productState ?? 'activo',
          permite_decimales: options.decimals ?? true,
        },
      ];
  const hydratedItems = options.hydratedItems ?? confirmationItems;
  pool.getConnection = async () => connection;
  Object.assign(repo, {
    findByIdForUpdate: async () => currentPurchase,
    findActiveSupplierForUpdate: async () => ({
      id_proveedor: 3,
      estado: options.supplierState ?? 'activo',
    }),
    findSupplierForUpdate: async () => ({
      id_proveedor: 3,
      estado: options.supplierState ?? 'activo',
    }),
    findByNumber: async () => null,
    create: async () => 11,
    update: async () => {},
    findById: async () =>
      purchase({
        estado:
          options.resultState ??
          (options.state === 'recibida' ? 'anulada' : currentPurchase.estado),
      }),
    listItems: async () => hydratedItems,
    createAudit: async (_c, data) => {
      calls.audits.push(data);
      if (options.failAt === 'audit') throw new Error('Fallo bitácora');
    },
    findActiveProductForUpdate: async () =>
      products[0]
        ? {
            ...products[0],
            estado: options.productState ?? products[0].estado,
          }
        : null,
    configurationForUpdate: async () => [
      { clave: 'descuento_maximo', valor: options.maxDiscount ?? '10.00' },
      { clave: 'impuesto_activo', valor: 'true' },
      { clave: 'tasa_impuesto', valor: '15.00' },
    ],
    findItemByProduct: async () => (options.duplicate ? item() : null),
    createItem: async (_c, purchaseId, data) => {
      calls.createdItems.push({ purchaseId, data });
      return 21;
    },
    updateItem: async () => {},
    deleteItem: async () => {},
    findItemByIdForUpdate: async () => item(),
    getItemAmounts: async () => hydratedItems,
    updateTotals: async (_c, purchaseId, totals) =>
      calls.totals.push({ purchaseId, totals }),
    getConfirmationItemsForUpdate: async () => confirmationItems,
    lockProductsForUpdate: async () => products,
    updateConfirmedItemAmounts: async (_c, itemId, data) =>
      calls.confirmedItems.push({ itemId, data }),
    updateProductInventory: async (_c, productId, stock, averageCost) =>
      calls.productInventory.push({ productId, stock, averageCost }),
    createInventoryMovement: async (_c, data) => {
      calls.inventoryMovements.push(data);
      if (options.failAt === 'movement') throw new Error('Fallo movimiento');
    },
    markAsReceived: async () => 1,
    updateProductStock: async (_c, productId, stock) =>
      calls.productStocks.push({ productId, stock }),
    createCancellationMovement: async (_c, data) =>
      calls.cancellationMovements.push(data),
    markAsCancelled: async () => 1,
  });
  return { calls, currentPurchase, products, transaction };
}

const purchaseBody = {
  numero_compra: 'C-11',
  id_proveedor: 3,
  fecha_compra: '2026-08-15 10:00:00',
};
const itemBody = {
  id_producto: 5,
  cantidad: 2,
  costo_unitario: 10,
  descuento: 0,
};

test('crea borrador con proveedor activo y bitácora', async () => {
  const context = scenario();
  const result = await service.createPurchase(purchaseBody, actor);
  assert.equal(result.id_compra, 11);
  assert.equal(context.calls.audits[0].action, 'crear_borrador');
  assert.equal(context.transaction.commit, 1);
  assert.equal(context.transaction.release, 1);
});

test('rechaza proveedor inactivo', async () => {
  const context = scenario({ supplierState: 'inactivo' });
  await assert.rejects(
    service.createPurchase(purchaseBody, actor),
    (error) => error.statusCode === 400,
  );
  assert.equal(context.transaction.rollback, 1);
});

test('agrega línea, calcula impuesto y totales en backend', async () => {
  const context = scenario({
    hydratedItems: [item({ impuesto: '3.00' })],
  });
  await service.addItem('11', itemBody, actor);
  assert.equal(context.calls.createdItems[0].data.tax.fixed, '3.00');
  assert.equal(context.calls.createdItems[0].data.subtotal, '20.00');
  assert.equal(context.calls.audits[0].action, 'agregar_detalle');
  assert.equal(context.transaction.commit, 1);
});

test('rechaza impuesto controlado por cliente', async () => {
  scenario();
  await assert.rejects(
    service.addItem('11', { ...itemBody, impuesto: 99 }, actor),
    (error) => error.statusCode === 400,
  );
});

test('rechaza descuento superior al máximo', async () => {
  const context = scenario();
  await assert.rejects(
    service.addItem('11', { ...itemBody, descuento: 2.01 }, actor),
    (error) => error.statusCode === 400,
  );
  assert.equal(context.transaction.rollback, 1);
});

test('rechaza producto repetido', async () => {
  const context = scenario({ duplicate: true });
  await assert.rejects(
    service.addItem('11', itemBody, actor),
    (error) => error.statusCode === 409,
  );
  assert.equal(context.transaction.rollback, 1);
});

test('rechaza producto inactivo y fracción en unidad no decimal', async () => {
  let context = scenario({ productState: 'inactivo' });
  await assert.rejects(
    service.addItem('11', itemBody, actor),
    (error) => error.statusCode === 400,
  );
  assert.equal(context.transaction.rollback, 1);

  context = scenario({ decimals: false });
  await assert.rejects(
    service.addItem('11', { ...itemBody, cantidad: 1.5 }, actor),
    (error) => error.statusCode === 400,
  );
  assert.equal(context.transaction.rollback, 1);
});

test('edita y elimina líneas de borrador', async () => {
  let context = scenario();
  await service.updateItem('11', '21', itemBody, actor);
  assert.equal(context.calls.audits[0].action, 'editar_detalle');

  context = scenario();
  await service.removeItem('11', '21', actor);
  assert.equal(context.calls.audits[0].action, 'quitar_detalle');
});

test('confirmación pondera 10 a 4 más 2 a 10 como 12 a 5', async () => {
  const context = scenario({ resultState: 'recibida' });
  await service.confirmPurchase('11', actor);
  assert.deepEqual(context.calls.productInventory, [
    { productId: 5, stock: '12.000', averageCost: '5.00' },
  ]);
  assert.equal(context.calls.inventoryMovements.length, 1);
  assert.equal(context.transaction.commit, 1);
});

test('existencia cero adopta costo unitario comprado', async () => {
  const context = scenario({ stock: '0.000', averageCost: '7.00' });
  await service.confirmPurchase('11', actor);
  assert.equal(context.calls.productInventory[0].averageCost, '10.00');
});

test('confirmación vacía responde 400', async () => {
  const context = scenario({ items: [] });
  await assert.rejects(
    service.confirmPurchase('11', actor),
    (error) => error.statusCode === 400,
  );
  assert.equal(context.transaction.rollback, 1);
});

test('segunda confirmación o compra anulada responde 409', async () => {
  for (const state of ['recibida', 'anulada']) {
    const context = scenario({ state });
    await assert.rejects(
      service.confirmPurchase('11', actor),
      (error) => error.statusCode === 409,
    );
    assert.equal(context.transaction.rollback, 1);
  }
});

test('crea un movimiento de compra por cada línea', async () => {
  const context = scenario({
    items: [item(), item({ id_detalle_compra: 22, id_producto: 6 })],
    products: [
      {
        id_producto: 5,
        existencia: '10.000',
        costo_promedio: '4.00',
        estado: 'activo',
        permite_decimales: true,
      },
      {
        id_producto: 6,
        existencia: '3.000',
        costo_promedio: '8.00',
        estado: 'activo',
        permite_decimales: true,
      },
    ],
  });
  await service.confirmPurchase('11', actor);
  assert.equal(context.calls.inventoryMovements.length, 2);
});

test('repositorio codifica movimiento compra/entrada/referencia compra', async () => {
  let sql;
  let values;
  await originalRepo.createInventoryMovement(
    {
      execute: async (statement, parameters) => (
        (sql = statement),
        (values = parameters),
        [{}]
      ),
    },
    {
      productId: 5,
      quantity: '2.000',
      previousStock: '10.000',
      newStock: '12.000',
      purchaseId: 11,
      userId: 9,
    },
  );
  assert.match(sql, /movimientos_inventario/);
  assert.equal(values[1], 'compra');
  assert.equal(values[2], 'entrada');
  assert.equal(values[6], 'compra');
});

test('rollback si falla movimiento o bitácora al confirmar', async () => {
  for (const failAt of ['movement', 'audit']) {
    const context = scenario({ failAt, resultState: 'recibida' });
    await assert.rejects(service.confirmPurchase('11', actor));
    assert.equal(context.transaction.commit, 0);
    assert.equal(context.transaction.rollback, 1);
    assert.equal(context.transaction.release, 1);
  }
});

test('anulación resta existencia y no modifica costo promedio', async () => {
  const context = scenario({
    state: 'recibida',
    stock: '8.000',
    averageCost: '5.00',
    resultState: 'anulada',
  });
  await service.cancelPurchase('11', { motivo: 'Devolución' }, actor);
  assert.deepEqual(context.calls.productStocks, [
    { productId: 5, stock: '6.000' },
  ]);
  assert.equal(context.calls.productInventory.length, 0);
  assert.equal(context.products[0].costo_promedio, '5.00');
  assert.equal(context.calls.cancellationMovements.length, 1);
});

test('anulación con inventario insuficiente responde 409', async () => {
  const context = scenario({ state: 'recibida', stock: '1.000' });
  await assert.rejects(
    service.cancelPurchase('11', { motivo: 'Devolución' }, actor),
    (error) => error.statusCode === 409,
  );
  assert.equal(context.calls.productStocks.length, 0);
  assert.equal(context.transaction.rollback, 1);
});

test('segunda anulación responde 409', async () => {
  const context = scenario({ state: 'anulada' });
  await assert.rejects(
    service.cancelPurchase('11', { motivo: 'Repetida' }, actor),
    (error) => error.statusCode === 409,
  );
  assert.equal(context.transaction.rollback, 1);
});

test.after(() => {
  pool.getConnection = originalGetConnection;
  Object.assign(repo, originalRepo);
});
