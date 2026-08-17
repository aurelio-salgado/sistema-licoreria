const express = require('express'),
  authenticate = require('../../middlewares/authenticate'),
  requirePermission = require('../../middlewares/requirePermission'),
  controller = require('./sale.controller');
const router = express.Router();
router.use(authenticate);
router.get('/', requirePermission('ventas.ver'), controller.listSales);
router.get(
  '/payment-methods',
  requirePermission('ventas.crear'),
  controller.listPaymentMethods,
);
router.get('/:id', requirePermission('ventas.ver'), controller.getSale);
router.post('/', requirePermission('ventas.crear'), controller.createSale);
router.post(
  '/:id/confirm',
  requirePermission('ventas.crear'),
  controller.confirmSale,
);
router.post(
  '/:id/cancel',
  requirePermission('ventas.anular'),
  controller.cancelSale,
);
router.put('/:id', requirePermission('ventas.crear'), controller.updateSale);
router.post(
  '/:id/items',
  requirePermission('ventas.crear'),
  controller.addItem,
);
router.put(
  '/:id/items/:itemId',
  requirePermission('ventas.crear'),
  controller.updateItem,
);
router.delete(
  '/:id/items/:itemId',
  requirePermission('ventas.crear'),
  controller.removeItem,
);
module.exports = router;
