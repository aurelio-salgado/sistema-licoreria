const express = require('express');
const multer = require('multer');
const authenticate = require('../../middlewares/authenticate');
const requirePermission = require('../../middlewares/requirePermission');
const productController = require('./product.controller');

const router = express.Router();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 2 * 1024 * 1024, fields: 0, parts: 2 },
});
function mapMulterError(error) {
  if (!(error instanceof multer.MulterError)) return { statusCode: 400, message: 'La solicitud de imagen no es válida' };
  const errors = {
    LIMIT_FILE_SIZE: { statusCode: 413, message: 'La imagen no puede superar 2 MB' },
    LIMIT_PART_COUNT: { statusCode: 400, message: 'La solicitud contiene demasiadas partes' },
    LIMIT_UNEXPECTED_FILE: { statusCode: 400, message: 'El campo de archivo no es válido' },
  };
  return errors[error.code] || { statusCode: 400, message: 'La solicitud de imagen no es válida' };
}
function receiveImage(req, res, next) {
  imageUpload.single('image')(req, res, (error) => {
    if (!error) return next();
    const mapped = mapMulterError(error);
    error.statusCode = mapped.statusCode;
    error.message = mapped.message;
    return next(error);
  });
}
router.use(authenticate);
router.get(
  '/',
  requirePermission('productos.ver'),
  productController.listProducts,
);
router.get(
  '/:id',
  requirePermission('productos.ver'),
  productController.getProduct,
);
router.post(
  '/',
  requirePermission('productos.crear'),
  productController.createProduct,
);
router.put(
  '/:id',
  requirePermission('productos.editar'),
  productController.updateProduct,
);
router.put(
  '/:id/image',
  requirePermission('productos.editar'),
  productController.validateProductImageTarget,
  receiveImage,
  productController.saveProductImage,
);
router.delete(
  '/:id/image',
  requirePermission('productos.editar'),
  productController.deleteProductImage,
);
router.patch(
  '/:id/status',
  requirePermission('productos.desactivar'),
  productController.changeProductStatus,
);

module.exports = router;
module.exports.mapMulterError = mapMulterError;
module.exports.receiveImage = receiveImage;
