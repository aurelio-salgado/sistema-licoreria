const SUPPLIER_COLUMNS = `
  id_proveedor,
  nombre,
  identificacion_fiscal,
  contacto,
  telefono,
  correo,
  direccion,
  estado,
  creado_en,
  actualizado_en
`;

function buildListFilters({ search, status }) {
  const conditions = [];
  const values = [];
  if (search) {
    conditions.push(
      '(nombre LIKE ? OR identificacion_fiscal LIKE ? OR contacto LIKE ? OR correo LIKE ? OR telefono LIKE ?)',
    );
    const pattern = `%${search}%`;
    values.push(pattern, pattern, pattern, pattern, pattern);
  }
  if (status) {
    conditions.push('estado = ?');
    values.push(status);
  }
  return {
    clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

async function list(executor, filters) {
  const { clause, values } = buildListFilters(filters);
  const [suppliers] = await executor.execute(
    `SELECT ${SUPPLIER_COLUMNS} FROM proveedores ${clause}
     ORDER BY nombre, id_proveedor LIMIT ? OFFSET ?`,
    [...values, filters.limit, (filters.page - 1) * filters.limit],
  );
  return suppliers;
}

async function count(executor, filters) {
  const { clause, values } = buildListFilters(filters);
  const [[result]] = await executor.execute(
    `SELECT COUNT(*) AS total FROM proveedores ${clause}`,
    values,
  );
  return Number(result.total);
}

async function findById(executor, supplierId) {
  const [suppliers] = await executor.execute(
    `SELECT ${SUPPLIER_COLUMNS} FROM proveedores
     WHERE id_proveedor = ? LIMIT 1`,
    [supplierId],
  );
  return suppliers[0] || null;
}

async function findByIdForUpdate(connection, supplierId) {
  const [suppliers] = await connection.execute(
    `SELECT ${SUPPLIER_COLUMNS} FROM proveedores
     WHERE id_proveedor = ? LIMIT 1 FOR UPDATE`,
    [supplierId],
  );
  return suppliers[0] || null;
}

async function findByTaxIdentification(
  executor,
  taxIdentification,
  excludedSupplierId = null,
) {
  const [suppliers] = await executor.execute(
    `SELECT id_proveedor FROM proveedores WHERE identificacion_fiscal = ?
     AND (? IS NULL OR id_proveedor <> ?) LIMIT 1`,
    [taxIdentification, excludedSupplierId, excludedSupplierId],
  );
  return suppliers[0] || null;
}

async function create(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO proveedores (
       nombre, identificacion_fiscal, contacto, telefono, correo, direccion,
       estado
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.taxIdentification,
      data.contact,
      data.phone,
      data.email,
      data.address,
      'activo',
    ],
  );
  return result.insertId;
}

async function update(connection, supplierId, data) {
  await connection.execute(
    `UPDATE proveedores SET nombre = ?, identificacion_fiscal = ?,
       contacto = ?, telefono = ?, correo = ?, direccion = ?
     WHERE id_proveedor = ?`,
    [
      data.name,
      data.taxIdentification,
      data.contact,
      data.phone,
      data.email,
      data.address,
      supplierId,
    ],
  );
}

async function changeStatus(connection, supplierId, state) {
  await connection.execute(
    'UPDATE proveedores SET estado = ? WHERE id_proveedor = ?',
    [state, supplierId],
  );
}

async function createAudit(connection, data) {
  await connection.execute(
    `INSERT INTO bitacora (
       id_usuario, modulo, accion, entidad, id_entidad, datos_anteriores,
       datos_nuevos, direccion_ip, resultado, fecha_evento
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.userId,
      'proveedores',
      data.action,
      'proveedores',
      data.supplierId,
      data.previousData ? JSON.stringify(data.previousData) : null,
      data.newData ? JSON.stringify(data.newData) : null,
      data.ipAddress || null,
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
  findByTaxIdentification,
  list,
  update,
};
