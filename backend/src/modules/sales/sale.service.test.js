const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const pool = require('../../config/database');
const repo = require('./sale.repository');
const service = require('./sale.service');

const originalGetConnection = pool.getConnection;
const originalRepo = { ...repo };

test('contratos de lectura de métodos y pagos de ventas', async (t) => {
  await t.test('métodos activos usan filtro, orden y no asumen IDs', async () => {
    const calls = [];
    const database = {
      execute: async (sql, values) => {
        calls.push({ sql, values });
        return [[
          {
            id_metodo_pago: 17,
            nombre: 'Método configurable',
            requiere_referencia: 1,
            es_efectivo: 0,
            estado: 'activo',
          },
        ]];
      },
    };
    const methods = await repo.listActivePaymentMethods(database);
    assert.deepEqual(calls[0].values, ['activo']);
    assert.match(calls[0].sql, /WHERE estado=\? ORDER BY id_metodo_pago/);
    assert.doesNotMatch(calls[0].sql, /SELECT \*/i);
    assert.deepEqual(methods, [
      {
        id_metodo_pago: 17,
        nombre: 'Método configurable',
        requiere_referencia: true,
        es_efectivo: false,
        estado: 'activo',
      },
    ]);
  });

  await t.test('ruta está antes de :id y exige ventas.crear', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'sale.routes.js'),
      'utf8',
    );
    const paymentRoute = source.indexOf("'/payment-methods'");
    assert.ok(paymentRoute > -1);
    assert.ok(paymentRoute < source.indexOf("'/:id'"));
    assert.match(
      source.slice(paymentRoute, source.indexOf("router.get('/:id'")),
      /requirePermission\('ventas\.crear'\)/,
    );
  });

  await t.test('preparación sin pagos devuelve arreglo vacío', async () => {
    repo.findById = async () => ({ id_venta: 31, estado: 'preparacion' });
    repo.listItems = async () => [];
    repo.listPayments = async () => [];
    repo.discountPolicy = async () => ({ valor: '10.00' });
    const sale = await service.getSale('31', { userId: 7, canSupervise: true });
    assert.deepEqual(sale.payments, []);
    assert.deepEqual(sale.discount_policy, { max_percent: '10.00' });
  });

  await t.test('política consulta solo descuento_maximo', async () => {
    const calls = [];
    const policy = await originalRepo.discountPolicy({ execute: async (sql, values) => { calls.push({ sql, values }); return [[{ valor: '12.50' }]] } });
    assert.deepEqual(policy, { valor: '12.50' });
    assert.deepEqual(calls[0].values, ['descuento_maximo']);
    assert.doesNotMatch(calls[0].sql, /impuesto_activo|tasa_impuesto/);
  });

  await t.test('detalle usa ventas.ver sin exigir configuracion.ver', () => {
    const source = fs.readFileSync(path.join(__dirname, 'sale.routes.js'), 'utf8');
    assert.match(source, /router\.get\('\/:id', requirePermission\('ventas\.ver'\), controller\.getSale\)/);
    assert.doesNotMatch(source, /configuracion\.ver/);
  });

  await t.test('detalle conserva pagos históricos y metadatos del método', async () => {
    repo.listPayments = originalRepo.listPayments;
    const storedRows = [
      {
        id_pago: 81,
        id_metodo_pago: 9,
        metodo_nombre: 'Efectivo local',
        requiere_referencia: 0,
        es_efectivo: 1,
        monto: '60.00',
        referencia: null,
        monto_recibido: '80.00',
        cambio: '20.00',
        creado_en: '2026-08-16 10:00:00',
      },
      {
        id_pago: 82,
        id_metodo_pago: 14,
        metodo_nombre: 'Transferencia local',
        requiere_referencia: 1,
        es_efectivo: 0,
        monto: '40.00',
        referencia: 'REF-204',
        monto_recibido: null,
        cambio: '0.00',
        creado_en: '2026-08-16 10:00:00',
      },
    ];
    const before = structuredClone(storedRows);
    const payments = await repo.listPayments(
      { execute: async () => [storedRows] },
      44,
    );
    assert.deepEqual(storedRows, before);
    assert.deepEqual(payments[0], {
      id_pago: 81,
      method: {
        id_metodo_pago: 9,
        nombre: 'Efectivo local',
        requiere_referencia: false,
        es_efectivo: true,
      },
      monto: '60.00',
      referencia: null,
      monto_recibido: '80.00',
      cambio: '20.00',
      creado_en: '2026-08-16 10:00:00',
    });
    assert.equal(payments[1].referencia, 'REF-204');
    assert.equal(payments[1].method.requiere_referencia, true);

    repo.findById = async () => ({ id_venta: 44, estado: 'completada' });
    repo.listItems = async () => [];
    repo.listPayments = async () => payments;
    const sale = await service.getSale('44', { userId: 7, canSupervise: true });
    assert.deepEqual(sale.payments, payments);
    assert.equal(Object.hasOwn(sale, 'discount_policy'), false);
  });

  await t.test('venta inexistente conserva respuesta 404', async () => {
    repo.findById = async () => null;
    let queriedChildren = false;
    repo.listItems = async () => {
      queriedChildren = true;
      return [];
    };
    repo.listPayments = repo.listItems;
    await assert.rejects(
      service.getSale('404', { userId: 7, canSupervise: true }),
      (error) => error.statusCode === 404 && error.message === 'Venta no encontrada',
    );
    assert.equal(queriedChildren, false);
  });

