const pool = require('../../config/database');
const unitRepository = require('./unit.repository');
const {
  validateId,
  validateListQuery,
  validateStatusInput,
  validateUnitInput,
} = require('./unit.validation');

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function duplicateNameError() {
  return httpError(409, 'Ya existe una unidad con ese nombre');
}

function duplicateAbbreviationError() {
  return httpError(409, 'Ya existe una unidad con esa abreviatura');
}

function duplicateUnitError() {
  return httpError(409, 'Ya existe una unidad con ese nombre o abreviatura');
}

function unitNotFoundError() {
  return httpError(404, 'Unidad de medida no encontrada');
}

function mapDatabaseError(error) {
  return error?.code === 'ER_DUP_ENTRY' ? duplicateUnitError() : error;
}

async function runTransaction(operation) {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const result = await operation(connection);
    await connection.commit();
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        // El middleware global conserva una respuesta pública saneada.
      }
    }

    throw mapDatabaseError(error);
  } finally {
    connection.release();
  }
}

async function validateUniqueFields(connection, data, excludedUnitId = null) {
  const duplicateName = await unitRepository.findByName(
    connection,
    data.name,
    excludedUnitId,
  );

  if (duplicateName) {
    throw duplicateNameError();
  }

  const duplicateAbbreviation = await unitRepository.findByAbbreviation(
    connection,
    data.abbreviation,
    excludedUnitId,
  );

  if (duplicateAbbreviation) {
    throw duplicateAbbreviationError();
  }
}

async function listUnits(rawQuery) {
  const filters = validateListQuery(rawQuery);
  const [units, total] = await Promise.all([
    unitRepository.list(pool, filters),
    unitRepository.count(pool, filters),
  ]);

  return {
    units,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      total_pages: Math.ceil(total / filters.limit),
    },
  };
}

async function getUnit(rawId) {
  const unitId = validateId(rawId);
  const unit = await unitRepository.findById(pool, unitId);

  if (!unit) {
    throw unitNotFoundError();
  }

  return unit;
}

async function createUnit(rawData, actor) {
  const data = validateUnitInput(rawData);

  return runTransaction(async (connection) => {
    await validateUniqueFields(connection, data);
    const unitId = await unitRepository.create(connection, data);
    const unit = await unitRepository.findById(connection, unitId);

    await unitRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'crear',
      unitId,
      previousData: null,
      newData: unit,
      ipAddress: actor.ipAddress,
    });

    return unit;
  });
}

async function updateUnit(rawId, rawData, actor) {
  const unitId = validateId(rawId);
  const data = validateUnitInput(rawData);

  return runTransaction(async (connection) => {
    const currentUnit = await unitRepository.findByIdForUpdate(
      connection,
      unitId,
    );

    if (!currentUnit) {
      throw unitNotFoundError();
    }

    await validateUniqueFields(connection, data, unitId);
    await unitRepository.update(connection, unitId, data);
    const unit = await unitRepository.findById(connection, unitId);

    await unitRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'actualizar',
      unitId,
      previousData: currentUnit,
      newData: unit,
      ipAddress: actor.ipAddress,
    });

    return unit;
  });
}

async function changeUnitStatus(rawId, rawData, actor) {
  const unitId = validateId(rawId);
  const { state } = validateStatusInput(rawData);

  return runTransaction(async (connection) => {
    const currentUnit = await unitRepository.findByIdForUpdate(
      connection,
      unitId,
    );

    if (!currentUnit) {
      throw unitNotFoundError();
    }

    if (currentUnit.estado === state) {
      return currentUnit;
    }

    await unitRepository.changeStatus(connection, unitId, state);
    const unit = await unitRepository.findById(connection, unitId);

    await unitRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'cambiar_estado',
      unitId,
      previousData: currentUnit,
      newData: unit,
      ipAddress: actor.ipAddress,
    });

    return unit;
  });
}

module.exports = {
  changeUnitStatus,
  createUnit,
  getUnit,
  listUnits,
  updateUnit,
};
