const assert = require('node:assert/strict');
const test = require('node:test');
const categoryRepository = require('./categories/category.repository');
const brandRepository = require('./brands/brand.repository');
const unitRepository = require('./units/unit.repository');
const productRepository = require('./products/product.repository');

function captureListQuery(repository) {
  const calls = [];
  const executor = {
    async execute(sql, values) {
      calls.push({ sql, values });
      return [[]];
    },
  };

  return repository
    .list(executor, {
      page: 1,
      limit: 20,
      search: 'ron',
      status: null,
      categoryId: null,
      brandId: null,
    })
    .then(() => calls[0]);
}

test('categorías busca únicamente por nombre', async () => {
  const { sql, values } = await captureListQuery(categoryRepository);

  assert.match(sql, /WHERE nombre LIKE \?/);
  assert.doesNotMatch(sql, /descripcion LIKE/);
  assert.deepEqual(values, ['%ron%', 20, 0]);
});

test('marcas busca únicamente por nombre', async () => {
  const { sql, values } = await captureListQuery(brandRepository);

  assert.match(sql, /WHERE nombre LIKE \?/);
  assert.doesNotMatch(sql, /descripcion LIKE/);
  assert.deepEqual(values, ['%ron%', 20, 0]);
});

test('unidades conserva búsqueda por nombre o abreviatura', async () => {
  const { sql, values } = await captureListQuery(unitRepository);

  assert.match(sql, /nombre LIKE \? OR abreviatura LIKE \?/);
  assert.deepEqual(values, ['%ron%', '%ron%', 20, 0]);
});

test('productos conserva búsqueda por código, código de barras o nombre', async () => {
  const { sql, values } = await captureListQuery(productRepository);

  assert.match(
    sql,
    /p\.codigo LIKE \? OR p\.codigo_barras LIKE \? OR p\.nombre LIKE \?/,
  );
  assert.deepEqual(values, ['%ron%', '%ron%', '%ron%', 20, 0]);
});
