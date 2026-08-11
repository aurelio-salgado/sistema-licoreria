const UNIT_COLUMNS = `
  id_unidad,
  nombre,
  abreviatura,
  permite_decimales,
  estado,
  creado_en,
  actualizado_en
`;

function normalizeUnit(unit) {
  return unit
    ? { ...unit, permite_decimales: Boolean(unit.permite_decimales) }
    : null;
}

function buildListFilters({ search, status }) {
  const conditions = [];
  const values = [];

  if (search) {
    conditions.push('(nombre LIKE ? OR abreviatura LIKE ?)');
    const searchPattern = `%${search}%`;
    values.push(searchPattern, searchPattern);
  }

  if (status) {
    conditions.push('estado = ?');
    values.push(status);
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

async function list(executor, filters) {
  const { clause, values } = buildListFilters(filters);
  const offset = (filters.page - 1) * filters.limit;
  const [units] = await executor.execute(
    `SELECT ${UNIT_COLUMNS}
     FROM unidades_medida
     ${clause}
     ORDER BY nombre, id_unidad
     LIMIT ? OFFSET ?`,
    [...values, filters.limit, offset],
  );

  return units.map(normalizeUnit);
}

async function count(executor, filters) {
  const { clause, values } = buildListFilters(filters);
  const [[result]] = await executor.execute(
    `SELECT COUNT(*) AS total
     FROM unidades_medida
     ${clause}`,
    values,
  );

  return Number(result.total);
}

async function findById(executor, unitId) {
  const [units] = await executor.execute(
    `SELECT ${UNIT_COLUMNS}
     FROM unidades_medida
     WHERE id_unidad = ?
     LIMIT 1`,
    [unitId],
  );

  return normalizeUnit(units[0]);
}

async function findByIdForUpdate(connection, unitId) {
  const [units] = await connection.execute(
    `SELECT ${UNIT_COLUMNS}
     FROM unidades_medida
     WHERE id_unidad = ?
     LIMIT 1
     FOR UPDATE`,
    [unitId],
  );

  return normalizeUnit(units[0]);
}

async function findByName(executor, name, excludedUnitId = null) {
  const [units] = await executor.execute(
    `SELECT id_unidad
     FROM unidades_medida
     WHERE nombre = ?
       AND (? IS NULL OR id_unidad <> ?)
     LIMIT 1`,
    [name, excludedUnitId, excludedUnitId],
  );

  return units[0] || null;
}

async function findByAbbreviation(
  executor,
  abbreviation,
  excludedUnitId = null,
) {
  const [units] = await executor.execute(
    `SELECT id_unidad
     FROM unidades_medida
     WHERE abreviatura = ?
       AND (? IS NULL OR id_unidad <> ?)
     LIMIT 1`,
    [abbreviation, excludedUnitId, excludedUnitId],
  );

  return units[0] || null;
}

async function create(connection, { name, abbreviation, allowsDecimals }) {
  const [result] = await connection.execute(
    `INSERT INTO unidades_medida (
       nombre,
       abreviatura,
       permite_decimales,
       estado
     ) VALUES (?, ?, ?, ?)`,
    [name, abbreviation, allowsDecimals, 'activo'],
  );

  return result.insertId;
}

async function update(
  connection,
  unitId,
  { name, abbreviation, allowsDecimals },
) {
  await connection.execute(
    `UPDATE unidades_medida
     SET nombre = ?, abreviatura = ?, permite_decimales = ?
     WHERE id_unidad = ?`,
    [name, abbreviation, allowsDecimals, unitId],
  );
}

async function changeStatus(connection, unitId, state) {
  await connection.execute(
    `UPDATE unidades_medida
     SET estado = ?
     WHERE id_unidad = ?`,
    [state, unitId],
  );
}

async function createAudit(
  connection,
  { userId, action, unitId, previousData, newData, ipAddress },
) {
  await connection.execute(
    `INSERT INTO bitacora (
       id_usuario,
       modulo,
       accion,
       entidad,
       id_entidad,
       datos_anteriores,
       datos_nuevos,
       direccion_ip,
       resultado,
       fecha_evento
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      userId,
      'unidades_medida',
      action,
      'unidades_medida',
      unitId,
      previousData ? JSON.stringify(previousData) : null,
      newData ? JSON.stringify(newData) : null,
      ipAddress || null,
      'exitoso',
    ],
  );
}

module.exports = {
  changeStatus,
  count,
  create,
  createAudit,
  findByAbbreviation,
  findById,
  findByIdForUpdate,
  findByName,
  list,
  update,
};
