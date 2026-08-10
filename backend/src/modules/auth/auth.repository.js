async function findUserByUsername(connection, username) {
  const [users] = await connection.execute(
    `SELECT
       id_usuario,
       nombre,
       apellido,
       nombre_usuario,
       correo,
       password_hash,
       estado,
       intentos_fallidos,
       bloqueado_hasta,
       bloqueado_hasta > NOW() AS esta_bloqueado
     FROM usuarios
     WHERE nombre_usuario = ?
     LIMIT 1
     FOR UPDATE`,
    [username],
  );

  return users[0] || null;
}

async function registerFailedAttempt(
  connection,
  userId,
  failedAttempts,
  shouldBlock,
  blockDurationMinutes,
) {
  await connection.execute(
    `UPDATE usuarios
     SET intentos_fallidos = ?,
         bloqueado_hasta = CASE
           WHEN ? THEN DATE_ADD(NOW(), INTERVAL ? MINUTE)
           ELSE NULL
         END
     WHERE id_usuario = ?`,
    [failedAttempts, shouldBlock, blockDurationMinutes, userId],
  );
}

async function registerSuccessfulLogin(connection, userId) {
  await connection.execute(
    `UPDATE usuarios
     SET intentos_fallidos = 0,
         bloqueado_hasta = NULL,
         ultimo_acceso = NOW()
     WHERE id_usuario = ?`,
    [userId],
  );
}

async function findRolesByUserId(connection, userId) {
  const [roles] = await connection.execute(
    `SELECT DISTINCT r.nombre
     FROM usuario_roles AS ur
     INNER JOIN roles AS r ON r.id_rol = ur.id_rol
     WHERE ur.id_usuario = ? AND r.estado = ?
     ORDER BY r.nombre`,
    [userId, 'activo'],
  );

  return roles.map((role) => role.nombre);
}

async function findPermissionsByUserId(connection, userId) {
  const [permissions] = await connection.execute(
    `SELECT DISTINCT p.codigo
     FROM usuario_roles AS ur
     INNER JOIN roles AS r ON r.id_rol = ur.id_rol
     INNER JOIN rol_permisos AS rp ON rp.id_rol = r.id_rol
     INNER JOIN permisos AS p ON p.id_permiso = rp.id_permiso
     WHERE ur.id_usuario = ? AND r.estado = ?
     ORDER BY p.codigo`,
    [userId, 'activo'],
  );

  return permissions.map((permission) => permission.codigo);
}

async function createLoginAudit(connection, { userId, ipAddress, result }) {
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
      'autenticacion',
      'login',
      'usuarios',
      userId,
      null,
      null,
      ipAddress || null,
      result,
    ],
  );
}

module.exports = {
  createLoginAudit,
  findPermissionsByUserId,
  findRolesByUserId,
  findUserByUsername,
  registerFailedAttempt,
  registerSuccessfulLogin,
};
