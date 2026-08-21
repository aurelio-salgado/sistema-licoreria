const fsp = require('node:fs/promises');
const path = require('node:path');

const pool = require('../../config/database');
const env = require('../../config/env');
const repository = require('./publicCatalog.repository');
const validation = require('./publicCatalog.validation');

const FILENAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpe?g|png|webp)$/i;
const MIME_BY_EXTENSION = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function notFound() { const error = new Error('Imagen no encontrada'); error.statusCode = 404; return error; }

function matchesSignature(buffer, extension) {
  if (extension === '.jpg' || extension === '.jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (extension === '.png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  return extension === '.webp' && buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
}

function publicImage(reference) {
  return typeof reference === 'string' && FILENAME_PATTERN.test(reference)
    ? `/api/v1/public/catalog/images/${reference}` : null;
}

function createService(dependencies = {}) {
  const database = dependencies.pool || pool;
  const dataRepository = dependencies.repository || repository;
  const fileSystem = dependencies.fileSystem || fsp;
  const storagePath = path.resolve(dependencies.storagePath || env.productImages.storagePath);
  const maxBytes = dependencies.maxBytes || env.productImages.maxBytes;

  async function list(rawQuery) {
    const filters = validation.list(rawQuery);
    const [rows, total, availableFilters] = await Promise.all([
      dataRepository.list(database, filters),
      dataRepository.count(database, filters),
      dataRepository.facets(database),
    ]);
    const products = rows.map((row) => ({
      id_producto: row.id_producto,
      nombre: row.nombre,
      precio_venta: row.precio_venta,
      imagen: publicImage(row.imagen_referencia),
      categoria: { id_categoria: row.id_categoria, nombre: row.categoria_nombre },
      marca: { id_marca: row.id_marca, nombre: row.marca_nombre },
      disponible: Boolean(row.disponible),
    }));
    const filtersOutput = { ...availableFilters, brands: availableFilters.brands.map((brand) => ({ id_marca: brand.id_marca, nombre: brand.nombre, imagen: publicImage(brand.imagen_referencia)?.replace('/images/', '/brand-images/') || null })) };
    return { products, pagination: { page: filters.page, limit: filters.limit, total, total_pages: Math.ceil(total / filters.limit) }, filters: filtersOutput };
  }

  async function readImage(filename, selectedStoragePath) {
    if (typeof filename !== 'string' || !FILENAME_PATTERN.test(filename)) throw notFound();
    const root = path.resolve(selectedStoragePath);
    const file = path.resolve(root, filename);
    if (!file.startsWith(`${root}${path.sep}`)) throw notFound();
    let stat;
    try { stat = await fileSystem.stat(file); }
    catch { throw notFound(); }
    if (!stat.isFile() || stat.size === 0 || stat.size > maxBytes) throw notFound();
    let buffer;
    try { buffer = await fileSystem.readFile(file); }
    catch { throw notFound(); }
    if (buffer.length !== stat.size) throw notFound();
    const extension = path.extname(filename).toLowerCase();
    if (!MIME_BY_EXTENSION[extension] || !matchesSignature(buffer, extension)) throw notFound();
    return { buffer, contentType: MIME_BY_EXTENSION[extension] };
  }

  const image = (filename) => readImage(filename, storagePath);
  const brandImage = (filename) => readImage(filename, dependencies.brandStoragePath || env.brandImages.storagePath);

  return { brandImage, image, list };
}

module.exports = Object.assign(createService(), { createService, FILENAME_PATTERN, matchesSignature });
