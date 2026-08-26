const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const cashService = require('../cash/cash.service');
const authService = require('./auth.service');
const authController = require('./auth.controller');

const originalHasOpenCash = cashService.hasOpenCash;
const originalLogout = authService.logout;

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('usuario sin caja abierta puede cerrar sesión', async () => {
  let receivedUserId;
  cashService.hasOpenCash = async (userId) => {
    receivedUserId = userId;
    return false;
  };

  await authService.logout(31);
  assert.equal(receivedUserId, 31);
});

test('una caja cerrada no bloquea el cierre de sesión', async () => {
  cashService.hasOpenCash = async () => false;
  await assert.doesNotReject(authService.logout(31));
});

test('usuario con caja abierta recibe el conflicto de negocio esperado', async () => {
  cashService.hasOpenCash = async () => true;
  await assert.rejects(authService.logout(31), (error) => {
    assert.equal(error.statusCode, 409);
    assert.equal(
      error.message,
      'No puedes cerrar sesión porque tienes una caja abierta. Debes cerrar la caja antes de salir del sistema.',
    );
    return true;
  });
});

test('logout usa exclusivamente el usuario autenticado del request', async () => {
  const res = response();
  let receivedUserId;
  authService.logout = async (userId) => {
    receivedUserId = userId;
  };

  await authController.logout(
    {
      user: { id_usuario: 44 },
      body: { id_usuario: 999 },
      params: { id_usuario: 888 },
    },
    res,
    assert.fail,
  );

  assert.equal(receivedUserId, 44);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});

test('la ruta de logout exige authenticate y no exige un rol', () => {
  const source = fs.readFileSync(
    path.join(__dirname, 'auth.routes.js'),
    'utf8',
  );
  assert.match(source, /router\.post\('\/logout', authenticate, logout\)/);
  assert.doesNotMatch(source, /logout[^\n]*requirePermission/);
});

test.after(() => {
  cashService.hasOpenCash = originalHasOpenCash;
  authService.logout = originalLogout;
});
