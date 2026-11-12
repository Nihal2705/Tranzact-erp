const express = require("express");
const router = express.Router();
const { requireAuth, allowRoles } = require("../middleware/auth");
const {
  getItems,
  createItem,
  updateItem,
  changeItemStock,
  getItemHistory,
  getLowStockItems
} = require("../controllers/itemController");

// 1. Specific routes first (BEFORE /:id)
router.get("/low-stock", requireAuth, allowRoles("Admin", "Manager", "Worker"), getLowStockItems);

// 2. Collection routes
router.get("/", requireAuth, allowRoles("Admin", "Manager", "Worker"), getItems);
router.post("/", requireAuth, allowRoles("Admin", "Manager"), createItem);

// 3. Sub-resource routes under :id
router.put("/:id/stock", requireAuth, allowRoles("Admin", "Manager", "Worker"), changeItemStock);
router.get("/:id/history", requireAuth, allowRoles("Admin", "Manager", "Worker"), getItemHistory);

// 4. Parameterized route
router.put("/:id", requireAuth, allowRoles("Admin", "Manager"), updateItem);

module.exports = router;

