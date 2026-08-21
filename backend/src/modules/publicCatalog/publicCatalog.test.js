const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

const app = require('../../app');
const env = require('../../config/env');
const { createService } = require('./publicCatalog.service');
const validation = require('./publicCatalog.validation');

const IMAGE_NAME = '45e64b2a-bb2d-4d5f-9f4a-d01486838761.webp';

function repositoryWith(rows) {
  return {
    list: async () => rows,
    count: async () => rows.length,
    facets: async () => ({ categories: [{ id_categoria: 1, nombre: 'Rones' }], brands: [{ id_marca: 2, nombre: 'Marca' }] }),
  };
}

test('catálogo proyecta exclusivamente datos públicos y disponibilidad booleana', async () => {
  const service = createService({
    pool: {},
    repository: repositoryWith([{
      id_producto: 7, nombre: 'Ron', precio_venta: '350.00', imagen_referencia: IMAGE_NAME,
      id_categoria: 1, categoria_nombre: 'Rones', id_marca: 2, marca_nombre: 'Marca', disponible: 1,
      costo_promedio: '200.00', existencia: '9.000', codigo_barras: 'secreto-operativo',
    }]),
  });
  const result = await service.list({});
  assert.deepEqual(result.products[0], {
    id_producto: 7, nombre: 'Ron', precio_venta: '350.00',
    imagen: `/api/v1/public/catalog/images/${IMAGE_NAME}`,
    categoria: { id_categoria: 1, nombre: 'Rones' },
    marca: { id_marca: 2, nombre: 'Marca' }, disponible: true,
  });
  assert.equal('existencia' in result.products[0], false);
  assert.equal('costo_promedio' in result.products[0], false);
});

test('catálogo representa agotado y descarta referencias de imagen no controladas', async () => {
  const service = createService({ pool: {}, repository: repositoryWith([{
    id_producto: 8, nombre: 'Whisky', precio_venta: '500.00', imagen_referencia: '../../archivo.png',
    id_categoria: 1, categoria_nombre: 'Whisky', id_marca: 2, marca_nombre: 'Marca', disponible: 0,
  }]) });
  const product = (await service.list({})).products[0];
  assert.equal(product.disponible, false);
  assert.equal(product.imagen, null);
});

test('filtros públicos son cerrados, remotos y paginados', () => {
  assert.deepEqual(validation.list({ page: '2', limit: '12', search: ' ron ', id_categoria: '3', id_marca: '4' }), {
    page: 2, limit: 12, search: 'ron', categoryId: 3, brandId: 4,
  });
  assert.throws(() => validation.list({ status: 'inactivo' }), /no es un filtro permitido/);
  assert.throws(() => validation.list({ limit: '49' }), /1 y 48/);
});

test('ruta del catálogo es pública y no instala autenticación', () => {
  const routes = fs.readFileSync(path.join(__dirname, 'publicCatalog.routes.js'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '../../app.js'), 'utf8');
  assert.doesNotMatch(routes, /authenticate|requirePermission/);
  assert.match(app, /app\.use\('\/api\/v1\/public\/catalog', publicCatalogRoutes\)/);
});

test('imagen controlada valida nombre, firma y MIME', async () => {
  const buffer = Buffer.from('RIFF1234WEBPcontenido');
  const service = createService({
    storagePath: path.resolve('storage-products-test'), maxBytes: 100,
    fileSystem: { stat: async () => ({ isFile: () => true, size: buffer.length }), readFile: async () => buffer },
  });
  const result = await service.image(IMAGE_NAME);
  assert.equal(result.contentType, 'image/webp');
  assert.equal(result.buffer, buffer);
});

test('faceta pública de marca expone solo id, nombre e imagen controlada', async () => {
  const service = createService({ pool: {}, repository: { ...repositoryWith([]), facets: async () => ({ categories: [], brands: [{ id_marca: 4, nombre: 'Marca Uno', imagen_referencia: IMAGE_NAME, descripcion: 'privada' }] }) } });
  const result = await service.list({});
  assert.deepEqual(result.filters.brands, [{ id_marca: 4, nombre: 'Marca Uno', imagen: `/api/v1/public/catalog/brand-images/${IMAGE_NAME}` }]);
});

test('lector de logo de marca reutiliza firma, MIME y storage controlado', async () => {
  const buffer = Buffer.from('RIFF1234WEBPcontenido');
  const service = createService({ brandStoragePath: path.resolve('brand-storage-test'), maxBytes: 100, fileSystem: { stat: async () => ({ isFile: () => true, size: buffer.length }), readFile: async () => buffer } });
  const result = await service.brandImage(IMAGE_NAME);
  assert.equal(result.contentType, 'image/webp');
  await assert.rejects(() => service.brandImage('../logo.webp'), /Imagen no encontrada/);
});

test('endpoint de imagen válida permite uso cross-origin y conserva headers seguros', async () => {
  const filename = `${crypto.randomUUID()}.webp`;
  const storageRoot = path.resolve(env.productImages.storagePath);
  const imagePath = path.resolve(storageRoot, filename);
  assert.equal(imagePath.startsWith(`${storageRoot}${path.sep}`), true);
  const buffer = Buffer.from('RIFF1234WEBPcontenido');
  let server;
  try {
    await fsp.mkdir(storageRoot, { recursive: true });
    await fsp.writeFile(imagePath, buffer, { flag: 'wx' });
    server = await new Promise((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/public/catalog/images/${filename}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/webp');
    assert.equal(response.headers.get('cross-origin-resource-policy'), 'cross-origin');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('content-disposition'), 'inline');
    assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), buffer);
  } finally {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fsp.unlink(imagePath).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
});

test('imagen rechaza traversal, inexistente, exceso de tamaño y contenido corrupto', async () => {
  const missing = createService({ fileSystem: { stat: async () => { throw new Error('missing'); }, readFile: async () => Buffer.alloc(0) } });
  await assert.rejects(() => missing.image('../archivo.png'), /Imagen no encontrada/);
  await assert.rejects(() => missing.image(IMAGE_NAME), /Imagen no encontrada/);

  const oversized = createService({ maxBytes: 2, fileSystem: { stat: async () => ({ isFile: () => true, size: 3 }), readFile: async () => Buffer.alloc(3) } });
  await assert.rejects(() => oversized.image(IMAGE_NAME), /Imagen no encontrada/);

  const corrupt = createService({ fileSystem: { stat: async () => ({ isFile: () => true, size: 12 }), readFile: async () => Buffer.alloc(12) } });
  await assert.rejects(() => corrupt.image(IMAGE_NAME), /Imagen no encontrada/);
});
