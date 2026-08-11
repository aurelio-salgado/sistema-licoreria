const express = require('express');

const authenticate = require('../../middlewares/authenticate');
const requirePermission = require('../../middlewares/requirePermission');
const unitController = require('./unit.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('productos.ver'), unitController.listUnits);
router.get('/:id', requirePermission('productos.ver'), unitController.getUnit);
router.post(
  '/',
  requirePermission('productos.crear'),
  unitController.createUnit,
);
router.put(
  '/:id',
  requirePermission('productos.editar'),
  unitController.updateUnit,
);
router.patch(
  '/:id/status',
  requirePermission('productos.desactivar'),
  unitController.changeUnitStatus,
);

module.exports = router;
