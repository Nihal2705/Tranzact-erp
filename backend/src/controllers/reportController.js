const pool = require("../config/db");

/**
 * GET /api/reports/summary
 * Aggregates dashboard KPIs, charts datasets, and critical lists
 * Admin and Manager only
 */
async function getReportsSummary(req, res) {
  try {
    // 1. KPI Queries
    const kpiQueries = `
      SELECT
        (SELECT COALESCE(SUM(quantity * price), 0) FROM items) AS stock_value,
        (SELECT COUNT(*) FROM items WHERE quantity < low_stock_limit) AS low_stock_count,
        (SELECT COUNT(*) FROM orders WHERE DATE_TRUNC('month', order_date) = DATE_TRUNC('month', CURRENT_DATE)) AS orders_this_month,
        (SELECT COUNT(*) FROM orders WHERE invoice_status = 'Pending') AS pending_invoices,
        (SELECT COUNT(*) FROM orders WHERE order_type = 'SALES' AND goods_status <> 'Dispatched') AS orders_not_dispatched,
        (SELECT COUNT(*) FROM production_orders WHERE status = 'COMPLETED') AS production_completed;
    `;

    // 2. Orders per month chart dataset
    const ordersPerMonthQuery = `
      SELECT 
        TO_CHAR(order_date, 'YYYY-MM') AS month,
        COUNT(*)::int AS count
      FROM orders
      GROUP BY TO_CHAR(order_date, 'YYYY-MM')
      ORDER BY month ASC;
    `;

    // 3. Stock value by item chart dataset
    const stockByItemQuery = `
      SELECT 
        name,
        ROUND((quantity * price)::numeric, 2)::float AS value
      FROM items
      ORDER BY value DESC;
    `;

    // 4. Production by status chart dataset
    const productionByStatusQuery = `
      SELECT 
        status,
        COUNT(*)::int AS count
      FROM production_orders
      GROUP BY status
      ORDER BY 
        CASE status 
          WHEN 'PLANNED' THEN 1 
          WHEN 'PENDING' THEN 2 
          WHEN 'WIP' THEN 3 
          WHEN 'IN-TESTING' THEN 4 
          WHEN 'COMPLETED' THEN 5 
        END;
    `;

    // 5. Low stock items list
    const lowStockItemsQuery = `
      SELECT 
        id,
        name,
        item_type,
        unit,
        quantity::float,
        price::float,
        low_stock_limit::float
      FROM items
      WHERE quantity < low_stock_limit
      ORDER BY (low_stock_limit - quantity) DESC, name ASC;
    `;

    // 6. Late orders list (due_date < CURRENT_DATE AND goods_status <> 'Dispatched')
    const lateOrdersQuery = `
      SELECT 
        id,
        order_type,
        party_name,
        TO_CHAR(order_date, 'YYYY-MM-DD') AS order_date,
        TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date,
        goods_status,
        invoice_status,
        total_amount::float
      FROM orders
      WHERE due_date IS NOT NULL 
        AND due_date < CURRENT_DATE 
        AND goods_status <> 'Dispatched'
      ORDER BY due_date ASC;
    `;

    const [
      kpiRes,
      ordersPerMonthRes,
      stockByItemRes,
      productionByStatusRes,
      lowStockItemsRes,
      lateOrdersRes
    ] = await Promise.all([
      pool.query(kpiQueries),
      pool.query(ordersPerMonthQuery),
      pool.query(stockByItemQuery),
      pool.query(productionByStatusQuery),
      pool.query(lowStockItemsQuery),
      pool.query(lateOrdersQuery)
    ]);

    const kpiRow = kpiRes.rows[0];

    const responsePayload = {
      kpis: {
        stock_value: parseFloat(parseFloat(kpiRow.stock_value).toFixed(2)),
        low_stock_count: parseInt(kpiRow.low_stock_count, 10),
        orders_this_month: parseInt(kpiRow.orders_this_month, 10),
        pending_invoices: parseInt(kpiRow.pending_invoices, 10),
        orders_not_dispatched: parseInt(kpiRow.orders_not_dispatched, 10),
        production_completed: parseInt(kpiRow.production_completed, 10)
      },
      orders_per_month: ordersPerMonthRes.rows,
      stock_by_item: stockByItemRes.rows,
      production_by_status: productionByStatusRes.rows,
      low_stock_items: lowStockItemsRes.rows,
      late_orders: lateOrdersRes.rows
    };

    res.json(responsePayload);
  } catch (err) {
    console.error("Error generating reports summary:", err);
    res.status(500).json({ error: "Server error generating reports summary" });
  }
}

module.exports = {
  getReportsSummary
};

