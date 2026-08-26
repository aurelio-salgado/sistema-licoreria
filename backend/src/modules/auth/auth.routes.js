const express = require('express');

const authenticate = require('../../middlewares/authenticate');
const { getCurrentUser, login, logout } = require('./auth.controller');

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);

module.exports = router;
