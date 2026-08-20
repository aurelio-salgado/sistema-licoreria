const crypto = require('node:crypto');
const pool = require('../config/database');
const repository = require('./sessionEpoch.repository');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidConfiguration() {
  const error = new Error('La version interna de sesiones no esta configurada');
  error.statusCode = 500;
  return error;
}

function validate(value) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw invalidConfiguration();
  return value.toLowerCase();
}

async function get(executor = pool) { return validate(await repository.find(executor)); }

async function persistNew(connection) {
  const value = crypto.randomUUID();
  await repository.upsert(connection, value);
  if (await repository.find(connection) !== value) throw invalidConfiguration();
  return value;
}

async function rotate() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const value = await persistNew(connection);
    await connection.commit();
    return value;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally { connection.release(); }
}

async function initialize() {
  const existing = await repository.find(pool);
  if (existing) return validate(existing);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const concurrent = await repository.find(connection);
    if (!concurrent) await repository.insertIfMissing(connection, crypto.randomUUID());
    const value = validate(await repository.find(connection));
    await connection.commit();
    return value;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally { connection.release(); }
}

module.exports = { get, initialize, rotate, validate };
