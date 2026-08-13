function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function validateId(value, name = 'El id') {
  const normalized = String(value ?? '').trim();

  if (!/^[1-9]\d*$/.test(normalized)) {
    throw validationError(`${name} debe ser un entero positivo`);
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed)) {
    throw validationError(`${name} debe ser un entero positivo`);
  }

  return parsed;
}

function validateOptionalText(value, name, maximum) {
  if (value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw validationError(`${name} debe ser texto`);
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maximum) {
    throw validationError(`${name} no puede superar ${maximum} caracteres`);
  }

  return normalized;
}

function validateDate(value, name) {
  if (value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw validationError(`${name} debe tener formato YYYY-MM-DD`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw validationError(`${name} no es una fecha valida`);
  }

  return value;
}

function validateListQuery(query) {
  const allowed = [
    'page',
    'limit',
    'user',
    'module',
    'action',
    'entity',
    'entity_id',
    'result',
    'date_from',
    'date_to',
  ];

  for (const key of Object.keys(query)) {
    if (!allowed.includes(key)) {
      throw validationError(`${key} no es un filtro permitido`);
    }
  }

  const page = query.page === undefined ? 1 : validateId(query.page, 'page');
  const limit = query.limit === undefined ? 20 : validateId(query.limit, 'limit');

  if (limit > 100) {
    throw validationError('limit debe estar entre 1 y 100');
  }

  const dateFrom = validateDate(query.date_from, 'date_from');
  const dateTo = validateDate(query.date_to, 'date_to');

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw validationError('date_from no puede ser posterior a date_to');
  }

  return {
    page,
    limit,
    userId: query.user ? validateId(query.user, 'user') : null,
    module: validateOptionalText(query.module, 'module', 80),
    action: validateOptionalText(query.action, 'action', 100),
    entity: validateOptionalText(query.entity, 'entity', 80),
    entityId: query.entity_id
      ? validateId(query.entity_id, 'entity_id')
      : null,
    result: validateOptionalText(query.result, 'result', 30),
    dateFrom,
    dateTo,
  };
}

module.exports = { validateId, validateListQuery };
