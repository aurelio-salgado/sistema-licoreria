const express = require('express');
const controller = require('./publicCatalog.controller');

const router = express.Router();
router.get('/brand-images/:filename', controller.brandImage);
router.get('/images/:filename', controller.image);
router.get('/', controller.list);

module.exports = router;
