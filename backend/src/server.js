require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");
const orderRoutes = require("./routes/orderRoutes");
const productionRoutes = require("./routes/productionRoutes");

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/production", productionRoutes);

// Health check endpoint
app.get("/api/health", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.json({
      status: "ok",
      database: "pending_credentials",
      message: "Server is running. Database connection string pending from Person 5."
    });
  }

  try {
    const result = await pool.query("SELECT NOW()");
    return res.json({
      status: "ok",
      database: "connected",
      db_time: result.rows[0].now
    });
  } catch (err) {
    console.error("Database connection error in /api/health:", err.message);
    return res.status(500).json({
      status: "error",
      database: "disconnected",
      error: "Could not connect to database"
    });
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Something went wrong" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

