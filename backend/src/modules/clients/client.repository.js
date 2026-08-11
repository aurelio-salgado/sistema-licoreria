const CLIENT_COLUMNS = `
  id_cliente,
  nombre,
  identificacion,
  telefono,
  correo,
  direccion,
  es_consumidor_final,
  estado,
  creado_en,
  actualizado_en
`;

function normalizeClient(client) {
  return client
    ? { ...client, es_consumidor_final: Boolean(client.es_consumidor_final) }
    : null;
}

function buildListFilters({ search, status }) {
  const conditions = [];
  const values = [];
  if (search) {
    conditions.push(
      '(nombre LIKE ? OR identificacion LIKE ? OR correo LIKE ? OR telefono LIKE ?)',
    );
    const pattern = `%${search}%`;
    values.push(pattern, pattern, pattern, pattern);
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
  const [clients] = await executor.execute(
    `SELECT ${CLIENT_COLUMNS} FROM clientes ${clause}
     ORDER BY es_consumidor_final DESC, nombre, id_cliente LIMIT ? OFFSET ?`,
    [...values, filters.limit, (filters.page - 1) * filters.limit],
  );
  return clients.map(normalizeClient);
}

async function count(executor, filters) {
  const { clause, values } = buildListFilters(filters);
  const [[result]] = await executor.execute(
    `SELECT COUNT(*) AS total FROM clientes ${clause}`,
    values,
  );
  return Number(result.total);
}

async function findById(executor, clientId) {
  const [clients] = await executor.execute(
    `SELECT ${CLIENT_COLUMNS} FROM clientes WHERE id_cliente = ? LIMIT 1`,
    [clientId],
  );
  return normalizeClient(clients[0]);
}

async function findByIdForUpdate(connection, clientId) {
  const [clients] = await connection.execute(
    `SELECT ${CLIENT_COLUMNS} FROM clientes
     WHERE id_cliente = ? LIMIT 1 FOR UPDATE`,
    [clientId],
  );
  return normalizeClient(clients[0]);
}

async function findByIdentification(
  executor,
  identification,
  excludedClientId = null,
) {
  const [clients] = await executor.execute(
    `SELECT id_cliente FROM clientes WHERE identificacion = ?
     AND (? IS NULL OR id_cliente <> ?) LIMIT 1`,
    [identification, excludedClientId, excludedClientId],
  );
  return clients[0] || null;
}

async function findFinalConsumerForUpdate(connection) {
  const [clients] = await connection.execute(
    `SELECT id_cliente, es_consumidor_final, estado FROM clientes
     WHERE es_consumidor_final = ? LIMIT 1 FOR UPDATE`,
    [true],
  );
  return normalizeClient(clients[0]);
}

async function create(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO clientes (
       nombre, identificacion, telefono, correo, direccion,
       es_consumidor_final, estado
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.identification,
      data.phone,
      data.email,
      data.address,
      false,
      'activo',
    ],
  );
  return result.insertId;
}

async function update(connection, clientId, data) {
  await connection.execute(
    `UPDATE clientes SET nombre = ?, identificacion = ?, telefono = ?,
       correo = ?, direccion = ? WHERE id_cliente = ?`,
    [
      data.name,
      data.identification,
      data.phone,
      data.email,
      data.address,
      clientId,
    ],
  );
}

async function changeStatus(connection, clientId, state) {
  await connection.execute(
    'UPDATE clientes SET estado = ? WHERE id_cliente = ?',
    [state, clientId],
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
      'clientes',
      data.action,
      'clientes',
      data.clientId,
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
  findByIdentification,
  findFinalConsumerForUpdate,
  list,
  update,
};
