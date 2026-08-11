const CATEGORY_STATES = new Set(['activo', 'inactivo']);

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

function validateName(value) {
  if (typeof value !== 'string') {
    throw validationError('El nombre es obligatorio');
  }

  const name = value.trim();

  if (!name) {
    throw validationError('El nombre es obligatorio');
  }

  if (name.length > 100) {
    throw validationError('El nombre no puede superar 100 caracteres');
  }

  return name;
}

function validateDescription(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw validationError('La descripción debe ser texto');
  }

  const description = value.trim();

  if (description.length > 255) {
    throw validationError('La descripción no puede superar 255 caracteres');
  }

  return description || null;
}

function validateState(value) {
  if (typeof value !== 'string' || !CATEGORY_STATES.has(value.trim())) {
    throw validationError('El estado debe ser activo o inactivo');
  }

  return value.trim();
}

function validateCategoryInput(body) {
  return {
    name: validateName(body?.nombre),
    description: validateDescription(body?.descripcion),
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

  if (search.length > 100) {
    throw validationError('search no puede superar 100 caracteres');
  }

  const status =
    query.status === undefined || query.status === ''
      ? null
      : validateState(query.status);

  return { page, limit, search, status };
}

module.exports = {
  validateCategoryInput,
  validateId,
  validateListQuery,
  validateStatusInput,
};
