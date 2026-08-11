const express = require('express');

const authenticate = require('../../middlewares/authenticate');
const requirePermission = require('../../middlewares/requirePermission');
const brandController = require('./brand.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('productos.ver'), brandController.listBrands);
router.get(
  '/:id',
  requirePermission('productos.ver'),
  brandController.getBrand,
);
router.post(
  '/',
  requirePermission('productos.crear'),
  brandController.createBrand,
);
router.put(
  '/:id',
  requirePermission('productos.editar'),
  brandController.updateBrand,
);
router.patch(
  '/:id/status',
  requirePermission('productos.desactivar'),
  brandController.changeBrandStatus,
);

module.exports = router;
