const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const env = require('../../config/env');
const { createBackupService } = require('./backup.service');
const backupRepository = require('./backup.repository');

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
    createRecovered: async (_db, data) => { const id = nextId++; records.set(id, { id_respaldo: id, ruta_segura: data.safePath, nombre_archivo: data.filename, tamano_bytes: data.size, checksum_sha256: data.checksum, formato_version: data.format, tipo: data.type, operacion: data.operation, estado: 'exitoso', archivo_disponible: data.available, id_usuario: data.userId, id_respaldo_origen: data.sourceId || null, id_respaldo_preventivo: data.preventiveId || null, mensaje_resultado: data.message }); return id; },
    succeed: async (_db, id, data) => Object.assign(records.get(id), { tamano_bytes: data.size, checksum_sha256: data.checksum, formato_version: 'sql-mariadb', estado: 'exitoso', archivo_disponible: true, mensaje_resultado: data.message }),
    fail: async () => {}, completeRestoration: async (_db, id, message) => Object.assign(records.get(id), { estado: 'exitoso', archivo_disponible: false, mensaje_resultado: message }),
    findById: async (_db, id) => records.get(id) || null, audit: async (_db, data) => audits.push(data),
    oldestManual: async () => [], retire: async () => {}, verifyEssentialTables: async () => true,
    userExists: async () => true,
  };
  const inspect = async (file) => { const content = await fsp.readFile(file); return { size: content.length, checksum: crypto.createHash('sha256').update(content).digest('hex') }; };
  const processTools = { dump: async (file) => { dumped.push(file); await fsp.writeFile(file, `CREATE DATABASE IF NOT EXISTS \`${env.database.name}\`;\nUSE \`${env.database.name}\`;\nCREATE TABLE \`respaldos\` (\`checksum_sha256\` CHAR(64));`); }, inspect, restore: async () => { processTools.restored = true; } };
  const coordinator = { acquireBackup: () => true, releaseBackup: () => {}, beginRestore: () => true, endRestore: () => { coordinator.ended = true; } };
  const pool = { renew: async () => { pool.renewed = true; } };
  const logger = { error: (...args) => { logger.entries.push(args); }, entries: [] };
  return { audits, coordinator, dumped, logger, pool, processTools, records, repository };
}

test('crea respaldo con parcial, SHA-256, auditoria y limpieza del lock', async () => {
  const context = integrationContext(); const service = createBackupService(context);
  try {
    const result = await service.create({}, { userId: 1, ipAddress: '127.0.0.1' });
    assert.equal(result.estado, 'exitoso'); assert.equal(result.archivo_disponible, true);
    assert.equal(context.audits[0].action, 'crear_respaldo');
    assert.equal(context.dumped[0].endsWith('.sql.part'), true);
    const finalContent = await fsp.readFile(context.dumped[0].replace(/\.part$/, ''));
    assert.equal(context.records.get(result.id_respaldo).checksum_sha256, crypto.createHash('sha256').update(finalContent).digest('hex'));
    await assert.rejects(() => fsp.stat(context.dumped[0]));
  } finally { for (const file of context.dumped) await fsp.rm(file.replace(/\.part$/, ''), { force: true }); }
});

test('restauracion simulada crea preventivo, renueva pool, audita y libera mantenimiento', async () => {
  const context = integrationContext(); const sourcePath = path.join(env.backups.storagePath, 'source-test.sql');
  await fsp.mkdir(env.backups.storagePath, { recursive: true });
  const content = `CREATE DATABASE IF NOT EXISTS \`${env.database.name}\`;\nUSE \`${env.database.name}\`;\nCREATE TABLE \`respaldos\` (\`checksum_sha256\` CHAR(64));`; await fsp.writeFile(sourcePath, content);
  context.records.set(1, { id_respaldo: 1, nombre_archivo: 'source-test.sql', ruta_segura: sourcePath, tamano_bytes: Buffer.byteLength(content), checksum_sha256: crypto.createHash('sha256').update(content).digest('hex'), formato_version: 'sql-mariadb', tipo: 'manual', operacion: 'respaldo', estado: 'exitoso', archivo_disponible: true, id_usuario: 1 });
  const service = createBackupService({ ...context, sessionInvalidator: async () => { context.invalidated = true; } });
  try {
    const result = await service.restore('1', { confirmacion: 'RESTAURAR' }, { userId: 1, ipAddress: '127.0.0.1' });
    assert.equal(result.operacion, 'restauracion'); assert.equal(context.processTools.restored, true);
    assert.equal(context.pool.renewed, true); assert.equal(context.invalidated, true); assert.equal(context.coordinator.ended, true);
    assert.notEqual(result.id_respaldo, 1);
    assert.notEqual(result.id_respaldo_origen, 1);
    assert.notEqual(result.id_respaldo_preventivo, 10);
    assert.equal(context.audits.some((item) => item.action === 'restaurar_respaldo' && item.result === 'exitoso'), true);
  } finally { await fsp.rm(sourcePath, { force: true }); for (const file of context.dumped) await fsp.rm(file.replace(/\.part$/, ''), { force: true }); }
});

