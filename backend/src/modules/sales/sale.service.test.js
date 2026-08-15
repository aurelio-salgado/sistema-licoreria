const assert = require('node:assert/strict');
const test = require('node:test');

const pool = require('../../config/database');
const repo = require('./sale.repository');
const service = require('./sale.service');

const originalGetConnection = pool.getConnection;
const originalRepo = { ...repo };

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