Object.assign(repo, originalRepo);
});

test('estado operativo de ventas respecto a caja', async (t) => {
  await t.test('repositorio usa dos consultas de solo lectura y el usuario recibido', async () => {
    const calls = [];
    const result = await originalRepo.operationalStatus({
      execute: async (sql, values) => {
        calls.push({ sql, values });
        return calls.length === 1 ? [[{ valor: 'true' }]] : [[{ id_caja: 8 }]];
      },
    }, 27);
    assert.deepEqual(result, { configuration: { valor: 'true' }, cashboxes: [{ id_caja: 8 }] });
    assert.deepEqual(calls[0].values, ['control_caja_activo']);
    assert.deepEqual(calls[1].values, [27]);
    assert.match(calls[1].sql, /id_usuario=\? AND estado='abierta'/);
    assert.doesNotMatch(calls.map(({ sql }) => sql).join(' '), /\b(?:INSERT|UPDATE|DELETE)\b/i);
  });

  await t.test('expone únicamente booleanos para control desactivado sin caja', async () => {
    repo.operationalStatus = async () => ({ configuration: { valor: 'false' }, cashboxes: [] });
    assert.deepEqual(await service.getOperationalStatus(27), {
      control_caja_activo: false,
      caja_abierta: false,
    });
  });

  await t.test('distingue control activo sin caja y con exactamente una caja', async () => {
    repo.operationalStatus = async () => ({ configuration: { valor: 'true' }, cashboxes: [] });
    assert.deepEqual(await service.getOperationalStatus(27), { control_caja_activo: true, caja_abierta: false });
    repo.operationalStatus = async () => ({ configuration: { valor: 'true' }, cashboxes: [{ id_caja: 8 }] });
    assert.deepEqual(await service.getOperationalStatus(27), { control_caja_activo: true, caja_abierta: true });
  });

  await t.test('ruta antecede a :id y requiere solamente ventas.crear', () => {
    const source = fs.readFileSync(path.join(__dirname, 'sale.routes.js'), 'utf8');
    const route = source.indexOf("'/operational-status'");
    assert.ok(route > -1 && route < source.indexOf("'/:id'"));
    const contract = source.slice(route, source.indexOf("router.get('/:id'"));
    assert.match(contract, /requirePermission\('ventas\.crear'\)/);
    assert.doesNotMatch(contract, /configuracion\.ver|caja\.movimientos/);
  });

  await t.test('confirmación conserva la validación autoritativa y el rechazo sin caja', () => {
    const source = fs.readFileSync(path.join(__dirname, 'sale.service.js'), 'utf8');
    const confirmation = source.slice(
      source.indexOf('async function confirmSale'),
      source.indexOf('async function cancelSale'),
    );
    assert.match(confirmation, /config\.get\('control_caja_activo'\)/);
    assert.match(confirmation, /openCashboxesForUpdate\(c, sale\.id_usuario\)/);
    assert.match(confirmation, /El vendedor no tiene una caja abierta/);
  });

  Object.assign(repo, originalRepo);
});

