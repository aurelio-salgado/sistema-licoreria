const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const routes = fs.readFileSync(path.join(__dirname, 'brand.routes.js'), 'utf8');
const service = fs.readFileSync(path.join(__dirname, 'brand.service.js'), 'utf8');

test('logos usan endpoints separados, productos.editar y multipart limitado', () => {
  assert.match(routes, /put\('\/:id\/image'.*productos\.editar.*receiveImage/s);
  assert.match(routes, /delete\('\/:id\/image'.*productos\.editar/s);
  assert.match(routes, /files:\s*1.*fileSize:\s*2 \* 1024 \* 1024.*fields:\s*0.*parts:\s*2/s);
});

test('marcas reutiliza la validación y almacenamiento seguro existente', () => {
  assert.match(service, /products\/product\.image/);
  assert.match(service, /env\.brandImages\.storagePath/);
  assert.match(service, /agregar_imagen|reemplazar_imagen|eliminar_imagen/);
});
