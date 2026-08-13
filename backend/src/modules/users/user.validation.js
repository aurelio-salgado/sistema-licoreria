function bad(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function ensureObject(body) {
  if (!body || Array.isArray(body) || typeof body !== "object") {
    throw bad("El body debe ser un objeto");
  }
}

function id(value, name = "El id") {
  const stringValue = String(value ?? "").trim();
  if (
    !/^[1-9]\d*$/.test(stringValue) ||
    !Number.isSafeInteger(Number(stringValue))
  ) {
    throw bad(`${name} debe ser un entero positivo`);
  }
  return Number(stringValue);
}

function requiredText(value, name, maximum) {
  if (typeof value !== "string" || !value.trim())
    throw bad(`${name} es obligatorio`);
  const normalized = value.trim();
  if (normalized.length > maximum)
    throw bad(`${name} no puede superar ${maximum} caracteres`);
  return normalized;
}

function email(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw bad("correo debe ser texto o null");
  const normalized = value.trim();
  if (!normalized) return null;
  if (
    normalized.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    throw bad("correo no es valido");
  }
  return normalized;
}

function password(value) {
  if (typeof value !== "string" || value.length < 12)
    throw bad("password debe tener al menos 12 caracteres");
  if (Buffer.byteLength(value, "utf8") > 72)
    throw bad("password no puede superar 72 bytes UTF-8");
  return value;
}

function rejectUnknown(source, allowed) {
  for (const key of Object.keys(source)) {
    if (!allowed.includes(key)) throw bad(`${key} no esta permitido`);
  }
}

function profile(body, creating) {
  ensureObject(body);
  const allowed = ["nombre", "apellido", "nombre_usuario", "correo"];
  if (creating) allowed.push("password", "id_rol");
  rejectUnknown(body, allowed);
  const result = {
    name: requiredText(body.nombre, "nombre", 100),
    lastName: requiredText(body.apellido, "apellido", 100),
    username: requiredText(body.nombre_usuario, "nombre_usuario", 80),
    email: email(body.correo),
  };
  if (creating) {
    result.password = password(body.password);
    result.roleId = id(body.id_rol, "id_rol");
  }
  return result;
}

function list(query) {
  rejectUnknown(query, ["page", "limit", "search", "status", "role"]);
  const page = query.page === undefined ? 1 : id(query.page, "page");
  const limit = query.limit === undefined ? 20 : id(query.limit, "limit");
  if (limit > 100) throw bad("limit debe estar entre 1 y 100");
  const status =
    query.status === undefined || query.status === ""
      ? null
      : String(query.status).trim();
  if (status && !["activo", "inactivo"].includes(status))
    throw bad("status no es valido");
  const search =
    query.search === undefined ? null : String(query.search).trim();
  if (search && search.length > 150)
    throw bad("search no puede superar 150 caracteres");
  return {
    page,
    limit,
    status,
    roleId: query.role ? id(query.role, "role") : null,
    search: search || null,
  };
}

function status(body) {
  ensureObject(body);
  rejectUnknown(body, ["estado"]);
  if (!["activo", "inactivo"].includes(body.estado))
    throw bad("estado no es valido");
  return body.estado;
}

function role(body) {
  ensureObject(body);
  rejectUnknown(body, ["id_rol"]);
  return id(body.id_rol, "id_rol");
}

module.exports = { id, list, profile, role, status };
