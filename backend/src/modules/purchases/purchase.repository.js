const PURCHASE_COLUMNS = `
  c.id_compra, c.numero_compra, c.numero_documento_proveedor,
  c.fecha_compra, c.subtotal, c.descuento, c.impuesto, c.total,
  c.estado, c.observacion, c.creado_en, c.actualizado_en,
  pr.id_proveedor, pr.nombre AS proveedor_nombre,
  u.id_usuario, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
  u.nombre_usuario
`;

const PURCHASE_JOINS = `
  INNER JOIN proveedores pr ON pr.id_proveedor = c.id_proveedor
  INNER JOIN usuarios u ON u.id_usuario = c.id_usuario
`;

function normalizePurchase(row) {
  if (!row) return null;
  const {
    id_proveedor,
    proveedor_nombre,
    id_usuario,
    usuario_nombre,
    usuario_apellido,
    nombre_usuario,
    ...purchase
  } = row;
  return {
    ...purchase,
    proveedor: { id_proveedor, nombre: proveedor_nombre },
    usuario: {
      id_usuario,
      nombre: usuario_nombre,
      apellido: usuario_apellido,
      nombre_usuario,
    },
  };
}

function buildListFilters({ status, supplierId, dateFrom, dateTo }) {
  const conditions = [];
  const values = [];
  if (status) {
    conditions.push('c.estado = ?');
    values.push(status);
  }
  if (supplierId) {
    conditions.push('c.id_proveedor = ?');
    values.push(supplierId);
  }
  if (dateFrom) {
    conditions.push('c.fecha_compra >= ?');
    values.push(`${dateFrom} 00:00:00`);
  }
  if (dateTo) {
    conditions.push('c.fecha_compra < DATE_ADD(?, INTERVAL 1 DAY)');
    values.push(`${dateTo} 00:00:00`);
  }
  return {
    clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

async function list(executor, filters) {
  const { clause, values } = buildListFilters(filters);
  const [rows] = await executor.execute(
    `SELECT ${PURCHASE_COLUMNS} FROM compras c ${PURCHASE_JOINS} ${clause}
     ORDER BY c.fecha_compra DESC, c.id_compra DESC LIMIT ? OFFSET ?`,
    [...values, filters.limit, (filters.page - 1) * filters.limit],
  );
  return rows.map(normalizePurchase);
}

async function count(executor, filters) {
  const { clause, values } = buildListFilters(filters);
  const [[result]] = await executor.execute(
    `SELECT COUNT(*) AS total FROM compras c ${clause}`,
    values,
  );
  return Number(result.total);
}

async function findById(executor, purchaseId) {
  const [rows] = await executor.execute(
    `SELECT ${PURCHASE_COLUMNS} FROM compras c ${PURCHASE_JOINS}
     WHERE c.id_compra = ? LIMIT 1`,
    [purchaseId],
  );
  return normalizePurchase(rows[0]);
}

async function findByIdForUpdate(connection, purchaseId) {
  const [rows] = await connection.execute(
    `SELECT id_compra, numero_compra, id_proveedor, id_usuario, estado,
            subtotal, descuento, impuesto, total, observacion
     FROM compras WHERE id_compra = ? LIMIT 1 FOR UPDATE`,
    [purchaseId],
  );
  return rows[0] || null;
}

async function findSupplierForUpdate(connection, supplierId) {
  const [rows] = await connection.execute(
    `SELECT id_proveedor, estado FROM proveedores
     WHERE id_proveedor = ? LIMIT 1 FOR UPDATE`,
    [supplierId],
  );
  return rows[0] || null;
}

async function findByNumber(
  executor,
  purchaseNumber,
  excludedPurchaseId = null,
) {
  const [rows] = await executor.execute(
    `SELECT id_compra FROM compras WHERE numero_compra = ?
     AND (? IS NULL OR id_compra <> ?) LIMIT 1`,
    [purchaseNumber, excludedPurchaseId, excludedPurchaseId],
  );
  return rows[0] || null;
}

async function findActiveSupplierForUpdate(connection, supplierId) {
  const [rows] = await connection.execute(
    `SELECT id_proveedor, estado FROM proveedores
     WHERE id_proveedor = ? LIMIT 1 FOR UPDATE`,
    [supplierId],
  );
  return rows[0] || null;
}

async function create(connection, data, userId) {
  const [result] = await connection.execute(
    `INSERT INTO compras (
       numero_compra, numero_documento_proveedor, id_proveedor, id_usuario,
       fecha_compra, subtotal, descuento, impuesto, total, estado, observacion
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.purchaseNumber,
      data.supplierDocumentNumber,
      data.supplierId,
      userId,
      data.purchaseDate,
      '0.00',
      '0.00',
      '0.00',
      '0.00',
      'borrador',
      data.observation,
    ],
  );
  return result.insertId;
}

async function update(connection, purchaseId, data) {
  await connection.execute(
    `UPDATE compras SET numero_compra = ?, numero_documento_proveedor = ?,
       id_proveedor = ?, fecha_compra = ?, observacion = ?
     WHERE id_compra = ?`,
    [
      data.purchaseNumber,
      data.supplierDocumentNumber,
      data.supplierId,
      data.purchaseDate,
      data.observation,
      purchaseId,
    ],
  );
}

async function listItems(executor, purchaseId) {
  const [rows] = await executor.execute(
    `SELECT dc.id_detalle_compra, dc.id_producto, p.codigo AS producto_codigo,
            p.nombre AS producto_nombre, dc.cantidad, dc.costo_unitario,
            dc.descuento, dc.impuesto, dc.subtotal, dc.creado_en,
            um.id_unidad, um.nombre AS unidad_nombre,
            um.abreviatura AS unidad_abreviatura,
            um.permite_decimales
     FROM detalle_compras dc
     INNER JOIN productos p ON p.id_producto = dc.id_producto
     INNER JOIN unidades_medida um ON um.id_unidad = p.id_unidad
     WHERE dc.id_compra = ? ORDER BY dc.id_detalle_compra`,
    [purchaseId],
  );
  return rows.map((row) => ({
    id_detalle_compra: row.id_detalle_compra,
    producto: {
      id_producto: row.id_producto,
      codigo: row.producto_codigo,
      nombre: row.producto_nombre,
    },
    unidad: {
      id_unidad: row.id_unidad,
      nombre: row.unidad_nombre,
      abreviatura: row.unidad_abreviatura,
      permite_decimales: Boolean(row.permite_decimales),
    },
    cantidad: row.cantidad,
    costo_unitario: row.costo_unitario,
    descuento: row.descuento,
    impuesto: row.impuesto,
    subtotal: row.subtotal,
    creado_en: row.creado_en,
  }));
}

async function findActiveProductForUpdate(connection, productId) {
  const [rows] = await connection.execute(
    `SELECT p.id_producto, p.estado, um.permite_decimales
     FROM productos p INNER JOIN unidades_medida um ON um.id_unidad = p.id_unidad
     WHERE p.id_producto = ? LIMIT 1 FOR UPDATE`,
    [productId],
  );
  return rows[0] || null;
}

async function findItemByIdForUpdate(connection, purchaseId, itemId) {
  const [rows] = await connection.execute(
    `SELECT id_detalle_compra, id_compra, id_producto, cantidad,
            costo_unitario, descuento, impuesto, subtotal
     FROM detalle_compras
     WHERE id_detalle_compra = ? AND id_compra = ? LIMIT 1 FOR UPDATE`,
    [itemId, purchaseId],
  );
  return rows[0] || null;
}

async function findItemByProduct(
  connection,
  purchaseId,
  productId,
  excludedItemId = null,
) {
  const [rows] = await connection.execute(
    `SELECT id_detalle_compra FROM detalle_compras
     WHERE id_compra = ? AND id_producto = ?
       AND (? IS NULL OR id_detalle_compra <> ?) LIMIT 1`,
    [purchaseId, productId, excludedItemId, excludedItemId],
  );
  return rows[0] || null;
}

async function createItem(connection, purchaseId, data) {
  const [result] = await connection.execute(
    `INSERT INTO detalle_compras (
       id_compra, id_producto, cantidad, costo_unitario,
       descuento, impuesto, subtotal
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      purchaseId,
      data.productId,
      data.quantity.fixed,
      data.unitCost.fixed,
      data.discount.fixed,
      data.tax.fixed,
      data.subtotal,
    ],
  );
  return result.insertId;
}

async function updateItem(connection, purchaseId, itemId, data) {
  await connection.execute(
    `UPDATE detalle_compras SET id_producto = ?, cantidad = ?,
       costo_unitario = ?, descuento = ?, impuesto = ?, subtotal = ?
     WHERE id_detalle_compra = ? AND id_compra = ?`,
    [
      data.productId,
      data.quantity.fixed,
      data.unitCost.fixed,
      data.discount.fixed,
      data.tax.fixed,
      data.subtotal,
      itemId,
      purchaseId,
    ],
  );
}

async function deleteItem(connection, purchaseId, itemId) {
  await connection.execute(
    'DELETE FROM detalle_compras WHERE id_detalle_compra = ? AND id_compra = ?',
    [itemId, purchaseId],
  );
}

async function getItemAmounts(connection, purchaseId) {
  const [rows] = await connection.execute(
    `SELECT subtotal, descuento, impuesto FROM detalle_compras
     WHERE id_compra = ? ORDER BY id_detalle_compra`,
    [purchaseId],
  );
  return rows;
}

async function getConfirmationItemsForUpdate(connection, purchaseId) {
  const [rows] = await connection.execute(
    `SELECT id_detalle_compra, id_producto, cantidad, costo_unitario,
            descuento, impuesto, subtotal
     FROM detalle_compras
     WHERE id_compra = ?
     ORDER BY id_producto, id_detalle_compra
     FOR UPDATE`,
    [purchaseId],
  );
  return rows;
}

async function configurationForUpdate(connection, keys) {
  const placeholders = keys.map(() => '?').join(', ');
  const [rows] = await connection.execute(
    `SELECT id_configuracion, clave, valor, tipo_dato
     FROM configuracion
     WHERE clave IN (${placeholders})
     ORDER BY clave
     FOR UPDATE`,
    keys,
  );
  return rows;
}

async function updateConfirmedItemAmounts(connection, itemId, data) {
  await connection.execute(
    `UPDATE detalle_compras SET subtotal = ?, impuesto = ?
     WHERE id_detalle_compra = ?`,
    [data.subtotal, data.tax, itemId],
  );
}

async function lockProductsForUpdate(connection, productIds) {
  const placeholders = productIds.map(() => '?').join(', ');
  const [rows] = await connection.execute(
    `SELECT p.id_producto, p.existencia, p.costo_promedio, p.estado,
            um.permite_decimales
     FROM productos p
     INNER JOIN unidades_medida um ON um.id_unidad = p.id_unidad
     WHERE p.id_producto IN (${placeholders})
     ORDER BY p.id_producto
     FOR UPDATE`,
    productIds,
  );
  return rows;
}

async function updateProductInventory(
  connection,
  productId,
  newStock,
  newAverageCost,
) {
  await connection.execute(
    `UPDATE productos SET existencia = ?, costo_promedio = ?
     WHERE id_producto = ?`,
    [newStock, newAverageCost, productId],
  );
}

async function createInventoryMovement(connection, data) {
  await connection.execute(
    `INSERT INTO movimientos_inventario (
       id_producto, tipo_movimiento, naturaleza, cantidad,
       existencia_anterior, existencia_posterior, tipo_referencia,
       id_referencia, motivo, id_usuario, fecha_movimiento
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.productId,
      'compra',
      'entrada',
      data.quantity,
      data.previousStock,
      data.newStock,
      'compra',
      data.purchaseId,
      'Recepción de compra',
      data.userId,
    ],
  );
}

async function markAsReceived(connection, purchaseId) {
  const [result] = await connection.execute(
    `UPDATE compras SET estado = ?
     WHERE id_compra = ? AND estado = ?`,
    ['recibida', purchaseId, 'borrador'],
  );
  return result.affectedRows;
}

async function updateProductStock(connection, productId, newStock) {
  await connection.execute(
    `UPDATE productos SET existencia = ?
     WHERE id_producto = ?`,
    [newStock, productId],
  );
}

async function createCancellationMovement(connection, data) {
  await connection.execute(
    `INSERT INTO movimientos_inventario (
       id_producto, tipo_movimiento, naturaleza, cantidad,
       existencia_anterior, existencia_posterior, tipo_referencia,
       id_referencia, motivo, id_usuario, fecha_movimiento
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.productId,
      'anulacion_compra',
      'salida',
      data.quantity,
      data.previousStock,
      data.newStock,
      'compra',
      data.purchaseId,
      'Anulación de compra',
      data.userId,
    ],
  );
}

async function markAsCancelled(connection, purchaseId, observation) {
  const [result] = await connection.execute(
    `UPDATE compras SET estado = ?, observacion = ?
     WHERE id_compra = ? AND estado = ?`,
    ['anulada', observation, purchaseId, 'recibida'],
  );
  return result.affectedRows;
}

async function updateTotals(connection, purchaseId, totals) {
  await connection.execute(
    `UPDATE compras SET subtotal = ?, descuento = ?, impuesto = ?, total = ?
     WHERE id_compra = ?`,
    [totals.subtotal, totals.discount, totals.tax, totals.total, purchaseId],
  );
}

async function createAudit(connection, data) {
  await connection.execute(
    `INSERT INTO bitacora (
       id_usuario, modulo, accion, entidad, id_entidad, datos_anteriores,
       datos_nuevos, direccion_ip, resultado, fecha_evento
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.userId,
      'compras',
      data.action,
      data.entity,
      data.entityId,
      data.previousData ? JSON.stringify(data.previousData) : null,
      data.newData ? JSON.stringify(data.newData) : null,
      data.ipAddress || null,
      'exitoso',
    ],
  );
}

module.exports = {
  configurationForUpdate,
  count,
  create,
  createAudit,
  createCancellationMovement,
  createItem,
  deleteItem,
  findActiveProductForUpdate,
  findActiveSupplierForUpdate,
  findById,
  findByIdForUpdate,
  findByNumber,
  findSupplierForUpdate,
  getConfirmationItemsForUpdate,
  findItemByIdForUpdate,
  findItemByProduct,
  getItemAmounts,
  list,
  listItems,
  lockProductsForUpdate,
  markAsReceived,
  markAsCancelled,
  update,
  updateConfirmedItemAmounts,
  updateItem,
  updateProductInventory,
  updateProductStock,
  updateTotals,
  createInventoryMovement,
};
