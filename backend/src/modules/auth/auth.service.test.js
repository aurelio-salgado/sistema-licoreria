const assert = require('node:assert/strict');
const test = require('node:test');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'secreto-exclusivo-para-pruebas-automatizadas';
process.env.JWT_EXPIRES_IN = '1h';

const bcrypt = require('bcrypt');
const pool = require('../../config/database');
const repository = require('./auth.repository');
const service = require('./auth.service');
const controller = require('./auth.controller');

const originalCompare = bcrypt.compare;
const originalGetConnection = pool.getConnection;
const originalRepository = { ...repository };
const originalServiceLogin = service.login;

function user(overrides = {}) {
  return {
    id_usuario: 4,
    nombre: 'Usuario',
    apellido: 'Prueba',
    nombre_usuario: 'usuario.prueba',
    correo: 'prueba@example.test',
    password_hash: '$2b$hash-no-real',
    estado: 'activo',
    intentos_fallidos: 0,
    bloqueado_hasta: null,
    esta_bloqueado: 0,
    ...overrides,
  };
}

function scenario(options = {}) {
  const calls = { audits: [], failed: [], successful: [] };
  const transaction = { begin: 0, commit: 0, rollback: 0 };
  const connection = {
    beginTransaction: async () => transaction.begin++,
    commit: async () => transaction.commit++,
    rollback: async () => transaction.rollback++,
    release() {},
  };
  pool.getConnection = async () => connection;
  bcrypt.compare = async () => options.passwordMatches ?? true;
  Object.assign(repository, {
    findUserByUsername: async () =>
      Object.hasOwn(options, 'foundUser') ? options.foundUser : user(),
    registerFailedAttempt: async (...args) => calls.failed.push(args.slice(1)),
    registerSuccessfulLogin: async (...args) =>
      calls.successful.push(args.slice(1)),
    findRolesByUserId: async () => ['Administrador'],
    findPermissionsByUserId: async () => ['dashboard.ver'],
    createLoginAudit: async (_connection, data) => calls.audits.push(data),
  });
  return { calls, transaction };
}

async function login() {
  return service.login({
    username: 'usuario.prueba',
    password: 'clave-no-real',
    ipAddress: '127.0.0.1',
  });
}

test('login válido genera JWT permitido y respuesta sin credenciales', async () => {
  const context = scenario();
  const result = await login();
  const payload = jwt.verify(result.token, process.env.JWT_SECRET);

  assert.equal(payload.sub, '4');
  assert.equal(payload.nombre_usuario, 'usuario.prueba');
  assert.deepEqual(payload.roles, ['Administrador']);
  assert.equal(Object.hasOwn(payload, 'password'), false);
  assert.equal(Object.hasOwn(payload, 'password_hash'), false);
  assert.equal(Object.hasOwn(result.user, 'password'), false);
  assert.equal(Object.hasOwn(result.user, 'password_hash'), false);
  assert.deepEqual(result.user.permisos, ['dashboard.ver']);
  assert.equal(context.calls.successful.length, 1);
  assert.equal(context.calls.audits[0].result, 'exitoso');
  assert.equal(context.transaction.commit, 1);
});

test('login rechaza usuario inexistente uniformemente', async () => {
  const context = scenario({ foundUser: null });
  await assert.rejects(login(), (error) => {
    assert.equal(error.statusCode, 401);
    assert.equal(error.message, 'Credenciales inválidas');
    return true;
  });
  assert.equal(context.transaction.commit, 1);
});

test('login rechaza contraseña incorrecta y registra intento', async () => {
  const context = scenario({ passwordMatches: false });
  await assert.rejects(login(), (error) => error.statusCode === 401);
  assert.equal(context.calls.failed.length, 1);
  assert.equal(context.calls.audits[0].result, 'fallido');
  assert.equal(context.transaction.commit, 1);
});

test('login rechaza usuario inactivo', async () => {
  const context = scenario({ foundUser: user({ estado: 'inactivo' }) });
  await assert.rejects(login(), (error) => error.statusCode === 401);
  assert.equal(context.calls.audits[0].result, 'fallido');
  assert.equal(context.calls.successful.length, 0);
});

test('login rechaza bloqueo temporal vigente', async () => {
  const context = scenario({
    foundUser: user({
      bloqueado_hasta: '2099-01-01 00:00:00',
      esta_bloqueado: 1,
    }),
  });
  await assert.rejects(login(), (error) => error.statusCode === 401);
  assert.equal(context.calls.successful.length, 0);
});

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

test('controlador valida nombre de usuario obligatorio', async () => {
  const res = response();
  let receivedError;
  let serviceCalls = 0;
  service.login = async () => serviceCalls++;
  await controller.login(
    { body: { password: 'x' }, ip: '127.0.0.1' },
    res,
    (error) => (receivedError = error),
  );
  assert.equal(receivedError.statusCode, 400);
  assert.equal(serviceCalls, 0);
});

test('controlador valida contraseña obligatoria', async () => {
  const res = response();
  let receivedError;
  let serviceCalls = 0;
  service.login = async () => serviceCalls++;
  await controller.login(
    { body: { nombre_usuario: 'usuario' }, ip: '127.0.0.1' },
    res,
    (error) => (receivedError = error),
  );
  assert.equal(receivedError.statusCode, 400);
  assert.equal(serviceCalls, 0);
});

test.after(() => {
  bcrypt.compare = originalCompare;
  pool.getConnection = originalGetConnection;
  Object.assign(repository, originalRepository);
  service.login = originalServiceLogin;
});
