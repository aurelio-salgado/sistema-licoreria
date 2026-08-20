const assert = require('node:assert/strict');
const test = require('node:test');

const pool = require('../config/database');
const repository = require('./sessionEpoch.repository');
const service = require('./sessionEpoch');

const originalPool = { getConnection: pool.getConnection };
const originalRepository = { ...repository };

function context(initial = null) {
  let stored = initial; const transaction = { commits: 0, rollbacks: 0 };
  const connection = {
    beginTransaction: async () => {}, commit: async () => transaction.commits++,
    rollback: async () => transaction.rollbacks++, release() {},
  };
  pool.getConnection = async () => connection;
  repository.find = async () => stored;
  repository.upsert = async (_executor, value) => { stored = value; };
  repository.insertIfMissing = async (_executor, value) => { if (!stored) stored = value; };
  return { get stored() { return stored; }, transaction };
}

test('initialize genera una sola vez y conserva epoch persistente', async () => {
  const state = context(); const first = await service.initialize(); const second = await service.initialize();
  assert.match(first, /^[0-9a-f-]{36}$/); assert.equal(second, first); assert.equal(state.stored, first);
});

test('rotate persiste y verifica un UUID nuevo', async () => {
  const previous = '45e64b2a-bb2d-4d5f-9f4a-d01486838761'; const state = context(previous);
  const current = await service.rotate(); assert.notEqual(current, previous); assert.equal(state.stored, current); assert.equal(state.transaction.commits, 1);
});

test('rotate revierte si no puede verificar persistencia', async () => {
  const state = context('45e64b2a-bb2d-4d5f-9f4a-d01486838761');
  repository.upsert = async () => {};
  await assert.rejects(() => service.rotate(), /no esta configurada/); assert.equal(state.transaction.commits, 0); assert.equal(state.transaction.rollbacks, 1);
});

test.after(() => { pool.getConnection = originalPool.getConnection; Object.assign(repository, originalRepository); });
