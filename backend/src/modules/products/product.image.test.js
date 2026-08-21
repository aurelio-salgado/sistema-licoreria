const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { afterEach, test } = require('node:test');

const image = require('./product.image');

const temporaryDirectories = [];
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fsp.rm(directory, { recursive: true, force: true })));
});

const jpeg = () => Buffer.from([0xff, 0xd8, 0xff, 0xdb]);
const png = () => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = () => Buffer.from('RIFF0000WEBP', 'ascii');
const file = (mimetype, buffer) => ({ mimetype, buffer });

test('acepta las firmas reales JPEG, PNG y WebP', () => {
  assert.equal(image.validate(file('image/jpeg', jpeg())), '.jpg');
  assert.equal(image.validate(file('image/png', png())), '.png');
  assert.equal(image.validate(file('image/webp', webp())), '.webp');
});

test('rechaza archivo faltante, SVG, firma falsa y MIME inconsistente', () => {
  assert.throws(() => image.validate(), /seleccionar/);
  assert.throws(() => image.validate(file('image/svg+xml', Buffer.from('<svg/>'))), /JPEG, PNG o WebP/);
  assert.throws(() => image.validate(file('image/png', Buffer.from('<svg/>'))), /no coincide/);
  assert.throws(() => image.validate(file('image/jpeg', png())), /no coincide/);
});

test('rechaza imágenes mayores a 2 MB', () => {
  assert.throws(() => image.validate(file('image/jpeg', Buffer.concat([jpeg(), Buffer.alloc(2 * 1024 * 1024)]))), /2 MB/);
});

test('escribe con UUID y extensión derivada, nunca con nombre del cliente', async () => {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'liquorix-product-image-'));
  temporaryDirectories.push(directory);
  const reference = await image.write(
    { ...file('image/png', png()), originalname: '../../ataque.jpg' },
    { storagePath: directory, randomUUID: () => '123e4567-e89b-42d3-a456-426614174000' },
  );
  assert.equal(reference, '123e4567-e89b-42d3-a456-426614174000.png');
  assert.deepEqual(await fsp.readFile(path.join(directory, reference)), png());
});

test('impide resolver una referencia fuera del storage permitido', () => {
  assert.throws(() => image.storageFile('../escape.png', 'C:/storage/products'), /no válida/);
});
