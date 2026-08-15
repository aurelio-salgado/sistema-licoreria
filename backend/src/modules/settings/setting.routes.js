const express = require('express');

const authenticate = require('../../middlewares/authenticate');
const requirePermission = require('../../middlewares/requirePermission');
const settingController = require('./setting.controller');

const router = express.Router();

router.use(authenticate);
router.get(
  '/',
  requirePermission('configuracion.ver'),
  settingController.listSettings,
);
router.put(
  '/:key',
  requirePermission('configuracion.editar'),
  settingController.updateSetting,
);

module.exports = router;
