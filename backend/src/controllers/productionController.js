const pool = require("../config/db");
const { changeStock } = require("../services/stockService");

const STATUS_ORDER = ["PLANNED", "PENDING", "WIP", "IN-TESTING", "COMPLETED"];

/**
 * GET /api/production
 * Returns production orders with required vs in-stock raw materials
 * Optional filters: ?status=, ?from=, ?to=
 * Admin, Manager, Worker
 */
async function getProductionOrders(req, res) {
  const { status, from, to } = req.query;

  try {
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`po.status = $${params.length}`);
    }

    if (from) {
      params.push(from);
      conditions.push(`po.planned_date >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      conditions.push(`po.planned_date <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        po.id,
        po.finished_item_id,
        fi.name AS finished_item_name,
        po.target_qty,
        po.completed_qty,
        po.status,
        TO_CHAR(po.planned_date, 'YYYY-MM-DD') AS planned_date,
        po.total_cost,
        po.created_by,
        po.created_at,
        po.updated_at,
        po.completed_at,
        COALESCE(
          json_agg(
            json_build_object(
              'raw_item_id', b.raw_item_id,
              'raw_item_name', ri.name,
              'qty_needed', ROUND((b.qty_per_unit * po.target_qty)::numeric, 2),
              'qty_in_stock', ri.quantity
            ) ORDER BY b.raw_item_id ASC
          ) FILTER (WHERE b.id IS NOT NULL),
          '[]'::json
        ) AS materials
      FROM production_orders po
      JOIN items fi ON po.finished_item_id = fi.id
      LEFT JOIN bom_lines b ON fi.id = b.finished_item_id
      LEFT JOIN items ri ON b.raw_item_id = ri.id
      ${whereClause}
      GROUP BY po.id, fi.name
      ORDER BY po.created_at DESC, po.id DESC
    `;

    const result = await pool.query(query, params);

    const formatted = result.rows.map((row) => ({
      id: row.id,
      finished_item_id: row.finished_item_id,
      finished_item_name: row.finished_item_name,
      target_qty: parseFloat(row.target_qty),
      completed_qty: parseFloat(row.completed_qty),
      status: row.status,
      planned_date: row.planned_date,
      total_cost: row.total_cost !== null ? parseFloat(row.total_cost) : null,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      completed_at: row.completed_at,
      materials: (row.materials || []).map((m) => ({
        raw_item_id: m.raw_item_id,
        raw_item_name: m.raw_item_name,
        qty_needed: parseFloat(m.qty_needed),
        qty_in_stock: parseFloat(m.qty_in_stock)
      }))
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching production orders:", err);
    res.status(500).json({ error: "Server error fetching production orders" });
  }
}

/**
 * POST /api/production
 * Creates a new production order
 * Requires: finished_item_id (must be FINISHED and have BOM lines), target_qty > 0
 * Starts at PLANNED
 * Admin, Manager only
 */
async function createProductionOrder(req, res) {
  const { finished_item_id, target_qty, planned_date } = req.body;

  const itemId = parseInt(finished_item_id, 10);
  if (isNaN(itemId)) {
    return res.status(400).json({ error: "Invalid finished_item_id" });
  }

  const numTarget = parseFloat(target_qty);
  if (isNaN(numTarget) || numTarget <= 0) {
    return res.status(400).json({ error: "target_qty must be greater than 0" });
  }

  if (planned_date && isNaN(Date.parse(planned_date))) {
    return res.status(400).json({ error: "Invalid planned_date format" });
  }

  try {
    // 1. Check item exists and is FINISHED
    const itemRes = await pool.query(
      "SELECT id, name, item_type FROM items WHERE id = $1",
      [itemId]
    );

    if (itemRes.rows.length === 0) {
      return res.status(404).json({ error: "Finished item not found" });
    }

    const item = itemRes.rows[0];
    if (item.item_type !== "FINISHED") {
      return res.status(400).json({ error: "Only FINISHED items can have production orders" });
    }

    // 2. Check item has BOM lines defined
    const bomRes = await pool.query(
      "SELECT id FROM bom_lines WHERE finished_item_id = $1",
      [itemId]
    );

    if (bomRes.rows.length === 0) {
      return res.status(400).json({ error: "Cannot create production order: Item has no BOM lines defined" });
    }

    // 3. Create production order
    const insertRes = await pool.query(
      `INSERT INTO production_orders (
        finished_item_id,
        target_qty,
        completed_qty,
        status,
        planned_date,
        total_cost,
        created_by
      ) VALUES ($1, $2, 0, 'PLANNED', $3, NULL, $4)
      RETURNING *`,
      [itemId, numTarget, planned_date || null, req.user.id]
    );

    const inserted = insertRes.rows[0];
    res.status(201).json({
      id: inserted.id,
      finished_item_id: inserted.finished_item_id,
      finished_item_name: item.name,
      target_qty: parseFloat(inserted.target_qty),
      completed_qty: parseFloat(inserted.completed_qty),
      status: inserted.status,
      planned_date: inserted.planned_date,
      total_cost: inserted.total_cost !== null ? parseFloat(inserted.total_cost) : null,
      created_by: inserted.created_by,
      created_at: inserted.created_at
    });
  } catch (err) {
    console.error("Error creating production order:", err);
    res.status(500).json({ error: "Server error creating production order" });
  }
}

/**
 * PUT /api/production/:id/status
 * Updates status and progress
 * Sequence: PLANNED -> PENDING -> WIP -> IN-TESTING -> COMPLETED
 * On COMPLETED:
 *   - Checks all BOM raw materials availability
 *   - Consumes raw materials (writes Production Consumption history with unit_cost)
 *   - Adds finished goods (writes Production Output history)
 *   - Computes total_cost
 *   - Records completed_qty and completed_at
 * Admin, Manager, Worker
 */
async function updateProductionStatus(req, res) {
  const { id } = req.params;
  const { status, completed_qty, request_id } = req.body;

  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return res.status(400).json({ error: "Invalid production order ID" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock production order row
    const poRes = await client.query(
      `SELECT po.*, fi.name AS finished_item_name, fi.price AS finished_item_price
       FROM production_orders po
       JOIN items fi ON po.finished_item_id = fi.id
       WHERE po.id = $1
       FOR UPDATE`,
      [orderId]
    );

    if (poRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Production order not found" });
    }

    const po = poRes.rows[0];
    const currentStatus = po.status;
    const targetQty = parseFloat(po.target_qty);

    // 1. If already COMPLETED, reject further changes (409 Conflict)
    if (currentStatus === "COMPLETED") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Production order is already COMPLETED" });
    }

    // 2. Validate status transition
    let newStatus = currentStatus;
    if (status) {
      if (!STATUS_ORDER.includes(status)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Invalid status. Allowed values: ${STATUS_ORDER.join(", ")}` });
      }

      const currentIndex = STATUS_ORDER.indexOf(currentStatus);
      const targetIndex = STATUS_ORDER.indexOf(status);

      // Status must either remain the same (e.g. updating progress) or step exactly +1 forward
      if (targetIndex < currentIndex) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Cannot move status backwards from ${currentStatus} to ${status}` });
      }

      if (targetIndex > currentIndex + 1) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Skipping stages is not allowed. Must advance sequentially: PLANNED -> PENDING -> WIP -> IN-TESTING -> COMPLETED`
        });
      }

      newStatus = status;
    }

    // 3. Handle completed_qty update during progress
    let newCompletedQty = parseFloat(po.completed_qty);
    if (completed_qty !== undefined) {
      const numComp = parseFloat(completed_qty);
      if (isNaN(numComp) || numComp < 0 || numComp > targetQty) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `completed_qty must be a number between 0 and target quantity (${targetQty})`
        });
      }
      newCompletedQty = numComp;
    }

    let calculatedTotalCost = po.total_cost !== null ? parseFloat(po.total_cost) : null;
    let completedAt = po.completed_at;

    // 4. Handle Completion Action (Transition to COMPLETED)
    if (newStatus === "COMPLETED") {
      // Fetch BOM lines with locked current raw item stocks and prices
      const bomRes = await client.query(
        `SELECT 
           b.raw_item_id,
           b.qty_per_unit,
           ri.name AS raw_item_name,
           ri.quantity AS current_stock,
           ri.price AS unit_price
         FROM bom_lines b
         JOIN items ri ON b.raw_item_id = ri.id
         WHERE b.finished_item_id = $1
         FOR UPDATE OF ri`,
        [po.finished_item_id]
      );

      if (bomRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Cannot complete: Finished item has no BOM lines" });
      }

      // Check all raw materials first before making any mutation
      for (const bomLine of bomRes.rows) {
        const requiredQty = parseFloat(bomLine.qty_per_unit) * targetQty;
        const availableStock = parseFloat(bomLine.current_stock);

        if (availableStock < requiredQty) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: `Not enough ${bomLine.raw_item_name} in stock. Needed: ${requiredQty}, Available: ${availableStock}`
          });
        }
      }

      // All materials are sufficient: execute stock mutations
      let sumCost = 0;
      for (const bomLine of bomRes.rows) {
        const requiredQty = parseFloat(bomLine.qty_per_unit) * targetQty;
        const unitCost = parseFloat(bomLine.unit_price);
        const lineCost = requiredQty * unitCost;
        sumCost += lineCost;

        // Deduct raw material via stockService
        const consumeRequestId = request_id ? `${request_id}-consume-${bomLine.raw_item_id}` : null;
        await changeStock(client, {
          itemId: bomLine.raw_item_id,
          changeQty: -requiredQty,
          changedVia: "Production Consumption",
          reason: `Production Order #${po.id} consumption for ${po.finished_item_name}`,
          userId: req.user.id,
          productionOrderId: po.id,
          requestId: consumeRequestId,
          unitCost
        });
      }

      calculatedTotalCost = parseFloat(sumCost.toFixed(2));
      const finishedUnitCost = parseFloat((calculatedTotalCost / targetQty).toFixed(2));

      // Increase finished good stock
      const outputRequestId = request_id ? `${request_id}-output-${po.finished_item_id}` : null;
      await changeStock(client, {
        itemId: po.finished_item_id,
        changeQty: targetQty,
        changedVia: "Production Output",
        reason: `Production Order #${po.id} output`,
        userId: req.user.id,
        productionOrderId: po.id,
        requestId: outputRequestId,
        unitCost: finishedUnitCost
      });

      newCompletedQty = targetQty;
      completedAt = new Date();
    }

    // 5. Update production order
    const updateRes = await client.query(
      `UPDATE production_orders
       SET status = $1,
           completed_qty = $2,
           total_cost = $3,
           completed_at = $4,
           updated_at = now()
       WHERE id = $5
       RETURNING *`,
      [newStatus, newCompletedQty, calculatedTotalCost, completedAt, orderId]
    );

    await client.query("COMMIT");

    const updated = updateRes.rows[0];
    res.json({
      id: updated.id,
      finished_item_id: updated.finished_item_id,
      finished_item_name: po.finished_item_name,
      target_qty: parseFloat(updated.target_qty),
      completed_qty: parseFloat(updated.completed_qty),
      status: updated.status,
      planned_date: updated.planned_date,
      total_cost: updated.total_cost !== null ? parseFloat(updated.total_cost) : null,
      created_by: updated.created_by,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      completed_at: updated.completed_at
    });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Error updating production order status:", err);
    res.status(500).json({ error: "Server error updating production order status" });
  } finally {
    client.release();
  }
}

module.exports = {
  getProductionOrders,
  createProductionOrder,
  updateProductionStatus
};

