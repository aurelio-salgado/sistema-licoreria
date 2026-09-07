const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const processTools = require('./backup.process');

test('usa el modo nativo autocontenido para la base configurada', () => {
  const databaseName = 'liquorix_recovery_test';
  const args = processTools.buildDumpArguments('private.cnf', databaseName);

  assert.deepEqual(args.slice(-2), ['--databases', databaseName]);
  assert.equal(args.includes('--add-drop-database'), false);
  assert.equal(args.includes('sistema_licoreria'), false);
});

test('rechaza nombres de base incompatibles antes de ejecutar mysqldump', () => {
  for (const value of ['', '1database', 'base-datos', 'base datos', 'base;DROP DATABASE x', 'a'.repeat(65)]) {
    assert.throws(() => processTools.buildDumpArguments('private.cnf', value), /invalida/);
  }
});

test('calcula SHA-256 y rechaza SQL ajeno o incompatible', async () => {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'liquorix-test-'));
  try {
    const valid = path.join(directory, 'valid.sql'); const sql = 'CREATE DATABASE IF NOT EXISTS `liquorix_recovery_test`;\nUSE `liquorix_recovery_test`;\nCREATE TABLE `respaldos` (`checksum_sha256` CHAR(64));';
    await fsp.writeFile(valid, sql); const info = await processTools.inspect(valid);
    assert.equal(info.size, Buffer.byteLength(sql)); assert.equal(info.checksum, crypto.createHash('sha256').update(sql).digest('hex'));
    const invalid = path.join(directory, 'invalid.sql'); await fsp.writeFile(invalid, 'DROP TABLE usuarios;');
    await assert.rejects(() => processTools.inspect(invalid), /compatible/);
  } finally { await fsp.rm(directory, { recursive: true, force: true }); }
});
