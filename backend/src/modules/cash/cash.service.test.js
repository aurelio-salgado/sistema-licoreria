const assert = require('node:assert/strict');
const test = require('node:test');

const pool = require('../../config/database');
const repo = require('./cash.repository');
const service = require('./cash.service');

const originalGetConnection = pool.getConnection;
const originalRepo = { ...repo };

function scenario(options = {}) {
  const calls = { audits: [], close: [], movements: [] };
  const transaction = { begin: 0, commit: 0, rollback: 0, release: 0 };
  const connection = {
    beginTransaction: async () => transaction.begin++,
    commit: async () => transaction.commit++,
    rollback: async () => transaction.rollback++,
    release: () => transaction.release++,
  };
  const current = {
    id_caja: 12,
    id_usuario: 9,
    monto_apertura: '500.00',
    estado: options.status ?? 'abierta',
    observacion: null,
  };
  const closed = {
    ...current,
    estado: 'cerrada',
    monto_esperado: '575.00',
    monto_contado: '570.00',
    monto_cierre: '570.00',
    diferencia: '-5.00',
  };
  pool.getConnection = async () => connection;
  Object.assign(repo, {
    lockUser: async () => ({ id_usuario: 9, estado: 'activo' }),
    findOpenByUser: async () => options.openCashboxes ?? [],
    create: async () => 12,
    findOwnedById: async () =>
      options.owned === false ? null : options.returnClosed ? closed : current,
    findOwnedByIdForUpdate: async () =>
      options.owned === false ? null : current,
    createAudit: async (_c, data) => {
      calls.audits.push(data);
      if (options.failAt === 'audit') throw new Error('Fallo bitácora');
    },
    list: async () => [{ id_caja: 12 }],
    count: async () => 1,
    listMovements: async () => calls.movements,
    createMovement: async (_c, cashId, userId, data) => {
      calls.movements.push({
        id_movimiento_caja: 41,
        id_caja: cashId,
        id_usuario: userId,
        tipo_movimiento: data.type,
        naturaleza: data.nature,
        monto: data.amount.fixed,
      });
      return 41;
    },
    lockMovements: async () =>
      options.movements ?? [
        { naturaleza: 'entrada', afecta_efectivo: true, monto: '100.00' },
        { naturaleza: 'salida', afecta_efectivo: true, monto: '25.00' },
        { naturaleza: 'entrada', afecta_efectivo: false, monto: '80.00' },
      ],
    close: async (_c, cashId, data) => {
      calls.close.push({ cashId, data });
      if (options.failAt === 'close') throw new Error('Fallo cierre');
      return options.closeAffected ?? 1;
    },
  });
  return { calls, closed, current, transaction };
}

const actor = { userId: 9, ipAddress: '127.0.0.1' };

test('apertura válida con monto 500', async () => {
  const context = scenario();
  const result = await service.openCash({ monto_apertura: 500 }, actor);
  assert.equal(result.id_caja, 12);
  assert.equal(context.calls.audits[0].action, 'abrir');
  assert.equal(context.transaction.commit, 1);
  assert.equal(context.transaction.release, 1);
});

test('segunda caja abierta responde 409', async () => {
  const context = scenario({ openCashboxes: [{ id_caja: 3 }] });
  await assert.rejects(
    service.openCash({ monto_apertura: 500 }, actor),
    (error) => error.statusCode === 409,
  );
  assert.equal(context.transaction.rollback, 1);
});

test('consulta caja actual y ausencia devuelve 404', async () => {
  scenario({ openCashboxes: [{ id_caja: 12 }] });
  assert.equal((await service.getCurrentCash(9)).id_caja, 12);
  scenario({ openCashboxes: [] });
  await assert.rejects(
    service.getCurrentCash(9),
    (error) => error.statusCode === 404,
  );
});

