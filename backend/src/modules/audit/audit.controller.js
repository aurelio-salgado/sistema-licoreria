const auditService = require('./audit.service');

async function listEvents(req, res, next) {
  try {
    const data = await auditService.listEvents(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getEvent(req, res, next) {
  try {
    const event = await auditService.getEvent(req.params.id);
    res.status(200).json({ success: true, data: { event } });
  } catch (error) {
    next(error);
  }
}

module.exports = { getEvent, listEvents };
