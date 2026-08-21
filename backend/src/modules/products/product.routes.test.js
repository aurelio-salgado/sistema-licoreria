const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const test = require('node:test');
const multer = require('multer');

const source = fs.readFileSync(path.join(__dirname, 'product.routes.js'), 'utf8');
const { mapMulterError, receiveImage } = require('./product.routes');

const signatures = {
  jpeg: { mime: 'image/jpeg', name: 'test.jpg', data: Buffer.from([0xff, 0xd8, 0xff, 0xdb]) },
  png: { mime: 'image/png', name: 'test.png', data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  webp: { mime: 'image/webp', name: 'test.webp', data: Buffer.from('RIFF0000WEBP', 'ascii') },
};

function multipart(parts) {
  const boundary = 'liquorix-test-boundary';
  const chunks = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    if (part.filename) {
      chunks.push(Buffer.from(`Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\nContent-Type: ${part.mime}\r\n\r\n`));
      chunks.push(part.data);
    } else {
      chunks.push(Buffer.from(`Content-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value}`));
    }
    chunks.push(Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  const body = Buffer.concat(chunks);
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

function parse(parts) {
  const payload = multipart(parts);
  const req = Readable.from(payload.body);
  req.headers = { 'content-type': payload.contentType, 'content-length': String(payload.body.length) };
  req.method = 'PUT';
  return new Promise((resolve) => {
    receiveImage(req, {}, (error) => resolve({ error, file: req.file }));
  });
}

test('upload y delete de imagen exigen productos.editar y no alteran el CRUD JSON', () => {
  assert.match(source, /router\.use\(authenticate\)/);
  assert.match(source, /router\.put\(\s*'\/:id\/image',\s*requirePermission\('productos\.editar'\),\s*productController\.validateProductImageTarget,\s*receiveImage/s);
  assert.match(source, /router\.delete\(\s*'\/:id\/image',\s*requirePermission\('productos\.editar'\)/s);
  assert.match(source, /router\.post\(\s*'\/',\s*requirePermission\('productos\.crear'\),\s*productController\.createProduct/s);
});

test('Multer está aislado, en memoria y con límites estrictos', () => {
  assert.match(source, /memoryStorage\(\)/);
  assert.match(source, /files:\s*1/);
  assert.match(source, /fileSize:\s*2 \* 1024 \* 1024/);
  assert.match(source, /fields:\s*0/);
  assert.match(source, /parts:\s*2/);
  assert.match(source, /single\('image'\)/);
});

for (const [format, fixture] of Object.entries(signatures)) {
  test(`acepta exactamente un archivo ${format.toUpperCase()}`, async () => {
    const result = await parse([{ name: 'image', filename: fixture.name, mime: fixture.mime, data: fixture.data }]);
    assert.equal(result.error, undefined);
    assert.equal(result.file.fieldname, 'image');
    assert.deepEqual(result.file.buffer, fixture.data);
  });
}

test('rechaza un segundo archivo aunque parts permita el multipart válido', async () => {
  const fixture = signatures.jpeg;
  const result = await parse([
    { name: 'image', filename: fixture.name, mime: fixture.mime, data: fixture.data },
    { name: 'image', filename: 'second.jpg', mime: fixture.mime, data: fixture.data },
  ]);
  assert.equal(result.error?.statusCode, 400);
  assert.equal(result.error?.message, 'La solicitud de imagen no es válida');
});

test('rechaza un campo de archivo inesperado con mensaje seguro específico', async () => {
  const fixture = signatures.png;
  const result = await parse([{ name: 'attachment', filename: fixture.name, mime: fixture.mime, data: fixture.data }]);
  assert.equal(result.error?.code, 'LIMIT_UNEXPECTED_FILE');
  assert.equal(result.error?.statusCode, 400);
  assert.equal(result.error?.message, 'El campo de archivo no es válido');
});

test('rechaza un archivo mayor de 2 MB con 413', async () => {
  const result = await parse([{ name: 'image', filename: 'large.jpg', mime: 'image/jpeg', data: Buffer.alloc(2 * 1024 * 1024 + 1, 0xff) }]);
  assert.equal(result.error?.code, 'LIMIT_FILE_SIZE');
  assert.equal(result.error?.statusCode, 413);
  assert.equal(result.error?.message, 'La imagen no puede superar 2 MB');
});

test('los campos de texto siguen rechazados', async () => {
  const result = await parse([{ name: 'description', value: 'no permitido' }]);
  assert.equal(result.error?.statusCode, 400);
  assert.equal(result.error?.message, 'La solicitud de imagen no es válida');
});

test('mapea LIMIT_PART_COUNT y otros MulterError sin exponer detalles internos', () => {
  assert.deepEqual(mapMulterError(new multer.MulterError('LIMIT_PART_COUNT')), {
    statusCode: 400,
    message: 'La solicitud contiene demasiadas partes',
  });
  assert.deepEqual(mapMulterError(new multer.MulterError('LIMIT_FIELD_COUNT')), {
    statusCode: 400,
    message: 'La solicitud de imagen no es válida',
  });
});
