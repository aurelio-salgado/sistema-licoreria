const service = require('./sale.service');
const actor = (req) => ({ userId: req.user.id_usuario, ipAddress: req.ip });
const reader = (req) => ({
  userId: req.user.id_usuario,
  canSupervise: req.user.permisos.includes('ventas.supervisar'),
});
async function listSales(req, res, next) {
  try {
    res
      .status(200)
      .json({ success: true, data: await service.listSales(req.query, reader(req)) });
  } catch (e) {
    next(e);
  }
}
async function getSale(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: { sale: await service.getSale(req.params.id, reader(req)) },
    });
  } catch (e) {
    next(e);
  }
}
async function listPaymentMethods(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: { payment_methods: await service.listPaymentMethods() },
    });
  } catch (e) {
    next(e);
  }
}
async function getOperationalStatus(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: await service.getOperationalStatus(req.user.id_usuario),
    });
  } catch (e) {
    next(e);
  }
}
async function createSale(req, res, next) {
  try {
    res.status(201).json({
      success: true,
      data: { sale: await service.createSale(req.body, actor(req)) },
    });
  } catch (e) {
    next(e);
  }
}
async function updateSale(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: {
        sale: await service.updateSale(req.params.id, req.body, actor(req)),
      },
    });
  } catch (e) {
    next(e);
  }
}
async function addItem(req, res, next) {
  try {
    res.status(201).json({
      success: true,
      data: {
        sale: await service.addItem(req.params.id, req.body, actor(req)),
      },
    });
  } catch (e) {
    next(e);
  }
}
async function updateItem(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: {
        sale: await service.updateItem(
          req.params.id,
          req.params.itemId,
          req.body,
          actor(req),
        ),
      },
    });
  } catch (e) {
    next(e);
  }
}
async function removeItem(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: {
        sale: await service.removeItem(
          req.params.id,
          req.params.itemId,
          actor(req),
        ),
      },
    });
  } catch (e) {
    next(e);
  }
}
async function confirmSale(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: {
        sale: await service.confirmSale(req.params.id, req.body, actor(req)),
      },
    });
  } catch (e) {
    next(e);
  }
}
async function cancelSale(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: {
        sale: await service.cancelSale(req.params.id, req.body, actor(req)),
      },
    });
  } catch (e) {
    next(e);
  }
}
module.exports = {
  addItem,
  cancelSale,
  confirmSale,
  createSale,
  getSale,
  getOperationalStatus,
  listPaymentMethods,
  listSales,
  removeItem,
  updateItem,
  updateSale,
};
