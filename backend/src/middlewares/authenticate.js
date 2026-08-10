const jwt = require('jsonwebtoken');

const env = require('../config/env');

function rejectUnauthorized(res) {
  return res.status(401).json({
    success: false,
    message: 'No autorizado',
  });
}

function authenticate(req, res, next) {
  const authorization = req.get('authorization');

  if (!authorization) {
    return rejectUnauthorized(res);
  }

  const parts = authorization.trim().split(/\s+/);

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    return rejectUnauthorized(res);
  }

  let jwtConfig;

  try {
    jwtConfig = env.getJwtConfig();
  } catch (error) {
    return next(error);
  }

  try {
    const payload = jwt.verify(parts[1], jwtConfig.secret);
    const userId = Number(payload?.sub);
    const username = payload?.nombre_usuario;
    const roles = payload?.roles;

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      typeof username !== 'string' ||
      !username.trim() ||
      !Array.isArray(roles) ||
      !roles.every((role) => typeof role === 'string' && role.trim())
    ) {
      return rejectUnauthorized(res);
    }

    req.user = {
      id_usuario: userId,
      nombre_usuario: username,
      roles: [...roles],
    };

    return next();
  } catch {
    return rejectUnauthorized(res);
  }
}

module.exports = authenticate;