test('límite global de descuento por línea de venta', async (t) => {
  const actor = { userId: 20, ipAddress: '127.0.0.1' };
  const runAddItem = async (discount) => {
    const transaction = { commit: 0, rollback: 0 };
    const connection = {
      beginTransaction: async () => {},
      commit: async () => transaction.commit++,
      rollback: async () => transaction.rollback++,
      release() {},
    };
    let created;
    pool.getConnection = async () => connection;
    Object.assign(repo, {
      findByIdForUpdate: async () => ({ id_venta: 10, estado: 'preparacion' }),
      findProductForUpdate: async () => ({ id_producto: 5, estado: 'activo', permite_decimales: false, precio_venta: '100.00', costo_promedio: '60.00' }),
      findItemByProduct: async () => null,
      configurationForUpdate: async () => [
        { clave: 'descuento_maximo', valor: '10.00' },
        { clave: 'impuesto_activo', valor: 'true' },
        { clave: 'tasa_impuesto', valor: '15.00' },
      ],
      createItem: async (_connection, _saleId, data) => { created = data; return 81 },
      amounts: async () => created ? [{ subtotal: created.subtotal, descuento: created.discount.fixed, impuesto: created.tax.fixed }] : [],
      updateTotals: async () => {},
      findById: async () => ({ id_venta: 10, estado: 'preparacion' }),
      listItems: async () => created ? [{ id_detalle_venta: 81, id_producto: 5, cantidad: '1.000', precio_unitario: '100.00', descuento: created.discount.fixed, impuesto: created.tax.fixed, subtotal: created.subtotal }] : [],
      listPayments: async () => [],
      discountPolicy: async () => ({ valor: '10.00' }),
      audit: async () => {},
    });
    const operation = service.addItem('10', { id_producto: 5, cantidad: 1, descuento: discount }, actor);
    return { operation, transaction, created: () => created };
  };

  await t.test('permite un descuento inferior al máximo sin alterar el impuesto', async () => {
    const context = await runAddItem(9);
    await context.operation;
    assert.equal(context.created().discount.fixed, '9.00');
    assert.equal(context.created().tax.fixed, '13.65');
    assert.equal(context.transaction.commit, 1);
  });
  await t.test('permite un descuento exactamente igual al máximo', async () => {
    const context = await runAddItem(10);
    await context.operation;
    assert.equal(context.created().discount.fixed, '10.00');
    assert.equal(context.transaction.commit, 1);
  });
  await t.test('rechaza en backend una petición manipulada superior al máximo', async () => {
    const context = await runAddItem(10.01);
    await assert.rejects(context.operation, (error) => error.statusCode === 400);
    assert.equal(context.transaction.rollback, 1);
    assert.equal(context.created(), undefined);
  });

  Object.assign(repo, originalRepo);
  pool.getConnection = originalGetConnection;
});

