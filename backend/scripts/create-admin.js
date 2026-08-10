const bcrypt = require("bcrypt");

const pool = require("../src/config/database");

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;
const MAX_BCRYPT_PASSWORD_BYTES = 72;

class AdminCreationError extends Error {}

function getRequiredValue(variableName, label, maxLength) {
  const value = process.env[variableName]?.trim();

  if (!value) {
    throw new AdminCreationError(`${label} es obligatorio.`);
  }

  if (value.length > maxLength) {
    throw new AdminCreationError(
      `${label} no puede superar ${maxLength} caracteres.`,
    );
  }

  return value;
}

function getOptionalEmail() {
  const email = process.env.ADMIN_EMAIL?.trim();

  if (!email) {
    return null;
  }

  if (email.length > 150) {
    throw new AdminCreationError("El correo no puede superar 150 caracteres.");
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw new AdminCreationError("El correo proporcionado no es válido.");
  }

  return email;
}

function getPassword() {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new AdminCreationError("La contraseña es obligatoria.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AdminCreationError(
      `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }

  if (Buffer.byteLength(password, "utf8") > MAX_BCRYPT_PASSWORD_BYTES) {
    throw new AdminCreationError(
      `La contraseña no puede superar ${MAX_BCRYPT_PASSWORD_BYTES} bytes en UTF-8.`,
    );
  }

  return password;
}

function readAdminData() {
  return {
    name: getRequiredValue("ADMIN_NAME", "El nombre", 100),
    lastName: getRequiredValue("ADMIN_LASTNAME", "El apellido", 100),
    username: getRequiredValue("ADMIN_USERNAME", "El nombre de usuario", 80),
    email: getOptionalEmail(),
    password: getPassword(),
  };
}

function toSafeError(error) {
  if (error instanceof AdminCreationError) {
    return error;
  }

  if (error?.code === "ER_DUP_ENTRY") {
    return new AdminCreationError(
      "El nombre de usuario o el correo ya están registrados.",
    );
  }

  return new AdminCreationError(
    "No fue posible crear el Administrador. Verifica la conexión y la configuración de la base de datos.",
  );
}

async function createAdmin() {
  const admin = readAdminData();
  const passwordHash = await bcrypt.hash(admin.password, BCRYPT_ROUNDS);
  let connection;
  let transactionStarted = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [roles] = await connection.execute(
      `SELECT id_rol
       FROM roles
       WHERE nombre = ? AND estado = ?
       FOR UPDATE`,
      ["Administrador", "activo"],
    );

    if (roles.length === 0) {
      throw new AdminCreationError(
        "No existe un rol Administrador activo. Ejecuta primero los datos iniciales aprobados.",
      );
    }

    const administratorRoleId = roles[0].id_rol;
    const [activeAdministrators] = await connection.execute(
      `SELECT u.id_usuario
       FROM usuarios AS u
       INNER JOIN usuario_roles AS ur ON ur.id_usuario = u.id_usuario
       WHERE ur.id_rol = ? AND u.estado = ?
       LIMIT 1`,
      [administratorRoleId, "activo"],
    );

    if (activeAdministrators.length > 0) {
      throw new AdminCreationError(
        "Ya existe un usuario activo asignado al rol Administrador.",
      );
    }

    const [duplicateUsers] = await connection.execute(
      `SELECT nombre_usuario, correo
       FROM usuarios
       WHERE nombre_usuario = ? OR (? IS NOT NULL AND correo = ?)
       LIMIT 1`,
      [admin.username, admin.email, admin.email],
    );

    if (duplicateUsers.length > 0) {
      const duplicate = duplicateUsers[0];

      if (duplicate.nombre_usuario === admin.username) {
        throw new AdminCreationError(
          "El nombre de usuario ya está registrado.",
        );
      }

      throw new AdminCreationError("El correo ya está registrado.");
    }

    const [userResult] = await connection.execute(
      `INSERT INTO usuarios (
         nombre,
         apellido,
         nombre_usuario,
         correo,
         password_hash,
         estado,
         intentos_fallidos,
         bloqueado_hasta,
         ultimo_acceso
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        admin.name,
        admin.lastName,
        admin.username,
        admin.email,
        passwordHash,
        "activo",
        0,
        null,
        null,
      ],
    );

    await connection.execute(
      `INSERT INTO usuario_roles (id_usuario, id_rol, asignado_por)
       VALUES (?, ?, ?)`,
      [userResult.insertId, administratorRoleId, null],
    );

    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        // El error mostrado debe permanecer libre de detalles internos.
      }
    }

    throw toSafeError(error);
  } finally {
    connection?.release();
  }
}

async function run() {
  try {
    await createAdmin();
    console.log("Usuario Administrador creado correctamente.");
  } catch (error) {
    console.error(`Error: ${toSafeError(error).message}`);
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch {
      if (!process.exitCode) {
        console.error(
          "Error: No fue posible cerrar la conexión de base de datos.",
        );
        process.exitCode = 1;
      }
    }
  }
}

run();
