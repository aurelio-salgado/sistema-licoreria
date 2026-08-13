const service = require("./access.service");
function actor(req) {
  return { userId: req.user.id_usuario, ipAddress: req.ip };
}
async function roles(req, res, next) {
  try {
    res
      .status(200)
      .json({ success: true, data: { roles: await service.listRoles() } });
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
        data: { role: await service.getRole(req.params.id) },
      });
  } catch (e) {
    next(e);
  }
}
async function permissions(req, res, next) {
  try {
    res
      .status(200)
      .json({
        success: true,
        data: { permissions: await service.listPermissions() },
      });
  } catch (e) {
    next(e);
  }
}
async function updatePermissions(req, res, next) {
  try {
    res
      .status(200)
      .json({
        success: true,
        data: {
          role: await service.updatePermissions(
            req.params.id,
            req.body,
            actor(req),
          ),
        },
      });
  } catch (e) {
    next(e);
  }
}
module.exports = { permissions, role, roles, updatePermissions };
