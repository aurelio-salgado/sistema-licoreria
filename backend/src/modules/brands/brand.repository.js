const BRAND_COLUMNS = `
  id_marca,
  nombre,
  descripcion,
  estado,
  creado_en,
  actualizado_en
`;

function buildListFilters({ search, status }) {
  const conditions = [];
  const values = [];

  if (search) {
    conditions.push('nombre LIKE ?');
    const searchPattern = `%${search}%`;
    values.push(searchPattern);
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
  const [brands] = await executor.execute(
    `SELECT ${BRAND_COLUMNS}
     FROM marcas
     ${clause}
     ORDER BY nombre, id_marca
     LIMIT ? OFFSET ?`,
    [...values, filters.limit, offset],
  );

  return brands;
}

async function count(executor, filters) {
  const { clause, values } = buildListFilters(filters);
  const [[result]] = await executor.execute(
    `SELECT COUNT(*) AS total
     FROM marcas
     ${clause}`,
    values,
  );

  return Number(result.total);
}

async function findById(executor, brandId) {
  const [brands] = await executor.execute(
    `SELECT ${BRAND_COLUMNS}
     FROM marcas
     WHERE id_marca = ?
     LIMIT 1`,
    [brandId],
  );

  return brands[0] || null;
}

async function findByIdForUpdate(connection, brandId) {
  const [brands] = await connection.execute(
    `SELECT ${BRAND_COLUMNS}
     FROM marcas
     WHERE id_marca = ?
     LIMIT 1
     FOR UPDATE`,
    [brandId],
  );

  return brands[0] || null;
}

async function findByName(executor, name, excludedBrandId = null) {
  const [brands] = await executor.execute(
    `SELECT id_marca
     FROM marcas
     WHERE nombre = ?
       AND (? IS NULL OR id_marca <> ?)
     LIMIT 1`,
    [name, excludedBrandId, excludedBrandId],
  );

  return brands[0] || null;
}

async function create(connection, { name, description }) {
  const [result] = await connection.execute(
    `INSERT INTO marcas (nombre, descripcion, estado)
     VALUES (?, ?, ?)`,
    [name, description, 'activo'],
  );

  return result.insertId;
}

async function update(connection, brandId, { name, description }) {
  await connection.execute(
    `UPDATE marcas
     SET nombre = ?, descripcion = ?
     WHERE id_marca = ?`,
    [name, description, brandId],
  );
}

async function changeStatus(connection, brandId, state) {
  await connection.execute(
    `UPDATE marcas
     SET estado = ?
     WHERE id_marca = ?`,
    [state, brandId],
  );
}

async function createAudit(
  connection,
  { userId, action, brandId, previousData, newData, ipAddress },
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
      'marcas',
      action,
      'marcas',
      brandId,
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
  findById,
  findByIdForUpdate,
  findByName,
  list,
  update,
};
