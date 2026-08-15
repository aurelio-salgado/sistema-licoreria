const pool = require('../../config/database');
const settingRepository = require('./setting.repository');
const {
  EDITABLE_KEYS,
  VISIBLE_KEYS,
  validateBody,
  validateKey,
  validateValue,
} = require('./setting.validation');

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function mapSetting(row) {
  return {
    clave: row.clave,
    valor: row.valor,
    tipo_dato: row.tipo_dato,
    descripcion: row.descripcion,
    es_critica: Boolean(row.es_critica),
    actualizado_en: row.actualizado_en,
  };
}

async function listSettings() {
  const rows = await settingRepository.list(pool, VISIBLE_KEYS);
  const settingsByKey = new Map(rows.map((row) => [row.clave, row]));

  if (settingsByKey.size !== VISIBLE_KEYS.length) {
    throw httpError(500, 'La configuracion administrativa esta incompleta');
  }

  return {
    settings: VISIBLE_KEYS.map((key) => mapSetting(settingsByKey.get(key))),
  };
}

async function updateSetting(rawKey, body, actor) {
  const key = validateKey(rawKey);
  const rawValue = validateBody(body);
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const current = await settingRepository.findByKeyForUpdate(connection, key);

    if (!current) {
      throw httpError(404, 'Configuracion no encontrada');
    }

    if (!EDITABLE_KEYS.has(key)) {
      throw httpError(409, 'La configuracion es de solo lectura');
    }

    const value = validateValue(key, rawValue);

    if (
      key === 'serie_comprobante' &&
      value !== current.valor &&
      (await settingRepository.hasHistoricalSeries(connection, value))
    ) {
      throw httpError(409, 'La serie ya fue utilizada historicamente');
    }

    await settingRepository.updateValue(
      connection,
      current.id_configuracion,
      value,
      actor.userId,
    );
    await settingRepository.audit(connection, {
      userId: actor.userId,
      settingId: current.id_configuracion,
      previousData: { clave: key, valor: current.valor },
      newData: { clave: key, valor: value },
      ipAddress: actor.ipAddress,
    });

    const updated = await settingRepository.findByKeyForUpdate(connection, key);
    await connection.commit();
    transactionStarted = false;

    return mapSetting(updated);
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        // El middleware global conserva una respuesta publica saneada.
      }
    }

    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { listSettings, updateSetting };
