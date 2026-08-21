const PRODUCT_COLUMNS = `
  p.id_producto, p.codigo, p.codigo_barras, p.nombre, p.descripcion,
  p.imagen_referencia,
  p.costo_promedio, p.precio_venta, p.existencia, p.existencia_minima,
  p.porcentaje_impuesto, p.estado, p.creado_en, p.actualizado_en,
  c.id_categoria, c.nombre AS categoria_nombre,
  m.id_marca, m.nombre AS marca_nombre,
  u.id_unidad, u.nombre AS unidad_nombre, u.abreviatura AS unidad_abreviatura,
  u.permite_decimales
`;

const PRODUCT_JOINS = `
  INNER JOIN categorias c ON c.id_categoria = p.id_categoria
  INNER JOIN marcas m ON m.id_marca = p.id_marca
  INNER JOIN unidades_medida u ON u.id_unidad = p.id_unidad
`;

function normalizeProduct(row) {
  if (!row) return null;
  const {
    id_categoria: categoryId,
    categoria_nombre: categoryName,
    id_marca: brandId,
    marca_nombre: brandName,
    id_unidad: unitId,
    unidad_nombre: unitName,
    unidad_abreviatura: abbreviation,
    permite_decimales: allowsDecimals,
    ...product
  } = row;
  return {
    ...product,
    categoria: { id_categoria: categoryId, nombre: categoryName },
    marca: { id_marca: brandId, nombre: brandName },
    unidad: {
      id_unidad: unitId,
      nombre: unitName,
      abreviatura: abbreviation,
      permite_decimales: Boolean(allowsDecimals),
    },
  };
}

function buildListFilters({ search, status, categoryId, brandId }) {
  const conditions = [];
  const values = [];
  if (search) {
    conditions.push(
      '(p.codigo LIKE ? OR p.codigo_barras LIKE ? OR p.nombre LIKE ?)',
    );
    const pattern = `%${search}%`;
    values.push(pattern, pattern, pattern);
  }
  if (status) {
    conditions.push('p.estado = ?');
    values.push(status);
  }
  if (categoryId) {
    conditions.push('p.id_categoria = ?');
    values.push(categoryId);
  }
  if (brandId) {
    conditions.push('p.id_marca = ?');
    values.push(brandId);
  }
  return {
    clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

async function list(executor, filters) {
  const { clause, values } = buildListFilters(filters);
  const [rows] = await executor.execute(
    `SELECT ${PRODUCT_COLUMNS} FROM productos p ${PRODUCT_JOINS} ${clause}
     ORDER BY p.nombre, p.id_producto LIMIT ? OFFSET ?`,
    [...values, filters.limit, (filters.page - 1) * filters.limit],
  );
  return rows.map(normalizeProduct);
}

async function count(executor, filters) {
  const { clause, values } = buildListFilters(filters);
  const [[result]] = await executor.execute(
    `SELECT COUNT(*) AS total FROM productos p ${clause}`,
    values,
  );
  return Number(result.total);
}

async function findById(executor, productId) {
  const [rows] = await executor.execute(
    `SELECT ${PRODUCT_COLUMNS} FROM productos p ${PRODUCT_JOINS}
     WHERE p.id_producto = ? LIMIT 1`,
    [productId],
  );
  return normalizeProduct(rows[0]);
}

async function findByIdForUpdate(connection, productId) {
  const [rows] = await connection.execute(
    `SELECT ${PRODUCT_COLUMNS} FROM productos p ${PRODUCT_JOINS}
     WHERE p.id_producto = ? LIMIT 1 FOR UPDATE`,
    [productId],
  );
  return normalizeProduct(rows[0]);
}

async function findByCode(executor, value, excludedProductId = null) {
  const [rows] = await executor.execute(
    `SELECT id_producto FROM productos WHERE codigo = ?
     AND (? IS NULL OR id_producto <> ?) LIMIT 1`,
    [value, excludedProductId, excludedProductId],
  );
  return rows[0] || null;
}

async function findByBarcode(executor, value, excludedProductId = null) {
  const [rows] = await executor.execute(
    `SELECT id_producto FROM productos WHERE codigo_barras = ?
     AND (? IS NULL OR id_producto <> ?) LIMIT 1`,
    [value, excludedProductId, excludedProductId],
  );
  return rows[0] || null;
}

async function findCategory(connection, id) {
  const [rows] = await connection.execute(
    'SELECT id_categoria, estado FROM categorias WHERE id_categoria = ? LIMIT 1 FOR UPDATE',
    [id],
  );
  return rows[0] || null;
}

async function findBrand(connection, id) {
  const [rows] = await connection.execute(
    'SELECT id_marca, estado FROM marcas WHERE id_marca = ? LIMIT 1 FOR UPDATE',
    [id],
  );
  return rows[0] || null;
}

async function findUnit(connection, id) {
  const [rows] = await connection.execute(
    'SELECT id_unidad, estado FROM unidades_medida WHERE id_unidad = ? LIMIT 1 FOR UPDATE',
    [id],
  );
  return rows[0] || null;
}

async function create(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO productos (
       codigo, codigo_barras, nombre, descripcion, id_categoria, id_marca,
       id_unidad, costo_promedio, precio_venta, existencia_minima,
       porcentaje_impuesto, estado
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.code,
      data.barcode,
      data.name,
      data.description,
      data.categoryId,
      data.brandId,
      data.unitId,
      data.averageCost,
      data.salePrice,
      data.minimumStock,
      data.taxPercentage,
      'activo',
    ],
  );
  return result.insertId;
}

async function update(connection, productId, data) {
  await connection.execute(
    `UPDATE productos SET codigo = ?, codigo_barras = ?, nombre = ?,
       descripcion = ?, id_categoria = ?, id_marca = ?, id_unidad = ?,
       costo_promedio = ?, precio_venta = ?, existencia_minima = ?,
       porcentaje_impuesto = ? WHERE id_producto = ?`,
    [
      data.code,
      data.barcode,
      data.name,
      data.description,
      data.categoryId,
      data.brandId,
      data.unitId,
      data.averageCost,
      data.salePrice,
      data.minimumStock,
      data.taxPercentage,
      productId,
    ],
  );
}

async function changeStatus(connection, productId, state) {
  await connection.execute(
    'UPDATE productos SET estado = ? WHERE id_producto = ?',
    [state, productId],
  );
}

async function updateImageReference(connection, productId, reference) {
  await connection.execute(
    'UPDATE productos SET imagen_referencia = ? WHERE id_producto = ?',
    [reference, productId],
  );
}

async function createAudit(connection, data) {
  await connection.execute(
    `INSERT INTO bitacora (
       id_usuario, modulo, accion, entidad, id_entidad, datos_anteriores,
       datos_nuevos, direccion_ip, resultado, fecha_evento
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.userId,
      'productos',
      data.action,
      'productos',
      data.productId,
      data.previousData ? JSON.stringify(data.previousData) : null,
      data.newData ? JSON.stringify(data.newData) : null,
      data.ipAddress || null,
      'exitoso',
    ],
  );
}

module.exports = {
  changeStatus,
  count,
  create,
  createAudit,
  findBrand,
  findByBarcode,
  findByCode,
  findById,
  findByIdForUpdate,
  findCategory,
  findUnit,
  list,
  update,
  updateImageReference,
};
