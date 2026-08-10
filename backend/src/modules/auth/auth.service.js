const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const pool = require('../../config/database');
const env = require('../../config/env');
const authRepository = require('./auth.repository');

const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MINUTES = 15;

function createCredentialsError() {
  const error = new Error('Credenciales inválidas');
  error.statusCode = 401;

  return error;
}

async function auditFailedLogin(connection, userId, ipAddress) {
  await authRepository.createLoginAudit(connection, {
    userId,
    ipAddress,
    result: 'fallido',
  });
}

async function login({ username, password, ipAddress }) {
  const jwtConfig = env.getJwtConfig();
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const user = await authRepository.findUserByUsername(connection, username);

    if (!user) {
      await connection.commit();
      transactionStarted = false;
      throw createCredentialsError();
    }

    if (user.estado !== 'activo' || Boolean(user.esta_bloqueado)) {
      await auditFailedLogin(connection, user.id_usuario, ipAddress);
      await connection.commit();
      transactionStarted = false;
      throw createCredentialsError();
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      const previousAttempts = user.bloqueado_hasta
        ? 0
        : user.intentos_fallidos;
      const failedAttempts = previousAttempts + 1;
      const shouldBlock = failedAttempts >= MAX_FAILED_ATTEMPTS;

      await authRepository.registerFailedAttempt(
        connection,
        user.id_usuario,
        failedAttempts,
        shouldBlock,
        BLOCK_DURATION_MINUTES,
      );
      await auditFailedLogin(connection, user.id_usuario, ipAddress);
      await connection.commit();
      transactionStarted = false;
      throw createCredentialsError();
    }

    await authRepository.registerSuccessfulLogin(connection, user.id_usuario);

    const roles = await authRepository.findRolesByUserId(
      connection,
      user.id_usuario,
    );
    const permissions = await authRepository.findPermissionsByUserId(
      connection,
      user.id_usuario,
    );

    const token = jwt.sign(
      {
        sub: String(user.id_usuario),
        nombre_usuario: user.nombre_usuario,
        roles,
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn },
    );

    await authRepository.createLoginAudit(connection, {
      userId: user.id_usuario,
      ipAddress,
      result: 'exitoso',
    });
    await connection.commit();
    transactionStarted = false;

    return {
      token,
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        nombre_usuario: user.nombre_usuario,
        correo: user.correo,
        roles,
        permisos: permissions,
      },
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        // El manejador global conservará una respuesta pública saneada.
      }
    }

    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { login };
