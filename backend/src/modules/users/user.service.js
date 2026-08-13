const bcrypt = require("bcrypt");

const pool = require("../../config/database");
const repository = require("./user.repository");
const validation = require("./user.validation");

function error(statusCode, message) {
  const value = new Error(message);
  value.statusCode = statusCode;
  return value;
}

function publicUser(row) {
  return {
    id_usuario: row.id_usuario,
    nombre: row.nombre,
    apellido: row.apellido,
    nombre_usuario: row.nombre_usuario,
    correo: row.correo,
    estado: row.estado,
    intentos_fallidos: row.intentos_fallidos,
    bloqueado_hasta: row.bloqueado_hasta,
    ultimo_acceso: row.ultimo_acceso,
    creado_en: row.creado_en,
    actualizado_en: row.actualizado_en,
    role: {
      id_rol: row.id_rol,
      nombre: row.rol_nombre,
      descripcion: row.rol_descripcion,
      estado: row.rol_estado,
    },
  };
}

function databaseError(value) {
  if (value?.code === "ER_DUP_ENTRY") {
    return error(409, "El nombre de usuario o correo ya existe");
  }
  return value;
}

async function transaction(operation) {
  const connection = await pool.getConnection();
  let started = false;
  try {
    await connection.beginTransaction();
    started = true;
    const result = await operation(connection);
    await connection.commit();
    started = false;
    return result;
  } catch (value) {
    if (started) {
      try {
        await connection.rollback();
      } catch {
        /* Respuesta saneada global. */
      }
    }
    throw databaseError(value);
  } finally {
    connection.release();
  }
}

function oneUser(rows) {
  if (!rows.length) throw error(404, "Usuario no encontrado");
  if (rows.length !== 1)
    throw error(409, "El usuario no tiene una asignacion de rol valida");
  return rows[0];
}

async function listUsers(query) {
  const filters = validation.list(query);
  const [rows, total] = await Promise.all([
    repository.list(pool, filters),
    repository.count(pool, filters),
  ]);
  return {
    users: rows.map(publicUser),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      total_pages: Math.ceil(total / filters.limit),
    },
  };
}

async function getUser(rawId) {
  const rows = await repository.find(pool, validation.id(rawId));
  return publicUser(oneUser(rows));
}

async function createUser(body, actor) {
  const data = validation.profile(body, true);
  const passwordHash = await bcrypt.hash(data.password, 12);
  return transaction(async (connection) => {
    const role = await repository.role(connection, data.roleId, true);
    if (!role || role.estado !== "activo")
      throw error(400, "El rol no existe o no esta activo");
    if (await repository.duplicate(connection, data))
      throw error(409, "El nombre de usuario o correo ya existe");
    const userId = await repository.create(connection, data, passwordHash);
    await repository.assign(connection, userId, data.roleId, actor.userId);
    const user = publicUser(oneUser(await repository.find(connection, userId)));
    await repository.audit(connection, {
      actor: actor.userId,
      action: "crear",
      entity: "usuario",
      entityId: userId,
      after: user,
      ip: actor.ipAddress,
    });
    return user;
  });
}

async function updateUser(rawId, body, actor) {
  const userId = validation.id(rawId);
  const data = validation.profile(body, false);
  return transaction(async (connection) => {
    const current = oneUser(await repository.find(connection, userId, true));
    if (await repository.duplicate(connection, data, userId))
      throw error(409, "El nombre de usuario o correo ya existe");
    await repository.update(connection, userId, data);
    const updated = publicUser(
      oneUser(await repository.find(connection, userId)),
    );
    await repository.audit(connection, {
      actor: actor.userId,
      action: "editar",
      entity: "usuario",
      entityId: userId,
      before: publicUser(current),
      after: updated,
      ip: actor.ipAddress,
    });
    return updated;
  });
}

async function changeStatus(rawId, body, actor) {
  const userId = validation.id(rawId);
  const state = validation.status(body);
  return transaction(async (connection) => {
    const adminRole = await repository.adminRoleLock(connection);
    if (!adminRole) throw error(409, "No se encontro el rol Administrador");
    const current = oneUser(await repository.find(connection, userId, true));
    if (userId === actor.userId && state === "inactivo")
      throw error(409, "No puede desactivar su propio usuario");
    if (
      current.id_rol === adminRole.id_rol &&
      current.estado === "activo" &&
      state === "inactivo"
    ) {
      if (
        (await repository.activeAdmins(connection, adminRole.id_rol)).length <=
        1
      ) {
        throw error(409, "Debe existir al menos un Administrador activo");
      }
    }
    if (current.estado === state) return publicUser(current);
    await repository.state(connection, userId, state);
    const updated = publicUser(
      oneUser(await repository.find(connection, userId)),
    );
    await repository.audit(connection, {
      actor: actor.userId,
      action: state === "activo" ? "activar" : "desactivar",
      entity: "usuario",
      entityId: userId,
      before: publicUser(current),
      after: updated,
      ip: actor.ipAddress,
    });
    return updated;
  });
}

async function changeRole(rawId, body, actor) {
  const userId = validation.id(rawId);
  const roleId = validation.role(body);
  return transaction(async (connection) => {
    const adminRole = await repository.adminRoleLock(connection);
    if (!adminRole) throw error(409, "No se encontro el rol Administrador");
    const current = oneUser(await repository.find(connection, userId, true));
    const nextRole =
      roleId === adminRole.id_rol
        ? adminRole
        : await repository.role(connection, roleId, true);
    if (!nextRole || nextRole.estado !== "activo")
      throw error(400, "El rol no existe o no esta activo");
    if (current.id_rol === roleId) return publicUser(current);
    if (userId === actor.userId && current.id_rol === adminRole.id_rol) {
      throw error(409, "No puede retirar su propio rol Administrador");
    }
    if (current.id_rol === adminRole.id_rol && current.estado === "activo") {
      if (
        (await repository.activeAdmins(connection, adminRole.id_rol)).length <=
        1
      ) {
        throw error(409, "Debe existir al menos un Administrador activo");
      }
    }
    await repository.replaceRole(connection, userId, roleId, actor.userId);
    const updated = publicUser(
      oneUser(await repository.find(connection, userId)),
    );
    await repository.audit(connection, {
      actor: actor.userId,
      action: "cambiar_rol",
      entity: "usuario",
      entityId: userId,
      before: { role: publicUser(current).role },
      after: { role: updated.role },
      ip: actor.ipAddress,
    });
    return updated;
  });
}

module.exports = {
  changeRole,
  changeStatus,
  createUser,
  getUser,
  listUsers,
  updateUser,
};
