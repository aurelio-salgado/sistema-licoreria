const express = require('express');

const authenticate = require('../../middlewares/authenticate');
const { getCurrentUser, login } = require('./auth.controller');

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);

module.exports = router;
