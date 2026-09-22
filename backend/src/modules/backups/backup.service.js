const crypto = require('node:crypto');
const fsp = require('node:fs/promises');
const path = require('node:path');

const defaultPool = require('../../config/database');
const env = require('../../config/env');
const defaultCoordinator = require('../../services/operationCoordinator');
const defaultProcessTools = require('./backup.process');
const defaultRepository = require('./backup.repository');
const validation = require('./backup.validation');
const defaultSessionEpoch = require('../../services/sessionEpoch');

function httpError(statusCode, message) { const error = new Error(message); error.statusCode = statusCode; return error; }

function sanitizeDiagnostic(value) {
  let message = String(value || 'Error sin mensaje');
  const privateValues = [env.database.password, env.backups.storagePath, process.cwd()]
    .filter((item) => typeof item === 'string' && item.length > 0);
  for (const privateValue of privateValues) message = message.split(privateValue).join('[dato privado]');
  return message
    .replace(/--defaults-extra-file=\S+/gi, '--defaults-extra-file=[dato privado]')
    .replace(/(password\s*[=:]\s*)\S+/gi, '$1[dato privado]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [dato privado]')
    .slice(0, 500);
}

function publicRecord(row) {
  return {
    id_respaldo: row.id_respaldo, nombre_archivo: row.nombre_archivo,
    tamano_bytes: row.tamano_bytes, tipo: row.tipo, operacion: row.operacion,
    estado: row.estado, archivo_disponible: Boolean(row.archivo_disponible),
    usuario: { id_usuario: row.id_usuario, nombre: row.usuario_nombre, nombre_usuario: row.nombre_usuario },
    mensaje_resultado: row.mensaje_resultado, fecha_operacion: row.fecha_operacion,
    fecha_finalizacion: row.fecha_finalizacion, id_respaldo_origen: row.id_respaldo_origen,
    id_respaldo_preventivo: row.id_respaldo_preventivo,
  };
}

