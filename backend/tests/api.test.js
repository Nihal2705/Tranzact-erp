
const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/server");

const workerToken = jwt.sign(
  { id: 3, role: "Worker" },
  process.env.JWT_SECRET
);
const adminToken = jwt.sign(
  { id: 1, role: "Admin" },
  process.env.JWT_SECRET
);

describe("TranZact ERP API Tests", () => {
  test("Health API should respond successfully", async () => {
    const res = await request(app).get("/api/health");
    expect(res.statusCode).toBe(200);
  });

  test("Items API should reject requests without token", async () => {
    const res = await request(app).get("/api/items");
    expect(res.statusCode).toBe(401);
  });

  test("Orders API should reject requests without token", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.statusCode).toBe(401);
  });

  test("Reports API should reject requests without token", async () => {
    const res = await request(app).get("/api/reports/summary");
    expect(res.statusCode).toBe(401);
  });

  test("Worker should be allowed to view items", async () => {
    const res = await request(app)
      .get("/api/items")
      .set("Authorization", `Bearer ${workerToken}`);

    expect(res.statusCode).toBe(200);
  });

  test("Worker should be denied permission to create items", async () => {
    const res = await request(app)
      .post("/api/items")
      .set("Authorization", `Bearer ${workerToken}`)
      .send({});

    expect(res.statusCode).toBe(403);
  });

  test("Worker should be denied permission to view orders", async () => {
    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${workerToken}`);

    expect(res.statusCode).toBe(403);
  });

  test("Worker should be allowed to access reports summary", async () => {
    const res = await request(app)
      .get("/api/reports/summary")
      .set("Authorization", `Bearer ${workerToken}`);

    expect(res.statusCode).toBe(200);
  });

  test("Creating item with invalid data should return 400", async () => {
    const res = await request(app)
      .post("/api/items")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  test("Updating item with invalid data should return 400", async () => {
    const res = await request(app)
      .put("/api/items/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  test("Updating nonexistent item should return 404", async () => {
    const res = await request(app)
      .put("/api/items/999999")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Test Item",
        unit: "pcs",
        price: 10,
        low_stock_limit: 0
      });

    expect(res.statusCode).toBe(404);
  });

  test("Deleting nonexistent item should return 404", async () => {
    const res = await request(app)
      .delete("/api/items/999999")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
  });

  test("Invalid JWT token should return 401", async () => {
    const res = await request(app)
      .get("/api/items")
      .set("Authorization", "Bearer invalid.token.value");

    expect(res.statusCode).toBe(401);
  });

  test("Stock adjustment with zero quantity should return 400", async () => {
    const res = await request(app)
      .put("/api/items/1/stock")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        change_qty: 0,
        reason: "API validation test"
      });

    expect(res.statusCode).toBe(400);
  });


});

afterAll(async () => {
  const pool = require("../src/config/db");
  await pool.end();
});
