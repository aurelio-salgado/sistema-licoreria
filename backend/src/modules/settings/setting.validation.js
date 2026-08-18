const VISIBLE_KEYS = Object.freeze([
  'nombre_negocio',
  'impuesto_activo',
  'tasa_impuesto',
  'descuento_maximo',
  'control_caja_activo',
  'serie_comprobante',
  'siguiente_numero_comprobante',
]);

const EDITABLE_KEYS = new Set([
  'nombre_negocio',
  'impuesto_activo',
  'tasa_impuesto',
  'descuento_maximo',
  'control_caja_activo',
  'serie_comprobante',
]);

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function validateKey(value) {
  if (typeof value !== 'string' || !VISIBLE_KEYS.includes(value)) {
    const error = new Error('Configuracion no encontrada');
    error.statusCode = 404;
    throw error;
  }

  return value;
}

function validateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw validationError('El body debe ser un objeto JSON');
  }

  const fields = Object.keys(body);

  if (fields.length !== 1 || fields[0] !== 'valor') {
    throw validationError('El unico campo permitido es valor');
  }

  return body.valor;
}

function validateRequiredText(value, name, maximum) {
  if (typeof value !== 'string') {
    throw validationError(`${name} debe ser texto`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw validationError(`${name} es obligatorio`);
  }

  if (normalized.length > maximum) {
    throw validationError(`${name} no puede superar ${maximum} caracteres`);
  }

  return normalized;
}

function validateLogicalValue(value) {
  if (value !== 'true' && value !== 'false') {
    throw validationError('valor debe ser exactamente "true" o "false"');
  }

  return value;
}

function validateTaxRate(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw validationError('valor debe ser un numero valido');
  }

  if (value < 0 || value > 100) {
    throw validationError('valor debe estar entre 0.00 y 100.00');
  }

  const scaled = value * 100;
  const rounded = Math.round(scaled);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;

  if (Math.abs(scaled - rounded) > tolerance) {
    throw validationError('valor admite como maximo dos decimales');
  }

  return (rounded / 100).toFixed(2);
}

function validateSeries(value) {
  const normalized = validateRequiredText(value, 'valor', 20);

  if (!/^[A-Za-z0-9-]+$/.test(normalized)) {
    throw validationError(
      'valor solo puede contener letras, numeros y guiones',
    );
  }

  return normalized;
}

function validateValue(key, value) {
  switch (key) {
    case 'nombre_negocio':
      return validateRequiredText(value, 'valor', 150);
    case 'impuesto_activo':
    case 'control_caja_activo':
      return validateLogicalValue(value);
    case 'tasa_impuesto':
    case 'descuento_maximo':
      return validateTaxRate(value);
    case 'serie_comprobante':
      return validateSeries(value);
    default:
      throw validationError('La configuracion no admite modificaciones');
  }
}

module.exports = {
  EDITABLE_KEYS,
  VISIBLE_KEYS,
  validateBody,
  validateKey,
  validateValue,
};
