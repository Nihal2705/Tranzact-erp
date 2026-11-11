const app = require("./src/server");
const pool = require("./src/config/db");
const jwt = require("jsonwebtoken");

// Generate tokens for testing
const adminToken = jwt.sign({ id: 1, role: "Admin" }, process.env.JWT_SECRET);
const workerToken = jwt.sign({ id: 3, role: "Worker" }, process.env.JWT_SECRET);

// Helper for simulated requests
function request(method, url, token, body = null) {
  return new Promise((resolve) => {
    const http = require("http");
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const parsedUrl = new URL(url, `http://localhost:${port}`);
      const options = {
        hostname: "localhost",
        port,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          server.close();
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = data;
          }
          resolve({ status: res.statusCode, data: json });
        });
      });

      req.on("error", (e) => {
        server.close();
        resolve({ status: 500, error: e.message });
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
}

async function runTests() {
  console.log("=== STARTING PHASE 3 INVENTORY TESTS ===");

  // Test 1: GET /api/items without token -> 401
  const t1 = await request("GET", "/api/items", null);
  console.log("T1: GET /api/items without token ->", t1.status, t1.status === 401 ? "PASS" : "FAIL");

  // Test 2: GET /api/items with admin token -> 200
  const t2 = await request("GET", "/api/items", adminToken);
  console.log("T2: GET /api/items with admin token ->", t2.status, Array.isArray(t2.data) ? `PASS (${t2.data.length} items)` : "FAIL");
  const finishedItem = t2.data.find(x => x.item_type === "FINISHED" && x.bom.length > 0);
  console.log("    Finished item has BOM:", Boolean(finishedItem && finishedItem.bom.length > 0) ? "PASS" : "FAIL");

  // Test 3: GET /api/items?search=Valve
  const t3 = await request("GET", "/api/items?search=Valve", adminToken);
  const allValves = t3.data.every(x => x.name.toLowerCase().includes("valve"));
  console.log("T3: GET /api/items?search=Valve ->", t3.status, allValves ? `PASS (${t3.data.length} valves found)` : "FAIL");

  // Test 4: GET /api/items/low-stock -> 200
  const t4 = await request("GET", "/api/items/low-stock", adminToken);
  const allLow = t4.data.every(x => x.quantity < x.low_stock_limit);
  console.log("T4: GET /api/items/low-stock ->", t4.status, allLow ? `PASS (${t4.data.length} low stock items)` : "FAIL");

  // Test 5: POST /api/items as Worker -> 403 Forbidden
  const t5 = await request("POST", "/api/items", workerToken, {
    name: "Test Worker Item",
    item_type: "RAW",
    unit: "pcs",
    price: 10
  });
  console.log("T5: POST /api/items as Worker ->", t5.status, t5.status === 403 ? "PASS" : "FAIL");

  // Test 6: POST /api/items as Admin with opening_qty -> 201 Created & check Opening Stock in history
  const uniqueName = `Test Item ${Date.now()}`;
  const t6 = await request("POST", "/api/items", adminToken, {
    name: uniqueName,
    item_type: "RAW",
    unit: "kg",
    price: 55.5,
    low_stock_limit: 20,
    opening_qty: 150
  });
  console.log("T6: POST /api/items as Admin ->", t6.status, t6.status === 201 ? "PASS" : "FAIL");
  const createdItemId = t6.data.id;

  // Check history of created item
  const t6Hist = await request("GET", `/api/items/${createdItemId}/history`, adminToken);
  const hasOpening = t6Hist.data.some(h => h.changed_via === "Opening Stock" && h.change_qty === 150);
  console.log("    Opening Stock in history:", hasOpening ? "PASS" : "FAIL");

  // Test 7: POST duplicate item name -> 409 Conflict
  const t7 = await request("POST", "/api/items", adminToken, {
    name: uniqueName,
    item_type: "RAW",
    unit: "kg",
    price: 55.5
  });
  console.log("T7: POST duplicate item name ->", t7.status, t7.status === 409 ? "PASS" : "FAIL");

  // Test 8: PUT /api/items/:id editing details -> 200
  const t8 = await request("PUT", `/api/items/${createdItemId}`, adminToken, {
    name: `${uniqueName} Updated`,
    unit: "kg",
    price: 60,
    low_stock_limit: 25
  });
  console.log("T8: PUT /api/items/:id details ->", t8.status, t8.status === 200 && t8.data.name.includes("Updated") ? "PASS" : "FAIL");

  // Test 9: PUT /api/items/:id attempting to modify quantity directly -> 400 Bad Request
  const t9 = await request("PUT", `/api/items/${createdItemId}`, adminToken, {
    name: `${uniqueName} Updated`,
    unit: "kg",
    price: 60,
    low_stock_limit: 25,
    quantity: 9999
  });
  console.log("T9: PUT /api/items/:id with quantity ->", t9.status, t9.status === 400 ? "PASS" : "FAIL");

  // Test 10: PUT /api/items/:id/stock manual adjustment (+25) -> 200
  const requestId = `req-test-${Date.now()}`;
  const t10 = await request("PUT", `/api/items/${createdItemId}/stock`, adminToken, {
    change_qty: 25,
    reason: "Purchased extra material",
    request_id: requestId
  });
  console.log("T10: PUT /api/items/:id/stock +25 ->", t10.status, t10.data.item.quantity === 175 ? "PASS (175 qty)" : "FAIL");

  // Test 11: Idempotency with same request_id -> 200 and quantity unchanged (stays 175)
  const t11 = await request("PUT", `/api/items/${createdItemId}/stock`, adminToken, {
    change_qty: 25,
    reason: "Purchased extra material",
    request_id: requestId
  });
  console.log("T11: Duplicate request_id ->", t11.status, t11.data.item.quantity === 175 ? "PASS (quantity still 175)" : "FAIL");

  // Test 12: Insufficient stock (reduce by -200 when qty is 175) -> 400 Bad Request
  const t12 = await request("PUT", `/api/items/${createdItemId}/stock`, adminToken, {
    change_qty: -200,
    reason: "Trying to over-reduce",
    request_id: `req-fail-${Date.now()}`
  });
  console.log("T12: Stock below zero ->", t12.status, t12.status === 400 ? "PASS" : "FAIL");

  // Test 13: GET /api/items/:id/history shows correct order
  const t13 = await request("GET", `/api/items/${createdItemId}/history`, adminToken);
  console.log("T13: GET /api/items/:id/history ->", t13.status, t13.data.length === 2 ? `PASS (${t13.data.length} entries)` : "FAIL");

  // Clean up test item
  await pool.query("DELETE FROM stock_history WHERE item_id = $1", [createdItemId]);
  await pool.query("DELETE FROM items WHERE id = $1", [createdItemId]);
  console.log("Cleaned up test item.");

  console.log("=== ALL PHASE 3 INVENTORY TESTS COMPLETED ===");
  process.exit(0);
}

runTests().catch((e) => {
  console.error("Test runner error:", e);
  process.exit(1);
});

