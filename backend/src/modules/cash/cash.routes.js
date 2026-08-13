const express = require('express');
const authenticate = require('../../middlewares/authenticate');
const requirePermission = require('../../middlewares/requirePermission');
const cashController = require('./cash.controller');

const router = express.Router();
router.use(authenticate);
router.post('/open', requirePermission('caja.abrir'), cashController.openCash);
router.get(
  '/current',
  requirePermission('caja.movimientos'),
  cashController.getCurrentCash,
);
router.get('/', requirePermission('caja.movimientos'), cashController.listCash);
router.get(
  '/:id',
  requirePermission('caja.movimientos'),
  cashController.getCash,
);
router.post(
  '/:id/movements',
  requirePermission('caja.movimientos'),
  cashController.createMovement,
);
router.post(
  '/:id/close',
  requirePermission('caja.cerrar'),
  cashController.closeCash,
);

module.exports = router;
