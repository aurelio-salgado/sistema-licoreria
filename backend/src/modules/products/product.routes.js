const express = require('express');
const authenticate = require('../../middlewares/authenticate');
const requirePermission = require('../../middlewares/requirePermission');
const productController = require('./product.controller');

const router = express.Router();
router.use(authenticate);
router.get(
  '/',
  requirePermission('productos.ver'),
  productController.listProducts,
);
router.get(
  '/:id',
  requirePermission('productos.ver'),
  productController.getProduct,
);
router.post(
  '/',
  requirePermission('productos.crear'),
  productController.createProduct,
);
router.put(
  '/:id',
  requirePermission('productos.editar'),
  productController.updateProduct,
);
router.patch(
  '/:id/status',
  requirePermission('productos.desactivar'),
  productController.changeProductStatus,
);

module.exports = router;
