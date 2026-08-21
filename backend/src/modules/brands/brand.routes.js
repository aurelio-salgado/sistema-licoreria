const express = require('express');
const multer = require('multer');

const authenticate = require('../../middlewares/authenticate');
const requirePermission = require('../../middlewares/requirePermission');
const brandController = require('./brand.controller');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: 2 * 1024 * 1024, fields: 0, parts: 2 } });
function receiveImage(req, res, next) { upload.single('image')(req, res, (error) => { if (!error) return next(); error.statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400; error.message = error.code === 'LIMIT_FILE_SIZE' ? 'La imagen no puede superar 2 MB' : 'La solicitud de imagen no es válida'; return next(error); }); }

router.use(authenticate);

router.get('/', requirePermission('productos.ver'), brandController.listBrands);
router.get(
  '/:id',
  requirePermission('productos.ver'),
  brandController.getBrand,
);
router.post(
  '/',
  requirePermission('productos.crear'),
  brandController.createBrand,
);
router.put(
  '/:id',
  requirePermission('productos.editar'),
  brandController.updateBrand,
);
router.put('/:id/image', requirePermission('productos.editar'), receiveImage, brandController.saveBrandImage);
router.delete('/:id/image', requirePermission('productos.editar'), brandController.deleteBrandImage);
router.patch(
  '/:id/status',
  requirePermission('productos.desactivar'),
  brandController.changeBrandStatus,
);

module.exports = router;
