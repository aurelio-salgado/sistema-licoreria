const assert = require('node:assert/strict');
const { after, test } = require('node:test');

const pool = require('../../config/database');
const repository = require('./product.repository');
const productImage = require('./product.image');
const service = require('./product.service');

const originalGetConnection = pool.getConnection;
const originalRepository = { ...repository };
const originalProductImage = { ...productImage };

after(() => {
  pool.getConnection = originalGetConnection;
  Object.assign(repository, originalRepository);
  Object.assign(productImage, originalProductImage);
});

function productInput(overrides = {}) {
  return {
    codigo: 'PROD-001',
    codigo_barras: null,
    nombre: 'Producto de prueba',
    descripcion: null,
    id_categoria: 1,
    id_marca: 2,
    id_unidad: 3,
    costo_promedio: 4,
    precio_venta: 10,
    existencia_minima: 1,
    porcentaje_impuesto: 0,
    ...overrides,
  };
}

function scenario(options = {}) {
  const calls = { audits: [], creates: [], updates: [], order: [] };
  const transaction = { begin: 0, commit: 0, rollback: 0, release: 0 };
  const connection = {
    beginTransaction: async () => transaction.begin++,
    commit: async () => transaction.commit++,
    rollback: async () => transaction.rollback++,
    release: () => transaction.release++,
  };
  const current = {
    id_producto: 5,
    codigo: 'PROD-001',
    costo_promedio: options.averageCost ?? '4.00',
    existencia: options.stock ?? '0.000',
    estado: 'activo',
  };

  pool.getConnection = async () => connection;
  Object.assign(repository, {
    findCategory: async () => ({ id_categoria: 1, estado: 'activo' }),
    findBrand: async () => ({ id_marca: 2, estado: 'activo' }),
    findUnit: async () => ({ id_unidad: 3, estado: 'activo' }),
    findByCode: async () => null,
    findByBarcode: async () => null,
    findByIdForUpdate: async () => {
      calls.order.push('lock');
      return current;
    },
    findById: async () => {
      const written = calls.updates.at(-1)?.data ?? calls.creates.at(-1);
      return {
        ...current,
        id_producto: 5,
        costo_promedio: written?.averageCost ?? current.costo_promedio,
      };
    },
    create: async (_connection, data) => {
      calls.creates.push(data);
      calls.order.push('create');
      return 5;
    },
    update: async (_connection, productId, data) => {
      calls.order.push('update');
      calls.updates.push({ productId, data: { ...data } });
      if (options.failAt === 'update') throw new Error('Fallo de actualización');
    },
    createAudit: async (_connection, data) => {
      calls.order.push('audit');
      calls.audits.push(data);
      if (options.failAt === 'audit') throw new Error('Fallo de bitácora');
    },
  });
  return { calls, current, transaction };
}

const actor = { userId: 9, ipAddress: '127.0.0.1' };

test('creación acepta un costo promedio válido', async () => {
  const context = scenario();
  const result = await service.createProduct(productInput(), actor);
  assert.equal(context.calls.creates[0].averageCost, '4.00');
  assert.equal(result.costo_promedio, '4.00');
  assert.equal(context.transaction.commit, 1);
});

test('creación sin costo promedio utiliza 0.00', async () => {
  const context = scenario();
  const input = productInput();
  delete input.costo_promedio;
  await service.createProduct(input, actor);
  assert.equal(context.calls.creates[0].averageCost, '0.00');
});

test('rechaza costo promedio negativo con 400', async () => {
  scenario();
  await assert.rejects(
    service.createProduct(productInput({ costo_promedio: -1 }), actor),
    (error) => error.statusCode === 400,
  );
});

test('rechaza costo promedio con más de dos decimales', async () => {
  scenario();
  await assert.rejects(
    service.createProduct(productInput({ costo_promedio: 1.234 }), actor),
    (error) => error.statusCode === 400,
  );
});

test('permite editar costo promedio cuando la existencia es cero', async () => {
  const context = scenario({ stock: '0.000' });
  const result = await service.updateProduct(
    5,
    productInput({ costo_promedio: 6.25 }),
    actor,
  );
  assert.equal(context.calls.updates[0].data.averageCost, '6.25');
  assert.equal(result.costo_promedio, '6.25');
});

test('con existencia positiva permite enviar el mismo costo', async () => {
  const context = scenario({ stock: '3.000', averageCost: '4.00' });
  await service.updateProduct(5, productInput({ costo_promedio: 4 }), actor);
  assert.equal(context.calls.updates[0].data.averageCost, '4.00');
  assert.equal(context.transaction.commit, 1);
});

test('con existencia positiva rechaza cambiar el costo con 409', async () => {
  const context = scenario({ stock: '3.000', averageCost: '4.00' });
  await assert.rejects(
    service.updateProduct(5, productInput({ costo_promedio: 4.01 }), actor),
    (error) => error.statusCode === 409,
  );
  assert.equal(context.calls.updates.length, 0);
  assert.equal(context.calls.audits.length, 0);
  assert.equal(context.transaction.rollback, 1);
});

