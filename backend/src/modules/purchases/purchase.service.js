const pool = require('../../config/database');
const purchaseRepository = require('./purchase.repository');
const {
  validateId,
  validateItemInput,
  validateListQuery,
  validatePurchaseInput,
} = require('./purchase.validation');

const MAX_MONEY_CENTS = 999999999999n;

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const purchaseNotFoundError = () => httpError(404, 'Compra no encontrada');
const itemNotFoundError = () =>
  httpError(404, 'Detalle de compra no encontrado');
const duplicateNumberError = () =>
  httpError(409, 'Ya existe una compra con ese número');
const duplicateProductError = () =>
  httpError(409, 'El producto ya existe en esta compra');

function mapDatabaseError(error) {
  return error?.code === 'ER_DUP_ENTRY' ? duplicateNumberError() : error;
}

function centsFromDecimal(value) {
  return BigInt(String(value).replace('.', ''));
}

function formatCents(cents) {
  const digits = cents.toString().padStart(3, '0');
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

function calculateLine(data) {
  const grossCents = (data.quantity.units * data.unitCost.units + 500n) / 1000n;
  if (grossCents > MAX_MONEY_CENTS) {
    throw httpError(
      400,
      'El subtotal de la línea está fuera del rango permitido',
    );
  }
  if (data.discount.units > grossCents) {
    throw httpError(
      400,
      'El descuento no puede superar el subtotal de la línea',
    );
  }
  return { ...data, subtotal: formatCents(grossCents) };
}

function calculateTotals(rows) {
  let subtotal = 0n;
  let discount = 0n;
  let tax = 0n;
  for (const row of rows) {
    subtotal += centsFromDecimal(row.subtotal);
    discount += centsFromDecimal(row.descuento);
    tax += centsFromDecimal(row.impuesto);
  }
  const total = subtotal - discount + tax;
  if (
    [subtotal, discount, tax, total].some(
      (value) => value < 0n || value > MAX_MONEY_CENTS,
    )
  ) {
    throw httpError(
      400,
      'Los totales de la compra están fuera del rango permitido',
    );
  }
  return {
    subtotal: formatCents(subtotal),
    discount: formatCents(discount),
    tax: formatCents(tax),
    total: formatCents(total),
  };
}

function purchaseAuditSnapshot(purchase) {
  return purchase
    ? {
        id_compra: purchase.id_compra,
        numero_compra: purchase.numero_compra,
        id_proveedor: purchase.proveedor?.id_proveedor ?? purchase.id_proveedor,
        estado: purchase.estado,
        subtotal: purchase.subtotal,
        descuento: purchase.descuento,
        impuesto: purchase.impuesto,
        total: purchase.total,
      }
    : null;
}

function itemAuditSnapshot(item) {
  return item
    ? {
        id_detalle_compra: item.id_detalle_compra,
        id_producto: item.producto?.id_producto ?? item.id_producto,
        cantidad: item.cantidad,
        costo_unitario: item.costo_unitario,
        descuento: item.descuento,
        impuesto: item.impuesto,
        subtotal: item.subtotal,
      }
    : null;
}

async function runTransaction(operation) {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const result = await operation(connection);
    await connection.commit();
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        /* Respuesta global saneada. */
      }
    }
    throw mapDatabaseError(error);
  } finally {
    connection.release();
  }
}

function ensureDraft(purchase) {
  if (purchase.estado !== 'borrador') {
    throw httpError(409, 'Solo las compras en borrador pueden modificarse');
  }
}

async function validateSupplier(connection, supplierId) {
  const supplier = await purchaseRepository.findActiveSupplierForUpdate(
    connection,
    supplierId,
  );
  if (!supplier) throw httpError(404, 'Proveedor no encontrado');
  if (supplier.estado !== 'activo')
    throw httpError(400, 'El proveedor debe estar activo');
}

async function validateProduct(connection, data) {
  const product = await purchaseRepository.findActiveProductForUpdate(
    connection,
    data.productId,
  );
  if (!product) throw httpError(404, 'Producto no encontrado');
  if (product.estado !== 'activo')
    throw httpError(400, 'El producto debe estar activo');
  if (!product.permite_decimales && data.quantity.units % 1000n !== 0n) {
    throw httpError(
      400,
      'La unidad de medida del producto no permite cantidades decimales',
    );
  }
}

async function validateUniqueNumber(connection, number, excludedId = null) {
  if (await purchaseRepository.findByNumber(connection, number, excludedId)) {
    throw duplicateNumberError();
  }
}

async function recalculateTotals(connection, purchaseId) {
  const rows = await purchaseRepository.getItemAmounts(connection, purchaseId);
  const totals = calculateTotals(rows);
  await purchaseRepository.updateTotals(connection, purchaseId, totals);
  return totals;
}

async function hydratePurchase(executor, purchaseId) {
  const purchase = await purchaseRepository.findById(executor, purchaseId);
  if (!purchase) throw purchaseNotFoundError();
  purchase.items = await purchaseRepository.listItems(executor, purchaseId);
  return purchase;
}

async function listPurchases(rawQuery) {
  const filters = validateListQuery(rawQuery);
  const [purchases, total] = await Promise.all([
    purchaseRepository.list(pool, filters),
    purchaseRepository.count(pool, filters),
  ]);
  return {
    purchases,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      total_pages: Math.ceil(total / filters.limit),
    },
  };
}

