const categoryService = require('./category.service');

function getActor(req) {
  return {
    userId: req.user.id_usuario,
    ipAddress: req.ip,
  };
}

async function listCategories(req, res, next) {
  try {
    const data = await categoryService.listCategories(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getCategory(req, res, next) {
  try {
    const category = await categoryService.getCategory(req.params.id);
    res.status(200).json({ success: true, data: { category } });
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await categoryService.createCategory(
      req.body,
      getActor(req),
    );
    res.status(201).json({ success: true, data: { category } });
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await categoryService.updateCategory(
      req.params.id,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { category } });
  } catch (error) {
    next(error);
  }
}

async function changeCategoryStatus(req, res, next) {
  try {
    const category = await categoryService.changeCategoryStatus(
      req.params.id,
      req.body,
      getActor(req),
    );
    res.status(200).json({ success: true, data: { category } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  changeCategoryStatus,
  createCategory,
  getCategory,
  listCategories,
  updateCategory,
};
