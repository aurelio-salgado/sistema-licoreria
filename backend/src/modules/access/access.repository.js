async function listRoles(e) {
  const [rows] = await e.execute(
    "SELECT id_rol,nombre,descripcion,es_sistema,estado,creado_en,actualizado_en FROM roles ORDER BY nombre,id_rol",
  );
  return rows;
}
async function findRole(e, id, lock = false) {
  const [rows] = await e.execute(
    `SELECT id_rol,nombre,descripcion,es_sistema,estado,creado_en,actualizado_en FROM roles WHERE id_rol=? LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [id],
  );
  return rows[0] || null;
}
async function listPermissions(e) {
  const [rows] = await e.execute(
    "SELECT id_permiso,codigo,nombre,modulo,descripcion,creado_en FROM permisos ORDER BY modulo,codigo,id_permiso",
  );
  return rows;
}
async function rolePermissions(e, roleId, lock = false) {
  const [rows] = await e.execute(
    `SELECT p.id_permiso,p.codigo,p.nombre,p.modulo,p.descripcion,p.creado_en FROM rol_permisos rp INNER JOIN permisos p ON p.id_permiso=rp.id_permiso WHERE rp.id_rol=? ORDER BY p.id_permiso${lock ? " FOR UPDATE" : ""}`,
    [roleId],
  );
  return rows;
}
async function lockPermissions(e, ids) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await e.execute(
    `SELECT id_permiso FROM permisos WHERE id_permiso IN (${placeholders}) ORDER BY id_permiso FOR UPDATE`,
    ids,
  );
  return rows;
}
async function replacePermissions(e, roleId, ids) {
  await e.execute("DELETE FROM rol_permisos WHERE id_rol=?", [roleId]);
  for (const permissionId of ids) {
    await e.execute("INSERT INTO rol_permisos(id_rol,id_permiso) VALUES(?,?)", [
      roleId,
      permissionId,
    ]);
  }
}
async function audit(e, data) {
  await e.execute(
    "INSERT INTO bitacora(id_usuario,modulo,accion,entidad,id_entidad,datos_anteriores,datos_nuevos,direccion_ip,resultado,fecha_evento) VALUES(?,'roles','cambiar_permisos','rol',?,?,?,?,'exitoso',NOW())",
    [
      data.actor,
      data.roleId,
      JSON.stringify(data.before),
      JSON.stringify(data.after),
      data.ip || null,
    ],
  );
}
module.exports = {
  audit,
  findRole,
  listPermissions,
  listRoles,
  lockPermissions,
  replacePermissions,
  rolePermissions,
};
