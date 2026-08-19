const pool = require('../../config/database');
const repository = require('./dashboard.repository');
const { chartQuery } = require('./dashboard.validation');
async function overview() { return { period: 'today', ...(await repository.overview(pool)) }; }
async function charts(query) { const filters = chartQuery(query); return { period: { date_from: filters.dateFrom, date_to: filters.dateTo }, seller: filters.seller, ...(await repository.charts(pool, filters)) }; }
module.exports = { charts, overview };
