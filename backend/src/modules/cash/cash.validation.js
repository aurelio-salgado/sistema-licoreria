const CASH_STATES = new Set(['abierta', 'cerrada']);
const MANUAL_MOVEMENT_TYPES = new Set(['ingreso', 'egreso']);
const SUPERVISION_RESULTS = new Set(['faltante', 'sobrante', 'cuadrada']);
const SUPERVISION_QUERY_FIELDS = new Set([
  'page',
  'limit',
  'user',
  'date_from',
  'date_to',
  'result',
]);

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function positiveInteger(value, fieldName) {
  const normalized = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(normalized))
    throw validationError(`${fieldName} debe ser un entero positivo`);
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed))
    throw validationError(`${fieldName} debe ser un entero positivo válido`);
  return parsed;
}

function money(value, fieldName, strictlyPositive = false) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw validationError(`${fieldName} debe ser un número válido`);
  if (strictlyPositive ? value <= 0 : value < 0)
    throw validationError(
      `${fieldName} debe ser ${strictlyPositive ? 'mayor que cero' : 'mayor o igual que cero'}`,
    );
  const scaled = value * 100;
  const rounded = Math.round(scaled);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
  if (Math.abs(scaled - rounded) > tolerance)
    throw validationError(`${fieldName} admite como máximo 2 decimales`);
  if (value > 9999999999.99)
    throw validationError(`${fieldName} está fuera del rango permitido`);
  const fixed = (rounded / 100).toFixed(2);
  return { fixed, cents: BigInt(fixed.replace('.', '')) };
}

function optionalText(value, fieldName, maximum) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string')
    throw validationError(`${fieldName} debe ser texto`);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maximum)
    throw validationError(
      `${fieldName} no puede superar ${maximum} caracteres`,
    );
  return normalized;
}

function requiredText(value, fieldName, maximum) {
  const normalized = optionalText(value, fieldName, maximum);
  if (!normalized) throw validationError(`${fieldName} es obligatorio`);
  return normalized;
}

function rejectFields(body, fields) {
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body || {}, field))
      throw validationError(`${field} es controlado por el backend`);
  }
}

function validDate(value, fieldName) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw validationError(`${fieldName} debe usar YYYY-MM-DD`);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw validationError(`${fieldName} no es una fecha válida`);
  return value;
}

function validateOpenInput(body) {
  rejectFields(body, [
    'id_usuario',
    'fecha_apertura',
    'fecha_cierre',
    'monto_cierre',
    'monto_esperado',
    'monto_contado',
    'diferencia',
    'estado',
  ]);
  return {
    openingAmount: money(body?.monto_apertura, 'monto_apertura'),
    observation: optionalText(body?.observacion, 'observacion', 500),
  };
}

function validateMovementInput(body) {
  rejectFields(body, [
    'id_usuario',
    'id_caja',
    'id_venta',
    'naturaleza',
    'afecta_efectivo',
  ]);
  if (!MANUAL_MOVEMENT_TYPES.has(body?.tipo_movimiento))
    throw validationError('tipo_movimiento debe ser ingreso o egreso');
  return {
    type: body.tipo_movimiento,
    nature: body.tipo_movimiento === 'ingreso' ? 'entrada' : 'salida',
    amount: money(body?.monto, 'monto', true),
    concept: requiredText(body?.concepto, 'concepto', 255),
  };
}

function validateCloseInput(body) {
  rejectFields(body, [
    'monto_cierre',
    'monto_esperado',
    'diferencia',
    'fecha_cierre',
    'estado',
  ]);
  return {
    countedAmount: money(body?.monto_contado, 'monto_contado'),
    observation: optionalText(body?.observacion, 'observacion', 500),
  };
}

function validateListQuery(query) {
  const page =
    query.page === undefined ? 1 : positiveInteger(query.page, 'page');
  const limit =
    query.limit === undefined ? 20 : positiveInteger(query.limit, 'limit');
  if (limit > 100) throw validationError('limit debe estar entre 1 y 100');
  if (!Number.isSafeInteger((page - 1) * limit))
    throw validationError('page está fuera del rango permitido');
  const status =
    query.status === undefined || query.status === ''
      ? null
      : String(query.status).trim();
  if (status && !CASH_STATES.has(status))
    throw validationError('status debe ser abierta o cerrada');
  const requestedUser =
    query.user === undefined || query.user === ''
      ? null
      : positiveInteger(query.user, 'user');
  const dateFrom = query.date_from
    ? validDate(query.date_from, 'date_from')
    : null;
  const dateTo = query.date_to ? validDate(query.date_to, 'date_to') : null;
  if (dateFrom && dateTo && dateFrom > dateTo)
    throw validationError('date_from no puede ser posterior a date_to');
  return { page, limit, status, requestedUser, dateFrom, dateTo };
}

function validateSupervisionQuery(query = {}) {
  for (const field of Object.keys(query)) {
    if (!SUPERVISION_QUERY_FIELDS.has(field))
      throw validationError(`El filtro ${field} no es permitido`);
  }
  const page = query.page === undefined ? 1 : positiveInteger(query.page, 'page');
  const limit =
    query.limit === undefined ? 20 : positiveInteger(query.limit, 'limit');
  if (limit > 100) throw validationError('limit debe estar entre 1 y 100');
  if (!Number.isSafeInteger((page - 1) * limit))
    throw validationError('page está fuera del rango permitido');
  const requestedUser =
    query.user === undefined || query.user === ''
      ? null
      : positiveInteger(query.user, 'user');
  const dateFrom = query.date_from
    ? validDate(query.date_from, 'date_from')
    : null;
  const dateTo = query.date_to ? validDate(query.date_to, 'date_to') : null;
  if (dateFrom && dateTo && dateFrom > dateTo)
    throw validationError('date_from no puede ser posterior a date_to');
  const result =
    query.result === undefined || query.result === ''
      ? null
      : String(query.result).trim();
  if (result && !SUPERVISION_RESULTS.has(result))
    throw validationError('result debe ser faltante, sobrante o cuadrada');
  return { page, limit, requestedUser, dateFrom, dateTo, result };
}

module.exports = {
  validateCloseInput,
  validateId: (value) => positiveInteger(value, 'El id'),
  validateListQuery,
  validateSupervisionQuery,
  validateMovementInput,
  validateOpenInput,
};
