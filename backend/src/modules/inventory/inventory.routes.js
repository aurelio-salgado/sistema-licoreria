const express = require('express'),
  authenticate = require('../../middlewares/authenticate'),
  requirePermission = require('../../middlewares/requirePermission'),
  controller = require('./inventory.controller');
const router = express.Router();
router.use(authenticate);
router.get(
  '/movements',
  requirePermission('inventario.ver'),
  controller.movements,
);
router.get('/low-stock', requirePermission('inventario.ver'), controller.low);
router.post(
  '/adjustments',
  requirePermission('inventario.ajustar'),
  controller.adjust,
);
router.get('/', requirePermission('inventario.ver'), controller.list);
module.exports = router;
