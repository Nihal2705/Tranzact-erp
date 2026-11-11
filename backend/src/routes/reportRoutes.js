const express = require("express");
const router = express.Router();
const { requireAuth, allowRoles } = require("../middleware/auth");
const { getReportsSummary } = require("../controllers/reportController");

// All reports routes are restricted to Admin and Manager
router.use(requireAuth, allowRoles("Admin", "Manager"));

router.get("/summary", getReportsSummary);

module.exports = router;

