const pool = require('../../config/database');
const supplierRepository = require('./supplier.repository');
const {
  validateId,
  validateListQuery,
  validateStatusInput,
  validateSupplierInput,
} = require('./supplier.validation');

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const supplierNotFoundError = () => httpError(404, 'Proveedor no encontrado');
const duplicateTaxIdentificationError = () =>
  httpError(409, 'Ya existe un proveedor con esa identificación fiscal');

function mapDatabaseError(error) {
  return error?.code === 'ER_DUP_ENTRY'
    ? duplicateTaxIdentificationError()
    : error;
}

function auditSnapshot(supplier) {
  return supplier
    ? {
        id_proveedor: supplier.id_proveedor,
        nombre: supplier.nombre,
        estado: supplier.estado,
      }
    : null;
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
        /* El middleware global conserva una respuesta pública saneada. */
      }
    }
    throw mapDatabaseError(error);
  } finally {
    connection.release();
  }
}

async function validateUniqueTaxIdentification(
  connection,
  taxIdentification,
  excludedSupplierId = null,
) {
  if (!taxIdentification) return;
  const duplicate = await supplierRepository.findByTaxIdentification(
    connection,
    taxIdentification,
    excludedSupplierId,
  );
  if (duplicate) throw duplicateTaxIdentificationError();
}

async function listSuppliers(rawQuery) {
  const filters = validateListQuery(rawQuery);
  const [suppliers, total] = await Promise.all([
    supplierRepository.list(pool, filters),
    supplierRepository.count(pool, filters),
  ]);
  return {
    suppliers,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      total_pages: Math.ceil(total / filters.limit),
    },
  };
}

async function getSupplier(rawId) {
  const supplier = await supplierRepository.findById(pool, validateId(rawId));
  if (!supplier) throw supplierNotFoundError();
  return supplier;
}

async function createSupplier(rawData, actor) {
  const data = validateSupplierInput(rawData);
  return runTransaction(async (connection) => {
    await validateUniqueTaxIdentification(connection, data.taxIdentification);
    const supplierId = await supplierRepository.create(connection, data);
    const supplier = await supplierRepository.findById(connection, supplierId);
    await supplierRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'crear',
      supplierId,
      previousData: null,
      newData: auditSnapshot(supplier),
      ipAddress: actor.ipAddress,
    });
    return supplier;
  });
}

async function updateSupplier(rawId, rawData, actor) {
  const supplierId = validateId(rawId);
  const data = validateSupplierInput(rawData);
  return runTransaction(async (connection) => {
    const currentSupplier = await supplierRepository.findByIdForUpdate(
      connection,
      supplierId,
    );
    if (!currentSupplier) throw supplierNotFoundError();
    await validateUniqueTaxIdentification(
      connection,
      data.taxIdentification,
      supplierId,
    );
    await supplierRepository.update(connection, supplierId, data);
    const supplier = await supplierRepository.findById(connection, supplierId);
    await supplierRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'actualizar',
      supplierId,
      previousData: auditSnapshot(currentSupplier),
      newData: auditSnapshot(supplier),
      ipAddress: actor.ipAddress,
    });
    return supplier;
  });
}

async function changeSupplierStatus(rawId, rawData, actor) {
  const supplierId = validateId(rawId);
  const { state } = validateStatusInput(rawData);
  return runTransaction(async (connection) => {
    const currentSupplier = await supplierRepository.findByIdForUpdate(
      connection,
      supplierId,
    );
    if (!currentSupplier) throw supplierNotFoundError();
    if (currentSupplier.estado === state) return currentSupplier;
    await supplierRepository.changeStatus(connection, supplierId, state);
    const supplier = await supplierRepository.findById(connection, supplierId);
    await supplierRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'cambiar_estado',
      supplierId,
      previousData: auditSnapshot(currentSupplier),
      newData: auditSnapshot(supplier),
      ipAddress: actor.ipAddress,
    });
    return supplier;
  });
}

module.exports = {
  changeSupplierStatus,
  createSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
};
