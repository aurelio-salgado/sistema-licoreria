const mysql = require('mysql2/promise');

const env = require('./env');

const pool = mysql.createPool({
  host: env.database.host,
  port: env.database.port,
  user: env.database.user,
  password: env.database.password,
  database: env.database.name,
  waitForConnections: true,
  connectionLimit: env.database.connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4',
});

module.exports = pool;
