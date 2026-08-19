const router = require('express').Router();
const authenticate = require('../../middlewares/authenticate');
const requirePermission = require('../../middlewares/requirePermission');
const controller = require('./dashboard.controller');
router.use(authenticate);
router.get('/charts', requirePermission('dashboard.graficos'), controller.charts);
router.get('/', requirePermission('dashboard.graficos'), controller.overview);
module.exports = router;
