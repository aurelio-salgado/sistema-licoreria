const cashService = require('./cash.service');

function actor(req) {
  return { userId: req.user.id_usuario, ipAddress: req.ip };
}

async function openCash(req, res, next) {
  try {
    const cash = await cashService.openCash(req.body, actor(req));
    res.status(201).json({ success: true, data: { cash } });
  } catch (error) {
    next(error);
  }
}

async function getCurrentCash(req, res, next) {
  try {
    const cash = await cashService.getCurrentCash(req.user.id_usuario);
    res.status(200).json({ success: true, data: { cash } });
  } catch (error) {
    next(error);
  }
}

async function listCash(req, res, next) {
  try {
    const data = await cashService.listCash(req.query, req.user.id_usuario);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getCash(req, res, next) {
  try {
    const cash = await cashService.getCash(req.params.id, req.user.id_usuario);
    res.status(200).json({ success: true, data: { cash } });
  } catch (error) {
    next(error);
  }
}

async function listClosedCash(req, res, next) {
  try {
    const data = await cashService.listClosedCash(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getClosedCash(req, res, next) {
  try {
    const cash = await cashService.getClosedCash(req.params.id);
    res.status(200).json({ success: true, data: { cash } });
  } catch (error) {
    next(error);
  }
}

async function createMovement(req, res, next) {
  try {
    const movement = await cashService.createMovement(
      req.params.id,
      req.body,
      actor(req),
    );
    res.status(201).json({ success: true, data: { movement } });
  } catch (error) {
    next(error);
  }
}

async function closeCash(req, res, next) {
  try {
    const cash = await cashService.closeCash(
      req.params.id,
      req.body,
      actor(req),
    );
    res.status(200).json({ success: true, data: { cash } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  closeCash,
  createMovement,
  getCash,
  getClosedCash,
  getCurrentCash,
  listCash,
  listClosedCash,
  openCash,
};
