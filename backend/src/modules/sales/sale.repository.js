const SALE_COLUMNS = `v.id_venta,v.numero_venta,v.numero_factura,v.fecha_venta,v.subtotal,v.descuento,v.impuesto,v.total,v.estado,v.motivo_anulacion,v.anulada_por,v.anulada_en,v.creado_en,c.id_cliente,c.nombre AS cliente_nombre,c.es_consumidor_final,u.id_usuario,u.nombre AS usuario_nombre,u.apellido AS usuario_apellido,u.nombre_usuario,v.id_caja`;
function normalizeSale(row) {
  if (!row) return null;
  const {
    id_cliente,
    cliente_nombre,
    es_consumidor_final,
    id_usuario,
    usuario_nombre,
    usuario_apellido,
    nombre_usuario,
    id_caja,
    ...sale
  } = row;
  return {
    ...sale,
    cliente: {
      id_cliente,
      nombre: cliente_nombre,
      es_consumidor_final: Boolean(es_consumidor_final),
    },
    usuario: {
      id_usuario,
      nombre: usuario_nombre,
      apellido: usuario_apellido,
      nombre_usuario,
    },
    caja: id_caja === null ? null : { id_caja },
  };
}
function filters(f) {
  const c = [],
    v = [];
  if (f.status) {
    c.push('v.estado=?');
    v.push(f.status);
  }
  if (f.clientId) {
    c.push('v.id_cliente=?');
    v.push(f.clientId);
  }
  if (f.sellerId) {
    c.push('v.id_usuario=?');
    v.push(f.sellerId);
  }
  if (f.dateFrom) {
    c.push('v.fecha_venta>=?');
    v.push(`${f.dateFrom} 00:00:00`);
  }
  if (f.dateTo) {
    c.push('v.fecha_venta<DATE_ADD(?,INTERVAL 1 DAY)');
    v.push(`${f.dateTo} 00:00:00`);
  }
  return { clause: c.length ? `WHERE ${c.join(' AND ')}` : '', values: v };
}
async function list(e, f) {
  const { clause, values } = filters(f);
  const [rows] = await e.execute(
    `SELECT ${SALE_COLUMNS} FROM ventas v INNER JOIN clientes c ON c.id_cliente=v.id_cliente INNER JOIN usuarios u ON u.id_usuario=v.id_usuario ${clause} ORDER BY v.fecha_venta DESC,v.id_venta DESC LIMIT ? OFFSET ?`,
    [...values, f.limit, (f.page - 1) * f.limit],
  );
  return rows.map(normalizeSale);
}
async function count(e, f) {
  const { clause, values } = filters(f);
  const [[r]] = await e.execute(
    `SELECT COUNT(*) total FROM ventas v ${clause}`,
    values,
  );
  return Number(r.total);
}
async function findById(e, id) {
  const [rows] = await e.execute(
    `SELECT ${SALE_COLUMNS} FROM ventas v INNER JOIN clientes c ON c.id_cliente=v.id_cliente INNER JOIN usuarios u ON u.id_usuario=v.id_usuario WHERE v.id_venta=? LIMIT 1`,
    [id],
  );
  return normalizeSale(rows[0]);
}
async function findByIdForUpdate(c, id) {
  const [rows] = await c.execute(
    'SELECT id_venta,numero_venta,id_cliente,id_usuario,estado,subtotal,descuento,impuesto,total FROM ventas WHERE id_venta=? LIMIT 1 FOR UPDATE',
    [id],
  );
  return rows[0] || null;
}
async function findByNumber(e, number, excluded = null) {
  const [rows] = await e.execute(
    'SELECT id_venta FROM ventas WHERE numero_venta=? AND (? IS NULL OR id_venta<>?) LIMIT 1',
    [number, excluded, excluded],
  );
  return rows[0] || null;
}
async function findClientForUpdate(c, id) {
  const [rows] = await c.execute(
    'SELECT id_cliente,estado,es_consumidor_final FROM clientes WHERE id_cliente=? LIMIT 1 FOR UPDATE',
    [id],
  );
  return rows[0] || null;
}
async function findFinalConsumerForUpdate(c) {
  const [rows] = await c.execute(
    'SELECT id_cliente,estado,es_consumidor_final FROM clientes WHERE es_consumidor_final=? ORDER BY id_cliente FOR UPDATE',
    [true],
  );
  return rows;
}
async function create(c, d, userId, clientId) {
  const [r] = await c.execute(
    `INSERT INTO ventas(numero_venta,numero_factura,id_cliente,id_usuario,id_caja,fecha_venta,subtotal,descuento,impuesto,total,estado,motivo_anulacion,anulada_por,anulada_en) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      d.saleNumber,
      null,
      clientId,
      userId,
      null,
      d.saleDate,
      '0.00',
      '0.00',
      '0.00',
      '0.00',
      'preparacion',
      null,
      null,
      null,
    ],
  );
  return r.insertId;
}
async function update(c, id, d, clientId) {
  await c.execute(
    'UPDATE ventas SET numero_venta=?,id_cliente=?,fecha_venta=? WHERE id_venta=?',
    [d.saleNumber, clientId, d.saleDate, id],
  );
}
async function listItems(e, id) {
  const [rows] = await e.execute(
    `SELECT dv.id_detalle_venta,dv.id_producto,p.codigo producto_codigo,p.nombre producto_nombre,dv.cantidad,dv.costo_unitario_historico,dv.precio_unitario,dv.descuento,dv.impuesto,dv.subtotal,dv.creado_en,um.id_unidad,um.nombre unidad_nombre,um.abreviatura unidad_abreviatura,um.permite_decimales FROM detalle_ventas dv INNER JOIN productos p ON p.id_producto=dv.id_producto INNER JOIN unidades_medida um ON um.id_unidad=p.id_unidad WHERE dv.id_venta=? ORDER BY dv.id_detalle_venta`,
    [id],
  );
  return rows.map((r) => ({
    id_detalle_venta: r.id_detalle_venta,
    producto: {
      id_producto: r.id_producto,
      codigo: r.producto_codigo,
      nombre: r.producto_nombre,
    },
    unidad: {
      id_unidad: r.id_unidad,
      nombre: r.unidad_nombre,
      abreviatura: r.unidad_abreviatura,
      permite_decimales: Boolean(r.permite_decimales),
    },
    cantidad: r.cantidad,
    costo_unitario_historico: r.costo_unitario_historico,
    precio_unitario: r.precio_unitario,
    descuento: r.descuento,
    impuesto: r.impuesto,
    subtotal: r.subtotal,
    creado_en: r.creado_en,
  }));
}
async function findProductForUpdate(c, id) {
  const [rows] = await c.execute(
    `SELECT p.id_producto,p.estado,p.precio_venta,p.costo_promedio,um.permite_decimales FROM productos p INNER JOIN unidades_medida um ON um.id_unidad=p.id_unidad WHERE p.id_producto=? LIMIT 1 FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}
async function findItemForUpdate(c, saleId, itemId) {
  const [rows] = await c.execute(
    'SELECT id_detalle_venta,id_venta,id_producto,cantidad,costo_unitario_historico,precio_unitario,descuento,impuesto,subtotal FROM detalle_ventas WHERE id_venta=? AND id_detalle_venta=? LIMIT 1 FOR UPDATE',
    [saleId, itemId],
  );
  return rows[0] || null;
}
async function findItemByProduct(c, saleId, productId, excluded = null) {
  const [rows] = await c.execute(
    'SELECT id_detalle_venta FROM detalle_ventas WHERE id_venta=? AND id_producto=? AND (? IS NULL OR id_detalle_venta<>?) LIMIT 1',
    [saleId, productId, excluded, excluded],
  );
  return rows[0] || null;
}
async function createItem(c, saleId, d) {
  const [r] = await c.execute(
    'INSERT INTO detalle_ventas(id_venta,id_producto,cantidad,costo_unitario_historico,precio_unitario,descuento,impuesto,subtotal) VALUES(?,?,?,?,?,?,?,?)',
    [
      saleId,
      d.productId,
      d.quantity.fixed,
      d.historicalCost,
      d.unitPrice,
      d.discount.fixed,
      d.tax.fixed,
      d.subtotal,
    ],
  );
  return r.insertId;
}
async function updateItem(c, saleId, itemId, d) {
  await c.execute(
    'UPDATE detalle_ventas SET id_producto=?,cantidad=?,costo_unitario_historico=?,precio_unitario=?,descuento=?,impuesto=?,subtotal=? WHERE id_venta=? AND id_detalle_venta=?',
    [
      d.productId,
      d.quantity.fixed,
      d.historicalCost,
      d.unitPrice,
      d.discount.fixed,
      d.tax.fixed,
      d.subtotal,
      saleId,
      itemId,
    ],
  );
}
async function deleteItem(c, saleId, itemId) {
  await c.execute(
    'DELETE FROM detalle_ventas WHERE id_venta=? AND id_detalle_venta=?',
    [saleId, itemId],
  );
}
async function amounts(c, id) {
  const [rows] = await c.execute(
    'SELECT subtotal,descuento,impuesto FROM detalle_ventas WHERE id_venta=? ORDER BY id_detalle_venta',
    [id],
  );
  return rows;
}
async function updateTotals(c, id, t) {
  await c.execute(
    'UPDATE ventas SET subtotal=?,descuento=?,impuesto=?,total=? WHERE id_venta=?',
    [t.subtotal, t.discount, t.tax, t.total, id],
  );
}
async function audit(c, d) {
  await c.execute(
    `INSERT INTO bitacora(id_usuario,modulo,accion,entidad,id_entidad,datos_anteriores,datos_nuevos,direccion_ip,resultado,fecha_evento) VALUES(?,?,?,?,?,?,?,?,?,NOW())`,
    [
      d.userId,
      'ventas',
      d.action,
      d.entity,
      d.entityId,
      d.previousData ? JSON.stringify(d.previousData) : null,
      d.newData ? JSON.stringify(d.newData) : null,
      d.ipAddress || null,
      'exitoso',
    ],
  );
}
module.exports = {
  audit,
  amounts,
  count,
  create,
  createItem,
  deleteItem,
  findById,
  findByIdForUpdate,
  findByNumber,
  findClientForUpdate,
  findFinalConsumerForUpdate,
  findItemByProduct,
  findItemForUpdate,
  findProductForUpdate,
  list,
  listItems,
  update,
  updateItem,
  updateTotals,
};
