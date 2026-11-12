const express = require("express");
const router = express.Router();
const { requireAuth, allowRoles } = require("../middleware/auth");
const {
  getProductionOrders,
  createProductionOrder,
  updateProductionStatus
} = require("../controllers/productionController");

// All production routes require authentication
router.use(requireAuth);

router.get("/", allowRoles("Admin", "Manager", "Worker"), getProductionOrders);
router.post("/", allowRoles("Admin", "Manager"), createProductionOrder);
router.put("/:id/status", allowRoles("Admin", "Manager", "Worker"), updateProductionStatus);

module.exports = router;

