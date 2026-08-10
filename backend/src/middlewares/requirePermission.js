const pool = require('../config/database');

function rejectUnauthorized(res) {
  return res.status(401).json({
    success: false,
    message: 'No autorizado',
  });
}

function rejectForbidden(res) {
  return res.status(403).json({
    success: false,
    message: 'Acceso denegado',
  });
}

function normalizePermissionCodes(inputs) {
  const codes = inputs.flatMap((input) =>
    Array.isArray(input) ? input : [input],
  );

  if (
    codes.length === 0 ||
    codes.some((code) => typeof code !== 'string' || !code.trim())
  ) {
    throw new TypeError('Se requiere al menos un código de permiso válido');
  }

  return [...new Set(codes.map((code) => code.trim()))];
}

function requirePermission(...permissionInputs) {
  const requiredCodes = normalizePermissionCodes(permissionInputs);

  return async function permissionMiddleware(req, res, next) {
    const userId = req.user?.id_usuario;

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return rejectUnauthorized(res);
    }

    try {
      const [permissions] = await pool.execute(
        `SELECT DISTINCT p.codigo
         FROM usuarios AS u
         INNER JOIN usuario_roles AS ur ON ur.id_usuario = u.id_usuario
         INNER JOIN roles AS r ON r.id_rol = ur.id_rol
         INNER JOIN rol_permisos AS rp ON rp.id_rol = r.id_rol
         INNER JOIN permisos AS p ON p.id_permiso = rp.id_permiso
         WHERE u.id_usuario = ?
           AND u.estado = ?
           AND r.estado = ?`,
        [userId, 'activo', 'activo'],
      );

      const effectivePermissions = new Set(
        permissions.map((permission) => permission.codigo),
      );
      const hasRequiredPermissions = requiredCodes.every((code) =>
        effectivePermissions.has(code),
      );

      if (!hasRequiredPermissions) {
        return rejectForbidden(res);
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = requirePermission;
