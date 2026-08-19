const service = require('./dashboard.service');
async function overview(req, res, next) { try { res.json({ success: true, data: await service.overview() }); } catch (error) { next(error); } }
async function charts(req, res, next) { try { res.json({ success: true, data: await service.charts(req.query) }); } catch (error) { next(error); } }
module.exports = { charts, overview };
