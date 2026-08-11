const purchaseService = require('./purchase.service');

function getActor(req) {
  return { userId: req.user.id_usuario, ipAddress: req.ip };
}

async function listPurchases(req, res, next) {
  try {
    const data = await purchaseService.listPurchases(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getPurchase(req, res, next) {
  try {
    const purchase = await purchaseService.getPurchase(req.params.id);
    res.status(200).json({ success: true, data: { purchase } });
  } catch (error) {
    next(error);
  }
}

async function createPurchase(req, res, next) {
  try {
    const purchase = await purchaseService.createPurchase(
      req.body,
      getActor(req),
    );
    res.status(201).json({ success: true, data: { purchase } });
  } catch (error) {
    next(error);
  }
}

async function confirmPurchase(req, res, next) {
  try {
    const purchase = await purchaseService.confirmPurchase(
      req.params.id,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { purchase } });
  } catch (error) {
    next(error);
  }
}

async function updatePurchase(req, res, next) {
  try {
    const purchase = await purchaseService.updatePurchase(
      req.params.id,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { purchase } });
  } catch (error) {
    next(error);
  }
}

async function addItem(req, res, next) {
  try {
    const purchase = await purchaseService.addItem(
      req.params.id,
      req.body,
      getActor(req),
    );
    res.status(201).json({ success: true, data: { purchase } });
  } catch (error) {
    next(error);
  }
}

async function updateItem(req, res, next) {
  try {
    const purchase = await purchaseService.updateItem(
      req.params.id,
      req.params.itemId,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { purchase } });
  } catch (error) {
    next(error);
  }
}

async function removeItem(req, res, next) {
  try {
    const purchase = await purchaseService.removeItem(
      req.params.id,
      req.params.itemId,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { purchase } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addItem,
  confirmPurchase,
  createPurchase,
  getPurchase,
  listPurchases,
  removeItem,
  updateItem,
  updatePurchase,
};
