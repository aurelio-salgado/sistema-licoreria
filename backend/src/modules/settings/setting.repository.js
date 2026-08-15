const SETTING_COLUMNS = `
  id_configuracion,
  clave,
  valor,
  tipo_dato,
  descripcion,
  es_critica,
  actualizado_en
`;

async function list(connection, keys) {
  const placeholders = keys.map(() => '?').join(',');
  const [rows] = await connection.execute(
    `SELECT ${SETTING_COLUMNS}
     FROM configuracion
     WHERE clave IN (${placeholders})`,
    keys,
  );

  return rows;
}

async function findByKeyForUpdate(connection, key) {
  const [rows] = await connection.execute(
    `SELECT ${SETTING_COLUMNS}
     FROM configuracion
     WHERE clave = ?
     LIMIT 1
     FOR UPDATE`,
    [key],
  );

  return rows[0] || null;
}

async function hasHistoricalSeries(connection, series) {
  const [rows] = await connection.execute(
    `SELECT id_venta
     FROM ventas
     WHERE numero_factura LIKE CONCAT(?, '-%')
     LIMIT 1`,
    [series],
  );

  return rows.length > 0;
}

async function updateValue(connection, settingId, value, userId) {
  await connection.execute(
    `UPDATE configuracion
     SET valor = ?, id_usuario_actualizacion = ?
     WHERE id_configuracion = ?`,
    [value, userId, settingId],
  );
}

async function audit(connection, data) {
  await connection.execute(
    `INSERT INTO bitacora
       (id_usuario, modulo, accion, entidad, id_entidad,
        datos_anteriores, datos_nuevos, direccion_ip, resultado, fecha_evento)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.userId,
      'configuracion',
      'actualizar',
      'configuracion',
      data.settingId,
      JSON.stringify(data.previousData),
      JSON.stringify(data.newData),
      data.ipAddress || null,
      'exitoso',
    ],
  );
}

module.exports = {
  audit,
  findByKeyForUpdate,
  hasHistoricalSeries,
  list,
  updateValue,
};