function createBackupService(dependencies = {}) {
  const pool = dependencies.pool || defaultPool;
  const coordinator = dependencies.coordinator || defaultCoordinator;
  const processTools = dependencies.processTools || defaultProcessTools;
  const repository = dependencies.repository || defaultRepository;
  const sessionInvalidator = dependencies.sessionInvalidator || defaultSessionEpoch.rotate;
  const logger = dependencies.logger || console;

  function logRestoreFailure(error, context) {
    logger.error('[backups.restore] fallo controlado', {
      etapa: context.stage,
      tipo: error?.name || 'Error',
      codigo: error?.code || null,
      sqlState: error?.sqlState || null,
      mensaje: sanitizeDiagnostic(error?.message),
      importIniciado: context.importStarted,
      poolRenovado: context.poolRenewed,
      epochRotado: context.epochRotated,
    });
  }

  function safePath(storedPath) {
    const root = path.resolve(env.backups.storagePath);
    const resolved = path.resolve(storedPath);
    if (resolved === root || !resolved.startsWith(`${root}${path.sep}`)) {
      throw httpError(409, 'El archivo de respaldo no esta disponible');
    }
    return resolved;
  }

  async function verify(row) {
    if (row.operacion !== 'respaldo' || row.estado !== 'exitoso' || !row.archivo_disponible) {
      throw httpError(409, 'El respaldo no es elegible para esta operacion');
    }
    if (row.formato_version !== 'sql-mariadb') throw httpError(409, 'El formato del respaldo no es compatible');
    const file = safePath(row.ruta_segura);
    let realPath;
    try { realPath = await fsp.realpath(file); }
    catch { throw httpError(409, 'El archivo de respaldo no esta disponible'); }
    if (path.resolve(realPath) !== file) throw httpError(409, 'El archivo de respaldo no es valido');
    let info;
    try { info = await processTools.inspect(file); }
    catch { throw httpError(409, 'La integridad del respaldo no es valida'); }
    if (Number(row.tamano_bytes) !== info.size || row.checksum_sha256 !== info.checksum) {
      throw httpError(409, 'La integridad del respaldo no es valida');
    }
    return { file, info };
  }

  function filename(type) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    return `liquorix_${type}_${stamp}_${crypto.randomUUID()}.sql`;
  }

  async function generate(type, actor) {
    await fsp.mkdir(env.backups.storagePath, { recursive: true });
    const name = filename(type);
    const finalPath = path.join(env.backups.storagePath, name);
    const partialPath = `${finalPath}.part`;
    const id = await repository.create(pool, {
      filename: name, safePath: finalPath, type, operation: 'respaldo', userId: actor.userId,
    });
    let promoted = false;
    try {
      await processTools.dump(partialPath);
      const info = await processTools.inspect(partialPath);
      await fsp.rename(partialPath, finalPath);
      promoted = true;
      await repository.succeed(pool, id, { ...info, message: 'Respaldo creado correctamente' });
      await repository.audit(pool, {
        userId: actor.userId, ipAddress: actor.ipAddress, action: 'crear_respaldo', id,
        result: 'exitoso', data: { tipo: type, nombre_archivo: name, tamano_bytes: info.size },
      });
      return repository.findById(pool, id);
    } catch {
      await fsp.rm(partialPath, { force: true }).catch(() => {});
      if (promoted) await fsp.rm(finalPath, { force: true }).catch(() => {});
      await repository.fail(pool, id, 'No fue posible crear el respaldo').catch(() => {});
      await repository.audit(pool, {
        userId: actor.userId, ipAddress: actor.ipAddress, action: 'crear_respaldo', id,
        result: 'fallido', data: { tipo: type },
      }).catch(() => {});
      throw httpError(500, 'No fue posible crear el respaldo');
    }
  }

  async function applyRetention() {
    const rows = await repository.oldestManual(pool, env.backups.maxManual);
    for (const row of rows) {
      try {
        const file = safePath(row.ruta_segura);
        await fsp.rm(file, { force: true });
        await repository.retire(pool, row.id_respaldo);
      } catch { /* Mantener archivo y metadata si no puede retirarse de forma segura. */ }
    }
  }

  async function list(rawQuery) {
    const filters = validation.list(rawQuery);
    const result = await repository.list(pool, filters);
    return { backups: result.rows.map(publicRecord), pagination: { page: filters.page, limit: filters.limit, total: result.total, total_pages: Math.ceil(result.total / filters.limit) } };
  }

  async function get(rawId) {
    const row = await repository.findById(pool, validation.id(rawId));
    if (!row) throw httpError(404, 'Respaldo no encontrado');
    return publicRecord(row);
  }

  async function create(body, actor) {
    validation.create(body);
    if (!coordinator.acquireBackup()) throw httpError(409, 'Existe otra operacion de respaldo o restauracion en curso');
    try {
      const row = await generate('manual', actor);
      await applyRetention();
      return publicRecord(row);
    } finally { coordinator.releaseBackup(); }
  }

  async function download(rawId) {
    const row = await repository.findById(pool, validation.id(rawId));
    if (!row) throw httpError(404, 'Respaldo no encontrado');
    return { ...(await verify(row)), filename: row.nombre_archivo };
  }

  async function restore(rawId, body, actor) {
    let stage = 'validando_origen';
    let importStarted = false;
    let poolRenewed = false;
    let epochRotated = false;
    validation.restore(body);
    const sourceId = validation.id(rawId);
    const source = await repository.findById(pool, sourceId);
    if (!source) throw httpError(404, 'Respaldo no encontrado');
    let checkedSource;
    try {
      checkedSource = await verify(source);
    } catch (verificationError) {
      logRestoreFailure(verificationError, { stage, importStarted, poolRenewed, epochRotated });
      await repository.audit(pool, {
        userId: actor.userId, ipAddress: actor.ipAddress, action: 'restaurar_respaldo',
        id: sourceId, result: 'fallido', data: { id_respaldo_origen: sourceId, etapa: 'validacion_origen' },
      }).catch(() => {});
      throw verificationError;
    }
    if (!coordinator.beginRestore()) throw httpError(409, 'Existen operaciones incompatibles en curso');

    let preventive;
    let recoveredRestorationId = null;
    try {
      stage = 'creando_preventivo';
      preventive = await generate('preventivo', actor);
      stage = 'validando_preventivo';
      await verify(preventive);
      await repository.audit(pool, {
        userId: actor.userId, ipAddress: actor.ipAddress, action: 'iniciar_restauracion',
        id: sourceId, result: 'exitoso', data: { id_respaldo_origen: sourceId, respaldo_preventivo_creado: true },
      }).catch(() => {});
      stage = 'importando';
      importStarted = true;
      await processTools.restore(checkedSource.file);
      stage = 'renovando_pool';
      await pool.renew();
      poolRenewed = true;
      stage = 'verificando_base';
      if (!(await repository.verifyEssentialTables(pool))) throw new Error('Verificacion posterior incompleta');

      stage = 'reconstruyendo_metadata';
      const actorAvailable = await repository.userExists(pool, actor.userId);
      const sourceOwnerAvailable = await repository.userExists(pool, source.id_usuario);
      let recoveredSourceId = null;
      let recoveredPreventiveId = null;

      if (sourceOwnerAvailable) {
        recoveredSourceId = await repository.createRecovered(pool, {
          filename: source.nombre_archivo, safePath: source.ruta_segura,
          size: source.tamano_bytes, checksum: source.checksum_sha256,
          format: source.formato_version, type: source.tipo, operation: 'respaldo',
          userId: source.id_usuario, message: 'Respaldo de origen validado para restauracion',
          available: true,
        });
      }
      if (actorAvailable) {
        recoveredPreventiveId = await repository.createRecovered(pool, {
          filename: preventive.nombre_archivo, safePath: preventive.ruta_segura,
          size: preventive.tamano_bytes, checksum: preventive.checksum_sha256,
          format: preventive.formato_version, type: 'preventivo', operation: 'respaldo',
          userId: actor.userId, message: 'Respaldo preventivo creado correctamente',
          available: true,
        });
      }

      stage = 'rotando_epoch';
      await sessionInvalidator();
      epochRotated = true;

      if (actorAvailable) {
        stage = 'auditando';
        recoveredRestorationId = await repository.createRecovered(pool, {
          filename: source.nombre_archivo, safePath: source.ruta_segura,
          size: source.tamano_bytes, checksum: null, format: null,
          type: source.tipo, operation: 'restauracion', userId: actor.userId,
          message: 'Restauracion completada correctamente', available: false,
          sourceId: recoveredSourceId, preventiveId: recoveredPreventiveId,
        });
        await repository.audit(pool, {
          userId: actor.userId, ipAddress: actor.ipAddress, action: 'restaurar_respaldo',
          id: recoveredRestorationId, result: 'exitoso',
          data: { respaldo_origen_reconstruido: Boolean(recoveredSourceId), id_respaldo_preventivo: recoveredPreventiveId, sesiones_globales_invalidadas: true },
        }).catch(() => {});
        return publicRecord(await repository.findById(pool, recoveredRestorationId));
      }

      return {
        id_respaldo: null, nombre_archivo: source.nombre_archivo, tamano_bytes: source.tamano_bytes,
        tipo: source.tipo, operacion: 'restauracion', estado: 'exitoso', archivo_disponible: false,
        usuario: null, mensaje_resultado: 'Restauracion completada; la metadata del ejecutor no pudo persistirse',
        fecha_operacion: new Date().toISOString(), fecha_finalizacion: new Date().toISOString(),
        id_respaldo_origen: recoveredSourceId, id_respaldo_preventivo: null,
      };
    } catch (restoreError) {
      logRestoreFailure(restoreError, { stage, importStarted, poolRenewed, epochRotated });
      if (!importStarted) {
        await repository.audit(pool, {
          userId: actor.userId, ipAddress: actor.ipAddress, action: 'restaurar_respaldo',
          id: sourceId, result: 'fallido', data: { id_respaldo_origen: sourceId, etapa: 'respaldo_preventivo' },
        }).catch(() => {});
        throw httpError(500, 'No fue posible preparar la restauracion');
      }
      if (recoveredRestorationId && await repository.userExists(pool, actor.userId).catch(() => false)) {
        await repository.audit(pool, {
          userId: actor.userId, ipAddress: actor.ipAddress, action: 'restaurar_respaldo',
          id: recoveredRestorationId, result: 'fallido', data: { etapa: 'posterior_importacion' },
        }).catch(() => {});
      }
      if (epochRotated) {
        throw httpError(409, 'La base fue restaurada y las sesiones invalidadas, pero no pudo completarse la metadata final; se requiere revision administrativa');
      }
      throw httpError(409, 'La restauracion no pudo verificarse; el sistema permanece en mantenimiento y requiere revision administrativa');
    } finally {
      if (!importStarted || epochRotated) coordinator.endRestore();
    }
  }

  return { create, download, get, list, restore, _private: { applyRetention, generate, safePath, verify } };
}

module.exports = Object.assign(createBackupService(), { createBackupService });
