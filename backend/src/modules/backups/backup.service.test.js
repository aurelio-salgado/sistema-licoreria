const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const env = require('../../config/env');
const { createBackupService } = require('./backup.service');

function repositoryWith(row) {
  return {
    findById: async () => row,
    list: async () => ({ rows: row ? [row] : [], total: row ? 1 : 0 }),
  };
}

test('listado solo proyecta metadata publica', async () => {
  const row = { id_respaldo: 1, nombre_archivo: 'safe.sql', ruta_segura: 'secreta', checksum_sha256: 'a'.repeat(64), archivo_disponible: 1, id_usuario: 2 };
  const service = createBackupService({ repository: repositoryWith(row), pool: {} });
  const result = await service.list({});
  assert.equal(result.backups[0].nombre_archivo, 'safe.sql');
  assert.equal('ruta_segura' in result.backups[0], false);
  assert.equal('checksum_sha256' in result.backups[0], false);
});

test('rechaza path traversal', async () => {
  const row = { id_respaldo: 1, operacion: 'respaldo', estado: 'exitoso', archivo_disponible: 1, formato_version: 'sql-mariadb', ruta_segura: `${env.backups.storagePath}\\..\\externo.sql` };
  const service = createBackupService({ repository: repositoryWith(row), pool: {} });
  await assert.rejects(() => service.download('1'), /no esta disponible/);
});

function integrationContext() {
  let nextId = 10; const records = new Map(); const audits = []; const dumped = [];
  const repository = {
    create: async (_db, data) => { const id = nextId++; records.set(id, { id_respaldo: id, ...data, ruta_segura: data.safePath, nombre_archivo: data.filename, tipo: data.type, operacion: data.operation, estado: 'en_proceso', archivo_disponible: false, id_usuario: data.userId, id_respaldo_origen: data.sourceId || null, id_respaldo_preventivo: data.preventiveId || null }); return id; },
    succeed: async (_db, id, data) => Object.assign(records.get(id), { tamano_bytes: data.size, checksum_sha256: data.checksum, formato_version: 'sql-mariadb', estado: 'exitoso', archivo_disponible: true, mensaje_resultado: data.message }),
    fail: async () => {}, completeRestoration: async (_db, id, message) => Object.assign(records.get(id), { estado: 'exitoso', archivo_disponible: false, mensaje_resultado: message }),
    findById: async (_db, id) => records.get(id) || null, audit: async (_db, data) => audits.push(data),
    oldestManual: async () => [], retire: async () => {}, verifyEssentialTables: async () => true,
  };
  const inspect = async (file) => { const content = await fsp.readFile(file); return { size: content.length, checksum: crypto.createHash('sha256').update(content).digest('hex') }; };
  const processTools = { dump: async (file) => { dumped.push(file); await fsp.writeFile(file, 'CREATE TABLE `respaldos` (`checksum_sha256` CHAR(64));'); }, inspect, restore: async () => { processTools.restored = true; } };
  const coordinator = { acquireBackup: () => true, releaseBackup: () => {}, beginRestore: () => true, endRestore: () => { coordinator.ended = true; } };
  const pool = { renew: async () => { pool.renewed = true; } };
  return { audits, coordinator, dumped, pool, processTools, records, repository };
}

test('crea respaldo con parcial, SHA-256, auditoria y limpieza del lock', async () => {
  const context = integrationContext(); const service = createBackupService(context);
  try {
    const result = await service.create({}, { userId: 1, ipAddress: '127.0.0.1' });
    assert.equal(result.estado, 'exitoso'); assert.equal(result.archivo_disponible, true);
    assert.equal(context.audits[0].action, 'crear_respaldo');
    assert.equal(context.dumped[0].endsWith('.sql.part'), true);
    await assert.rejects(() => fsp.stat(context.dumped[0]));
  } finally { for (const file of context.dumped) await fsp.rm(file.replace(/\.part$/, ''), { force: true }); }
});

test('restauracion simulada crea preventivo, renueva pool, audita y libera mantenimiento', async () => {
  const context = integrationContext(); const sourcePath = path.join(env.backups.storagePath, 'source-test.sql');
  await fsp.mkdir(env.backups.storagePath, { recursive: true });
  const content = 'CREATE TABLE `respaldos` (`checksum_sha256` CHAR(64));'; await fsp.writeFile(sourcePath, content);
  context.records.set(1, { id_respaldo: 1, nombre_archivo: 'source-test.sql', ruta_segura: sourcePath, tamano_bytes: Buffer.byteLength(content), checksum_sha256: crypto.createHash('sha256').update(content).digest('hex'), formato_version: 'sql-mariadb', tipo: 'manual', operacion: 'respaldo', estado: 'exitoso', archivo_disponible: true, id_usuario: 1 });
  const service = createBackupService({ ...context, sessionInvalidator: async () => { context.invalidated = true; } });
  try {
    const result = await service.restore('1', { confirmacion: 'RESTAURAR' }, { userId: 1, ipAddress: '127.0.0.1' });
    assert.equal(result.operacion, 'restauracion'); assert.equal(context.processTools.restored, true);
    assert.equal(context.pool.renewed, true); assert.equal(context.invalidated, true); assert.equal(context.coordinator.ended, true);
    assert.equal(context.audits.some((item) => item.action === 'restaurar_respaldo' && item.result === 'exitoso'), true);
  } finally { await fsp.rm(sourcePath, { force: true }); for (const file of context.dumped) await fsp.rm(file.replace(/\.part$/, ''), { force: true }); }
});

test('fallo al rotar epoch no declara restauracion exitosa', async () => {
  const context = integrationContext(); const sourcePath = path.join(env.backups.storagePath, 'source-epoch-fail.sql');
  await fsp.mkdir(env.backups.storagePath, { recursive: true });
  const content = 'CREATE TABLE `respaldos` (`checksum_sha256` CHAR(64));'; await fsp.writeFile(sourcePath, content);
  context.records.set(1, { id_respaldo: 1, nombre_archivo: 'source-epoch-fail.sql', ruta_segura: sourcePath, tamano_bytes: Buffer.byteLength(content), checksum_sha256: crypto.createHash('sha256').update(content).digest('hex'), formato_version: 'sql-mariadb', tipo: 'manual', operacion: 'respaldo', estado: 'exitoso', archivo_disponible: true, id_usuario: 1 });
  const service = createBackupService({ ...context, sessionInvalidator: async () => { throw new Error('fallo interno'); } });
  try {
    await assert.rejects(() => service.restore('1', { confirmacion: 'RESTAURAR' }, { userId: 1 }), /no pudo completarse/);
    assert.equal(context.audits.some((item) => item.action === 'restaurar_respaldo' && item.result === 'exitoso'), false);
    assert.equal(context.coordinator.ended, undefined);
  } finally { await fsp.rm(sourcePath, { force: true }); for (const file of context.dumped) await fsp.rm(file.replace(/\.part$/, ''), { force: true }); }
});
