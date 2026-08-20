const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { EDITABLE_KEYS, VISIBLE_KEYS, validateKey, validateValue } = require('./setting.validation');

test('descuento_maximo es un porcentaje administrativo editable y validado', () => {
  assert.equal(EDITABLE_KEYS.has('descuento_maximo'), true);
  assert.equal(validateValue('descuento_maximo', 0), '0.00');
  assert.equal(validateValue('descuento_maximo', 10), '10.00');
  assert.equal(validateValue('descuento_maximo', 100), '100.00');
  assert.throws(() => validateValue('descuento_maximo', -0.01), (error) => error.statusCode === 400);
  assert.throws(() => validateValue('descuento_maximo', 100.01), (error) => error.statusCode === 400);
  assert.throws(() => validateValue('descuento_maximo', '10'), (error) => error.statusCode === 400);
});

test('la actualización conserva el permiso configuracion.editar', () => {
  const routes = fs.readFileSync(path.join(__dirname, 'setting.routes.js'), 'utf8');
  assert.match(routes, /router\.put\([\s\S]*requirePermission\('configuracion\.editar'\)[\s\S]*settingController\.updateSetting/);
});

test('jwt_session_epoch es interno, no visible ni editable', () => {
  assert.equal(VISIBLE_KEYS.includes('jwt_session_epoch'), false);
  assert.equal(EDITABLE_KEYS.has('jwt_session_epoch'), false);
  assert.throws(() => validateKey('jwt_session_epoch'), (error) => error.statusCode === 404);
  const frontend = fs.readFileSync(path.join(__dirname, '../../../../frontend/src/pages/SettingsPage.jsx'), 'utf8');
  assert.doesNotMatch(frontend, /jwt_session_epoch/);
});
