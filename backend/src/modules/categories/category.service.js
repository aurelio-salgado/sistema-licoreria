const pool = require('../../config/database');
const categoryRepository = require('./category.repository');
const {
  validateCategoryInput,
  validateId,
  validateListQuery,
  validateStatusInput,
} = require('./category.validation');

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function duplicateCategoryError() {
  return httpError(409, 'Ya existe una categoría con ese nombre');
}

function categoryNotFoundError() {
  return httpError(404, 'Categoría no encontrada');
}

function mapDatabaseError(error) {
  return error?.code === 'ER_DUP_ENTRY' ? duplicateCategoryError() : error;
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

async function listCategories(rawQuery) {
  const filters = validateListQuery(rawQuery);
  const [categories, total] = await Promise.all([
    categoryRepository.list(pool, filters),
    categoryRepository.count(pool, filters),
  ]);

  return {
    categories,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      total_pages: Math.ceil(total / filters.limit),
    },
  };
}

async function getCategory(rawId) {
  const categoryId = validateId(rawId);
  const category = await categoryRepository.findById(pool, categoryId);

  if (!category) {
    throw categoryNotFoundError();
  }

  return category;
}

async function createCategory(rawData, actor) {
  const data = validateCategoryInput(rawData);

  return runTransaction(async (connection) => {
    const duplicate = await categoryRepository.findByName(
      connection,
      data.name,
    );

    if (duplicate) {
      throw duplicateCategoryError();
    }

    const categoryId = await categoryRepository.create(connection, data);
    const category = await categoryRepository.findById(connection, categoryId);

    await categoryRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'crear',
      categoryId,
      previousData: null,
      newData: category,
      ipAddress: actor.ipAddress,
    });

    return category;
  });
}

async function updateCategory(rawId, rawData, actor) {
  const categoryId = validateId(rawId);
  const data = validateCategoryInput(rawData);

  return runTransaction(async (connection) => {
    const currentCategory = await categoryRepository.findByIdForUpdate(
      connection,
      categoryId,
    );

    if (!currentCategory) {
      throw categoryNotFoundError();
    }

    const duplicate = await categoryRepository.findByName(
      connection,
      data.name,
      categoryId,
    );

    if (duplicate) {
      throw duplicateCategoryError();
    }

    await categoryRepository.update(connection, categoryId, data);
    const category = await categoryRepository.findById(connection, categoryId);

    await categoryRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'actualizar',
      categoryId,
      previousData: currentCategory,
      newData: category,
      ipAddress: actor.ipAddress,
    });

    return category;
  });
}

async function changeCategoryStatus(rawId, rawData, actor) {
  const categoryId = validateId(rawId);
  const { state } = validateStatusInput(rawData);

  return runTransaction(async (connection) => {
    const currentCategory = await categoryRepository.findByIdForUpdate(
      connection,
      categoryId,
    );

    if (!currentCategory) {
      throw categoryNotFoundError();
    }

    if (currentCategory.estado === state) {
      return currentCategory;
    }

    await categoryRepository.changeStatus(connection, categoryId, state);
    const category = await categoryRepository.findById(connection, categoryId);

    await categoryRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'cambiar_estado',
      categoryId,
      previousData: currentCategory,
      newData: category,
      ipAddress: actor.ipAddress,
    });

    return category;
  });
}

module.exports = {
  changeCategoryStatus,
  createCategory,
  getCategory,
  listCategories,
  updateCategory,
};
