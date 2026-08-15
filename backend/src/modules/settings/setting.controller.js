const settingService = require('./setting.service');

function getActor(req) {
  return {
    userId: req.user.id_usuario,
    ipAddress: req.ip,
  };
}

async function listSettings(req, res, next) {
  try {
    const data = await settingService.listSettings();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function updateSetting(req, res, next) {
  try {
    const setting = await settingService.updateSetting(
      req.params.key,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { setting } });
  } catch (error) {
    next(error);
  }
}

module.exports = { listSettings, updateSetting };
