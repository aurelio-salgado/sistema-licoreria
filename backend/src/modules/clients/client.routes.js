const express = require('express');
const authenticate = require('../../middlewares/authenticate');
const requirePermission = require('../../middlewares/requirePermission');
const clientController = require('./client.controller');

const router = express.Router();
router.use(authenticate);
router.get(
  '/',
  requirePermission('clientes.ver'),
  clientController.listClients,
);
router.get(
  '/:id',
  requirePermission('clientes.ver'),
  clientController.getClient,
);
router.post(
  '/',
  requirePermission('clientes.crear'),
  clientController.createClient,
);
router.put(
  '/:id',
  requirePermission('clientes.editar'),
  clientController.updateClient,
);
router.patch(
  '/:id/status',
  requirePermission('clientes.editar'),
  clientController.changeClientStatus,
);

module.exports = router;
