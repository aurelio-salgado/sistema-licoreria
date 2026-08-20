const KEY = 'jwt_session_epoch';

async function find(executor) {
  const [rows] = await executor.execute(
    'SELECT valor FROM configuracion WHERE clave = ? LIMIT 1',
    [KEY],
  );
  return rows[0]?.valor || null;
}

async function upsert(executor, value) {
  await executor.execute(
    `INSERT INTO configuracion
       (clave, valor, tipo_dato, descripcion, es_critica, id_usuario_actualizacion)
     VALUES (?, ?, 'uuid', 'Version interna global de sesiones JWT.', TRUE, NULL)
     ON DUPLICATE KEY UPDATE
       valor = VALUES(valor), tipo_dato = VALUES(tipo_dato),
       descripcion = VALUES(descripcion), es_critica = TRUE,
       id_usuario_actualizacion = NULL`,
    [KEY, value],
  );
}

async function insertIfMissing(executor, value) {
  await executor.execute(
    `INSERT IGNORE INTO configuracion
       (clave, valor, tipo_dato, descripcion, es_critica, id_usuario_actualizacion)
     VALUES (?, ?, 'uuid', 'Version interna global de sesiones JWT.', TRUE, NULL)`,
    [KEY, value],
  );
}

module.exports = { KEY, find, insertIfMissing, upsert };