test('verificacion posterior exige DB_NAME, tablas criticas y consultas minimas', async () => {
  const names = ['usuarios','roles','permisos','configuracion','respaldos','bitacora','productos','ventas','detalle_ventas','movimientos_inventario'];
  const executed = [];
  const executor = {
    execute: async (sql) => {
      executed.push(sql);
      if (sql.startsWith('SELECT DATABASE()')) return [[{ nombre_base: env.database.name }]];
      if (sql.includes('information_schema.tables')) return [names.map((table_name) => ({ table_name }))];
      if (sql.includes('FROM movimientos_inventario')) assert.equal(sql, 'SELECT id_movimiento_inventario FROM movimientos_inventario LIMIT 1');
      return [[]];
    },
  };
  assert.equal(await backupRepository.verifyEssentialTables(executor), true);
  assert.equal(executed.includes('SELECT id_movimiento_inventario FROM movimientos_inventario LIMIT 1'), true);
  assert.equal(executed.some((sql) => /SELECT id_movimiento FROM movimientos_inventario/.test(sql)), false);
  executor.execute = async (sql) => sql.startsWith('SELECT DATABASE()') ? [[{ nombre_base: 'otra_base' }]] : [[]];
  assert.equal(await backupRepository.verifyEssentialTables(executor), false);
});

test('restauracion rechaza respaldo inexistente, archivo ausente e integridad distinta', async () => {
  const missingService = createBackupService({ repository: repositoryWith(null), pool: {} });
  await assert.rejects(() => missingService.restore('99', { confirmacion: 'RESTAURAR' }, { userId: 1 }), (error) => error.statusCode === 404);

  const absentPath = path.join(env.backups.storagePath, 'missing-backup.sql');
  const absent = { id_respaldo: 2, operacion: 'respaldo', estado: 'exitoso', archivo_disponible: 1, formato_version: 'sql-mariadb', ruta_segura: absentPath, id_usuario: 1 };
  const absentService = createBackupService({ repository: { ...repositoryWith(absent), audit: async () => {} }, pool: {} });
  await assert.rejects(() => absentService.restore('2', { confirmacion: 'RESTAURAR' }, { userId: 1 }), /no esta disponible/);

  await fsp.mkdir(env.backups.storagePath, { recursive: true });
  const file = path.join(env.backups.storagePath, 'integrity-mismatch.sql');
  const content = `CREATE DATABASE IF NOT EXISTS \`${env.database.name}\`;\nUSE \`${env.database.name}\`;\nCREATE TABLE \`respaldos\` (\`checksum_sha256\` CHAR(64));`;
  await fsp.writeFile(file, content);
  const row = { ...absent, id_respaldo: 3, ruta_segura: file, tamano_bytes: Buffer.byteLength(content) + 1, checksum_sha256: '0'.repeat(64) };
  const service = createBackupService({ repository: { ...repositoryWith(row), audit: async () => {} }, pool: {} });
  try { await assert.rejects(() => service.restore('3', { confirmacion: 'RESTAURAR' }, { userId: 1 }), /integridad/); }
  finally { await fsp.rm(file, { force: true }); }
});

test('fallo preventivo impide importar y libera mantenimiento', async () => {
  const context = integrationContext(); const sourcePath = path.join(env.backups.storagePath, 'source-preventive-fail.sql');
  await fsp.mkdir(env.backups.storagePath, { recursive: true });
  const content = `CREATE DATABASE IF NOT EXISTS \`${env.database.name}\`;\nUSE \`${env.database.name}\`;\nCREATE TABLE \`respaldos\` (\`checksum_sha256\` CHAR(64));`; await fsp.writeFile(sourcePath, content);
  context.records.set(1, { id_respaldo: 1, nombre_archivo: 'source-preventive-fail.sql', ruta_segura: sourcePath, tamano_bytes: Buffer.byteLength(content), checksum_sha256: crypto.createHash('sha256').update(content).digest('hex'), formato_version: 'sql-mariadb', tipo: 'manual', operacion: 'respaldo', estado: 'exitoso', archivo_disponible: true, id_usuario: 1 });
  context.processTools.dump = async () => { throw new Error('dump fail'); };
  const service = createBackupService(context);
  try {
    await assert.rejects(() => service.restore('1', { confirmacion: 'RESTAURAR' }, { userId: 1 }), /preparar/);
    assert.equal(context.processTools.restored, undefined);
    assert.equal(context.coordinator.ended, true);
  } finally { await fsp.rm(sourcePath, { force: true }); }
});

