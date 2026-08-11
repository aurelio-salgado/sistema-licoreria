const pool = require('../../config/database');
const productRepository = require('./product.repository');
const {
  validateId,
  validateListQuery,
  validateProductInput,
  validateStatusInput,
} = require('./product.validation');

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const productNotFoundError = () => httpError(404, 'Producto no encontrado');
const duplicateCodeError = () =>
  httpError(409, 'Ya existe un producto con ese código');
const duplicateBarcodeError = () =>
  httpError(409, 'Ya existe un producto con ese código de barras');
const duplicateProductError = () =>
  httpError(409, 'Ya existe un producto con ese código o código de barras');

function mapDatabaseError(error) {
  return error?.code === 'ER_DUP_ENTRY' ? duplicateProductError() : error;
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
        /* El error global se mantiene saneado. */
      }
    }
    throw mapDatabaseError(error);
  } finally {
    connection.release();
  }
}

async function validateCatalogs(connection, data) {
  const category = await productRepository.findCategory(
    connection,
    data.categoryId,
  );
  if (!category || category.estado !== 'activo') {
    throw httpError(400, 'La categoría seleccionada no existe o está inactiva');
  }
  const brand = await productRepository.findBrand(connection, data.brandId);
  if (!brand || brand.estado !== 'activo') {
    throw httpError(400, 'La marca seleccionada no existe o está inactiva');
  }
  const unit = await productRepository.findUnit(connection, data.unitId);
  if (!unit || unit.estado !== 'activo') {
    throw httpError(
      400,
      'La unidad de medida seleccionada no existe o está inactiva',
    );
  }
}

async function validateUniqueFields(
  connection,
  data,
  excludedProductId = null,
) {
  if (
    await productRepository.findByCode(connection, data.code, excludedProductId)
  ) {
    throw duplicateCodeError();
  }
  if (
    data.barcode &&
    (await productRepository.findByBarcode(
      connection,
      data.barcode,
      excludedProductId,
    ))
  ) {
    throw duplicateBarcodeError();
  }
}

async function listProducts(rawQuery) {
  const filters = validateListQuery(rawQuery);
  const [products, total] = await Promise.all([
    productRepository.list(pool, filters),
    productRepository.count(pool, filters),
  ]);
  return {
    products,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      total_pages: Math.ceil(total / filters.limit),
    },
  };
}

async function getProduct(rawId) {
  const product = await productRepository.findById(pool, validateId(rawId));
  if (!product) throw productNotFoundError();
  return product;
}

async function createProduct(rawData, actor) {
  const data = validateProductInput(rawData);
  return runTransaction(async (connection) => {
    await validateCatalogs(connection, data);
    await validateUniqueFields(connection, data);
    const productId = await productRepository.create(connection, data);
    const product = await productRepository.findById(connection, productId);
    await productRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'crear',
      productId,
      previousData: null,
      newData: product,
      ipAddress: actor.ipAddress,
    });
    return product;
  });
}

async function updateProduct(rawId, rawData, actor) {
  const productId = validateId(rawId);
  const data = validateProductInput(rawData);
  return runTransaction(async (connection) => {
    const currentProduct = await productRepository.findByIdForUpdate(
      connection,
      productId,
    );
    if (!currentProduct) throw productNotFoundError();
    await validateCatalogs(connection, data);
    await validateUniqueFields(connection, data, productId);
    await productRepository.update(connection, productId, data);
    const product = await productRepository.findById(connection, productId);
    await productRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'actualizar',
      productId,
      previousData: currentProduct,
      newData: product,
      ipAddress: actor.ipAddress,
    });
    return product;
  });
}

async function changeProductStatus(rawId, rawData, actor) {
  const productId = validateId(rawId);
  const { state } = validateStatusInput(rawData);
  return runTransaction(async (connection) => {
    const currentProduct = await productRepository.findByIdForUpdate(
      connection,
      productId,
    );
    if (!currentProduct) throw productNotFoundError();
    if (currentProduct.estado === state) return currentProduct;
    await productRepository.changeStatus(connection, productId, state);
    const product = await productRepository.findById(connection, productId);
    await productRepository.createAudit(connection, {
      userId: actor.userId,
      action: 'cambiar_estado',
      productId,
      previousData: currentProduct,
      newData: product,
      ipAddress: actor.ipAddress,
    });
    return product;
  });
}

module.exports = {
  changeProductStatus,
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
};
