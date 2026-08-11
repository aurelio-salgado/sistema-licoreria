const productService = require('./product.service');

function getActor(req) {
  return { userId: req.user.id_usuario, ipAddress: req.ip };
}

async function listProducts(req, res, next) {
  try {
    const data = await productService.listProducts(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await productService.getProduct(req.params.id);
    res.status(200).json({ success: true, data: { product } });
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.body, getActor(req));
    res.status(201).json({ success: true, data: { product } });
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const product = await productService.updateProduct(
      req.params.id,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { product } });
  } catch (error) {
    next(error);
  }
}

async function changeProductStatus(req, res, next) {
  try {
    const product = await productService.changeProductStatus(
      req.params.id,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { product } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  changeProductStatus,
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
};
