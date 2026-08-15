const PURCHASE_STATES = new Set(['borrador', 'recibida', 'anulada']);
const CONTROLLED_PURCHASE_FIELDS = [
  'subtotal',
  'descuento',
  'impuesto',
  'total',
  'id_usuario',
  'estado',
];

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function parsePositiveInteger(value, fieldName) {
  const normalized = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw validationError(`${fieldName} debe ser un entero positivo`);
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    throw validationError(`${fieldName} debe ser un entero positivo válido`);
  }
  return parsed;
}

function requiredText(value, fieldName, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw validationError(`${fieldName} es obligatorio`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw validationError(
      `${fieldName} no puede superar ${maxLength} caracteres`,
    );
  }
  return normalized;
}

function optionalText(value, fieldName, maxLength) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string')
    throw validationError(`${fieldName} debe ser texto`);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw validationError(
      `${fieldName} no puede superar ${maxLength} caracteres`,
    );
  }
  return normalized;
}

function optionalLongText(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string')
    throw validationError('La observación debe ser texto');
  const normalized = value.trim();
  if (!normalized) return null;
  if (Buffer.byteLength(normalized, 'utf8') > 65535) {
    throw validationError('La observación supera el tamaño permitido');
  }
  return normalized;
}

function validateDateTime(value) {
  if (typeof value !== 'string')
    throw validationError('fecha_compra es obligatoria');
  const normalized = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(
    normalized,
  );
  if (!match)
    throw validationError(
      'fecha_compra debe usar el formato YYYY-MM-DD HH:mm:ss',
    );
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    throw validationError('fecha_compra no es una fecha válida');
  }
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
}

function rejectControlledFields(body, fields, message) {
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body || {}, field)) {
      throw validationError(message);
    }
  }
}

function decimalToUnits(value, fieldName, precision, scale, options = {}) {
  const { defaultValue, strictlyPositive = false } = options;
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
  const scaled = candidate * factor;
  const rounded = Math.round(scaled);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
  if (Math.abs(scaled - rounded) > tolerance) {
    throw validationError(`${fieldName} admite como máximo ${scale} decimales`);
  }
  const maximum = 10 ** (precision - scale) - 1 / factor;
  if (candidate > maximum)
    throw validationError(`${fieldName} está fuera del rango permitido`);
  const fixed = (rounded / factor).toFixed(scale);
  return { fixed, units: BigInt(fixed.replace('.', '')) };
}

function validatePurchaseInput(body) {
  rejectControlledFields(
    body,
    CONTROLLED_PURCHASE_FIELDS,
    'Los totales, usuario y estado son controlados por el backend',
  );
  return {
    purchaseNumber: requiredText(body?.numero_compra, 'numero_compra', 50),
    supplierDocumentNumber: optionalText(
      body?.numero_documento_proveedor,
      'numero_documento_proveedor',
      80,
    ),
    supplierId: parsePositiveInteger(body?.id_proveedor, 'id_proveedor'),
    purchaseDate: validateDateTime(body?.fecha_compra),
    observation: optionalLongText(body?.observacion),
  };
}

function validateItemInput(body) {
  rejectControlledFields(
    body,
    ['subtotal', 'impuesto'],
    'El subtotal y el impuesto son calculados por el backend',
  );
  return {
    productId: parsePositiveInteger(body?.id_producto, 'id_producto'),
    quantity: decimalToUnits(body?.cantidad, 'cantidad', 12, 3, {
      strictlyPositive: true,
    }),
    unitCost: decimalToUnits(body?.costo_unitario, 'costo_unitario', 12, 2),
    discount: decimalToUnits(body?.descuento, 'descuento', 12, 2, {
      defaultValue: 0,
    }),
  };
}

function validateDate(value, fieldName) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw validationError(`${fieldName} debe usar el formato YYYY-MM-DD`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw validationError(`${fieldName} no es una fecha válida`);
  }
  return value;
}

function validateListQuery(query) {
  const page =
    query.page === undefined ? 1 : parsePositiveInteger(query.page, 'page');
  const limit =
    query.limit === undefined ? 20 : parsePositiveInteger(query.limit, 'limit');
  if (limit > 100) throw validationError('limit debe estar entre 1 y 100');
  if (!Number.isSafeInteger((page - 1) * limit))
    throw validationError('page está fuera del rango permitido');
  const status =
    query.status === undefined || query.status === ''
      ? null
      : String(query.status).trim();
  if (status && !PURCHASE_STATES.has(status))
    throw validationError('status no es válido');
  const supplierId =
    query.supplier === undefined || query.supplier === ''
      ? null
      : parsePositiveInteger(query.supplier, 'supplier');
  const dateFrom = query.date_from
    ? validateDate(query.date_from, 'date_from')
    : null;
  const dateTo = query.date_to ? validateDate(query.date_to, 'date_to') : null;
  if (dateFrom && dateTo && dateFrom > dateTo)
    throw validationError('date_from no puede ser posterior a date_to');
  return { page, limit, status, supplierId, dateFrom, dateTo };
}

function validateCancellationInput(body) {
  if (typeof body?.motivo !== 'string' || !body.motivo.trim()) {
    throw validationError('El motivo de anulación es obligatorio');
  }
  const reason = body.motivo.trim();
  if (Buffer.byteLength(reason, 'utf8') > 65535) {
    throw validationError('El motivo de anulación supera el tamaño permitido');
  }
  return { reason };
}

module.exports = {
  validateCancellationInput,
  validateId: (value, label = 'El id') => parsePositiveInteger(value, label),
  validateItemInput,
  validateListQuery,
  validatePurchaseInput,
};
