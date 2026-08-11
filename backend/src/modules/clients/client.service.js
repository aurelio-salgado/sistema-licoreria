const pool = require('../../config/database');
const clientRepository = require('./client.repository');
const {
  validateClientInput,
  validateId,
  validateListQuery,
  validateStatusInput,
} = require('./client.validation');

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const clientNotFoundError = () => httpError(404, 'Cliente no encontrado');
const duplicateIdentificationError = () =>
  httpError(409, 'Ya existe un cliente con esa identificación');
const protectedFinalConsumerError = () =>
  httpError(
    400,
    'El cliente Consumidor final no puede modificarse ni desactivarse',
  );

function mapDatabaseError(error) {
  return error?.code === 'ER_DUP_ENTRY'
    ? duplicateIdentificationError()
    : error;
}

function auditSnapshot(client) {
  return client
    ? {
        id_cliente: client.id_cliente,
        nombre: client.nombre,
        es_consumidor_final: client.es_consumidor_final,
        estado: client.estado,
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

async function ensureFinalConsumer(connection) {
  const finalConsumer =
    await clientRepository.findFinalConsumerForUpdate(connection);
  if (!finalConsumer || finalConsumer.estado !== 'activo') {
    throw httpError(409, 'El cliente Consumidor final no está disponible');
  }
  return finalConsumer;
}

async function validateUniqueIdentification(
  connection,
  identification,
  excludedClientId = null,
) {
  if (!identification) return;
  const duplicate = await clientRepository.findByIdentification(
    connection,
    identification,
    excludedClientId,
  );
  if (duplicate) throw duplicateIdentificationError();
}

async function listClients(rawQuery) {
  const filters = validateListQuery(rawQuery);
  const [clients, total] = await Promise.all([
    clientRepository.list(pool, filters),
    clientRepository.count(pool, filters),
  ]);
  return {
    clients,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      total_pages: Math.ceil(total / filters.limit),
    },
  };
}

async function getClient(rawId) {
  const client = await clientRepository.findById(pool, validateId(rawId));
  if (!client) throw clientNotFoundError();
  return client;
}

async function createClient(rawData, actor) {
  const data = validateClientInput(rawData);
  return runTransaction(async (connection) => {
    await ensureFinalConsumer(connection);
    await validateUniqueIdentification(connection, data.identification);
    const clientId = await clientRepository.create(connection, data);
    const client = await clientRepository.findById(connection, clientId);
    await clientRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'crear',
      clientId,
      previousData: null,
      newData: auditSnapshot(client),
      ipAddress: actor.ipAddress,
    });
    return client;
  });
}

async function updateClient(rawId, rawData, actor) {
  const clientId = validateId(rawId);
  const data = validateClientInput(rawData);
  return runTransaction(async (connection) => {
    await ensureFinalConsumer(connection);
    const currentClient = await clientRepository.findByIdForUpdate(
      connection,
      clientId,
    );
    if (!currentClient) throw clientNotFoundError();
    if (currentClient.es_consumidor_final) throw protectedFinalConsumerError();
    await validateUniqueIdentification(
      connection,
      data.identification,
      clientId,
    );
    await clientRepository.update(connection, clientId, data);
    const client = await clientRepository.findById(connection, clientId);
    await clientRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'actualizar',
      clientId,
      previousData: auditSnapshot(currentClient),
      newData: auditSnapshot(client),
      ipAddress: actor.ipAddress,
    });
    return client;
  });
}

async function changeClientStatus(rawId, rawData, actor) {
  const clientId = validateId(rawId);
  const { state } = validateStatusInput(rawData);
  return runTransaction(async (connection) => {
    await ensureFinalConsumer(connection);
    const currentClient = await clientRepository.findByIdForUpdate(
      connection,
      clientId,
    );
    if (!currentClient) throw clientNotFoundError();
    if (currentClient.es_consumidor_final) throw protectedFinalConsumerError();
    if (currentClient.estado === state) return currentClient;
    await clientRepository.changeStatus(connection, clientId, state);
    const client = await clientRepository.findById(connection, clientId);
    await clientRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'cambiar_estado',
      clientId,
      previousData: auditSnapshot(currentClient),
      newData: auditSnapshot(client),
      ipAddress: actor.ipAddress,
    });
    return client;
  });
}

module.exports = {
  changeClientStatus,
  createClient,
  getClient,
  listClients,
  updateClient,
};
