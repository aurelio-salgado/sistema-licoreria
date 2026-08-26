const authService = require('./auth.service');

function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;

  return error;
}

function validateCredentials(body) {
  const username =
    typeof body?.nombre_usuario === 'string' ? body.nombre_usuario.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!username) {
    throw createValidationError('El nombre de usuario es obligatorio');
  }

  if (username.length > 80) {
    throw createValidationError(
      'El nombre de usuario no puede superar 80 caracteres',
    );
  }

  if (!password) {
    throw createValidationError('La contraseña es obligatoria');
  }

  return { username, password };
}

async function login(req, res, next) {
  try {
    const credentials = validateCredentials(req.body);
    const data = await authService.login({
      ...credentials,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.user.id_usuario);
    res.status(200).json({
      success: true,
      data: {
        message: 'Sesión cerrada correctamente',
      },
    });
  } catch (error) {
    next(error);
  }
}

function getCurrentUser(req, res) {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
}

module.exports = { getCurrentUser, login, logout };
