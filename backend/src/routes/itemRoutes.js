const express = require("express");

const router = express.Router();

const {
  getItems,
  createItem,
  updateItem,
  changeItemStock,
  getItemHistory,
  getLowStockItems,
} = require("../controllers/itemController");

const {
  requireAuth,
  allowRoles,
} = require("../middleware/auth");

// All inventory routes require login
router.use(requireAuth);

// GET /api/items
// Admin, Manager, Worker can view inventory
router.get("/", getItems);

// GET /api/items/low-stock
// Admin, Manager, Worker can view low-stock items
router.get("/low-stock", getLowStockItems);

// POST /api/items
// Only Admin and Manager can add items
router.post(
  "/",
  allowRoles("Admin", "Manager"),
  createItem
);

// PUT /api/items/:id
// Only Admin and Manager can edit item details
router.put(
  "/:id",
  allowRoles("Admin", "Manager"),
  updateItem
);

// PUT /api/items/:id/stock
// Admin, Manager, Worker can change stock
router.put(
  "/:id/stock",
  allowRoles("Admin", "Manager", "Worker"),
  changeItemStock
);

// GET /api/items/:id/history
// Admin, Manager, Worker can view stock history
router.get(
  "/:id/history",
  getItemHistory
);

module.exports = router;