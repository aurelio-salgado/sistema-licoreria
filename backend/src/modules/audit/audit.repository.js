const EVENT_COLUMNS = `
  b.id_bitacora,
  b.id_usuario,
  b.modulo,
  b.accion,
  b.entidad,
  b.id_entidad,
  b.datos_anteriores,
  b.datos_nuevos,
  b.direccion_ip,
  b.resultado,
  b.fecha_evento,
  u.nombre AS usuario_nombre,
  u.apellido AS usuario_apellido,
  u.nombre_usuario AS usuario_nombre_usuario
`;

function buildWhere(filters) {
  const conditions = [];
  const values = [];
  const equalityFilters = [
    [filters.userId, 'b.id_usuario = ?'],
    [filters.module, 'b.modulo = ?'],
    [filters.action, 'b.accion = ?'],
    [filters.entity, 'b.entidad = ?'],
    [filters.entityId, 'b.id_entidad = ?'],
    [filters.result, 'b.resultado = ?'],
  ];

  for (const [value, condition] of equalityFilters) {
    if (value !== null) {
      conditions.push(condition);
      values.push(value);
    }
  }

  if (filters.dateFrom) {
    conditions.push('b.fecha_evento >= ?');
    values.push(`${filters.dateFrom} 00:00:00`);
  }

  if (filters.dateTo) {
    conditions.push('b.fecha_evento < DATE_ADD(?, INTERVAL 1 DAY)');
    values.push(`${filters.dateTo} 00:00:00`);
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

async function list(connection, filters) {
  const where = buildWhere(filters);
  const [rows] = await connection.execute(
    `SELECT ${EVENT_COLUMNS}
     FROM bitacora AS b
     LEFT JOIN usuarios AS u ON u.id_usuario = b.id_usuario
     ${where.clause}
     ORDER BY b.fecha_evento DESC, b.id_bitacora DESC
     LIMIT ? OFFSET ?`,
    [...where.values, filters.limit, (filters.page - 1) * filters.limit],
  );

  return rows;
}

async function count(connection, filters) {
  const where = buildWhere(filters);
  const [[row]] = await connection.execute(
    `SELECT COUNT(*) AS total
     FROM bitacora AS b
     ${where.clause}`,
    where.values,
  );

  return Number(row.total);
}

async function findById(connection, auditId) {
  const [rows] = await connection.execute(
    `SELECT ${EVENT_COLUMNS}
     FROM bitacora AS b
     LEFT JOIN usuarios AS u ON u.id_usuario = b.id_usuario
     WHERE b.id_bitacora = ?
     LIMIT 1`,
    [auditId],
  );

  return rows[0] || null;
}

module.exports = { count, findById, list };
