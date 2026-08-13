const express = require('express');

const authenticate = require('../../middlewares/authenticate');
const requirePermission = require('../../middlewares/requirePermission');
const auditController = require('./audit.controller');

const router = express.Router();

router.use(authenticate);
router.get('/', requirePermission('bitacora.ver'), auditController.listEvents);
router.get('/:id', requirePermission('bitacora.ver'), auditController.getEvent);

module.exports = router;
