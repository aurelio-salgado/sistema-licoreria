function validationError(message) {
  const e = new Error(message);
  e.statusCode = 400;
  return e;
}
function id(value, name) {
  const s = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(s) || !Number.isSafeInteger(Number(s)))
    throw validationError(`${name} debe ser un entero positivo`);
  return Number(s);
}
function date(value, name) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw validationError(`${name} debe usar YYYY-MM-DD`);
  const [y, m, d] = value.split('-').map(Number),
    x = new Date(Date.UTC(y, m - 1, d));
  if (
    x.getUTCFullYear() !== y ||
    x.getUTCMonth() !== m - 1 ||
    x.getUTCDate() !== d
  )
    throw validationError(`${name} no es una fecha válida`);
  return value;
}
function boundedText(value, name, max) {
  if (typeof value !== 'string' || !value.trim())
    throw validationError(`${name} es obligatorio`);
  const s = value.trim();
  if (s.length > max)
    throw validationError(`${name} no puede superar ${max} caracteres`);
  return s;
}
function quantity(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    throw validationError('cantidad debe ser un número mayor que cero');
  const scaled = value * 1000,
    rounded = Math.round(scaled),
    t = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
  if (Math.abs(scaled - rounded) > t)
    throw validationError('cantidad admite como máximo 3 decimales');
  if (value > 999999999.999)
    throw validationError('cantidad está fuera del rango permitido');
  return { fixed: (rounded / 1000).toFixed(3), units: BigInt(rounded) };
}
function validateStockQuery(q) {
  const status =
    q.status === undefined || q.status === ''
      ? 'activo'
      : String(q.status).trim();
  if (!['activo', 'inactivo', 'todos'].includes(status))
    throw validationError('status debe ser activo, inactivo o todos');
  return { status };
}
function validateMovementQuery(q) {
  const page = q.page === undefined ? 1 : id(q.page, 'page'),
    limit = q.limit === undefined ? 20 : id(q.limit, 'limit');
  if (limit > 100) throw validationError('limit debe estar entre 1 y 100');
  const nature = q.nature ? String(q.nature).trim() : null;
  if (nature && !['entrada', 'salida'].includes(nature))
    throw validationError('nature debe ser entrada o salida');
  const type = q.type ? boundedText(q.type, 'type', 40) : null,
    referenceType = q.reference_type
      ? boundedText(q.reference_type, 'reference_type', 40)
      : null,
    product = q.product ? id(q.product, 'product') : null,
    user = q.user ? id(q.user, 'user') : null,
    referenceId = q.reference_id ? id(q.reference_id, 'reference_id') : null,
    dateFrom = q.date_from ? date(q.date_from, 'date_from') : null,
    dateTo = q.date_to ? date(q.date_to, 'date_to') : null;
  if (dateFrom && dateTo && dateFrom > dateTo)
    throw validationError('date_from no puede ser posterior a date_to');
  return {
    page,
    limit,
    nature,
    type,
    referenceType,
    product,
    user,
    referenceId,
    dateFrom,
    dateTo,
  };
}
function validateAdjustment(body) {
  if (!['entrada', 'salida'].includes(body?.naturaleza))
    throw validationError('naturaleza debe ser entrada o salida');
  return {
    productId: id(body?.id_producto, 'id_producto'),
    nature: body.naturaleza,
    quantity: quantity(body?.cantidad),
    reason: boundedText(body?.motivo, 'motivo', 500),
  };
}
module.exports = {
  validateAdjustment,
  validateMovementQuery,
  validateStockQuery,
};