function scenario(options = {}) {
  const calls = {
    audits: [],
    cashMovements: [],
    inventoryMovements: [],
    stocks: [],
  };
  const transaction = { begin: 0, commit: 0, rollback: 0 };
  const connection = {
    beginTransaction: async () => transaction.begin++,
    commit: async () => transaction.commit++,
    rollback: async () => transaction.rollback++,
    release() {},
  };
  const sale = {
    id_venta: 10,
    numero_venta: 'V-10',
    numero_factura: 'F-10',
    id_cliente: 1,
    id_usuario: options.sellerId ?? 20,
    id_caja:
      options.originalCashboxId === undefined ? 30 : options.originalCashboxId,
    estado: options.status ?? 'completada',
    subtotal: '100.00',
    descuento: '0.00',
    impuesto: '0.00',
    total: '100.00',
  };
  const cashAmount = Object.hasOwn(options, 'cashAmount')
    ? options.cashAmount
    : '100.00';
  const cardAmount = Object.hasOwn(options, 'cardAmount')
    ? options.cardAmount
    : null;
  const payments = [];
  const methods = [];
  if (cashAmount !== null) {
    payments.push({ id_pago: 1, id_metodo_pago: 1, monto: cashAmount });
    methods.push({ id_metodo_pago: 1, es_efectivo: true });
  }
  if (cardAmount !== null) {
    payments.push({ id_pago: 2, id_metodo_pago: 2, monto: cardAmount });
    methods.push({ id_metodo_pago: 2, es_efectivo: false });
  }
  const originalCashbox =
    sale.id_caja === null
      ? []
      : [
          {
            id_caja: sale.id_caja,
            id_usuario: sale.id_usuario,
            estado: options.originalCashboxStatus ?? 'abierta',
          },
        ];
  const compensationCashbox =
    options.actorCashboxId === null
      ? []
      : [
          {
            id_caja: options.actorCashboxId ?? 40,
            id_usuario: 99,
            estado: 'abierta',
          },
        ];

  pool.getConnection = async () => connection;
  Object.assign(repo, {
    findByIdForUpdate: async () => sale,
    confirmationItemsForUpdate: async () => [
      { id_producto: 5, cantidad: '2.000' },
    ],
    productsForUpdate: async () => [
      { id_producto: 5, existencia: '3.000', costo_promedio: '7.50' },
    ],
    cancellationPaymentsForUpdate: async () => payments,
    paymentMethodsForUpdate: async () => methods,
    cancellationCashboxesForUpdate: async () => [
      ...originalCashbox,
      ...compensationCashbox.filter(
        (cashbox) =>
          !originalCashbox.some(
            (original) => original.id_caja === cashbox.id_caja,
          ),
      ),
    ],
    cashMovementsForUpdate: async () =>
      sale.id_caja !== null && cashAmount !== null
        ? [
            {
              id_caja: sale.id_caja,
              tipo_movimiento: 'venta',
              naturaleza: 'entrada',
              afecta_efectivo: true,
              monto: cashAmount,
            },
          ]
        : [],
    updateStock: async (_c, productId, stock) => {
      calls.stocks.push({ productId, stock });
    },
    createCancellationInventoryMovement: async (_c, data) => {
      calls.inventoryMovements.push(data);
      if (options.failAfterInventory) throw new Error('Fallo simulado');
    },
    createCancellationCashMovement: async (_c, data) => {
      calls.cashMovements.push(data);
    },
    cancel: async () => 1,
    findById: async () => ({
      ...sale,
      estado: 'anulada',
      motivo_anulacion: 'Motivo autorizado',
      anulada_por: 99,
      anulada_en: '2026-08-15 12:00:00',
      cliente: { id_cliente: 1 },
      usuario: { id_usuario: sale.id_usuario },
      caja: sale.id_caja === null ? null : { id_caja: sale.id_caja },
    }),
    listItems: async () => [],
    listPayments: async () => [],
    audit: async (_c, data) => calls.audits.push(data),
  });
  return { calls, connection, payments, sale, transaction };
}

async function cancel() {
  return service.cancelSale(
    '10',
    { motivo: 'Motivo autorizado' },
    { userId: 99, ipAddress: '127.0.0.1' },
  );
}

