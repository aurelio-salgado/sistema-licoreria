const unitService = require('./unit.service');

function getActor(req) {
  return {
    userId: req.user.id_usuario,
    ipAddress: req.ip,
  };
}

async function listUnits(req, res, next) {
  try {
    const data = await unitService.listUnits(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getUnit(req, res, next) {
  try {
    const unit = await unitService.getUnit(req.params.id);
    res.status(200).json({ success: true, data: { unit } });
  } catch (error) {
    next(error);
  }
}

async function createUnit(req, res, next) {
  try {
    const unit = await unitService.createUnit(req.body, getActor(req));
    res.status(201).json({ success: true, data: { unit } });
  } catch (error) {
    next(error);
  }
}

async function updateUnit(req, res, next) {
  try {
    const unit = await unitService.updateUnit(
      req.params.id,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { unit } });
  } catch (error) {
    next(error);
  }
}

async function changeUnitStatus(req, res, next) {
  try {
    const unit = await unitService.changeUnitStatus(
      req.params.id,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { unit } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  changeUnitStatus,
  createUnit,
  getUnit,
  listUnits,
  updateUnit,
};
