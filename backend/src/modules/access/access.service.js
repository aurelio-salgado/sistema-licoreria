const pool = require("../../config/database");
const repository = require("./access.repository");
const validation = require("./access.validation");

function error(statusCode, message) {
  const value = new Error(message);
  value.statusCode = statusCode;
  return value;
}
function roleView(role, permissions) {
  return { ...role, es_sistema: Boolean(role.es_sistema), permissions };
}
async function listRoles() {
  const roles = await repository.listRoles(pool);
  return Promise.all(
    roles.map(async (role) =>
      roleView(role, await repository.rolePermissions(pool, role.id_rol)),
    ),
  );
}
async function getRole(rawId) {
  const role = await repository.findRole(pool, validation.id(rawId));
  if (!role) throw error(404, "Rol no encontrado");
  return roleView(role, await repository.rolePermissions(pool, role.id_rol));
}
async function listPermissions() {
  return repository.listPermissions(pool);
}
async function updatePermissions(rawId, body, actor) {
  const roleId = validation.id(rawId);
  const permissionIds = validation.permissions(body);
  const connection = await pool.getConnection();
  let started = false;
  try {
    await connection.beginTransaction();
    started = true;
    const role = await repository.findRole(connection, roleId, true);
    if (!role) throw error(404, "Rol no encontrado");
    if (role.nombre === "Administrador")
      throw error(409, "Los permisos del rol Administrador estan protegidos");
    if (!["Vendedor", "Consulta"].includes(role.nombre))
      throw error(409, "El rol no admite cambios de permisos");
    const current = await repository.rolePermissions(connection, roleId, true);
    const existing = await repository.lockPermissions(
      connection,
      permissionIds,
    );
    if (existing.length !== permissionIds.length)
      throw error(400, "Uno o mas permisos no existen");
    await repository.replacePermissions(connection, roleId, permissionIds);
    const updated = await repository.rolePermissions(connection, roleId);
    await repository.audit(connection, {
      actor: actor.userId,
      roleId,
      before: { permission_ids: current.map((item) => item.id_permiso) },
      after: { permission_ids: updated.map((item) => item.id_permiso) },
      ip: actor.ipAddress,
    });
    await connection.commit();
    started = false;
    return roleView(role, updated);
  } catch (value) {
    if (started) {
      try {
        await connection.rollback();
      } catch {
        /* Respuesta saneada global. */
      }
    }
    throw value;
  } finally {
    connection.release();
  }
}
module.exports = { getRole, listPermissions, listRoles, updatePermissions };