test('consulta booleana de caja abierta reutiliza el usuario recibido', async () => {
  let receivedUserId;
  repo.findOpenByUser = async (_executor, userId) => {
    receivedUserId = userId;
    return [{ id_caja: 12, estado: 'abierta' }];
  };
  assert.equal(await service.hasOpenCash(9), true);
  assert.equal(receivedUserId, 9);

  repo.findOpenByUser = async () => [];
  assert.equal(await service.hasOpenCash(9), false);
});

test('historial propio y rechazo de filtro de usuario ajeno', async () => {
  scenario();
  const history = await service.listCash({ page: '1', limit: '20' }, 9);
  assert.equal(history.cash.length, 1);
  await assert.rejects(
    service.listCash({ user: '10' }, 9),
    (error) => error.statusCode === 403,
  );
});

test('acceso a caja ajena devuelve 404', async () => {
  scenario({ owned: false });
  await assert.rejects(
    service.getCash('12', 9),
    (error) => error.statusCode === 404,
  );
});

for (const [type, nature] of [
  ['ingreso', 'entrada'],
  ['egreso', 'salida'],
]) {
  test(`${type} manual conserva propiedad, naturaleza y bitácora`, async () => {
    const context = scenario();
    const result = await service.createMovement(
      '12',
      {
        tipo_movimiento: type,
        monto: type === 'ingreso' ? 100 : 25,
        concepto: 'Manual',
      },
      actor,
    );
    assert.equal(result.naturaleza, nature);
    assert.equal(result.id_usuario, 9);
    assert.equal(context.calls.audits[0].action, `${type}_manual`);
  });
}

test('rechaza campos controlados en movimiento', async () => {
  scenario();
  await assert.rejects(
    service.createMovement(
      '12',
      { tipo_movimiento: 'ingreso', monto: 100, concepto: 'X', id_usuario: 99 },
      actor,
    ),
    (error) => error.statusCode === 400,
  );
});

test('rechaza movimiento sobre caja cerrada', async () => {
  const context = scenario({ status: 'cerrada' });
  await assert.rejects(
    service.createMovement(
      '12',
      { tipo_movimiento: 'ingreso', monto: 100, concepto: 'X' },
      actor,
    ),
    (error) => error.statusCode === 409,
  );
  assert.equal(context.calls.movements.length, 0);
  assert.equal(context.transaction.rollback, 1);
});

test('cierre calcula esperado, contado, cierre y diferencia', async () => {
  const context = scenario({ returnClosed: true });
  const result = await service.closeCash('12', { monto_contado: 570 }, actor);
  assert.deepEqual(context.calls.close[0].data, {
    counted: '570.00',
    expected: '575.00',
    difference: '-5.00',
    observation: null,
  });
  assert.equal(result.monto_cierre, '570.00');
  assert.equal(result.estado, 'cerrada');
  assert.equal(context.transaction.commit, 1);
});

test('venta en efectivo existente aumenta el esperado', async () => {
  const context = scenario({
    returnClosed: true,
    movements: [
      { naturaleza: 'entrada', afecta_efectivo: true, monto: '100.00' },
    ],
  });
  await service.closeCash('12', { monto_contado: 600 }, actor);
  assert.equal(context.calls.close[0].data.expected, '600.00');
});

test('segundo cierre responde 409', async () => {
  const context = scenario({ status: 'cerrada' });
  await assert.rejects(
    service.closeCash('12', { monto_contado: 570 }, actor),
    (error) => error.statusCode === 409,
  );
  assert.equal(context.transaction.rollback, 1);
});

test('rollback ante fallo de cierre o bitácora', async () => {
  for (const failAt of ['close', 'audit']) {
    const context = scenario({ failAt, returnClosed: true });
    await assert.rejects(
      service.closeCash('12', { monto_contado: 570 }, actor),
    );
    assert.equal(context.transaction.commit, 0);
    assert.equal(context.transaction.rollback, 1);
    assert.equal(context.transaction.release, 1);
  }
});

test.after(() => {
  pool.getConnection = originalGetConnection;
  Object.assign(repo, originalRepo);
});
