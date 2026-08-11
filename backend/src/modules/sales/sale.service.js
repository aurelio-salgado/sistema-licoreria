const pool = require('../../config/database');
const repo = require('./sale.repository');
const {
  validateId,
  validateItemInput,
  validateListQuery,
  validateSaleInput,
} = require('./sale.validation');
const MAX = 999999999999n;
function error(statusCode, message) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}
const notFound = () => error(404, 'Venta no encontrada'),
  itemNotFound = () => error(404, 'Detalle de venta no encontrado'),
  duplicateNumber = () => error(409, 'Ya existe una venta con ese número'),
  duplicateProduct = () => error(409, 'El producto ya existe en esta venta');
function mapError(e) {
  return e?.code === 'ER_DUP_ENTRY' ? duplicateNumber() : e;
}
async function transaction(fn) {
  const c = await pool.getConnection();
  let started = false;
  try {
    await c.beginTransaction();
    started = true;
    const result = await fn(c);
    await c.commit();
    started = false;
    return result;
  } catch (e) {
    if (started)
      try {
        await c.rollback();
      } catch {}
    throw mapError(e);
  } finally {
    c.release();
  }
}
function cents(value) {
  return BigInt(String(value).replace('.', ''));
}
function money(value) {
  const s = value.toString().padStart(3, '0');
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
}
function line(data, unitPrice, historicalCost) {
  const price = cents(unitPrice),
    gross = (data.quantity.units * price + 500n) / 1000n;
  if (gross > MAX)
    throw error(400, 'El subtotal de la línea está fuera del rango permitido');
  if (data.discount.units > gross)
    throw error(400, 'El descuento no puede superar el subtotal de la línea');
  return { ...data, unitPrice, historicalCost, subtotal: money(gross) };
}
function totals(rows) {
  let subtotal = 0n,
    discount = 0n,
    tax = 0n;
  for (const r of rows) {
    subtotal += cents(r.subtotal);
    discount += cents(r.descuento);
    tax += cents(r.impuesto);
  }
  const total = subtotal - discount + tax;
  if ([subtotal, discount, tax, total].some((v) => v < 0n || v > MAX))
    throw error(400, 'Los totales están fuera del rango permitido');
  return {
    subtotal: money(subtotal),
    discount: money(discount),
    tax: money(tax),
    total: money(total),
  };
}
function ensurePreparation(s) {
  if (s.estado !== 'preparacion')
    throw error(409, 'Solo las ventas en preparación pueden modificarse');
}
async function client(c, id) {
  if (id) {
    const result = await repo.findClientForUpdate(c, id);
    if (!result) throw error(404, 'Cliente no encontrado');
    if (result.estado !== 'activo')
      throw error(400, 'El cliente debe estar activo');
    return result.id_cliente;
  }
  const rows = await repo.findFinalConsumerForUpdate(c);
  if (rows.length !== 1 || rows[0].estado !== 'activo')
    throw error(409, 'Consumidor final no está disponible');
  return rows[0].id_cliente;
}
async function product(c, id) {
  const result = await repo.findProductForUpdate(c, id);
  if (!result) throw error(404, 'Producto no encontrado');
  if (result.estado !== 'activo')
    throw error(400, 'El producto debe estar activo');
  return result;
}
function unitCheck(p, d) {
  if (!p.permite_decimales && d.quantity.units % 1000n !== 0n)
    throw error(400, 'La unidad de medida no permite cantidades decimales');
}
async function recalculate(c, id) {
  const t = totals(await repo.amounts(c, id));
  await repo.updateTotals(c, id, t);
}
async function hydrate(e, id) {
  const sale = await repo.findById(e, id);
  if (!sale) throw notFound();
  sale.items = await repo.listItems(e, id);
  return sale;
}
function snapshot(s) {
  return s
    ? {
        id_venta: s.id_venta,
        numero_venta: s.numero_venta,
        id_cliente: s.cliente?.id_cliente ?? s.id_cliente,
        estado: s.estado,
        subtotal: s.subtotal,
        descuento: s.descuento,
        impuesto: s.impuesto,
        total: s.total,
      }
    : null;
}
function itemSnapshot(i) {
  return i
    ? {
        id_detalle_venta: i.id_detalle_venta,
        id_producto: i.producto?.id_producto ?? i.id_producto,
        cantidad: i.cantidad,
        costo_unitario_historico: i.costo_unitario_historico,
        precio_unitario: i.precio_unitario,
        descuento: i.descuento,
        impuesto: i.impuesto,
        subtotal: i.subtotal,
      }
    : null;
}
async function listSales(q) {
  const f = validateListQuery(q),
    [sales, total] = await Promise.all([
      repo.list(pool, f),
      repo.count(pool, f),
    ]);
  return {
    sales,
    pagination: {
      page: f.page,
      limit: f.limit,
      total,
      total_pages: Math.ceil(total / f.limit),
    },
  };
}
async function getSale(id) {
  return hydrate(pool, validateId(id));
}
async function createSale(body, actor) {
  const d = validateSaleInput(body);
  return transaction(async (c) => {
    const clientId = await client(c, d.clientId);
    if (await repo.findByNumber(c, d.saleNumber)) throw duplicateNumber();
    const id = await repo.create(c, d, actor.userId, clientId),
      sale = await hydrate(c, id);
    await repo.audit(c, {
      userId: actor.userId,
      action: 'crear_preparacion',
      entity: 'ventas',
      entityId: id,
      newData: snapshot(sale),
      ipAddress: actor.ipAddress,
    });
    return sale;
  });
}
async function updateSale(rawId, body, actor) {
  const id = validateId(rawId),
    d = validateSaleInput(body);
  return transaction(async (c) => {
    const current = await repo.findByIdForUpdate(c, id);
    if (!current) throw notFound();
    ensurePreparation(current);
    const clientId = await client(c, d.clientId);
    if (await repo.findByNumber(c, d.saleNumber, id)) throw duplicateNumber();
    await repo.update(c, id, d, clientId);
    const sale = await hydrate(c, id);
    await repo.audit(c, {
      userId: actor.userId,
      action: 'editar_preparacion',
      entity: 'ventas',
      entityId: id,
      previousData: snapshot(current),
      newData: snapshot(sale),
      ipAddress: actor.ipAddress,
    });
    return sale;
  });
}
async function addItem(rawId, body, actor) {
  const id = validateId(rawId),
    d = validateItemInput(body);
  return transaction(async (c) => {
    const sale = await repo.findByIdForUpdate(c, id);
    if (!sale) throw notFound();
    ensurePreparation(sale);
    const p = await product(c, d.productId);
    unitCheck(p, d);
    if (await repo.findItemByProduct(c, id, d.productId))
      throw duplicateProduct();
    const calculated = line(d, p.precio_venta, p.costo_promedio),
      itemId = await repo.createItem(c, id, calculated);
    await recalculate(c, id);
    const result = await hydrate(c, id),
      item = result.items.find((i) => i.id_detalle_venta === itemId);
    await repo.audit(c, {
      userId: actor.userId,
      action: 'agregar_detalle',
      entity: 'detalle_ventas',
      entityId: itemId,
      newData: itemSnapshot(item),
      ipAddress: actor.ipAddress,
    });
    return result;
  });
}
async function updateItem(rawId, rawItemId, body, actor) {
  const id = validateId(rawId),
    itemId = validateId(rawItemId, 'itemId'),
    d = validateItemInput(body);
  return transaction(async (c) => {
    const sale = await repo.findByIdForUpdate(c, id);
    if (!sale) throw notFound();
    ensurePreparation(sale);
    const current = await repo.findItemForUpdate(c, id, itemId);
    if (!current) throw itemNotFound();
    const p = await product(c, d.productId);
    unitCheck(p, d);
    if (await repo.findItemByProduct(c, id, d.productId, itemId))
      throw duplicateProduct();
    const changed = Number(current.id_producto) !== Number(d.productId),
      calculated = line(
        d,
        changed ? p.precio_venta : current.precio_unitario,
        changed ? p.costo_promedio : current.costo_unitario_historico,
      );
    await repo.updateItem(c, id, itemId, calculated);
    await recalculate(c, id);
    const result = await hydrate(c, id),
      item = result.items.find((i) => i.id_detalle_venta === itemId);
    await repo.audit(c, {
      userId: actor.userId,
      action: 'editar_detalle',
      entity: 'detalle_ventas',
      entityId: itemId,
      previousData: itemSnapshot(current),
      newData: itemSnapshot(item),
      ipAddress: actor.ipAddress,
    });
    return result;
  });
}
async function removeItem(rawId, rawItemId, actor) {
  const id = validateId(rawId),
    itemId = validateId(rawItemId, 'itemId');
  return transaction(async (c) => {
    const sale = await repo.findByIdForUpdate(c, id);
    if (!sale) throw notFound();
    ensurePreparation(sale);
    const current = await repo.findItemForUpdate(c, id, itemId);
    if (!current) throw itemNotFound();
    await repo.deleteItem(c, id, itemId);
    await recalculate(c, id);
    const result = await hydrate(c, id);
    await repo.audit(c, {
      userId: actor.userId,
      action: 'quitar_detalle',
      entity: 'detalle_ventas',
      entityId: itemId,
      previousData: itemSnapshot(current),
      ipAddress: actor.ipAddress,
    });
    return result;
  });
}
module.exports = {
  addItem,
  createSale,
  getSale,
  listSales,
  removeItem,
  updateItem,
  updateSale,
};
