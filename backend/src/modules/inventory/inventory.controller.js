const service = require('./inventory.service');
const actor = (req) => ({ userId: req.user.id_usuario, ipAddress: req.ip });
async function list(req, res, next) {
  try {
    res
      .status(200)
      .json({ success: true, data: await service.listStock(req.query) });
  } catch (e) {
    next(e);
  }
}
async function low(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await service.lowStock() });
  } catch (e) {
    next(e);
  }
}
async function movements(req, res, next) {
  try {
    res
      .status(200)
      .json({ success: true, data: await service.movements(req.query) });
  } catch (e) {
    next(e);
  }
}
async function adjust(req, res, next) {
  try {
    res
      .status(201)
      .json({
        success: true,
        data: { adjustment: await service.adjust(req.body, actor(req)) },
      });
  } catch (e) {
    next(e);
  }
}
module.exports = { adjust, list, low, movements };
