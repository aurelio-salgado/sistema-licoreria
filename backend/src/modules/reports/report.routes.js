const router=require('express').Router(),authenticate=require('../../middlewares/authenticate'),requirePermission=require('../../middlewares/requirePermission'),controller=require('./report.controller');
router.use(authenticate);
router.get('/:type/export',requirePermission('reportes.ver'),requirePermission('reportes.exportar'),controller.exportReport);
router.get('/:type',requirePermission('reportes.ver'),controller.get);
module.exports=router;
