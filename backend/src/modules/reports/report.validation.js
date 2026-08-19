const REPORT_TYPES = Object.freeze(['sales-by-date','sales-detail','purchases-by-supplier','current-inventory','low-stock','top-products','sales-by-seller','gross-profit']);
function bad(message) { const error = new Error(message); error.statusCode = 400; return error; }
function positive(value, name, fallback) { if (value === undefined || value === '') return fallback; const text = String(value); if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text))) throw bad(`${name} debe ser un entero positivo`); return Number(text); }
function date(value, name) { if (!value) return null; if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw bad(`${name} debe usar YYYY-MM-DD`); const parsed = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0,10) !== value) throw bad(`${name} no es una fecha válida`); return value; }
function id(value, name) { return value ? positive(value, name) : null; }
function reportType(value) { if (!REPORT_TYPES.includes(value)) { const error = new Error('Tipo de reporte no encontrado'); error.statusCode = 404; throw error; } return value; }
function reportQuery(typeValue, query = {}) {
  const type = reportType(typeValue), page = positive(query.page, 'page', 1), limit = positive(query.limit, 'limit', 20);
  if (limit > 100) throw bad('limit debe estar entre 1 y 100');
  const dateFrom = date(query.date_from, 'date_from'), dateTo = date(query.date_to, 'date_to');
  if (dateFrom && dateTo && dateFrom > dateTo) throw bad('date_from no puede ser posterior a date_to');
  const allowed = {
    'sales-by-date': ['date_from','date_to','status'], 'sales-detail': ['date_from','date_to','status','product','seller'],
    'purchases-by-supplier': ['date_from','date_to','supplier','status'], 'current-inventory': ['product','status'],
    'low-stock': ['product'], 'top-products': ['date_from','date_to','product'],
    'sales-by-seller': ['date_from','date_to','seller'], 'gross-profit': ['date_from','date_to','product','seller'],
  }[type];
  for (const key of Object.keys(query)) if (!allowed.includes(key) && !['page','limit'].includes(key)) throw bad(`Filtro no permitido: ${key}`);
  let status = query.status ? String(query.status) : null;
  if (type.startsWith('sales') || type === 'sales-detail') { status ||= 'completada'; if (!['preparacion','completada','anulada'].includes(status)) throw bad('status de venta no válido'); }
  if (type === 'purchases-by-supplier') { status ||= 'recibida'; if (!['borrador','recibida','anulada'].includes(status)) throw bad('status de compra no válido'); }
  if (type === 'current-inventory') { status ||= 'todos'; if (!['activo','inactivo','todos'].includes(status)) throw bad('status de producto no válido'); }
  return { type, page, limit, dateFrom, dateTo, status, product: id(query.product,'product'), seller: id(query.seller,'seller'), supplier: id(query.supplier,'supplier') };
}
module.exports = { REPORT_TYPES, reportQuery, reportType };
