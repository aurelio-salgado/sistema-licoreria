const express = require('express');

const authenticate = require('../../middlewares/authenticate');
const requirePermission = require('../../middlewares/requirePermission');
const categoryController = require('./category.controller');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission('productos.ver'),
  categoryController.listCategories,
);
router.get(
  '/:id',
  requirePermission('productos.ver'),
  categoryController.getCategory,
);
router.post(
  '/',
  requirePermission('productos.crear'),
  categoryController.createCategory,
);
router.put(
  '/:id',
  requirePermission('productos.editar'),
  categoryController.updateCategory,
);
router.patch(
  '/:id/status',
  requirePermission('productos.desactivar'),
  categoryController.changeCategoryStatus,
);

module.exports = router;
