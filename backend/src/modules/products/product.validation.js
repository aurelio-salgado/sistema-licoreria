const PRODUCT_STATES = new Set(['activo', 'inactivo']);

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
  if (typeof value !== 'string')
    throw validationError(`${fieldName} debe ser texto`);
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;
  if (normalizedValue.length > maxLength) {
    throw validationError(
      `${fieldName} no puede superar ${maxLength} caracteres`,
    );
  }
  return normalizedValue;
}

function validateDescription(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string')
    throw validationError('La descripción debe ser texto');
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;
  if (Buffer.byteLength(normalizedValue, 'utf8') > 65535) {
    throw validationError('La descripción supera el tamaño permitido');
  }
  return normalizedValue;
}

function validateDecimal(value, options) {
  const {
    fieldName,
    precision,
    scale,
    defaultValue,
    strictlyPositive = false,
  } = options;
  const candidate = value === undefined ? defaultValue : value;
  if (
    candidate === undefined ||
    typeof candidate !== 'number' ||
    !Number.isFinite(candidate)
  ) {
    throw validationError(`${fieldName} debe ser un número válido`);
  }
  if (strictlyPositive ? candidate <= 0 : candidate < 0) {
    throw validationError(
      `${fieldName} debe ser ${strictlyPositive ? 'mayor que cero' : 'mayor o igual que cero'}`,
    );
  }
  const factor = 10 ** scale;
  const scaledValue = candidate * factor;
  const roundedValue = Math.round(scaledValue);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(scaledValue)) * 4;
  if (Math.abs(scaledValue - roundedValue) > tolerance) {
    throw validationError(`${fieldName} admite como máximo ${scale} decimales`);
  }
  const maximum = 10 ** (precision - scale) - 1 / factor;
  if (candidate > maximum)
    throw validationError(`${fieldName} está fuera del rango permitido`);
  return (roundedValue / factor).toFixed(scale);
}

function validateProductInput(body) {
  if (Object.prototype.hasOwnProperty.call(body || {}, 'existencia')) {
    throw validationError(
      'La existencia no puede modificarse desde el CRUD de productos',
    );
  }
  return {
    code: validateRequiredText(body?.codigo, 'El código', 60),
    barcode: validateOptionalText(
      body?.codigo_barras,
      'El código de barras',
      80,
    ),
    name: validateRequiredText(body?.nombre, 'El nombre', 150),
    description: validateDescription(body?.descripcion),
    categoryId: parsePositiveInteger(body?.id_categoria, 'id_categoria'),
    brandId: parsePositiveInteger(body?.id_marca, 'id_marca'),
    unitId: parsePositiveInteger(body?.id_unidad, 'id_unidad'),
    averageCost: validateDecimal(body?.costo_promedio, {
      fieldName: 'costo_promedio',
      precision: 12,
      scale: 2,
      defaultValue: 0,
    }),
    salePrice: validateDecimal(body?.precio_venta, {
      fieldName: 'precio_venta',
      precision: 12,
      scale: 2,
      strictlyPositive: true,
    }),
    minimumStock: validateDecimal(body?.existencia_minima, {
      fieldName: 'existencia_minima',
      precision: 12,
      scale: 3,
      defaultValue: 0,
    }),
    taxPercentage: validateDecimal(body?.porcentaje_impuesto, {
      fieldName: 'porcentaje_impuesto',
      precision: 5,
      scale: 2,
      defaultValue: 0,
    }),
  };
}

function validateState(value) {
  if (typeof value !== 'string' || !PRODUCT_STATES.has(value.trim())) {
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
  if (!Number.isSafeInteger((page - 1) * limit))
    throw validationError('page está fuera del rango permitido');
  if (query.search !== undefined && typeof query.search !== 'string')
    throw validationError('search debe ser texto');
  const search = query.search?.trim() || '';
  if (search.length > 150)
    throw validationError('search no puede superar 150 caracteres');
  const status =
    query.status === undefined || query.status === ''
      ? null
      : validateState(query.status);
  const categoryId =
    query.id_categoria === undefined || query.id_categoria === ''
      ? null
      : parsePositiveInteger(query.id_categoria, 'id_categoria');
  const brandId =
    query.id_marca === undefined || query.id_marca === ''
      ? null
      : parsePositiveInteger(query.id_marca, 'id_marca');
  return { page, limit, search, status, categoryId, brandId };
}

module.exports = {
  validateId: (value) => parsePositiveInteger(value, 'El id'),
  validateListQuery,
  validateProductInput,
  validateStatusInput: (body) => ({ state: validateState(body?.estado) }),
};
