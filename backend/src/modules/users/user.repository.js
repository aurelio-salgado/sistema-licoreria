const COL = `u.id_usuario,u.nombre,u.apellido,u.nombre_usuario,u.correo,u.estado,u.intentos_fallidos,u.bloqueado_hasta,u.ultimo_acceso,u.creado_en,u.actualizado_en,r.id_rol,r.nombre rol_nombre,r.descripcion rol_descripcion,r.estado rol_estado`;
function where(f) {
  const c = [],
    v = [];
  if (f.status) {
    c.push("u.estado=?");
    v.push(f.status);
  }
  if (f.roleId) {
    c.push("r.id_rol=?");
    v.push(f.roleId);
  }
  if (f.search) {
    c.push(
      "(u.nombre LIKE ? OR u.apellido LIKE ? OR u.nombre_usuario LIKE ? OR u.correo LIKE ?)",
    );
    const p = `%${f.search}%`;
    v.push(p, p, p, p);
  }
  return { q: c.length ? `WHERE ${c.join(" AND ")}` : "", v };
}
const SINGLE_ROLE =
  "(SELECT id_usuario,MIN(id_rol) id_rol FROM usuario_roles GROUP BY id_usuario)";
async function list(e, f) {
  const w = where(f);
  const [r] = await e.execute(
    `SELECT ${COL} FROM usuarios u INNER JOIN ${SINGLE_ROLE} ur ON ur.id_usuario=u.id_usuario INNER JOIN roles r ON r.id_rol=ur.id_rol ${w.q} ORDER BY u.nombre,u.apellido,u.id_usuario LIMIT ? OFFSET ?`,
    [...w.v, f.limit, (f.page - 1) * f.limit],
  );
  return r;
}
async function count(e, f) {
  const w = where(f);
  const [[r]] = await e.execute(
    `SELECT COUNT(*) total FROM usuarios u INNER JOIN ${SINGLE_ROLE} ur ON ur.id_usuario=u.id_usuario INNER JOIN roles r ON r.id_rol=ur.id_rol ${w.q}`,
    w.v,
  );
  return Number(r.total);
}
async function find(e, id, lock = false) {
  const [r] = await e.execute(
    `SELECT ${COL} FROM usuarios u INNER JOIN usuario_roles ur ON ur.id_usuario=u.id_usuario INNER JOIN roles r ON r.id_rol=ur.id_rol WHERE u.id_usuario=? LIMIT 2${lock ? " FOR UPDATE" : ""}`,
    [id],
  );
  return r;
}
async function duplicate(e, d, excluded = null) {
  const [r] = await e.execute(
    "SELECT id_usuario,nombre_usuario,correo FROM usuarios WHERE (nombre_usuario=? OR (? IS NOT NULL AND correo=?)) AND (? IS NULL OR id_usuario<>?) LIMIT 1",
    [d.username, d.email, d.email, excluded, excluded],
  );
  return r[0] || null;
}
async function role(e, id, lock = false) {
  const [r] = await e.execute(
    `SELECT id_rol,nombre,estado FROM roles WHERE id_rol=? LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [id],
  );
  return r[0] || null;
}
async function adminRoleLock(c) {
  const [r] = await c.execute(
    "SELECT id_rol,nombre,estado FROM roles WHERE nombre='Administrador' LIMIT 1 FOR UPDATE",
  );
  return r[0] || null;
}
async function activeAdmins(c, roleId) {
  const [r] = await c.execute(
    "SELECT u.id_usuario FROM usuarios u INNER JOIN usuario_roles ur ON ur.id_usuario=u.id_usuario WHERE ur.id_rol=? AND u.estado='activo' ORDER BY u.id_usuario FOR UPDATE",
    [roleId],
  );
  return r;
}
async function create(c, d, hash) {
  const [r] = await c.execute(
    "INSERT INTO usuarios(nombre,apellido,nombre_usuario,correo,password_hash,estado,intentos_fallidos,bloqueado_hasta,ultimo_acceso) VALUES(?,?,?,?,?,'activo',0,NULL,NULL)",
    [d.name, d.lastName, d.username, d.email, hash],
  );
  return r.insertId;
}
async function assign(c, userId, roleId, actor) {
  await c.execute(
    "INSERT INTO usuario_roles(id_usuario,id_rol,asignado_por) VALUES(?,?,?)",
    [userId, roleId, actor],
  );
}
async function update(c, id, d) {
  await c.execute(
    "UPDATE usuarios SET nombre=?,apellido=?,nombre_usuario=?,correo=? WHERE id_usuario=?",
    [d.name, d.lastName, d.username, d.email, id],
  );
}
async function state(c, id, s) {
  await c.execute("UPDATE usuarios SET estado=? WHERE id_usuario=?", [s, id]);
}
async function replaceRole(c, id, roleId, actor) {
  await c.execute("DELETE FROM usuario_roles WHERE id_usuario=?", [id]);
  await assign(c, id, roleId, actor);
}
async function audit(c, d) {
  await c.execute(
    "INSERT INTO bitacora(id_usuario,modulo,accion,entidad,id_entidad,datos_anteriores,datos_nuevos,direccion_ip,resultado,fecha_evento) VALUES(?,'usuarios',? ,?, ?,?,?,?,'exitoso',NOW())",
    [
      d.actor,
      d.action,
      d.entity,
      d.entityId,
      d.before ? JSON.stringify(d.before) : null,
      d.after ? JSON.stringify(d.after) : null,
      d.ip || null,
    ],
  );
}
module.exports = {
  activeAdmins,
  adminRoleLock,
  assign,
  audit,
  count,
  create,
  duplicate,
  find,
  list,
  replaceRole,
  role,
  state,
  update,
};
