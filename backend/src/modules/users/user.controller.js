const service = require("./user.service");

function actor(req) {
  return { userId: req.user.id_usuario, ipAddress: req.ip };
}
async function list(req, res, next) {
  try {
    res
      .status(200)
      .json({ success: true, data: await service.listUsers(req.query) });
  } catch (e) {
    next(e);
  }
}
async function get(req, res, next) {
  try {
    res
      .status(200)
      .json({
        success: true,
        data: { user: await service.getUser(req.params.id) },
      });
  } catch (e) {
    next(e);
  }
}
async function create(req, res, next) {
  try {
    res
      .status(201)
      .json({
        success: true,
        data: { user: await service.createUser(req.body, actor(req)) },
      });
  } catch (e) {
    next(e);
  }
}
async function update(req, res, next) {
  try {
    res
      .status(200)
      .json({
        success: true,
        data: {
          user: await service.updateUser(req.params.id, req.body, actor(req)),
        },
      });
  } catch (e) {
    next(e);
  }
}
async function status(req, res, next) {
  try {
    res
      .status(200)
      .json({
        success: true,
        data: {
          user: await service.changeStatus(req.params.id, req.body, actor(req)),
        },
      });
  } catch (e) {
    next(e);
  }
}
async function role(req, res, next) {
  try {
    res
      .status(200)
      .json({
        success: true,
        data: {
          user: await service.changeRole(req.params.id, req.body, actor(req)),
        },
      });
  } catch (e) {
    next(e);
  }
}
module.exports = { create, get, list, role, status, update };
