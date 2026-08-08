const pool = require('../../config/database');

async function getHealth(req, res, next) {
  try {
    await pool.query('SELECT 1');

    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        database: 'ok',
      },
    });
  } catch {
    const databaseUnavailableError = new Error(
      'Database health check failed',
    );
    databaseUnavailableError.statusCode = 503;

    next(databaseUnavailableError);
  }
}

module.exports = { getHealth };
