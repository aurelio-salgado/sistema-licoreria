const supplierService = require('./supplier.service');

function getActor(req) {
  return { userId: req.user.id_usuario, ipAddress: req.ip };
}

async function listSuppliers(req, res, next) {
  try {
    const data = await supplierService.listSuppliers(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getSupplier(req, res, next) {
  try {
    const supplier = await supplierService.getSupplier(req.params.id);
    res.status(200).json({ success: true, data: { supplier } });
  } catch (error) {
    next(error);
  }
}

async function createSupplier(req, res, next) {
  try {
    const supplier = await supplierService.createSupplier(
      req.body,
      getActor(req),
    );
    res.status(201).json({ success: true, data: { supplier } });
  } catch (error) {
    next(error);
  }
}

async function updateSupplier(req, res, next) {
  try {
    const supplier = await supplierService.updateSupplier(
      req.params.id,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { supplier } });
  } catch (error) {
    next(error);
  }
}

async function changeSupplierStatus(req, res, next) {
  try {
    const supplier = await supplierService.changeSupplierStatus(
      req.params.id,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { supplier } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  changeSupplierStatus,
  createSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
};
