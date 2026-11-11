const pool = require("../config/db");
const { changeStock } = require("../services/stockService");

/**
 * GET /api/orders
 * List orders with optional filters:
 * ?order_type=, ?invoice_status=, ?goods_status=, ?search=, ?from=, ?to=
 * Only Admin and Manager
 */
async function getOrders(req, res) {
  const { order_type, invoice_status, goods_status, search, from, to } = req.query;

  try {
    const conditions = [];
    const params = [];

    if (order_type) {
      params.push(order_type);
      conditions.push(`o.order_type = $${params.length}`);
    }

    if (invoice_status) {
      params.push(invoice_status);
      conditions.push(`o.invoice_status = $${params.length}`);
    }

    if (goods_status) {
      params.push(goods_status);
      conditions.push(`o.goods_status = $${params.length}`);
    }

    if (search) {
      params.push(search.trim());
      conditions.push(`o.party_name ILIKE '%' || $${params.length} || '%'`);
    }

    if (from) {
      params.push(from);
      conditions.push(`o.order_date >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      conditions.push(`o.order_date <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        o.id,
        o.order_type,
        o.party_name,
        TO_CHAR(o.order_date, 'YYYY-MM-DD') AS order_date,
        TO_CHAR(o.due_date, 'YYYY-MM-DD') AS due_date,
        o.invoice_status,
        o.invoice_created_at,
        o.goods_status,
        o.total_amount,
        o.created_by,
        o.created_at,
        o.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'item_id', oi.item_id,
              'item_name', i.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'fulfilled_qty', oi.fulfilled_qty
            ) ORDER BY oi.id ASC
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) AS lines
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN items i ON oi.item_id = i.id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.order_date DESC, o.id DESC
    `;

    const result = await pool.query(query, params);

    const formatted = result.rows.map((row) => ({
      id: row.id,
      order_type: row.order_type,
      party_name: row.party_name,
      order_date: row.order_date,
      due_date: row.due_date,
      invoice_status: row.invoice_status,
      invoice_created_at: row.invoice_created_at,
      goods_status: row.goods_status,
      total_amount: parseFloat(row.total_amount),
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      lines: (row.lines || []).map((line) => ({
        id: line.id,
        item_id: line.item_id,
        item_name: line.item_name,
        quantity: parseFloat(line.quantity),
        price: parseFloat(line.price),
        fulfilled_qty: parseFloat(line.fulfilled_qty)
      }))
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Server error fetching orders" });
  }
}

/**
 * POST /api/orders
 * Creates an order and order lines atomically inside a transaction
 * Total amount is computed by the backend
 * Only Admin and Manager
 */
async function createOrder(req, res) {
  const { order_type, party_name, order_date, due_date, lines } = req.body;

  if (!party_name || typeof party_name !== "string" || !party_name.trim()) {
    return res.status(400).json({ error: "party_name is required" });
  }

  if (!order_type || !["SALES", "PURCHASE"].includes(order_type)) {
    return res.status(400).json({ error: "order_type must be either 'SALES' or 'PURCHASE'" });
  }

  if (!order_date || isNaN(Date.parse(order_date))) {
    return res.status(400).json({ error: "Valid order_date is required (YYYY-MM-DD)" });
  }

  if (due_date && isNaN(Date.parse(due_date))) {
    return res.status(400).json({ error: "Invalid due_date format" });
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: "At least one order line is required" });
  }

  // Validate line items
  const seenItems = new Set();
  let calculatedTotal = 0;

  for (const line of lines) {
    const itemId = parseInt(line.item_id, 10);
    const qty = parseFloat(line.quantity);
    const price = parseFloat(line.price);

    if (isNaN(itemId)) {
      return res.status(400).json({ error: "Each order line must have a valid item_id" });
    }

    if (seenItems.has(itemId)) {
      return res.status(400).json({ error: `Duplicate item in order lines (item_id: ${itemId})` });
    }
    seenItems.add(itemId);

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: "Line quantity must be greater than 0" });
    }

    if (isNaN(price) || price < 0) {
      return res.status(400).json({ error: "Line price must be a non-negative number" });
    }

    calculatedTotal += qty * price;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify all items exist in DB
    const itemIds = Array.from(seenItems);
    const itemsCheck = await client.query("SELECT id, name FROM items WHERE id = ANY($1::int[])", [itemIds]);
    if (itemsCheck.rows.length !== itemIds.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "One or more item_ids do not exist in inventory" });
    }

    const itemMap = new Map(itemsCheck.rows.map((r) => [r.id, r.name]));

    // Insert order
    const orderInsertRes = await client.query(
      `INSERT INTO orders (
        order_type,
        party_name,
        order_date,
        due_date,
        invoice_status,
        goods_status,
        total_amount,
        created_by
      ) VALUES ($1, $2, $3, $4, 'Pending', 'Not Dispatched', $5, $6)
      RETURNING *`,
      [
        order_type,
        party_name.trim(),
        order_date,
        due_date || null,
        calculatedTotal.toFixed(2),
        req.user.id
      ]
    );

    const newOrder = orderInsertRes.rows[0];
    const createdLines = [];

    // Insert order lines
    for (const line of lines) {
      const itemId = parseInt(line.item_id, 10);
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.price);

      const lineInsertRes = await client.query(
        `INSERT INTO order_items (
          order_id,
          item_id,
          quantity,
          price,
          fulfilled_qty
        ) VALUES ($1, $2, $3, $4, 0)
        RETURNING *`,
        [newOrder.id, itemId, qty, price]
      );

      const insertedLine = lineInsertRes.rows[0];
      createdLines.push({
        id: insertedLine.id,
        item_id: insertedLine.item_id,
        item_name: itemMap.get(insertedLine.item_id),
        quantity: parseFloat(insertedLine.quantity),
        price: parseFloat(insertedLine.price),
        fulfilled_qty: parseFloat(insertedLine.fulfilled_qty)
      });
    }

    await client.query("COMMIT");

    res.status(201).json({
      id: newOrder.id,
      order_type: newOrder.order_type,
      party_name: newOrder.party_name,
      order_date: newOrder.order_date,
      due_date: newOrder.due_date,
      invoice_status: newOrder.invoice_status,
      goods_status: newOrder.goods_status,
      total_amount: parseFloat(newOrder.total_amount),
      created_by: newOrder.created_by,
      created_at: newOrder.created_at,
      lines: createdLines
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating order:", err);
    res.status(500).json({ error: "Server error creating order" });
  } finally {
    client.release();
  }
}

/**
 * PUT /api/orders/:id/status
 * Updates invoice status and/or dispatches / receives goods
 * Supports partial fulfillment
 * Only Admin and Manager
 */
async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { invoice_status, dispatch, request_id } = req.body;

  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return res.status(400).json({ error: "Invalid order ID" });
  }

  if (!invoice_status && (!dispatch || !Array.isArray(dispatch) || dispatch.length === 0)) {
    return res.status(400).json({ error: "At least invoice_status or dispatch array must be provided" });
  }

  if (invoice_status && !["Pending", "Created"].includes(invoice_status)) {
    return res.status(400).json({ error: "invoice_status must be 'Pending' or 'Created'" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock order row
    const orderRes = await client.query("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
    if (orderRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderRes.rows[0];

    // 1. Process Invoice Status Update
    let newInvoiceStatus = order.invoice_status;
    let newInvoiceCreatedAt = order.invoice_created_at;

    if (invoice_status && invoice_status !== order.invoice_status) {
      newInvoiceStatus = invoice_status;
      if (invoice_status === "Created" && !order.invoice_created_at) {
        newInvoiceCreatedAt = new Date();
      }
    }

    // 2. Process Goods Dispatch or Receiving
    if (Array.isArray(dispatch) && dispatch.length > 0) {
      for (const item of dispatch) {
        const orderItemId = parseInt(item.order_item_id, 10);
        const qtyToFulfill = parseFloat(item.qty);

        if (isNaN(orderItemId)) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Invalid order_item_id in dispatch" });
        }

        if (isNaN(qtyToFulfill) || qtyToFulfill <= 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Dispatch qty must be a positive number" });
        }

        // Lock order item row
        const oiRes = await client.query(
          `SELECT oi.*, i.name AS item_name 
           FROM order_items oi 
           JOIN items i ON oi.item_id = i.id 
           WHERE oi.id = $1 AND oi.order_id = $2 
           FOR UPDATE`,
          [orderItemId, orderId]
        );

        if (oiRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ error: `Order item ${orderItemId} not found in this order` });
        }

        const line = oiRes.rows[0];
        const lineOrderedQty = parseFloat(line.quantity);
        const lineFulfilledQty = parseFloat(line.fulfilled_qty);
        const remainingQty = lineOrderedQty - lineFulfilledQty;

        if (qtyToFulfill > remainingQty) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: `Cannot fulfill ${qtyToFulfill} of ${line.item_name}. Remaining quantity to fulfill is ${remainingQty}`
          });
        }

        // Determine stock mutation direction
        const isSales = order.order_type === "SALES";
        const stockChangeQty = isSales ? -qtyToFulfill : qtyToFulfill;
        const changedVia = isSales ? "Sales Dispatch" : "Purchase Inward";
        const reason = isSales
          ? `Sales dispatch for Order #${order.id} (${order.party_name})`
          : `Purchase inward for Order #${order.id} (${order.party_name})`;

        // Use stockService to change stock atomically within current client transaction
        const mutationRequestId = request_id ? `${request_id}-${line.item_id}` : null;
        await changeStock(client, {
          itemId: line.item_id,
          changeQty: stockChangeQty,
          changedVia,
          reason,
          userId: req.user.id,
          orderId: order.id,
          requestId: mutationRequestId
        });

        // Update fulfilled_qty on order_items
        const newFulfilledQty = lineFulfilledQty + qtyToFulfill;
        await client.query(
          "UPDATE order_items SET fulfilled_qty = $1 WHERE id = $2",
          [newFulfilledQty, orderItemId]
        );
      }
    }

    // 3. Re-evaluate overall goods_status based on all lines
    const allLinesRes = await client.query(
      "SELECT quantity, fulfilled_qty FROM order_items WHERE order_id = $1",
      [orderId]
    );

    let allComplete = true;
    let anyFulfilled = false;

    for (const l of allLinesRes.rows) {
      const q = parseFloat(l.quantity);
      const f = parseFloat(l.fulfilled_qty);
      if (f < q) {
        allComplete = false;
      }
      if (f > 0) {
        anyFulfilled = true;
      }
    }

    let newGoodsStatus = "Not Dispatched";
    if (allComplete && allLinesRes.rows.length > 0) {
      newGoodsStatus = "Dispatched";
    } else if (anyFulfilled) {
      newGoodsStatus = "Partially Dispatched";
    }

    // Update order with new statuses
    const updatedOrderRes = await client.query(
      `UPDATE orders
       SET invoice_status = $1,
           invoice_created_at = $2,
           goods_status = $3,
           updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [newInvoiceStatus, newInvoiceCreatedAt, newGoodsStatus, orderId]
    );

    // Fetch updated lines
    const linesRes = await client.query(
      `SELECT oi.id, oi.item_id, i.name AS item_name, oi.quantity, oi.price, oi.fulfilled_qty
       FROM order_items oi
       JOIN items i ON oi.item_id = i.id
       WHERE oi.order_id = $1
       ORDER BY oi.id ASC`,
      [orderId]
    );

    await client.query("COMMIT");

    const updated = updatedOrderRes.rows[0];
    res.json({
      id: updated.id,
      order_type: updated.order_type,
      party_name: updated.party_name,
      order_date: updated.order_date,
      due_date: updated.due_date,
      invoice_status: updated.invoice_status,
      invoice_created_at: updated.invoice_created_at,
      goods_status: updated.goods_status,
      total_amount: parseFloat(updated.total_amount),
      updated_at: updated.updated_at,
      lines: linesRes.rows.map((l) => ({
        id: l.id,
        item_id: l.item_id,
        item_name: l.item_name,
        quantity: parseFloat(l.quantity),
        price: parseFloat(l.price),
        fulfilled_qty: parseFloat(l.fulfilled_qty)
      }))
    });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Error updating order status:", err);
    res.status(500).json({ error: "Server error updating order status" });
  } finally {
    client.release();
  }
}

/**
 * GET /api/orders/:id/timeline
 * Builds chronological timeline events:
 * 1. Order Created
 * 2. Invoice Created (if Created)
 * 3. Dispatch / Inward movements from stock_history
 * Only Admin and Manager
 */
async function getOrderTimeline(req, res) {
  const { id } = req.params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return res.status(400).json({ error: "Invalid order ID" });
  }

  try {
    const orderRes = await pool.query(
      "SELECT id, order_type, party_name, order_date, created_at, invoice_status, invoice_created_at, goods_status FROM orders WHERE id = $1",
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderRes.rows[0];
    const events = [];

    // 1. Order Created event
    events.push({
      event: "Order Created",
      date: order.created_at,
      details: `${order.order_type === "SALES" ? "Sales order placed with" : "Purchase order issued to"} ${order.party_name}`
    });

    // 2. Invoice Created event (if applicable)
    if (order.invoice_status === "Created" && order.invoice_created_at) {
      events.push({
        event: "Invoice Created",
        date: order.invoice_created_at,
        details: "Invoice generated"
      });
    }

    // 3. Stock history dispatch / inward events
    const historyRes = await pool.query(
      `SELECT sh.id, sh.created_at, sh.changed_via, sh.change_qty, sh.reason, i.name AS item_name, u.name AS user_name
       FROM stock_history sh
       JOIN items i ON sh.item_id = i.id
       JOIN users u ON sh.changed_by = u.id
       WHERE sh.order_id = $1
       ORDER BY sh.created_at ASC, sh.id ASC`,
      [orderId]
    );

    for (let i = 0; i < historyRes.rows.length; i++) {
      const h = historyRes.rows[i];
      const qty = Math.abs(parseFloat(h.change_qty));
      const isLastMovement = (i === historyRes.rows.length - 1);

      let eventTitle = "Partially Dispatched";
      if (order.goods_status === "Dispatched" && isLastMovement) {
        eventTitle = "Dispatched";
      } else {
        eventTitle = "Partially Dispatched";
      }

      events.push({
        event: eventTitle,
        date: h.created_at,
        details: `${qty} of ${h.item_name} (${h.changed_via}) by ${h.user_name}`
      });
    }

    // Sort all events chronologically
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(events);
  } catch (err) {
    console.error("Error fetching order timeline:", err);
    res.status(500).json({ error: "Server error fetching order timeline" });
  }
}

module.exports = {
  getOrders,
  createOrder,
  updateOrderStatus,
  getOrderTimeline
};
