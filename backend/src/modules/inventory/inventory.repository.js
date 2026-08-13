const STOCK_COLUMNS = `p.id_producto,p.codigo,p.codigo_barras,p.nombre,p.existencia,p.existencia_minima,p.estado,u.id_unidad,u.nombre unidad_nombre,u.abreviatura,u.permite_decimales`;
async function listStock(e, status, low = false) {
  const where = [],
    v = [];
  if (status !== 'todos') {
    where.push('p.estado=?');
    v.push(status);
  }
  if (low)
    where.push("p.estado='activo' AND p.existencia<=p.existencia_minima");
  const [r] = await e.execute(
    `SELECT ${STOCK_COLUMNS} FROM productos p INNER JOIN unidades_medida u ON u.id_unidad=p.id_unidad ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY p.nombre,p.id_producto`,
    v,
  );
  return r.map((x) => ({
    ...x,
    permite_decimales: Boolean(x.permite_decimales),
    inventario_bajo:
      x.estado === 'activo' &&
      Number(x.existencia) <= Number(x.existencia_minima),
  }));
}
function movementWhere(f) {
  const c = [],
    v = [];
  for (const [value, sql] of [
    [f.product, 'mi.id_producto=?'],
    [f.type, 'mi.tipo_movimiento=?'],
    [f.nature, 'mi.naturaleza=?'],
    [f.user, 'mi.id_usuario=?'],
    [f.referenceType, 'mi.tipo_referencia=?'],
    [f.referenceId, 'mi.id_referencia=?'],
  ])
    if (value) {
      c.push(sql);
      v.push(value);
    }
  if (f.dateFrom) {
    c.push('mi.fecha_movimiento>=?');
    v.push(`${f.dateFrom} 00:00:00`);
  }
  if (f.dateTo) {
    c.push('mi.fecha_movimiento<DATE_ADD(?,INTERVAL 1 DAY)');
    v.push(`${f.dateTo} 00:00:00`);
  }
  return { clause: c.length ? `WHERE ${c.join(' AND ')}` : '', values: v };
}
async function listMovements(e, f) {
  const { clause, values } = movementWhere(f);
  const [r] = await e.execute(
    `SELECT mi.id_movimiento_inventario,mi.tipo_movimiento,mi.naturaleza,mi.cantidad,mi.existencia_anterior,mi.existencia_posterior,mi.tipo_referencia,mi.id_referencia,mi.motivo,mi.fecha_movimiento,p.id_producto,p.codigo producto_codigo,p.nombre producto_nombre,u.id_usuario,u.nombre usuario_nombre,u.apellido usuario_apellido,u.nombre_usuario FROM movimientos_inventario mi INNER JOIN productos p ON p.id_producto=mi.id_producto INNER JOIN usuarios u ON u.id_usuario=mi.id_usuario ${clause} ORDER BY mi.fecha_movimiento DESC,mi.id_movimiento_inventario DESC LIMIT ? OFFSET ?`,
    [...values, f.limit, (f.page - 1) * f.limit],
  );
  return r;
}
async function countMovements(e, f) {
  const { clause, values } = movementWhere(f);
  const [[r]] = await e.execute(
    `SELECT COUNT(*) total FROM movimientos_inventario mi ${clause}`,
    values,
  );
  return Number(r.total);
}
async function lockProduct(c, id) {
  const [r] = await c.execute(
    'SELECT p.id_producto,p.estado,p.existencia,p.costo_promedio,u.permite_decimales FROM productos p INNER JOIN unidades_medida u ON u.id_unidad=p.id_unidad WHERE p.id_producto=? LIMIT 1 FOR UPDATE',
    [id],
  );
  return r[0] || null;
}
async function createAdjustment(c, d) {
  const [r] = await c.execute(
    'INSERT INTO ajustes_inventario(id_producto,id_usuario,naturaleza,cantidad,existencia_anterior,existencia_posterior,motivo,fecha_ajuste) VALUES(?,?,?,?,?,?,?,NOW())',
    [d.productId, d.userId, d.nature, d.quantity, d.previous, d.next, d.reason],
  );
  return r.insertId;
}
async function updateStock(c, id, stock) {
  await c.execute('UPDATE productos SET existencia=? WHERE id_producto=?', [
    stock,
    id,
  ]);
}
async function createMovement(c, d) {
  await c.execute(
    "INSERT INTO movimientos_inventario(id_producto,tipo_movimiento,naturaleza,cantidad,existencia_anterior,existencia_posterior,tipo_referencia,id_referencia,motivo,id_usuario,fecha_movimiento) VALUES(?,'ajuste',?,?,?,?,'ajuste',?,?,?,NOW())",
    [
      d.productId,
      d.nature,
      d.quantity,
      d.previous,
      d.next,
      d.adjustmentId,
      d.reason,
      d.userId,
    ],
  );
}
async function audit(c, d) {
  await c.execute(
    "INSERT INTO bitacora(id_usuario,modulo,accion,entidad,id_entidad,datos_anteriores,datos_nuevos,direccion_ip,resultado,fecha_evento) VALUES(?,'inventario','ajustar','ajuste_inventario',?,?,?,?,'exitoso',NOW())",
    [
      d.userId,
      d.adjustmentId,
      JSON.stringify(d.previousData),
      JSON.stringify(d.newData),
      d.ipAddress || null,
    ],
  );
}
module.exports = {
  audit,
  countMovements,
  createAdjustment,
  createMovement,
  listMovements,
  listStock,
  lockProduct,
  updateStock,
};
