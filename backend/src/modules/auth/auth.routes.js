const express = require('express');

const authenticate = require('../../middlewares/authenticate');
const requirePermission = require('../../middlewares/requirePermission');
const { checkPermission, getCurrentUser, login } = require('./auth.controller');

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);
router.get(
  '/check-permission',
  authenticate,
  requirePermission('dashboard.ver'),
  checkPermission,
);

module.exports = router;
