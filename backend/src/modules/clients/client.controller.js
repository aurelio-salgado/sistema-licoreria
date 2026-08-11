const clientService = require('./client.service');

function getActor(req) {
  return { userId: req.user.id_usuario, ipAddress: req.ip };
}

async function listClients(req, res, next) {
  try {
    const data = await clientService.listClients(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getClient(req, res, next) {
  try {
    const client = await clientService.getClient(req.params.id);
    res.status(200).json({ success: true, data: { client } });
  } catch (error) {
    next(error);
  }
}

async function createClient(req, res, next) {
  try {
    const client = await clientService.createClient(req.body, getActor(req));
    res.status(201).json({ success: true, data: { client } });
  } catch (error) {
    next(error);
  }
}

async function updateClient(req, res, next) {
  try {
    const client = await clientService.updateClient(
      req.params.id,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { client } });
  } catch (error) {
    next(error);
  }
}

async function changeClientStatus(req, res, next) {
  try {
    const client = await clientService.changeClientStatus(
      req.params.id,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { client } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  changeClientStatus,
  createClient,
  getClient,
  listClients,
  updateClient,
};
