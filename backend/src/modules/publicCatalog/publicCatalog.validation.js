function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function positiveInteger(value, name) {
  const text = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text))) {
    throw badRequest(`${name} debe ser un entero positivo`);
  }
  return Number(text);
}

function list(query = {}) {
  const allowed = new Set(['page', 'limit', 'search', 'id_categoria', 'id_marca']);
  for (const key of Object.keys(query)) {
    if (!allowed.has(key)) throw badRequest(`${key} no es un filtro permitido`);
  }
  const page = query.page === undefined ? 1 : positiveInteger(query.page, 'page');
  const limit = query.limit === undefined ? 12 : positiveInteger(query.limit, 'limit');
  if (limit > 48) throw badRequest('limit debe estar entre 1 y 48');
  if (!Number.isSafeInteger((page - 1) * limit)) throw badRequest('page esta fuera del rango permitido');
  if (query.search !== undefined && typeof query.search !== 'string') throw badRequest('search debe ser texto');
  const search = query.search?.trim() || '';
  if (search.length > 150) throw badRequest('search no puede superar 150 caracteres');
  const categoryId = query.id_categoria ? positiveInteger(query.id_categoria, 'id_categoria') : null;
  const brandId = query.id_marca ? positiveInteger(query.id_marca, 'id_marca') : null;
  return { page, limit, search, categoryId, brandId };
}

module.exports = { list };
