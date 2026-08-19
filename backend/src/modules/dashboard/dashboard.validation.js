function badRequest(message) { const error = new Error(message); error.statusCode = 400; return error; }
function parseDate(value, name) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw badRequest(`${name} debe usar YYYY-MM-DD`);
  const [year, month, day] = value.split('-').map(Number), date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw badRequest(`${name} no es una fecha válida`);
  return value;
}
function chartQuery(query = {}) {
  const dateTo = query.date_to ? parseDate(query.date_to, 'date_to') : new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(`${dateTo}T00:00:00.000Z`); defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  const dateFrom = query.date_from ? parseDate(query.date_from, 'date_from') : defaultFrom.toISOString().slice(0, 10);
  if (dateFrom > dateTo) throw badRequest('date_from no puede ser posterior a date_to');
  let seller = null;
  if (query.seller !== undefined && query.seller !== '') {
    const value = String(query.seller);
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw badRequest('seller debe ser un entero positivo');
    seller = Number(value);
  }
  for (const key of Object.keys(query)) if (!['date_from', 'date_to', 'seller'].includes(key)) throw badRequest(`Filtro no permitido: ${key}`);
  return { dateFrom, dateTo, seller };
}
module.exports = { chartQuery };
