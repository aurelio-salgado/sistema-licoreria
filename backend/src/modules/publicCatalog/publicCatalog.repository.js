function where({ search, categoryId, brandId }) {
  const conditions = ["p.estado = 'activo'", "c.estado = 'activo'", "m.estado = 'activo'"];
  const values = [];
  if (search) { conditions.push('p.nombre LIKE ?'); values.push(`%${search}%`); }
  if (categoryId) { conditions.push('p.id_categoria = ?'); values.push(categoryId); }
  if (brandId) { conditions.push('p.id_marca = ?'); values.push(brandId); }
  return { clause: `WHERE ${conditions.join(' AND ')}`, values };
}

const JOINS = `INNER JOIN categorias c ON c.id_categoria=p.id_categoria
  INNER JOIN marcas m ON m.id_marca=p.id_marca`;

async function list(executor, filters) {
  const applied = where(filters);
  const [rows] = await executor.execute(
    `SELECT p.id_producto,p.nombre,p.precio_venta,p.imagen_referencia,
      (p.existencia>0) disponible,c.id_categoria,c.nombre categoria_nombre,
      m.id_marca,m.nombre marca_nombre
     FROM productos p ${JOINS} ${applied.clause}
     ORDER BY p.nombre,p.id_producto LIMIT ? OFFSET ?`,
    [...applied.values, filters.limit, (filters.page - 1) * filters.limit],
  );
  return rows;
}

async function count(executor, filters) {
  const applied = where(filters);
  const [[row]] = await executor.execute(
    `SELECT COUNT(*) total FROM productos p ${JOINS} ${applied.clause}`,
    applied.values,
  );
  return Number(row.total);
}

async function facets(executor) {
  const [categories, brands] = await Promise.all([
    executor.execute(`SELECT DISTINCT c.id_categoria,c.nombre FROM categorias c
      INNER JOIN productos p ON p.id_categoria=c.id_categoria
      INNER JOIN marcas m ON m.id_marca=p.id_marca
      WHERE c.estado='activo' AND m.estado='activo' AND p.estado='activo'
      ORDER BY c.nombre,c.id_categoria`),
    executor.execute(`SELECT DISTINCT m.id_marca,m.nombre,m.imagen_referencia FROM marcas m
      INNER JOIN productos p ON p.id_marca=m.id_marca
      INNER JOIN categorias c ON c.id_categoria=p.id_categoria
      WHERE m.estado='activo' AND c.estado='activo' AND p.estado='activo'
      ORDER BY m.nombre,m.id_marca`),
  ]);
  return { categories: categories[0], brands: brands[0] };
}

module.exports = { count, facets, list };
