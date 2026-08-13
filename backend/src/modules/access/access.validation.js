function bad(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}
function id(value, name = "El id") {
  const text = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text)))
    throw bad(`${name} debe ser un entero positivo`);
  return Number(text);
}
function permissions(body) {
  if (!body || Array.isArray(body) || typeof body !== "object")
    throw bad("El body debe ser un objeto");
  for (const key of Object.keys(body))
    if (key !== "permission_ids") throw bad(`${key} no esta permitido`);
  if (!Array.isArray(body.permission_ids))
    throw bad("permission_ids debe ser un array");
  const ids = body.permission_ids.map((value) => id(value, "Cada permiso"));
  if (new Set(ids).size !== ids.length)
    throw bad("permission_ids no puede contener duplicados");
  return [...ids].sort((a, b) => a - b);
}
module.exports = { id, permissions };
