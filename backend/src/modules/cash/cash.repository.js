const CASH_COLUMNS = `c.id_caja,c.id_usuario,c.fecha_apertura,c.monto_apertura,c.fecha_cierre,c.monto_cierre,c.monto_esperado,c.monto_contado,c.diferencia,c.estado,c.observacion,c.creado_en,c.actualizado_en`;

function listFilters(userId, filters) {
  const conditions = ['c.id_usuario=?'];
  const values = [userId];
  if (filters.status) {
    conditions.push('c.estado=?');
    values.push(filters.status);
  }
  if (filters.dateFrom) {
    conditions.push('c.fecha_apertura>=?');
    values.push(`${filters.dateFrom} 00:00:00`);
  }
  if (filters.dateTo) {
    conditions.push('c.fecha_apertura<DATE_ADD(?,INTERVAL 1 DAY)');
    values.push(`${filters.dateTo} 00:00:00`);
  }
  return { clause: `WHERE ${conditions.join(' AND ')}`, values };
}

function supervisionFilters(filters) {
  const conditions = ["c.estado='cerrada'"];
  const values = [];
  if (filters.requestedUser) {
    conditions.push('c.id_usuario=?');
    values.push(filters.requestedUser);
  }
  if (filters.dateFrom) {
    conditions.push('c.fecha_cierre>=?');
    values.push(`${filters.dateFrom} 00:00:00`);
  }
  if (filters.dateTo) {
    conditions.push('c.fecha_cierre<DATE_ADD(?,INTERVAL 1 DAY)');
    values.push(`${filters.dateTo} 00:00:00`);
  }
  if (filters.result === 'faltante') conditions.push('c.diferencia<0');
  if (filters.result === 'sobrante') conditions.push('c.diferencia>0');
  if (filters.result === 'cuadrada') conditions.push('c.diferencia=0');
  return { clause: `WHERE ${conditions.join(' AND ')}`, values };
}

async function lockUser(connection, userId) {
  const [rows] = await connection.execute(
    'SELECT id_usuario,estado FROM usuarios WHERE id_usuario=? LIMIT 1 FOR UPDATE',
    [userId],
  );
  return rows[0] || null;
}

async function findOpenByUser(executor, userId, forUpdate = false) {
  const [rows] = await executor.execute(
    `SELECT ${CASH_COLUMNS} FROM cajas c WHERE c.id_usuario=? AND c.estado='abierta' ORDER BY c.id_caja DESC${forUpdate ? ' FOR UPDATE' : ''}`,
    [userId],
  );
  return rows;
}

async function create(connection, userId, data) {
  const [result] = await connection.execute(
    `INSERT INTO cajas(id_usuario,fecha_apertura,monto_apertura,fecha_cierre,monto_cierre,monto_esperado,monto_contado,diferencia,estado,observacion) VALUES(?,NOW(),?,NULL,NULL,NULL,NULL,NULL,'abierta',?)`,
    [userId, data.openingAmount.fixed, data.observation],
  );
  return result.insertId;
}

async function findOwnedById(executor, cashId, userId) {
  const [rows] = await executor.execute(
    `SELECT ${CASH_COLUMNS},u.nombre AS usuario_nombre,u.apellido AS usuario_apellido,u.nombre_usuario FROM cajas c INNER JOIN usuarios u ON u.id_usuario=c.id_usuario WHERE c.id_caja=? AND c.id_usuario=? LIMIT 1`,
    [cashId, userId],
  );
  return rows[0] || null;
}

async function findOwnedByIdForUpdate(connection, cashId, userId) {
  const [rows] = await connection.execute(
    `SELECT ${CASH_COLUMNS} FROM cajas c WHERE c.id_caja=? AND c.id_usuario=? LIMIT 1 FOR UPDATE`,
    [cashId, userId],
  );
  return rows[0] || null;
}

async function list(executor, userId, filters) {
  const { clause, values } = listFilters(userId, filters);
  const [rows] = await executor.execute(
    `SELECT ${CASH_COLUMNS} FROM cajas c ${clause} ORDER BY c.fecha_apertura DESC,c.id_caja DESC LIMIT ? OFFSET ?`,
    [...values, filters.limit, (filters.page - 1) * filters.limit],
  );
  return rows;
}

async function count(executor, userId, filters) {
  const { clause, values } = listFilters(userId, filters);
  const [[row]] = await executor.execute(
    `SELECT COUNT(*) AS total FROM cajas c ${clause}`,
    values,
  );
  return Number(row.total);
}

