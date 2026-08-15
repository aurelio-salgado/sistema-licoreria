const pool = require('../../config/database'),
  repo = require('./inventory.repository');
const {
  validateAdjustment,
  validateMovementQuery,
  validateStockQuery,
} = require('./inventory.validation');
const MAX = 999999999999n;
function httpError(statusCode, message) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}
function millis(value) {
  const s = String(value),
    m = /^(\d+)(?:\.(\d{1,3}))?$/.exec(s);
  if (!m) throw httpError(500, 'La existencia almacenada no es válida');
  return BigInt(m[1]) * 1000n + BigInt((m[2] || '').padEnd(3, '0'));
}
function format(n) {
  const s = n.toString().padStart(4, '0');
  return `${s.slice(0, -3)}.${s.slice(-3)}`;
}
async function transaction(fn) {
  const c = await pool.getConnection();
  let started = false;
  try {
    await c.beginTransaction();
    started = true;
    const r = await fn(c);
    await c.commit();
    started = false;
    return r;
  } catch (e) {
    if (started)
      try {
        await c.rollback();
      } catch {}
    throw e;
  } finally {
    c.release();
  }
}
async function listStock(q) {
  return {
    inventory: await repo.listStock(pool, validateStockQuery(q).status),
  };
}
async function lowStock() {
  return { products: await repo.listStock(pool, 'activo', true) };
}
async function movements(q) {
  const f = validateMovementQuery(q),
    [items, total] = await Promise.all([
      repo.listMovements(pool, f),
      repo.countMovements(pool, f),
    ]);
  return {
    movements: items,
    pagination: {
      page: f.page,
      limit: f.limit,
      total,
      total_pages: Math.ceil(total / f.limit),
    },
  };
}
async function adjust(body, actor) {
  const d = validateAdjustment(body);
  return transaction(async (c) => {
    const p = await repo.lockProduct(c, d.productId);
    if (!p) throw httpError(404, 'Producto no encontrado');
    if (p.estado !== 'activo')
      throw httpError(409, 'El producto está inactivo');
    if (!p.permite_decimales && d.quantity.units % 1000n !== 0n)
      throw httpError(
        400,
        'La unidad de medida no permite cantidades decimales',
      );
    const previous = millis(p.existencia),
      next =
        d.nature === 'entrada'
          ? previous + d.quantity.units
          : previous - d.quantity.units;
    if (next < 0n)
      throw httpError(409, 'Existencia insuficiente para realizar el ajuste');
    if (next > MAX)
      throw httpError(
        409,
        'La existencia resultante está fuera del rango permitido',
      );
    const data = {
      productId: d.productId,
      userId: actor.userId,
      nature: d.nature,
      quantity: d.quantity.fixed,
      previous: format(previous),
      next: format(next),
      reason: d.reason,
    };
    const adjustmentId = await repo.createAdjustment(c, data);
    await repo.updateStock(c, d.productId, data.next);
    await repo.createMovement(c, { ...data, adjustmentId });
    const auditData = {
      id_producto: d.productId,
      naturaleza: d.nature,
      cantidad: data.quantity,
      existencia_anterior: data.previous,
      existencia_posterior: data.next,
      motivo: d.reason,
    };
    await repo.audit(c, {
      userId: actor.userId,
      adjustmentId,
      previousData: { id_producto: d.productId, existencia: data.previous },
      newData: auditData,
      ipAddress: actor.ipAddress,
    });
    return { id_ajuste: adjustmentId, ...auditData, id_usuario: actor.userId };
  });
}
module.exports = { adjust, listStock, lowStock, movements };
