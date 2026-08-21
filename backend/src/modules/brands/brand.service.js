const pool = require('../../config/database');
const brandRepository = require('./brand.repository');
const imageStorage = require('../products/product.image');
const env = require('../../config/env');
const {
  validateBrandInput,
  validateId,
  validateListQuery,
  validateStatusInput,
} = require('./brand.validation');

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function duplicateBrandError() {
  return httpError(409, 'Ya existe una marca con ese nombre');
}

function brandNotFoundError() {
  return httpError(404, 'Marca no encontrada');
}

function mapDatabaseError(error) {
  return error?.code === 'ER_DUP_ENTRY' ? duplicateBrandError() : error;
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

async function listBrands(rawQuery) {
  const filters = validateListQuery(rawQuery);
  const [brands, total] = await Promise.all([
    brandRepository.list(pool, filters),
    brandRepository.count(pool, filters),
  ]);

  return {
    brands,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      total_pages: Math.ceil(total / filters.limit),
    },
  };
}

async function getBrand(rawId) {
  const brandId = validateId(rawId);
  const brand = await brandRepository.findById(pool, brandId);

  if (!brand) {
    throw brandNotFoundError();
  }

  return brand;
}

async function createBrand(rawData, actor) {
  const data = validateBrandInput(rawData);

  return runTransaction(async (connection) => {
    const duplicate = await brandRepository.findByName(connection, data.name);

    if (duplicate) {
      throw duplicateBrandError();
    }

    const brandId = await brandRepository.create(connection, data);
    const brand = await brandRepository.findById(connection, brandId);

    await brandRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'crear',
      brandId,
      previousData: null,
      newData: brand,
      ipAddress: actor.ipAddress,
    });

    return brand;
  });
}

async function updateBrand(rawId, rawData, actor) {
  const brandId = validateId(rawId);
  const data = validateBrandInput(rawData);

  return runTransaction(async (connection) => {
    const currentBrand = await brandRepository.findByIdForUpdate(
      connection,
      brandId,
    );

    if (!currentBrand) {
      throw brandNotFoundError();
    }

    const duplicate = await brandRepository.findByName(
      connection,
      data.name,
      brandId,
    );

    if (duplicate) {
      throw duplicateBrandError();
    }

    await brandRepository.update(connection, brandId, data);
    const brand = await brandRepository.findById(connection, brandId);

    await brandRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'actualizar',
      brandId,
      previousData: currentBrand,
      newData: brand,
      ipAddress: actor.ipAddress,
    });

    return brand;
  });
}

async function changeBrandStatus(rawId, rawData, actor) {
  const brandId = validateId(rawId);
  const { state } = validateStatusInput(rawData);

  return runTransaction(async (connection) => {
    const currentBrand = await brandRepository.findByIdForUpdate(
      connection,
      brandId,
    );

    if (!currentBrand) {
      throw brandNotFoundError();
    }

    if (currentBrand.estado === state) {
      return currentBrand;
    }

    await brandRepository.changeStatus(connection, brandId, state);
    const brand = await brandRepository.findById(connection, brandId);

    await brandRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'cambiar_estado',
      brandId,
      previousData: currentBrand,
      newData: brand,
      ipAddress: actor.ipAddress,
    });

    return brand;
  });
}

async function saveBrandImage(rawId, file, actor) {
  const brandId = validateId(rawId);
  if (!(await brandRepository.findById(pool, brandId))) throw brandNotFoundError();
  imageStorage.validate(file);
  let newReference;
  try {
    newReference = await imageStorage.write(file, { storagePath: env.brandImages.storagePath });
    const result = await runTransaction(async (connection) => {
      const current = await brandRepository.findByIdForUpdate(connection, brandId);
      if (!current) throw brandNotFoundError();
      await brandRepository.updateImageReference(connection, brandId, newReference);
      await brandRepository.createAudit(connection, { userId: actor.userId, action: current.imagen_referencia ? 'reemplazar_imagen' : 'agregar_imagen', brandId, previousData: { imagen_referencia: current.imagen_referencia || null }, newData: { imagen_referencia: newReference }, ipAddress: actor.ipAddress });
      return { old: current.imagen_referencia, brand: await brandRepository.findById(connection, brandId) };
    });
    if (result.old) imageStorage.remove(result.old, { storagePath: env.brandImages.storagePath }).catch(() => {});
    return result.brand;
  } catch (error) {
    if (newReference) await imageStorage.remove(newReference, { storagePath: env.brandImages.storagePath }).catch(() => {});
    throw error;
  }
}

async function deleteBrandImage(rawId, actor) {
  const brandId = validateId(rawId);
  const result = await runTransaction(async (connection) => {
    const current = await brandRepository.findByIdForUpdate(connection, brandId);
    if (!current) throw brandNotFoundError();
    if (!current.imagen_referencia) return { old: null, brand: current };
    await brandRepository.updateImageReference(connection, brandId, null);
    await brandRepository.createAudit(connection, { userId: actor.userId, action: 'eliminar_imagen', brandId, previousData: { imagen_referencia: current.imagen_referencia }, newData: { imagen_referencia: null }, ipAddress: actor.ipAddress });
    return { old: current.imagen_referencia, brand: await brandRepository.findById(connection, brandId) };
  });
  if (result.old) imageStorage.remove(result.old, { storagePath: env.brandImages.storagePath }).catch(() => {});
  return result.brand;
}

module.exports = {
  changeBrandStatus,
  createBrand,
  deleteBrandImage,
  getBrand,
  listBrands,
  saveBrandImage,
  updateBrand,
};
