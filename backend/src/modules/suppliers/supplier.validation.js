const SUPPLIER_STATES = new Set(['activo', 'inactivo']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function validateRequiredText(value, fieldName, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw validationError(`${fieldName} es obligatorio`);
  }
  const normalizedValue = value.trim();
  if (normalizedValue.length > maxLength) {
    throw validationError(
      `${fieldName} no puede superar ${maxLength} caracteres`,
    );
  }
  return normalizedValue;
}

function validateOptionalText(value, fieldName, maxLength) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw validationError(`${fieldName} debe ser texto`);
  }
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;
  if (normalizedValue.length > maxLength) {
    throw validationError(
      `${fieldName} no puede superar ${maxLength} caracteres`,
    );
  }
  return normalizedValue;
}

function validateEmail(value) {
  const email = validateOptionalText(value, 'El correo', 150);
  if (email && !EMAIL_PATTERN.test(email)) {
    throw validationError('El correo no tiene un formato válido');
  }
  return email;
}

function validateSupplierInput(body) {
  return {
    name: validateRequiredText(body?.nombre, 'El nombre', 150),
    taxIdentification: validateOptionalText(
      body?.identificacion_fiscal,
      'La identificación fiscal',
      50,
    ),
    contact: validateOptionalText(body?.contacto, 'El contacto', 150),
    phone: validateOptionalText(body?.telefono, 'El teléfono', 30),
    email: validateEmail(body?.correo),
    address: validateOptionalText(body?.direccion, 'La dirección', 255),
  };
}

function validateState(value) {
  if (typeof value !== 'string' || !SUPPLIER_STATES.has(value.trim())) {
    throw validationError('El estado debe ser activo o inactivo');
  }
  return value.trim();
}

function validateListQuery(query) {
  const page =
    query.page === undefined ? 1 : parsePositiveInteger(query.page, 'page');
  const limit =
    query.limit === undefined ? 20 : parsePositiveInteger(query.limit, 'limit');
  if (limit > 100) throw validationError('limit debe estar entre 1 y 100');
  if (!Number.isSafeInteger((page - 1) * limit)) {
    throw validationError('page está fuera del rango permitido');
  }
  if (query.search !== undefined && typeof query.search !== 'string') {
    throw validationError('search debe ser texto');
  }
  const search = query.search?.trim() || '';
  if (search.length > 150) {
    throw validationError('search no puede superar 150 caracteres');
  }
  const status =
    query.status === undefined || query.status === ''
      ? null
      : validateState(query.status);
  return { page, limit, search, status };
}

module.exports = {
  validateId: (value) => parsePositiveInteger(value, 'El id'),
  validateListQuery,
  validateStatusInput: (body) => ({ state: validateState(body?.estado) }),
  validateSupplierInput,
};
