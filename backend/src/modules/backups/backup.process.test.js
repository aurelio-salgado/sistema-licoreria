const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const processTools = require('./backup.process');

test('calcula SHA-256 y rechaza SQL ajeno o incompatible', async () => {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'liquorix-test-'));
  try {
    const valid = path.join(directory, 'valid.sql'); const sql = 'CREATE TABLE `respaldos` (`checksum_sha256` CHAR(64));';
    await fsp.writeFile(valid, sql); const info = await processTools.inspect(valid);
    assert.equal(info.size, Buffer.byteLength(sql)); assert.equal(info.checksum, crypto.createHash('sha256').update(sql).digest('hex'));
    const invalid = path.join(directory, 'invalid.sql'); await fsp.writeFile(invalid, 'DROP TABLE usuarios;');
    await assert.rejects(() => processTools.inspect(invalid), /compatible/);
  } finally { await fsp.rm(directory, { recursive: true, force: true }); }
});
