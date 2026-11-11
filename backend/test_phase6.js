const app = require("./src/server");
const pool = require("./src/config/db");
const jwt = require("jsonwebtoken");

const adminToken = jwt.sign({ id: 1, role: "Admin" }, process.env.JWT_SECRET);
const workerToken = jwt.sign({ id: 3, role: "Worker" }, process.env.JWT_SECRET);

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
  console.log("=== STARTING PHASE 6 REPORTS TESTS ===");

  // Test 1: GET /api/reports/summary without token -> 401
  const t1 = await request("GET", "/api/reports/summary", null);
  console.log("T1: GET /api/reports/summary without token ->", t1.status, t1.status === 401 ? "PASS" : "FAIL");

  // Test 2: GET /api/reports/summary with Worker token -> 403 Forbidden
  const t2 = await request("GET", "/api/reports/summary", workerToken);
  console.log("T2: GET /api/reports/summary as Worker ->", t2.status, t2.status === 403 ? "PASS" : "FAIL");

  // Test 3: GET /api/reports/summary with Admin token -> 200 OK
  const t3 = await request("GET", "/api/reports/summary", adminToken);
  console.log("T3: GET /api/reports/summary as Admin ->", t3.status, t3.status === 200 ? "PASS" : "FAIL");

  const data = t3.data;
  console.log("Data returned:", JSON.stringify(data, null, 2));

  // Verify KPIs
  const hasKpis = (
    data.kpis &&
    typeof data.kpis.stock_value === "number" &&
    typeof data.kpis.low_stock_count === "number" &&
    typeof data.kpis.orders_this_month === "number" &&
    typeof data.kpis.pending_invoices === "number" &&
    typeof data.kpis.orders_not_dispatched === "number" &&
    typeof data.kpis.production_completed === "number"
  );
  console.log("Verify KPIs shape:", hasKpis ? "PASS" : "FAIL");

  // Verify Charts
  const hasOrdersPerMonth = Array.isArray(data.orders_per_month);
  const hasStockByItem = Array.isArray(data.stock_by_item);
  const hasProductionByStatus = Array.isArray(data.production_by_status);
  console.log("Verify Chart datasets:", (hasOrdersPerMonth && hasStockByItem && hasProductionByStatus) ? "PASS" : "FAIL");

  // Verify Lists
  const hasLowStockList = Array.isArray(data.low_stock_items);
  const hasLateOrdersList = Array.isArray(data.late_orders);
  console.log("Verify Lists:", (hasLowStockList && hasLateOrdersList) ? "PASS" : "FAIL");

  console.log("=== ALL PHASE 6 REPORTS TESTS COMPLETED ===");
  process.exit(0);
}

runTests().catch((e) => {
  console.error("Reports test error:", e);
  process.exit(1);
});

