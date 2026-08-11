const express = require('express');
const authenticate = require('../../middlewares/authenticate');
const requirePermission = require('../../middlewares/requirePermission');
const purchaseController = require('./purchase.controller');

const router = express.Router();
router.use(authenticate);
router.get(
  '/',
  requirePermission('compras.ver'),
  purchaseController.listPurchases,
);
router.get(
  '/:id',
  requirePermission('compras.ver'),
  purchaseController.getPurchase,
);
router.post(
  '/',
  requirePermission('compras.crear'),
  purchaseController.createPurchase,
);
router.post(
  '/:id/confirm',
  requirePermission('compras.confirmar'),
  purchaseController.confirmPurchase,
);
router.post(
  '/:id/cancel',
  requirePermission('compras.anular'),
  purchaseController.cancelPurchase,
);
router.put(
  '/:id',
  requirePermission('compras.crear'),
  purchaseController.updatePurchase,
);
router.post(
  '/:id/items',
  requirePermission('compras.crear'),
  purchaseController.addItem,
);
router.put(
  '/:id/items/:itemId',
  requirePermission('compras.crear'),
  purchaseController.updateItem,
);
router.delete(
  '/:id/items/:itemId',
  requirePermission('compras.crear'),
  purchaseController.removeItem,
);

module.exports = router;
