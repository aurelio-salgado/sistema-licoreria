const CATEGORY_COLUMNS = `
  id_categoria,
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
  const [categories] = await executor.execute(
    `SELECT ${CATEGORY_COLUMNS}
     FROM categorias
     ${clause}
     ORDER BY nombre, id_categoria
     LIMIT ? OFFSET ?`,
    [...values, filters.limit, offset],
  );

  return categories;
}

async function count(executor, filters) {
  const { clause, values } = buildListFilters(filters);
  const [[result]] = await executor.execute(
    `SELECT COUNT(*) AS total
     FROM categorias
     ${clause}`,
    values,
  );

  return Number(result.total);
}

async function findById(executor, categoryId) {
  const [categories] = await executor.execute(
    `SELECT ${CATEGORY_COLUMNS}
     FROM categorias
     WHERE id_categoria = ?
     LIMIT 1`,
    [categoryId],
  );

  return categories[0] || null;
}

async function findByIdForUpdate(connection, categoryId) {
  const [categories] = await connection.execute(
    `SELECT ${CATEGORY_COLUMNS}
     FROM categorias
     WHERE id_categoria = ?
     LIMIT 1
     FOR UPDATE`,
    [categoryId],
  );

  return categories[0] || null;
}

async function findByName(executor, name, excludedCategoryId = null) {
  const [categories] = await executor.execute(
    `SELECT id_categoria
     FROM categorias
     WHERE nombre = ?
       AND (? IS NULL OR id_categoria <> ?)
     LIMIT 1`,
    [name, excludedCategoryId, excludedCategoryId],
  );

  return categories[0] || null;
}

async function create(connection, { name, description }) {
  const [result] = await connection.execute(
    `INSERT INTO categorias (nombre, descripcion, estado)
     VALUES (?, ?, ?)`,
    [name, description, 'activo'],
  );

  return result.insertId;
}

async function update(connection, categoryId, { name, description }) {
  await connection.execute(
    `UPDATE categorias
     SET nombre = ?, descripcion = ?
     WHERE id_categoria = ?`,
    [name, description, categoryId],
  );
}

async function changeStatus(connection, categoryId, state) {
  await connection.execute(
    `UPDATE categorias
     SET estado = ?
     WHERE id_categoria = ?`,
    [state, categoryId],
  );
}

async function createAudit(
  connection,
  { userId, action, categoryId, previousData, newData, ipAddress },
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
      'categorias',
      action,
      'categorias',
      categoryId,
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
