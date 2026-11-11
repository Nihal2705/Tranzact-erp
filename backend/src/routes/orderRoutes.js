const express = require("express");
const router = express.Router();
const { requireAuth, allowRoles } = require("../middleware/auth");
const {
  getOrders,
  createOrder,
  updateOrderStatus,
  getOrderTimeline
} = require("../controllers/orderController");

// All Order routes are restricted to Admin and Manager
router.use(requireAuth, allowRoles("Admin", "Manager"));

router.get("/", getOrders);
router.post("/", createOrder);
router.put("/:id/status", updateOrderStatus);
router.get("/:id/timeline", getOrderTimeline);

module.exports = router;

