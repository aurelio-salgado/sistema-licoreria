const SALE_STATES = new Set(['preparacion', 'completada', 'anulada']);

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}
function positiveInteger(value, name) {
  const text = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(text))
    throw validationError(`${name} debe ser un entero positivo`);
  const number = Number(text);
  if (!Number.isSafeInteger(number))
    throw validationError(`${name} debe ser válido`);
  return number;
}
function requiredText(value, name, max) {
  if (typeof value !== 'string' || !value.trim())
    throw validationError(`${name} es obligatorio`);
  const text = value.trim();
  if (text.length > max)
    throw validationError(`${name} no puede superar ${max} caracteres`);
  return text;
}
function dateTime(value) {
  if (typeof value !== 'string')
    throw validationError('fecha_venta es obligatoria');
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(
    value.trim(),
  );
  if (!match)
    throw validationError('fecha_venta debe usar YYYY-MM-DD HH:mm:ss');
  const parts = match.slice(1).map(Number);
  const date = new Date(
    Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]),
  );
  if (
    date.getUTCFullYear() !== parts[0] ||
    date.getUTCMonth() !== parts[1] - 1 ||
    date.getUTCDate() !== parts[2] ||
    date.getUTCHours() !== parts[3] ||
    date.getUTCMinutes() !== parts[4] ||
    date.getUTCSeconds() !== parts[5]
  )
    throw validationError('fecha_venta no es válida');
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
}
function decimal(value, name, precision, scale, options = {}) {
  const candidate = value === undefined ? options.defaultValue : value;
  if (
    candidate === undefined ||
    typeof candidate !== 'number' ||
    !Number.isFinite(candidate)
  )
    throw validationError(`${name} debe ser un número válido`);
  if (options.positive ? candidate <= 0 : candidate < 0)
    throw validationError(
      `${name} debe ser ${options.positive ? 'mayor que cero' : 'mayor o igual que cero'}`,
    );
  const factor = 10 ** scale,
    scaled = candidate * factor,
    rounded = Math.round(scaled),
    tolerance = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
  if (Math.abs(scaled - rounded) > tolerance)
    throw validationError(`${name} admite como máximo ${scale} decimales`);
  const max = 10 ** (precision - scale) - 1 / factor;
  if (candidate > max)
    throw validationError(`${name} está fuera del rango permitido`);
  const fixed = (rounded / factor).toFixed(scale);
  return { fixed, units: BigInt(fixed.replace('.', '')) };
}
function reject(body, fields, message) {
  for (const field of fields)
    if (Object.prototype.hasOwnProperty.call(body || {}, field))
      throw validationError(message);
}

function validateSaleInput(body) {
  reject(
    body,
    [
      'numero_factura',
      'id_usuario',
      'id_caja',
      'subtotal',
      'descuento',
      'impuesto',
      'total',
      'estado',
      'motivo_anulacion',
      'anulada_por',
      'anulada_en',
    ],
    'Los campos de control de la venta son administrados por el backend',
  );
  return {
    saleNumber: requiredText(body?.numero_venta, 'numero_venta', 50),
    clientId:
      body?.id_cliente === undefined ||
      body?.id_cliente === null ||
      body?.id_cliente === ''
        ? null
        : positiveInteger(body.id_cliente, 'id_cliente'),
    saleDate: dateTime(body?.fecha_venta),
  };
}
function validateItemInput(body) {
  reject(
    body,
    ['precio_unitario', 'costo_unitario_historico', 'subtotal', 'impuesto'],
    'El precio, costo histórico, subtotal e impuesto son calculados por el backend',
  );
  return {
    productId: positiveInteger(body?.id_producto, 'id_producto'),
    quantity: decimal(body?.cantidad, 'cantidad', 12, 3, { positive: true }),
    discount: decimal(body?.descuento, 'descuento', 12, 2, { defaultValue: 0 }),
  };
}
function validDate(value, name) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw validationError(`${name} debe usar YYYY-MM-DD`);
  const [y, m, d] = value.split('-').map(Number),
    date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  )
    throw validationError(`${name} no es válida`);
  return value;
}
function validateListQuery(query) {
  const page =
      query.page === undefined ? 1 : positiveInteger(query.page, 'page'),
    limit =
      query.limit === undefined ? 20 : positiveInteger(query.limit, 'limit');
  if (limit > 100) throw validationError('limit debe estar entre 1 y 100');
  if (!Number.isSafeInteger((page - 1) * limit))
    throw validationError('page está fuera del rango permitido');
  const status =
    query.status === undefined || query.status === ''
      ? null
      : String(query.status).trim();
  if (status && !SALE_STATES.has(status))
    throw validationError('status no es válido');
  const clientId =
      query.client === undefined || query.client === ''
        ? null
        : positiveInteger(query.client, 'client'),
    sellerId =
      query.seller === undefined || query.seller === ''
        ? null
        : positiveInteger(query.seller, 'seller'),
    dateFrom = query.date_from ? validDate(query.date_from, 'date_from') : null,
    dateTo = query.date_to ? validDate(query.date_to, 'date_to') : null;
  if (dateFrom && dateTo && dateFrom > dateTo)
    throw validationError('date_from no puede ser posterior a date_to');
  return { page, limit, status, clientId, sellerId, dateFrom, dateTo };
}
function validateConfirmInput(body) {
  if (!body || !Array.isArray(body.pagos))
    throw validationError('pagos debe ser una colección');
  reject(
    body,
    ['subtotal', 'descuento', 'impuesto', 'total', 'estado', 'id_caja'],
    'Los totales, estado y caja son controlados por el backend',
  );
  const methods = new Set();
  const payments = body.pagos.map((payment, index) => {
    const methodId = positiveInteger(
      payment?.id_metodo_pago,
      `pagos[${index}].id_metodo_pago`,
    );
    if (methods.has(methodId))
      throw validationError('No se permite repetir un método de pago');
    methods.add(methodId);
    const amount = decimal(payment?.monto, `pagos[${index}].monto`, 12, 2, {
      positive: true,
    });
    let reference = null;
    if (payment?.referencia !== undefined && payment.referencia !== null) {
      if (typeof payment.referencia !== 'string')
        throw validationError(`pagos[${index}].referencia debe ser texto`);
      reference = payment.referencia.trim() || null;
      if (reference && reference.length > 120)
        throw validationError('La referencia no puede superar 120 caracteres');
    }
    const received =
      payment?.monto_recibido === undefined || payment.monto_recibido === null
        ? null
        : decimal(
            payment.monto_recibido,
            `pagos[${index}].monto_recibido`,
            12,
            2,
          );
    return { methodId, amount, reference, received };
  });
  return { payments };
}
function validateCancellationInput(body) {
  if (typeof body?.motivo !== 'string' || !body.motivo.trim())
    throw validationError('El motivo de anulación es obligatorio');
  const reason = body.motivo.trim();
  if (reason.length > 500)
    throw validationError(
      'El motivo de anulación no puede superar 500 caracteres',
    );
  return { reason };
}
module.exports = {
  validateCancellationInput,
  validateConfirmInput,
  validateId: (value, label = 'El id') => positiveInteger(value, label),
  validateItemInput,
  validateListQuery,
  validateSaleInput,
};
