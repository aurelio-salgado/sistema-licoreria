const express = require("express");
const authenticate = require("../../middlewares/authenticate");
const requirePermission = require("../../middlewares/requirePermission");
const controller = require("./user.controller");
const router = express.Router();
router.use(authenticate);
router.get("/", requirePermission("usuarios.ver"), controller.list);
router.get("/:id", requirePermission("usuarios.ver"), controller.get);
router.post("/", requirePermission("usuarios.crear"), controller.create);
router.put("/:id", requirePermission("usuarios.editar"), controller.update);
router.patch(
  "/:id/status",
  requirePermission("usuarios.desactivar"),
  controller.status,
);
router.put("/:id/role", requirePermission("usuarios.editar"), controller.role);
module.exports = router;
