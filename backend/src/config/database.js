const mysql = require('mysql2/promise');

const env = require('./env');

function createPool() {
  return mysql.createPool({
    host: env.database.host, port: env.database.port, user: env.database.user,
    password: env.database.password, database: env.database.name,
    waitForConnections: true, connectionLimit: env.database.connectionLimit,
    queueLimit: 0, charset: 'utf8mb4',
  });
}

let activePool = createPool();
const pool = {
  execute: (...args) => activePool.execute(...args),
  query: (...args) => activePool.query(...args),
  getConnection: (...args) => activePool.getConnection(...args),
  async renew() {
    const previous = activePool;
    await previous.end();
    activePool = createPool();
  },
  end: () => activePool.end(),
};

module.exports = pool;
