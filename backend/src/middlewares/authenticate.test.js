const assert = require('node:assert/strict');
const test = require('node:test');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'secreto-exclusivo-para-pruebas-automatizadas';
process.env.JWT_EXPIRES_IN = '1h';

const authRepository = require('../modules/auth/auth.repository');
const authenticate = require('./authenticate');

const originalRepository = { ...authRepository };
const secret = process.env.JWT_SECRET;

function request(authorization) {
  return {
    body: {},
    get(name) {
      return name.toLowerCase() === 'authorization' ? authorization : undefined;
    },
  };
}

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

function token(payload = {}, options = {}) {
  return jwt.sign(
    {
      sub: '7',
      nombre_usuario: 'nombre-en-token',
      roles: ['Rol antiguo'],
      ...payload,
    },
    secret,
    { expiresIn: '1h', ...options },
  );
}

function sessionUser(overrides = {}) {
  return {
    id_usuario: 7,
    nombre_usuario: 'nombre-actual',
    estado: 'activo',
    bloqueado_hasta: null,
    esta_bloqueado: 0,
    ...overrides,
  };
}

async function execute(authorization, user = sessionUser()) {
  const req = request(authorization);
  const res = response();
  let nextCalls = 0;
  let nextError;
  authRepository.findSessionUserById = async (_executor, userId) => {
    assert.equal(userId, 7);
    return user;
  };
  authRepository.findRolesByUserId = async () => ['Administrador'];
  await authenticate(req, res, (error) => {
    nextCalls += 1;
    nextError = error;
  });
  return { nextCalls, nextError, req, res };
}

test('authenticate rechaza solicitudes sin credenciales válidas', async (t) => {
  for (const [name, authorization] of [
    ['sin Authorization', undefined],
    ['con esquema distinto de Bearer', 'Basic abc'],
    ['con Bearer sin token', 'Bearer'],
    ['con token inválido', 'Bearer token-invalido'],
  ]) {
    await t.test(name, async () => {
      const result = await execute(authorization);
      assert.equal(result.res.statusCode, 401);
      assert.deepEqual(result.res.body, {
        success: false,
        message: 'No autorizado',
      });
      assert.equal(result.nextCalls, 0);
    });
  }
});

test('authenticate rechaza un token expirado', async () => {
  const expired = token({}, { expiresIn: -1 });
  const result = await execute(`Bearer ${expired}`);
  assert.equal(result.res.statusCode, 401);
  assert.equal(result.nextCalls, 0);
});

test('authenticate permite usuario activo y construye identidad actual', async () => {
  const result = await execute(`Bearer ${token()}`);
  assert.equal(result.nextCalls, 1);
  assert.equal(result.nextError, undefined);
  assert.deepEqual(result.req.user, {
    id_usuario: 7,
    nombre_usuario: 'nombre-actual',
    roles: ['Administrador'],
  });
  assert.equal(Object.hasOwn(result.req.user, 'password'), false);
  assert.equal(Object.hasOwn(result.req.user, 'password_hash'), false);
});

test('authenticate rechaza usuario inexistente', async () => {
  const result = await execute(`Bearer ${token()}`, null);
  assert.equal(result.res.statusCode, 401);
  assert.equal(result.nextCalls, 0);
});

test('regresión: authenticate rechaza usuario inactivo con JWT válido', async () => {
  const result = await execute(
    `Bearer ${token()}`,
    sessionUser({ estado: 'inactivo' }),
  );
  assert.equal(result.res.statusCode, 401);
  assert.equal(result.res.body.message, 'No autorizado');
  assert.equal(result.nextCalls, 0);
});

test('regresión: authenticate rechaza bloqueo temporal vigente', async () => {
  const result = await execute(
    `Bearer ${token()}`,
    sessionUser({
      bloqueado_hasta: '2099-01-01 00:00:00',
      esta_bloqueado: 1,
    }),
  );
  assert.equal(result.res.statusCode, 401);
  assert.equal(result.nextCalls, 0);
});

test('regresión: authenticate permite un bloqueo ya expirado', async () => {
  const result = await execute(
    `Bearer ${token()}`,
    sessionUser({
      bloqueado_hasta: '2020-01-01 00:00:00',
      esta_bloqueado: 0,
    }),
  );
  assert.equal(result.nextCalls, 1);
  assert.equal(result.res.statusCode, null);
});

test('authenticate toma id de sub y no confía en nombre ni roles del JWT', async () => {
  const result = await execute(
    `Bearer ${token({ nombre_usuario: 'falso', roles: ['Superusuario'] })}`,
  );
  assert.equal(result.req.user.id_usuario, 7);
  assert.equal(result.req.user.nombre_usuario, 'nombre-actual');
  assert.deepEqual(result.req.user.roles, ['Administrador']);
});

test.after(() => {
  Object.assign(authRepository, originalRepository);
});
