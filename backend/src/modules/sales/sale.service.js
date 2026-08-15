const pool = require('../../config/database');
const repo = require('./sale.repository');
const {
  validateCancellationInput,
  validateId,
  validateConfirmInput,
  validateItemInput,
  validateListQuery,
  validateSaleInput,
} = require('./sale.validation');
const MAX = 999999999999n;
const PERCENT_SCALE = 10000n;
const FISCAL_CONFIGURATION_KEYS = [
  'descuento_maximo',
  'impuesto_activo',
  'tasa_impuesto',
];
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
  if (e?.code !== 'ER_DUP_ENTRY') return e;
  if (String(e.sqlMessage || '').includes('numero_factura'))
    return error(409, 'El nÃºmero de factura ya existe');
  return duplicateNumber();
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
function decimalUnits(value, scale, field) {
  const text = String(value);
  const match = text.match(new RegExp(`^(\\d+)(?:\\.(\\d{1,${scale}}))?$`));
  if (!match) throw error(400, `${field} no es vÃ¡lido`);
  return (
    BigInt(match[1]) * 10n ** BigInt(scale) +
    BigInt((match[2] || '').padEnd(scale, '0'))
  );
}
function quantity(value) {
  const units = decimalUnits(value, 3, 'La cantidad');
  const text = units.toString().padStart(4, '0');
  return { units, fixed: `${text.slice(0, -3)}.${text.slice(-3)}` };
}
function parsePercentage(value, key) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) throw error(500, `La configuracion ${key} no es valida`);
  const units =
    BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0'));
  if (units > 10000n) throw error(500, `La configuracion ${key} no es valida`);
  return units;
}
function fiscalConfiguration(rows) {
  const config = new Map(rows.map((row) => [row.clave, row]));
  if (config.size !== FISCAL_CONFIGURATION_KEYS.length)
    throw error(500, 'La configuracion fiscal esta incompleta');
  const taxActive = config.get('impuesto_activo').valor;
  if (!['true', 'false'].includes(taxActive))
    throw error(500, 'La configuracion impuesto_activo no es valida');
  return {
    taxActive: taxActive === 'true',
    taxRate: parsePercentage(
      config.get('tasa_impuesto').valor,
      'tasa_impuesto',
    ),
    maximumDiscount: parsePercentage(
      config.get('descuento_maximo').valor,
      'descuento_maximo',
    ),
  };
}
async function fiscalConfigurationForUpdate(c) {
  return fiscalConfiguration(
    await repo.configurationForUpdate(c, FISCAL_CONFIGURATION_KEYS),
  );
}
function calculateTax(base, configuration) {
  if (!configuration.taxActive) return 0n;
  return (base * configuration.taxRate + PERCENT_SCALE / 2n) / PERCENT_SCALE;
}
function line(data, unitPrice, historicalCost, configuration) {
  const price = cents(unitPrice),
    gross = (data.quantity.units * price + 500n) / 1000n;
  if (gross > MAX)
    throw error(400, 'El subtotal de la línea está fuera del rango permitido');
  if (
    data.discount.units * PERCENT_SCALE >
    gross * configuration.maximumDiscount
  )
    throw error(400, 'El descuento no puede superar el subtotal de la línea');
  const tax = calculateTax(gross - data.discount.units, configuration);
  return {
    ...data,
    unitPrice,
    historicalCost,
    tax: { fixed: money(tax), units: tax },
    subtotal: money(gross),
  };
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
        numero_factura: s.numero_factura,
        id_cliente: s.cliente?.id_cliente ?? s.id_cliente,
        id_caja: s.caja?.id_caja ?? s.id_caja,
        estado: s.estado,
        subtotal: s.subtotal,
        descuento: s.descuento,
        impuesto: s.impuesto,
        total: s.total,
        motivo_anulacion: s.motivo_anulacion,
        anulada_por: s.anulada_por,
        anulada_en: s.anulada_en,
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
    const configuration = await fiscalConfigurationForUpdate(c),
      calculated = line(d, p.precio_venta, p.costo_promedio, configuration),
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
    const configuration = await fiscalConfigurationForUpdate(c),
      changed = Number(current.id_producto) !== Number(d.productId),
      calculated = line(
        d,
        changed ? p.precio_venta : current.precio_unitario,
        changed ? p.costo_promedio : current.costo_unitario_historico,
        configuration,
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
async function confirmSale(rawId, body, actor) {
  const id = validateId(rawId),
    input = validateConfirmInput(body);
  return transaction(async (c) => {
    const sale = await repo.findByIdForUpdate(c, id);
    if (!sale) throw notFound();
    ensurePreparation(sale);

    const items = await repo.confirmationItemsForUpdate(c, id);
    if (!items.length)
      throw error(400, 'La venta debe tener al menos un producto');
    const productIds = items.map((i) => Number(i.id_producto));
    if (new Set(productIds).size !== productIds.length)
      throw duplicateProduct();

    const currentClient = await repo.findClientForUpdate(c, sale.id_cliente);
    if (!currentClient || currentClient.estado !== 'activo')
      throw error(409, 'El cliente de la venta no estÃ¡ activo');

    const products = await repo.productsForUpdate(
      c,
      [...productIds].sort((a, b) => a - b),
    );
    if (products.length !== productIds.length)
      throw error(409, 'Uno o mÃ¡s productos ya no estÃ¡n disponibles');
    const configKeys = [
      ...FISCAL_CONFIGURATION_KEYS,
      'control_caja_activo',
      'serie_comprobante',
      'siguiente_numero_comprobante',
    ];
    const configRows = await repo.configurationForUpdate(c, configKeys);
    const config = new Map(configRows.map((row) => [row.clave, row]));
    if (config.size !== configKeys.length)
      throw error(500, 'La configuracion requerida esta incompleta');
    const fiscal = fiscalConfiguration(
      configRows.filter((row) => FISCAL_CONFIGURATION_KEYS.includes(row.clave)),
    );
    const productMap = new Map(products.map((p) => [Number(p.id_producto), p]));
    const calculatedItems = [];
    for (const item of items) {
      const p = productMap.get(Number(item.id_producto));
      if (!p || p.estado !== 'activo')
        throw error(409, 'Uno o mÃ¡s productos ya no estÃ¡n activos');
      const q = quantity(item.cantidad),
        stock = decimalUnits(p.existencia, 3, 'La existencia'),
        price = cents(item.precio_unitario),
        discount = cents(item.descuento),
        gross = (q.units * price + 500n) / 1000n;
      if (!p.permite_decimales && q.units % 1000n !== 0n)
        throw error(400, 'La unidad de medida no permite cantidades decimales');
      if (stock < q.units)
        throw error(409, 'Existencia insuficiente para confirmar la venta');
      if (discount * PERCENT_SCALE > gross * fiscal.maximumDiscount)
        throw error(
          400,
          'El descuento no puede superar el subtotal de la lÃ­nea',
        );
      const tax = calculateTax(gross - discount, fiscal);
      calculatedItems.push({
        ...item,
        quantity: q.fixed,
        previousStock: quantity(p.existencia).fixed,
        newStockUnits: stock - q.units,
        historicalCost: money(cents(p.costo_promedio)),
        subtotal: money(gross),
        discount,
        tax,
      });
      const ns = (stock - q.units).toString().padStart(4, '0');
      calculatedItems.at(-1).newStock = `${ns.slice(0, -3)}.${ns.slice(-3)}`;
    }
    const t = totals(
      calculatedItems.map((i) => ({
        subtotal: i.subtotal,
        descuento: money(i.discount),
        impuesto: money(i.tax),
      })),
    );

    if (t.total === '0.00' && input.payments.length)
      throw error(400, 'Una venta con total cero no debe incluir pagos');
    if (t.total !== '0.00' && !input.payments.length)
      throw error(400, 'Debe indicar al menos un pago');
    const paid = input.payments.reduce((sum, p) => sum + p.amount.units, 0n);
    if (paid !== cents(t.total))
      throw error(
        400,
        'La suma de los pagos debe coincidir con el total de la venta',
      );

    const methods = await repo.paymentMethodsForUpdate(
      c,
      input.payments.map((p) => p.methodId).sort((a, b) => a - b),
    );
    if (methods.length !== input.payments.length)
      throw error(400, 'Uno o mÃ¡s mÃ©todos de pago no existen');
    const methodMap = new Map(
      methods.map((m) => [Number(m.id_metodo_pago), m]),
    );
    let cashApplied = 0n;
    const payments = input.payments.map((payment) => {
      const method = methodMap.get(payment.methodId);
      if (method.estado !== 'activo')
        throw error(400, 'El mÃ©todo de pago debe estar activo');
      if (method.requiere_referencia && !payment.reference)
        throw error(
          400,
          'La referencia es obligatoria para el mÃ©todo de pago',
        );
      if (method.es_efectivo) {
        if (!payment.received || payment.received.units < payment.amount.units)
          throw error(400, 'El monto recibido en efectivo es insuficiente');
        cashApplied += payment.amount.units;
        return {
          ...payment,
          change: money(payment.received.units - payment.amount.units),
        };
      }
      if (payment.received !== null)
        throw error(400, 'monto_recibido solo corresponde a pagos en efectivo');
      return { ...payment, change: '0.00' };
    });

    if (config.size !== configKeys.length)
      throw error(500, 'La configuraciÃ³n de facturaciÃ³n estÃ¡ incompleta');
    const cashControlValue = config.get('control_caja_activo').valor;
    if (!['true', 'false'].includes(cashControlValue))
      throw error(500, 'La configuraciÃ³n de caja no es vÃ¡lida');
    const cashControl = cashControlValue === 'true';
    const series = String(config.get('serie_comprobante').valor).trim();
    if (!series || series === 'SIN_CONFIGURAR')
      throw error(409, 'La serie de comprobantes no estÃ¡ configurada');
    const sequenceText = String(
      config.get('siguiente_numero_comprobante').valor,
    );
    if (!/^\d+$/.test(sequenceText) || BigInt(sequenceText) < 1n)
      throw error(500, 'La secuencia de comprobantes no es vÃ¡lida');
    const invoiceNumber = `${series}-${sequenceText}`;
    if (invoiceNumber.length > 50)
      throw error(409, 'El nÃºmero de factura supera la longitud permitida');
    let cashboxId = null;
    if (cashControl) {
      const cashboxes = await repo.openCashboxesForUpdate(c, sale.id_usuario);
      if (cashboxes.length !== 1)
        throw error(
          409,
          cashboxes.length
            ? 'Existe mÃ¡s de una caja abierta para el vendedor'
            : 'El vendedor no tiene una caja abierta',
        );
      cashboxId = cashboxes[0].id_caja;
    }

    for (const item of calculatedItems) {
      await repo.updateConfirmedItem(
        c,
        id,
        item.id_detalle_venta,
        item.historicalCost,
        item.subtotal,
        money(item.tax),
      );
      await repo.updateStock(c, item.id_producto, item.newStock);
      await repo.createInventoryMovement(c, {
        productId: item.id_producto,
        quantity: item.quantity,
        previousStock: item.previousStock,
        newStock: item.newStock,
        saleId: id,
        userId: actor.userId,
      });
    }
    for (const payment of payments)
      await repo.createPayment(c, {
        saleId: id,
        methodId: payment.methodId,
        amount: payment.amount.fixed,
        reference: payment.reference,
        received: payment.received?.fixed || null,
        change: payment.change,
      });
    await repo.updateSequence(
      c,
      config.get('siguiente_numero_comprobante').id_configuracion,
      (BigInt(sequenceText) + 1n).toString(),
      actor.userId,
    );
    if (!(await repo.complete(c, id, invoiceNumber, cashboxId, t)))
      throw error(409, 'La venta ya no estÃ¡ disponible para confirmaciÃ³n');
    if (cashControl && cashApplied > 0n)
      await repo.createCashMovement(c, {
        cashboxId,
        saleId: id,
        userId: actor.userId,
        amount: money(cashApplied),
      });
    const result = await hydrate(c, id);
    await repo.audit(c, {
      userId: actor.userId,
      action: 'confirmar',
      entity: 'ventas',
      entityId: id,
      previousData: snapshot(sale),
      newData: snapshot(result),
      ipAddress: actor.ipAddress,
    });
    return result;
  });
}
async function cancelSale(rawId, body, actor) {
  const id = validateId(rawId),
    { reason } = validateCancellationInput(body);
  return transaction(async (c) => {
    const sale = await repo.findByIdForUpdate(c, id);
    if (!sale) throw notFound();
    if (sale.estado !== 'completada')
      throw error(409, 'Solo las ventas completadas pueden anularse');

    const items = await repo.confirmationItemsForUpdate(c, id);
    if (!items.length)
      throw error(409, 'La venta no contiene detalles para restaurar');
    const productIds = items.map((item) => Number(item.id_producto));
    if (new Set(productIds).size !== productIds.length)
      throw error(409, 'La venta contiene productos repetidos');
    const products = await repo.productsForUpdate(
      c,
      [...productIds].sort((left, right) => left - right),
    );
    if (products.length !== productIds.length)
      throw error(409, 'Uno o mÃ¡s productos de la venta no existen');
    const productMap = new Map(
      products.map((product) => [Number(product.id_producto), product]),
    );
    const restorations = items.map((item) => {
      const product = productMap.get(Number(item.id_producto));
      const soldQuantity = decimalUnits(item.cantidad, 3, 'La cantidad');
      const previousStock = decimalUnits(
        product.existencia,
        3,
        'La existencia',
      );
      const newStock = previousStock + soldQuantity;
      if (soldQuantity <= 0n || newStock > MAX)
        throw error(
          409,
          'La existencia resultante estÃ¡ fuera del rango permitido',
        );
      const previousText = previousStock.toString().padStart(4, '0');
      const newText = newStock.toString().padStart(4, '0');
      return {
        productId: item.id_producto,
        quantity: quantity(item.cantidad).fixed,
        previousStock: `${previousText.slice(0, -3)}.${previousText.slice(-3)}`,
        newStock: `${newText.slice(0, -3)}.${newText.slice(-3)}`,
      };
    });

    const payments = await repo.cancellationPaymentsForUpdate(c, id);
    const methodIds = [
      ...new Set(payments.map((payment) => Number(payment.id_metodo_pago))),
    ].sort((left, right) => left - right);
    const methods = await repo.paymentMethodsForUpdate(c, methodIds);
    if (methods.length !== methodIds.length)
      throw error(409, 'Los mÃ©todos de pago histÃ³ricos son inconsistentes');
    const methodMap = new Map(
      methods.map((method) => [Number(method.id_metodo_pago), method]),
    );
    const cashApplied = payments.reduce(
      (sum, payment) =>
        methodMap.get(Number(payment.id_metodo_pago)).es_efectivo
          ? sum + cents(payment.monto)
          : sum,
      0n,
    );

    let compensationCashbox = null;
    if (cashApplied > 0n) {
      const cashboxes = await repo.cancellationCashboxesForUpdate(
        c,
        sale.id_caja,
        actor.userId,
      );
      const originalCashbox =
        sale.id_caja === null
          ? null
          : cashboxes.find(
              (cashbox) => Number(cashbox.id_caja) === Number(sale.id_caja),
            );
      if (sale.id_caja !== null && !originalCashbox)
        throw error(409, 'La caja asociada no existe');

      const actorCashboxes = cashboxes.filter(
        (cashbox) =>
          Number(cashbox.id_usuario) === Number(actor.userId) &&
          cashbox.estado === 'abierta',
      );
      if (actorCashboxes.length !== 1)
        throw error(
          409,
          actorCashboxes.length
            ? 'Existe mÃ¡s de una caja abierta para el usuario anulador'
            : 'El usuario anulador no tiene una caja abierta',
        );
      [compensationCashbox] = actorCashboxes;
    }

    const cashMovements = await repo.cashMovementsForUpdate(c, id);
    if (
      cashMovements.some((movement) => movement.tipo_movimiento === 'anulacion')
    )
      throw error(409, 'La venta ya posee un movimiento de anulaciÃ³n');
    if (cashApplied > 0n && sale.id_caja !== null) {
      const originals = cashMovements.filter(
        (movement) =>
          Number(movement.id_caja) === Number(sale.id_caja) &&
          movement.tipo_movimiento === 'venta' &&
          movement.naturaleza === 'entrada' &&
          Boolean(movement.afecta_efectivo),
      );
      if (originals.length !== 1 || cents(originals[0].monto) !== cashApplied)
        throw error(409, 'El movimiento de efectivo original es inconsistente');
    }

    for (const restoration of restorations) {
      await repo.updateStock(c, restoration.productId, restoration.newStock);
      await repo.createCancellationInventoryMovement(c, {
        ...restoration,
        saleId: id,
        reason,
        userId: actor.userId,
      });
    }
    if (compensationCashbox)
      await repo.createCancellationCashMovement(c, {
        cashboxId: compensationCashbox.id_caja,
        saleId: id,
        userId: actor.userId,
        amount: money(cashApplied),
      });
    if (!(await repo.cancel(c, id, reason, actor.userId)))
      throw error(409, 'La venta ya no puede anularse');
    const result = await hydrate(c, id);
    await repo.audit(c, {
      userId: actor.userId,
      action: 'anular',
      entity: 'ventas',
      entityId: id,
      previousData: snapshot(sale),
      newData: {
        ...snapshot(result),
        anulacion: {
          id_venta: id,
          id_usuario_vendedor_original: sale.id_usuario,
          id_usuario_anulador: actor.userId,
          id_caja_original: sale.id_caja,
          id_caja_compensatoria: compensationCashbox?.id_caja ?? null,
          efectivo_aplicado: money(cashApplied),
          motivo: reason,
        },
      },
      ipAddress: actor.ipAddress,
    });
    return result;
  });
}
module.exports = {
  addItem,
  cancelSale,
  confirmSale,
  createSale,
  getSale,
  listSales,
  removeItem,
  updateItem,
  updateSale,
};
