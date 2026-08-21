const crypto = require('node:crypto');
const fsp = require('node:fs/promises');
const path = require('node:path');

const env = require('../../config/env');

const TYPES = Object.freeze({
  'image/jpeg': { extension: '.jpg', matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  'image/png': { extension: '.png', matches: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { extension: '.webp', matches: (buffer) => buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP' },
});

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function validate(file) {
  if (!file) throw validationError('Debes seleccionar una imagen');
  if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) throw validationError('La imagen está vacía');
  if (file.buffer.length > env.productImages.maxBytes) throw validationError('La imagen no puede superar 2 MB');
  const type = TYPES[file.mimetype];
  if (!type) throw validationError('La imagen debe ser JPEG, PNG o WebP');
  if (!type.matches(file.buffer)) throw validationError('El contenido de la imagen no coincide con su tipo declarado');
  return type.extension;
}

function storageFile(reference, storagePath = env.productImages.storagePath) {
  const root = path.resolve(storagePath);
  const target = path.resolve(root, reference);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Referencia de imagen no válida');
  return { root, target };
}

async function write(file, dependencies = {}) {
  const fileSystem = dependencies.fileSystem || fsp;
  const randomUUID = dependencies.randomUUID || crypto.randomUUID;
  const extension = validate(file);
  const reference = `${randomUUID()}${extension}`;
  const { root, target } = storageFile(reference, dependencies.storagePath);
  await fileSystem.mkdir(root, { recursive: true });
  await fileSystem.writeFile(target, file.buffer, { flag: 'wx' });
  return reference;
}

async function remove(reference, dependencies = {}) {
  if (!reference) return;
  const fileSystem = dependencies.fileSystem || fsp;
  const { target } = storageFile(reference, dependencies.storagePath);
  try { await fileSystem.unlink(target); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}

module.exports = { remove, storageFile, validate, write };
