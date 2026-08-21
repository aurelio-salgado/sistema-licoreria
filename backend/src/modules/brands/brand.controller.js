const brandService = require('./brand.service');

function getActor(req) {
  return {
    userId: req.user.id_usuario,
    ipAddress: req.ip,
  };
}

async function listBrands(req, res, next) {
  try {
    const data = await brandService.listBrands(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getBrand(req, res, next) {
  try {
    const brand = await brandService.getBrand(req.params.id);
    res.status(200).json({ success: true, data: { brand } });
  } catch (error) {
    next(error);
  }
}

async function createBrand(req, res, next) {
  try {
    const brand = await brandService.createBrand(req.body, getActor(req));
    res.status(201).json({ success: true, data: { brand } });
  } catch (error) {
    next(error);
  }
}

async function updateBrand(req, res, next) {
  try {
    const brand = await brandService.updateBrand(
      req.params.id,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { brand } });
  } catch (error) {
    next(error);
  }
}

async function changeBrandStatus(req, res, next) {
  try {
    const brand = await brandService.changeBrandStatus(
      req.params.id,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { brand } });
  } catch (error) {
    next(error);
  }
}
async function saveBrandImage(req, res, next) { try { const brand = await brandService.saveBrandImage(req.params.id, req.file, getActor(req)); res.status(200).json({ success: true, data: { brand } }); } catch (error) { next(error); } }
async function deleteBrandImage(req, res, next) { try { const brand = await brandService.deleteBrandImage(req.params.id, getActor(req)); res.status(200).json({ success: true, data: { brand } }); } catch (error) { next(error); } }

module.exports = {
  changeBrandStatus,
  createBrand,
  deleteBrandImage,
  getBrand,
  listBrands,
  saveBrandImage,
  updateBrand,
};