test('fallo posterior al import conserva mantenimiento y no declara exito', async () => {
  const context = integrationContext(); const sourcePath = path.join(env.backups.storagePath, 'source-post-fail.sql');
  await fsp.mkdir(env.backups.storagePath, { recursive: true });
  const content = `CREATE DATABASE IF NOT EXISTS \`${env.database.name}\`;\nUSE \`${env.database.name}\`;\nCREATE TABLE \`respaldos\` (\`checksum_sha256\` CHAR(64));`; await fsp.writeFile(sourcePath, content);
  context.records.set(1, { id_respaldo: 1, nombre_archivo: 'source-post-fail.sql', ruta_segura: sourcePath, tamano_bytes: Buffer.byteLength(content), checksum_sha256: crypto.createHash('sha256').update(content).digest('hex'), formato_version: 'sql-mariadb', tipo: 'manual', operacion: 'respaldo', estado: 'exitoso', archivo_disponible: true, id_usuario: 1 });
  context.repository.verifyEssentialTables = async () => false;
  const service = createBackupService(context);
  try {
    await assert.rejects(() => service.restore('1', { confirmacion: 'RESTAURAR' }, { userId: 1 }), /mantenimiento/);
    assert.equal(context.processTools.restored, true);
    assert.equal(context.coordinator.ended, undefined);
    assert.deepEqual(context.logger.entries.at(-1)[1], {
      etapa: 'verificando_base', tipo: 'Error', codigo: null, sqlState: null,
      mensaje: 'Verificacion posterior incompleta', importIniciado: true,
      poolRenovado: true, epochRotado: false,
    });
  } finally { await fsp.rm(sourcePath, { force: true }); for (const file of context.dumped) await fsp.rm(file.replace(/\.part$/, ''), { force: true }); }
});

test('usuario ejecutor ausente no inventa responsable ni convierte la restauracion en fallo', async () => {
  const context = integrationContext(); const sourcePath = path.join(env.backups.storagePath, 'source-missing-actor.sql');
  await fsp.mkdir(env.backups.storagePath, { recursive: true });
  const content = `CREATE DATABASE IF NOT EXISTS \`${env.database.name}\`;\nUSE \`${env.database.name}\`;\nCREATE TABLE \`respaldos\` (\`checksum_sha256\` CHAR(64));`; await fsp.writeFile(sourcePath, content);
  context.records.set(1, { id_respaldo: 1, nombre_archivo: 'source-missing-actor.sql', ruta_segura: sourcePath, tamano_bytes: Buffer.byteLength(content), checksum_sha256: crypto.createHash('sha256').update(content).digest('hex'), formato_version: 'sql-mariadb', tipo: 'manual', operacion: 'respaldo', estado: 'exitoso', archivo_disponible: true, id_usuario: 2 });
  context.repository.userExists = async (_db, id) => id === 2;
  const service = createBackupService({ ...context, sessionInvalidator: async () => { context.invalidated = true; } });
  try {
    const result = await service.restore('1', { confirmacion: 'RESTAURAR' }, { userId: 1 });
    assert.equal(result.estado, 'exitoso'); assert.equal(result.usuario, null); assert.equal(context.invalidated, true);
    assert.equal([...context.records.values()].some((row) => row.operacion === 'restauracion' && row.id_usuario !== 1), false);
  } finally { await fsp.rm(sourcePath, { force: true }); for (const file of context.dumped) await fsp.rm(file.replace(/\.part$/, ''), { force: true }); }
});

test('fallo al rotar epoch no declara restauracion exitosa', async () => {
  const context = integrationContext(); const sourcePath = path.join(env.backups.storagePath, 'source-epoch-fail.sql');
  await fsp.mkdir(env.backups.storagePath, { recursive: true });
  const content = `CREATE DATABASE IF NOT EXISTS \`${env.database.name}\`;\nUSE \`${env.database.name}\`;\nCREATE TABLE \`respaldos\` (\`checksum_sha256\` CHAR(64));`; await fsp.writeFile(sourcePath, content);
  context.records.set(1, { id_respaldo: 1, nombre_archivo: 'source-epoch-fail.sql', ruta_segura: sourcePath, tamano_bytes: Buffer.byteLength(content), checksum_sha256: crypto.createHash('sha256').update(content).digest('hex'), formato_version: 'sql-mariadb', tipo: 'manual', operacion: 'respaldo', estado: 'exitoso', archivo_disponible: true, id_usuario: 1 });
  const service = createBackupService({ ...context, sessionInvalidator: async () => { throw new Error('fallo interno'); } });
  try {
    await assert.rejects(() => service.restore('1', { confirmacion: 'RESTAURAR' }, { userId: 1 }), /no pudo verificarse/);
    assert.equal(context.audits.some((item) => item.action === 'restaurar_respaldo' && item.result === 'exitoso'), false);
    assert.equal(context.coordinator.ended, undefined);
  } finally { await fsp.rm(sourcePath, { force: true }); for (const file of context.dumped) await fsp.rm(file.replace(/\.part$/, ''), { force: true }); }
});
