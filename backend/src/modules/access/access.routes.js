const express = require("express");
const authenticate = require("../../middlewares/authenticate");
const requirePermission = require("../../middlewares/requirePermission");
const controller = require("./access.controller");
const roleRouter = express.Router();
const permissionRouter = express.Router();
roleRouter.use(authenticate);
permissionRouter.use(authenticate);
roleRouter.get("/", requirePermission("roles.ver"), controller.roles);
roleRouter.get("/:id", requirePermission("roles.ver"), controller.role);
roleRouter.put(
  "/:id/permissions",
  requirePermission("roles.administrar"),
  controller.updatePermissions,
);
permissionRouter.get(
  "/",
  requirePermission("roles.ver"),
  controller.permissions,
);
module.exports = { permissionRouter, roleRouter };
