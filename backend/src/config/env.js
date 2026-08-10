const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

function parsePositiveInteger(value, fallback) {
  const parsedValue = Number.parseInt(value, 10);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

function getJwtConfig() {
  const secret = process.env.JWT_SECRET?.trim();
  const expiresIn = process.env.JWT_EXPIRES_IN?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET no está configurado');
  }

  if (!expiresIn) {
    throw new Error('JWT_EXPIRES_IN no está configurado');
  }

  return Object.freeze({ secret, expiresIn });
}

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parsePositiveInteger(process.env.PORT, 3000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  database: Object.freeze({
    host: process.env.DB_HOST || 'localhost',
    port: parsePositiveInteger(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || '',
    connectionLimit: parsePositiveInteger(process.env.DB_CONNECTION_LIMIT, 10),
  }),
  getJwtConfig,
});

module.exports = env;
