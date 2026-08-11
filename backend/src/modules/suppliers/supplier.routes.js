const express = require('express');
const authenticate = require('../../middlewares/authenticate');
const requirePermission = require('../../middlewares/requirePermission');
const supplierController = require('./supplier.controller');

const router = express.Router();
router.use(authenticate);
router.get(
  '/',
  requirePermission('proveedores.ver'),
  supplierController.listSuppliers,
);
router.get(
  '/:id',
  requirePermission('proveedores.ver'),
  supplierController.getSupplier,
);
router.post(
  '/',
  requirePermission('proveedores.crear'),
  supplierController.createSupplier,
);
router.put(
  '/:id',
  requirePermission('proveedores.editar'),
  supplierController.updateSupplier,
);
router.patch(
  '/:id/status',
  requirePermission('proveedores.editar'),
  supplierController.changeSupplierStatus,
);

module.exports = router;
