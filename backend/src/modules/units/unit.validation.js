const UNIT_STATES = new Set(['activo', 'inactivo']);

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function parsePositiveInteger(value, fieldName) {
  const normalizedValue = String(value ?? '').trim();

  if (!/^[1-9]\d*$/.test(normalizedValue)) {
    throw validationError(`${fieldName} debe ser un entero positivo`);
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isSafeInteger(parsedValue)) {
    throw validationError(`${fieldName} debe ser un entero positivo válido`);
  }

  return parsedValue;
}

function validateId(value) {
  return parsePositiveInteger(value, 'El id');
}

function validateRequiredText(value, fieldName, maxLength) {
  if (typeof value !== 'string') {
    throw validationError(`${fieldName} es obligatorio`);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw validationError(`${fieldName} es obligatorio`);
  }

  if (normalizedValue.length > maxLength) {
    throw validationError(
      `${fieldName} no puede superar ${maxLength} caracteres`,
    );
  }

  return normalizedValue;
}

function validateAllowsDecimals(value) {
  if (value === undefined) {
    return false;
  }

  if (typeof value !== 'boolean') {
    throw validationError('permite_decimales debe ser true o false');
  }

  return value;
}

function validateState(value) {
  if (typeof value !== 'string' || !UNIT_STATES.has(value.trim())) {
    throw validationError('El estado debe ser activo o inactivo');
  }

  return value.trim();
}

function validateUnitInput(body) {
  return {
    name: validateRequiredText(body?.nombre, 'El nombre', 80),
    abbreviation: validateRequiredText(body?.abreviatura, 'La abreviatura', 20),
    allowsDecimals: validateAllowsDecimals(body?.permite_decimales),
  };
}

function validateStatusInput(body) {
  return {
    state: validateState(body?.estado),
  };
}

function validateListQuery(query) {
  const page =
    query.page === undefined ? 1 : parsePositiveInteger(query.page, 'page');
  const limit =
    query.limit === undefined ? 20 : parsePositiveInteger(query.limit, 'limit');

  if (limit > 100) {
    throw validationError('limit debe estar entre 1 y 100');
  }

  if (!Number.isSafeInteger((page - 1) * limit)) {
    throw validationError('page está fuera del rango permitido');
  }

  if (query.search !== undefined && typeof query.search !== 'string') {
    throw validationError('search debe ser texto');
  }

  const search = query.search?.trim() || '';

  if (search.length > 80) {
    throw validationError('search no puede superar 80 caracteres');
  }

  const status =
    query.status === undefined || query.status === ''
      ? null
      : validateState(query.status);

  return { page, limit, search, status };
}

module.exports = {
  validateId,
  validateListQuery,
  validateStatusInput,
  validateUnitInput,
};