test('PUT sin costo promedio conserva exactamente el valor vigente', async () => {
  const context = scenario({ stock: '8.000', averageCost: '7.35' });
  const input = productInput();
  delete input.costo_promedio;
  await service.updateProduct(5, input, actor);
  assert.equal(context.calls.updates[0].data.averageCost, '7.35');
});

test('hace rollback si falla la actualización', async () => {
  const context = scenario({ failAt: 'update' });
  await assert.rejects(service.updateProduct(5, productInput(), actor));
  assert.equal(context.transaction.commit, 0);
  assert.equal(context.transaction.rollback, 1);
  assert.equal(context.transaction.release, 1);
  assert.equal(context.calls.audits.length, 0);
});

test('bloquea antes de actualizar y registra la bitácora normal', async () => {
  const context = scenario({ stock: '0.000', averageCost: '4.00' });
  await service.updateProduct(
    5,
    productInput({ costo_promedio: 5 }),
    actor,
  );
  assert.deepEqual(context.calls.order.slice(0, 2), ['lock', 'update']);
  assert.equal(context.calls.order.at(-1), 'audit');
  assert.equal(context.calls.audits.length, 1);
  assert.equal(context.calls.audits[0].action, 'actualizar');
  assert.equal(context.calls.audits[0].previousData.costo_promedio, '4.00');
  assert.equal(context.calls.audits[0].newData.costo_promedio, '5.00');
});

test('agrega una imagen y registra solamente referencias seguras', async () => {
  const context = scenario();
  context.current.imagen_referencia = null;
  let storedReference = null;
  repository.findById = async () => ({ ...context.current, imagen_referencia: storedReference });
  repository.updateImageReference = async (_connection, _id, reference) => { storedReference = reference; };
  productImage.validate = () => '.png';
  productImage.write = async () => '123e4567-e89b-42d3-a456-426614174000.png';
  productImage.remove = async () => {};
  const product = await service.saveProductImage(5, { buffer: Buffer.from('x'), mimetype: 'image/png' }, actor);
  assert.equal(product.imagen_referencia, '123e4567-e89b-42d3-a456-426614174000.png');
  assert.equal(context.calls.audits[0].action, 'agregar_imagen');
  assert.deepEqual(context.calls.audits[0].newData, { imagen_referencia: product.imagen_referencia });
});

test('limpia la imagen nueva si falla la transacción', async () => {
  const context = scenario({ failAt: 'audit' });
  context.current.imagen_referencia = null;
  repository.findById = async () => context.current;
  repository.updateImageReference = async () => {};
  const removed = [];
  productImage.validate = () => '.jpg';
  productImage.write = async () => '123e4567-e89b-42d3-a456-426614174000.jpg';
  productImage.remove = async (reference) => removed.push(reference);
  await assert.rejects(service.saveProductImage(5, { buffer: Buffer.from('x'), mimetype: 'image/jpeg' }, actor));
  assert.deepEqual(removed, ['123e4567-e89b-42d3-a456-426614174000.jpg']);
  assert.equal(context.transaction.rollback, 1);
});

test('reemplaza referencia y retira la imagen anterior después del commit', async () => {
  const context = scenario();
  context.current.imagen_referencia = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg';
  let storedReference = context.current.imagen_referencia;
  repository.findById = async () => ({ ...context.current, imagen_referencia: storedReference });
  repository.updateImageReference = async (_connection, _id, reference) => { storedReference = reference; };
  const removed = [];
  productImage.validate = () => '.webp';
  productImage.write = async () => '123e4567-e89b-42d3-a456-426614174000.webp';
  productImage.remove = async (reference) => removed.push(reference);
  await service.saveProductImage(5, { buffer: Buffer.from('x'), mimetype: 'image/webp' }, actor);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(context.calls.audits[0].action, 'reemplazar_imagen');
  assert.deepEqual(removed, ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg']);
  assert.equal(context.transaction.commit, 1);
});

test('elimina referencia de forma idempotente y audita solo cuando existe', async () => {
  const context = scenario();
  context.current.imagen_referencia = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
  repository.updateImageReference = async (_connection, _id, reference) => { context.current.imagen_referencia = reference; };
  productImage.remove = async () => {};
  await service.deleteProductImage(5, actor);
  assert.equal(context.calls.audits[0].action, 'eliminar_imagen');
  assert.equal(context.current.imagen_referencia, null);

  const second = scenario();
  second.current.imagen_referencia = null;
  productImage.remove = async () => {};
  await service.deleteProductImage(5, actor);
  assert.equal(second.calls.audits.length, 0);
});

test('rechaza upload para producto inexistente antes de escribir archivo', async () => {
  scenario();
  repository.findById = async () => null;
  let writes = 0;
  productImage.validate = () => '.png';
  productImage.write = async () => { writes += 1; };
  await assert.rejects(service.saveProductImage(999, { buffer: Buffer.from('x'), mimetype: 'image/png' }, actor), (error) => error.statusCode === 404);
  assert.equal(writes, 0);
});