test('política transaccional de anulación de ventas', async (t) => {
  await t.test(
    'compensa venta propia en su caja original abierta',
    async () => {
      const context = scenario({ sellerId: 99, actorCashboxId: 30 });
      await cancel();
      assert.equal(context.calls.cashMovements[0].cashboxId, 30);
      assert.equal(context.transaction.commit, 1);
    },
  );

  await t.test(
    'usa una caja nueva y no modifica la caja original cerrada',
    async () => {
      const context = scenario({
        sellerId: 99,
        originalCashboxStatus: 'cerrada',
        actorCashboxId: 40,
      });
      await cancel();
      assert.equal(context.calls.cashMovements[0].cashboxId, 40);
    },
  );

  await t.test(
    'permite venta ajena con caja abierta del anulador',
    async () => {
      const context = scenario({ sellerId: 20, actorCashboxId: 40 });
      await cancel();
      assert.equal(context.calls.cashMovements[0].userId, 99);
    },
  );

  await t.test(
    'sin caja para devolver efectivo responde 409 y revierte',
    async () => {
      const context = scenario({ actorCashboxId: null });
      await assert.rejects(cancel(), (error) => error.statusCode === 409);
      assert.equal(context.calls.stocks.length, 0);
      assert.equal(context.transaction.rollback, 1);
      assert.equal(context.transaction.commit, 0);
    },
  );

  await t.test(
    'venta no efectiva no exige caja ni crea movimiento',
    async () => {
      const context = scenario({
        cashAmount: null,
        cardAmount: '100.00',
        actorCashboxId: null,
      });
      await cancel();
      assert.equal(context.calls.cashMovements.length, 0);
    },
  );

  await t.test('pago combinado compensa solamente el efectivo', async () => {
    const context = scenario({ cashAmount: '30.00', cardAmount: '70.00' });
    await cancel();
    assert.equal(context.calls.cashMovements[0].amount, '30.00');
  });

  await t.test(
    'venta con efectivo sin caja original usa la caja del anulador',
    async () => {
      const context = scenario({ originalCashboxId: null, actorCashboxId: 40 });
      await cancel();
      assert.equal(context.calls.cashMovements[0].cashboxId, 40);
      assert.equal(
        context.calls.audits[0].newData.anulacion.id_caja_original,
        null,
      );
    },
  );

  await t.test(
    'conserva pagos, restaura inventario y costo promedio',
    async () => {
      const context = scenario({ cashAmount: null, cardAmount: '100.00' });
      const paymentsBefore = structuredClone(context.payments);
      await cancel();
      assert.deepEqual(context.payments, paymentsBefore);
      assert.deepEqual(context.calls.stocks, [
        { productId: 5, stock: '5.000' },
      ]);
      assert.equal(context.calls.inventoryMovements[0].newStock, '5.000');
      assert.equal(
        Object.hasOwn(context.calls.inventoryMovements[0], 'costo_promedio'),
        false,
      );
    },
  );

  await t.test('segundo intento responde 409', async () => {
    const context = scenario({ status: 'anulada' });
    await assert.rejects(cancel(), (error) => error.statusCode === 409);
    assert.equal(context.transaction.rollback, 1);
  });

  await t.test(
    'fallo posterior al inventario revierte toda la transacción',
    async () => {
      const context = scenario({ failAfterInventory: true });
      await assert.rejects(cancel(), /Fallo simulado/);
      assert.equal(context.transaction.rollback, 1);
      assert.equal(context.transaction.commit, 0);
      assert.equal(context.calls.cashMovements.length, 0);
      assert.equal(context.calls.audits.length, 0);
    },
  );

  await t.test(
    'bitácora contiene únicamente la trazabilidad autorizada',
    async () => {
      const context = scenario({ sellerId: 20, actorCashboxId: 40 });
      await cancel();
      const audit = context.calls.audits[0].newData.anulacion;
      assert.deepEqual(audit, {
        id_venta: 10,
        id_usuario_vendedor_original: 20,
        id_usuario_anulador: 99,
        id_caja_original: 30,
        id_caja_compensatoria: 40,
        efectivo_aplicado: '100.00',
        motivo: 'Motivo autorizado',
      });
    },
  );
});

test.after(() => {
  pool.getConnection = originalGetConnection;
  Object.assign(repo, originalRepo);
});
