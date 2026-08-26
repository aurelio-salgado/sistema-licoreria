const pool = require('../../config/database');
const cashRepository = require('./cash.repository');
const {
  validateCloseInput,
  validateId,
  validateListQuery,
  validateMovementInput,
  validateOpenInput,
} = require('./cash.validation');

const MAX_MONEY_CENTS = 999999999999n;

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const cashNotFoundError = () => httpError(404, 'Caja no encontrada');

async function runTransaction(operation) {
  const connection = await pool.getConnection();
  let started = false;
  try {
    await connection.beginTransaction();
    started = true;
    const result = await operation(connection);
    await connection.commit();
    started = false;
    return result;
  } catch (error) {
    if (started) {
      try {
        await connection.rollback();
      } catch {
        /* El middleware global mantiene saneada la respuesta pública. */
      }
    }
    throw error;
  } finally {
    connection.release();
  }
}

function toCents(value, fieldName) {
  const normalized = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized))
    throw httpError(500, `${fieldName} almacenado no es válido`);
  const [integer, decimals = ''] = normalized.split('.');
  return BigInt(integer) * 100n + BigInt(decimals.padEnd(2, '0'));
}

function formatCents(value) {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const normalized = absolute.toString().padStart(3, '0');
  return `${negative ? '-' : ''}${normalized.slice(0, -2)}.${normalized.slice(-2)}`;
}

function cashSnapshot(cash) {
  return cash
    ? {
        id_caja: cash.id_caja,
        id_usuario: cash.id_usuario,
        fecha_apertura: cash.fecha_apertura,
        fecha_cierre: cash.fecha_cierre,
        monto_apertura: cash.monto_apertura,
        monto_cierre: cash.monto_cierre,
        monto_esperado: cash.monto_esperado,
        monto_contado: cash.monto_contado,
        diferencia: cash.diferencia,
        estado: cash.estado,
      }
    : null;
}

async function getOwnedCash(executor, cashId, userId) {
  const cash = await cashRepository.findOwnedById(executor, cashId, userId);
  if (!cash) throw cashNotFoundError();
  return cash;
}

async function openCash(rawData, actor) {
  const data = validateOpenInput(rawData);
  return runTransaction(async (connection) => {
    const user = await cashRepository.lockUser(connection, actor.userId);
    if (!user || user.estado !== 'activo')
      throw httpError(401, 'No autorizado');
    if (
      (await cashRepository.findOpenByUser(connection, actor.userId, true))
        .length
    )
      throw httpError(409, 'El usuario ya tiene una caja abierta');
    const cashId = await cashRepository.create(connection, actor.userId, data);
    const cash = await getOwnedCash(connection, cashId, actor.userId);
    await cashRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'abrir',
      cashId,
      newData: cashSnapshot(cash),
      ipAddress: actor.ipAddress,
    });
    return cash;
  });
}

async function getCurrentCash(userId) {
  const rows = await cashRepository.findOpenByUser(pool, userId);
  if (!rows.length) throw cashNotFoundError();
  if (rows.length > 1)
    throw httpError(409, 'Existe más de una caja abierta para el usuario');
  return rows[0];
}

async function hasOpenCash(userId) {
  const rows = await cashRepository.findOpenByUser(pool, userId);
  return rows.length > 0;
}

async function listCash(rawQuery, userId) {
  const filters = validateListQuery(rawQuery);
  if (filters.requestedUser !== null && filters.requestedUser !== userId)
    throw httpError(403, 'Acceso denegado');
  const [cash, total] = await Promise.all([
    cashRepository.list(pool, userId, filters),
    cashRepository.count(pool, userId, filters),
  ]);
  return {
    cash,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      total_pages: Math.ceil(total / filters.limit),
    },
  };
}

async function getCash(rawId, userId) {
  const cashId = validateId(rawId);
  const cash = await getOwnedCash(pool, cashId, userId);
  cash.usuario = {
    id_usuario: cash.id_usuario,
    nombre: cash.usuario_nombre,
    apellido: cash.usuario_apellido,
    nombre_usuario: cash.nombre_usuario,
  };
  delete cash.usuario_nombre;
  delete cash.usuario_apellido;
  delete cash.nombre_usuario;
  cash.movements = await cashRepository.listMovements(pool, cashId);
  return cash;
}

async function createMovement(rawId, rawData, actor) {
  const cashId = validateId(rawId);
  const data = validateMovementInput(rawData);
  return runTransaction(async (connection) => {
    const cash = await cashRepository.findOwnedByIdForUpdate(
      connection,
      cashId,
      actor.userId,
    );
    if (!cash) throw cashNotFoundError();
    if (cash.estado !== 'abierta')
      throw httpError(409, 'La caja está cerrada');
    const movementId = await cashRepository.createMovement(
      connection,
      cashId,
      actor.userId,
      data,
    );
    await cashRepository.createAudit(connection, {
      userId: actor.userId,
      action: data.type === 'ingreso' ? 'ingreso_manual' : 'egreso_manual',
      cashId,
      newData: {
        id_movimiento_caja: movementId,
        tipo_movimiento: data.type,
        monto: data.amount.fixed,
      },
      ipAddress: actor.ipAddress,
    });
    const movements = await cashRepository.listMovements(connection, cashId);
    return movements.find(
      (movement) => movement.id_movimiento_caja === movementId,
    );
  });
}

function calculateExpected(openingAmount, movements) {
  let expected = toCents(openingAmount, 'monto_apertura');
  for (const movement of movements) {
    if (!movement.afecta_efectivo) continue;
    const amount = toCents(movement.monto, 'monto');
    if (movement.naturaleza === 'entrada') expected += amount;
    else if (movement.naturaleza === 'salida') expected -= amount;
    else throw httpError(500, 'La naturaleza de un movimiento no es válida');
  }
  if (expected < -MAX_MONEY_CENTS || expected > MAX_MONEY_CENTS)
    throw httpError(409, 'El monto esperado está fuera del rango permitido');
  return expected;
}

async function closeCash(rawId, rawData, actor) {
  const cashId = validateId(rawId);
  const data = validateCloseInput(rawData);
  return runTransaction(async (connection) => {
    const current = await cashRepository.findOwnedByIdForUpdate(
      connection,
      cashId,
      actor.userId,
    );
    if (!current) throw cashNotFoundError();
    if (current.estado !== 'abierta')
      throw httpError(409, 'La caja ya está cerrada');
    const movements = await cashRepository.lockMovements(connection, cashId);
    const expected = calculateExpected(current.monto_apertura, movements);
    const difference = data.countedAmount.cents - expected;
    if (difference < -MAX_MONEY_CENTS || difference > MAX_MONEY_CENTS)
      throw httpError(409, 'La diferencia está fuera del rango permitido');
    const closingData = {
      counted: data.countedAmount.fixed,
      expected: formatCents(expected),
      difference: formatCents(difference),
      observation: data.observation ?? current.observacion,
    };
    if ((await cashRepository.close(connection, cashId, closingData)) !== 1)
      throw httpError(409, 'La caja ya no puede cerrarse');
    const cash = await getOwnedCash(connection, cashId, actor.userId);
    await cashRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'cerrar',
      cashId,
      previousData: cashSnapshot(current),
      newData: cashSnapshot(cash),
      ipAddress: actor.ipAddress,
    });
    return cash;
  });
}

module.exports = {
  closeCash,
  createMovement,
  getCash,
  getCurrentCash,
  hasOpenCash,
  listCash,
  openCash,
};
