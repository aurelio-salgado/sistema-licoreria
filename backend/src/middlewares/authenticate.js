const jwt = require('jsonwebtoken');

const env = require('../config/env');
const pool = require('../config/database');
const authRepository = require('../modules/auth/auth.repository');
const sessionEpoch = require('../services/sessionEpoch');

function rejectUnauthorized(res) {
  return res.status(401).json({
    success: false,
    message: 'No autorizado',
  });
}

async function authenticate(req, res, next) {
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
    const tokenSessionEpoch = payload?.session_epoch;

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      typeof username !== 'string' ||
      !username.trim() ||
      !Array.isArray(roles) ||
      !roles.every((role) => typeof role === 'string' && role.trim()) ||
      typeof tokenSessionEpoch !== 'string'
    ) {
      return rejectUnauthorized(res);
    }

    const currentSessionEpoch = await sessionEpoch.get(pool);
    if (tokenSessionEpoch !== currentSessionEpoch) return rejectUnauthorized(res);

    const user = await authRepository.findSessionUserById(pool, userId);

    if (!user || user.estado !== 'activo' || Boolean(user.esta_bloqueado)) {
      return rejectUnauthorized(res);
    }

    const [currentRoles, currentPermissions] = await Promise.all([
      authRepository.findRolesByUserId(pool, userId),
      authRepository.findPermissionsByUserId(pool, userId),
    ]);

    req.user = {
      id_usuario: userId,
      nombre_usuario: user.nombre_usuario,
      roles: currentRoles,
      permisos: currentPermissions,
    };

    return next();
  } catch (error) {
    if (!(error instanceof jwt.JsonWebTokenError)) return next(error);
    return rejectUnauthorized(res);
  }
}

module.exports = authenticate;