async function listClosedForSupervision(executor, filters) {
  const { clause, values } = supervisionFilters(filters);
  const [rows] = await executor.execute(
    `SELECT c.id_caja,c.id_usuario,c.fecha_apertura,c.fecha_cierre,c.monto_apertura,c.monto_esperado,c.monto_contado,c.diferencia,c.estado,u.nombre AS usuario_nombre,u.apellido AS usuario_apellido,u.nombre_usuario FROM cajas c INNER JOIN usuarios u ON u.id_usuario=c.id_usuario ${clause} ORDER BY c.fecha_cierre DESC,c.id_caja DESC LIMIT ? OFFSET ?`,
    [...values, filters.limit, (filters.page - 1) * filters.limit],
  );
  return rows;
}

async function countClosedForSupervision(executor, filters) {
  const { clause, values } = supervisionFilters(filters);
  const [[row]] = await executor.execute(
    `SELECT COUNT(*) AS total FROM cajas c ${clause}`,
    values,
  );
  return Number(row.total);
}

async function listSupervisionUsers(executor) {
  const [rows] = await executor.execute(
    `SELECT DISTINCT u.id_usuario,u.nombre,u.apellido,u.nombre_usuario FROM cajas c INNER JOIN usuarios u ON u.id_usuario=c.id_usuario WHERE c.estado='cerrada' ORDER BY u.nombre,u.apellido,u.id_usuario`,
  );
  return rows;
}

async function findClosedByIdForSupervision(executor, cashId) {
  const [rows] = await executor.execute(
    `SELECT ${CASH_COLUMNS},u.nombre AS usuario_nombre,u.apellido AS usuario_apellido,u.nombre_usuario FROM cajas c INNER JOIN usuarios u ON u.id_usuario=c.id_usuario WHERE c.id_caja=? AND c.estado='cerrada' LIMIT 1`,
    [cashId],
  );
  return rows[0] || null;
}

async function listMovements(executor, cashId) {
  const [rows] = await executor.execute(
    `SELECT id_movimiento_caja,id_caja,id_venta,id_usuario,tipo_movimiento,naturaleza,afecta_efectivo,monto,concepto,fecha_movimiento,creado_en FROM movimientos_caja WHERE id_caja=? ORDER BY fecha_movimiento,id_movimiento_caja`,
    [cashId],
  );
  return rows.map((row) => ({
    ...row,
    afecta_efectivo: Boolean(row.afecta_efectivo),
  }));
}

async function lockMovements(connection, cashId) {
  const [rows] = await connection.execute(
    'SELECT id_movimiento_caja,naturaleza,afecta_efectivo,monto FROM movimientos_caja WHERE id_caja=? ORDER BY id_movimiento_caja FOR UPDATE',
    [cashId],
  );
  return rows;
}

async function createMovement(connection, cashId, userId, data) {
  const [result] = await connection.execute(
    `INSERT INTO movimientos_caja(id_caja,id_venta,id_usuario,tipo_movimiento,naturaleza,afecta_efectivo,monto,concepto,fecha_movimiento) VALUES(?,NULL,?,?,?,TRUE,?,?,NOW())`,
    [cashId, userId, data.type, data.nature, data.amount.fixed, data.concept],
  );
  return result.insertId;
}

async function close(connection, cashId, data) {
  const [result] = await connection.execute(
    `UPDATE cajas SET fecha_cierre=NOW(),monto_cierre=?,monto_esperado=?,monto_contado=?,diferencia=?,estado='cerrada',observacion=? WHERE id_caja=? AND estado='abierta'`,
    [
      data.counted,
      data.expected,
      data.counted,
      data.difference,
      data.observation,
      cashId,
    ],
  );
  return result.affectedRows;
}

async function createAudit(connection, data) {
  await connection.execute(
    `INSERT INTO bitacora(id_usuario,modulo,accion,entidad,id_entidad,datos_anteriores,datos_nuevos,direccion_ip,resultado,fecha_evento) VALUES(?,'caja',?,'cajas',?,?,?,?,'exitoso',NOW())`,
    [
      data.userId,
      data.action,
      data.cashId,
      data.previousData ? JSON.stringify(data.previousData) : null,
      data.newData ? JSON.stringify(data.newData) : null,
      data.ipAddress || null,
    ],
  );
}

module.exports = {
  close,
  count,
  countClosedForSupervision,
  create,
  createAudit,
  createMovement,
  findOpenByUser,
  findClosedByIdForSupervision,
  findOwnedById,
  findOwnedByIdForUpdate,
  list,
  listClosedForSupervision,
  listMovements,
  listSupervisionUsers,
  lockMovements,
  lockUser,
};