async function getPurchase(rawId) {
  return hydratePurchase(pool, validateId(rawId));
}

async function createPurchase(rawData, actor) {
  const data = validatePurchaseInput(rawData);
  return runTransaction(async (connection) => {
    await validateSupplier(connection, data.supplierId);
    await validateUniqueNumber(connection, data.purchaseNumber);
    const purchaseId = await purchaseRepository.create(
      connection,
      data,
      actor.userId,
    );
    const purchase = await hydratePurchase(connection, purchaseId);
    await purchaseRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'crear_borrador',
      entity: 'compras',
      entityId: purchaseId,
      previousData: null,
      newData: purchaseAuditSnapshot(purchase),
      ipAddress: actor.ipAddress,
    });
    return purchase;
  });
}

async function updatePurchase(rawId, rawData, actor) {
  const purchaseId = validateId(rawId);
  const data = validatePurchaseInput(rawData);
  return runTransaction(async (connection) => {
    const current = await purchaseRepository.findByIdForUpdate(
      connection,
      purchaseId,
    );
    if (!current) throw purchaseNotFoundError();
    ensureDraft(current);
    await validateSupplier(connection, data.supplierId);
    await validateUniqueNumber(connection, data.purchaseNumber, purchaseId);
    await purchaseRepository.update(connection, purchaseId, data);
    const purchase = await hydratePurchase(connection, purchaseId);
    await purchaseRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'editar_borrador',
      entity: 'compras',
      entityId: purchaseId,
      previousData: purchaseAuditSnapshot(current),
      newData: purchaseAuditSnapshot(purchase),
      ipAddress: actor.ipAddress,
    });
    return purchase;
  });
}

async function addItem(rawPurchaseId, rawData, actor) {
  const purchaseId = validateId(rawPurchaseId);
  const data = calculateLine(validateItemInput(rawData));
  return runTransaction(async (connection) => {
    const purchase = await purchaseRepository.findByIdForUpdate(
      connection,
      purchaseId,
    );
    if (!purchase) throw purchaseNotFoundError();
    ensureDraft(purchase);
    await validateProduct(connection, data);
    if (
      await purchaseRepository.findItemByProduct(
        connection,
        purchaseId,
        data.productId,
      )
    ) {
      throw duplicateProductError();
    }
    const itemId = await purchaseRepository.createItem(
      connection,
      purchaseId,
      data,
    );
    await recalculateTotals(connection, purchaseId);
    const result = await hydratePurchase(connection, purchaseId);
    const item = result.items.find(
      (entry) => entry.id_detalle_compra === itemId,
    );
    await purchaseRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'agregar_detalle',
      entity: 'detalle_compras',
      entityId: itemId,
      previousData: null,
      newData: itemAuditSnapshot(item),
      ipAddress: actor.ipAddress,
    });
    return result;
  });
}

async function updateItem(rawPurchaseId, rawItemId, rawData, actor) {
  const purchaseId = validateId(rawPurchaseId);
  const itemId = validateId(rawItemId, 'itemId');
  const data = calculateLine(validateItemInput(rawData));
  return runTransaction(async (connection) => {
    const purchase = await purchaseRepository.findByIdForUpdate(
      connection,
      purchaseId,
    );
    if (!purchase) throw purchaseNotFoundError();
    ensureDraft(purchase);
    const currentItem = await purchaseRepository.findItemByIdForUpdate(
      connection,
      purchaseId,
      itemId,
    );
    if (!currentItem) throw itemNotFoundError();
    await validateProduct(connection, data);
    if (
      await purchaseRepository.findItemByProduct(
        connection,
        purchaseId,
        data.productId,
        itemId,
      )
    ) {
      throw duplicateProductError();
    }
    await purchaseRepository.updateItem(connection, purchaseId, itemId, data);
    await recalculateTotals(connection, purchaseId);
    const result = await hydratePurchase(connection, purchaseId);
    const item = result.items.find(
      (entry) => entry.id_detalle_compra === itemId,
    );
    await purchaseRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'editar_detalle',
      entity: 'detalle_compras',
      entityId: itemId,
      previousData: itemAuditSnapshot(currentItem),
      newData: itemAuditSnapshot(item),
      ipAddress: actor.ipAddress,
    });
    return result;
  });
}

async function removeItem(rawPurchaseId, rawItemId, actor) {
  const purchaseId = validateId(rawPurchaseId);
  const itemId = validateId(rawItemId, 'itemId');
  return runTransaction(async (connection) => {
    const purchase = await purchaseRepository.findByIdForUpdate(
      connection,
      purchaseId,
    );
    if (!purchase) throw purchaseNotFoundError();
    ensureDraft(purchase);
    const currentItem = await purchaseRepository.findItemByIdForUpdate(
      connection,
      purchaseId,
      itemId,
    );
    if (!currentItem) throw itemNotFoundError();
    await purchaseRepository.deleteItem(connection, purchaseId, itemId);
    await recalculateTotals(connection, purchaseId);
    const result = await hydratePurchase(connection, purchaseId);
    await purchaseRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'quitar_detalle',
      entity: 'detalle_compras',
      entityId: itemId,
      previousData: itemAuditSnapshot(currentItem),
      newData: null,
      ipAddress: actor.ipAddress,
    });
    return result;
  });
}

module.exports = {
  addItem,
  createPurchase,
  getPurchase,
  listPurchases,
  removeItem,
  updateItem,
  updatePurchase,
};
