const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { Pool } = require("pg");

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes("neon.tech") ? { rejectUnauthorized: false } : undefined
      }
    : undefined
);

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

module.exports = pool;
