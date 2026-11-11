const pool = require("../config/db");
const { changeStock } = require("../services/stockService");

/**
 * GET /api/items
 * Returns all items, optionally filtered by ?search=
 * Includes is_low_stock flag and BOM lines for finished goods
 */
async function getItems(req, res) {
  const { search } = req.query;

  try {
    const query = `
      SELECT 
        i.id,
        i.name,
        i.item_type,
        i.unit,
        i.quantity,
        i.price,
        i.low_stock_limit,
        (i.quantity < i.low_stock_limit) AS is_low_stock,
        COALESCE(
          json_agg(
            json_build_object(
              'raw_item_id', b.raw_item_id,
              'raw_item_name', r.name,
              'qty_per_unit', b.qty_per_unit
            )
          ) FILTER (WHERE b.id IS NOT NULL),
          '[]'::json
        ) AS bom
      FROM items i
      LEFT JOIN bom_lines b ON i.id = b.finished_item_id
      LEFT JOIN items r ON b.raw_item_id = r.id
      WHERE ($1::text IS NULL OR i.name ILIKE '%' || $1 || '%')
      GROUP BY i.id
      ORDER BY i.id ASC
    `;

    const result = await pool.query(query, [search ? search.trim() : null]);

    const formatted = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      item_type: row.item_type,
      unit: row.unit,
      quantity: parseFloat(row.quantity),
      price: parseFloat(row.price),
      low_stock_limit: parseFloat(row.low_stock_limit),
      is_low_stock: row.is_low_stock,
      bom: (row.bom || []).map((b) => ({
        raw_item_id: b.raw_item_id,
        raw_item_name: b.raw_item_name,
        qty_per_unit: parseFloat(b.qty_per_unit)
      }))
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).json({ error: "Server error fetching items" });
  }
}

/**
 * POST /api/items
 * Creates a new item (Admin, Manager only)
 * If opening_qty > 0, atomically inserts an Opening Stock history entry
 */
async function createItem(req, res) {
  const { name, item_type, unit, price, low_stock_limit = 0, opening_qty = 0 } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Item name is required" });
  }

  if (!item_type || !["RAW", "FINISHED"].includes(item_type)) {
    return res.status(400).json({ error: "item_type must be either 'RAW' or 'FINISHED'" });
  }

  if (!unit || typeof unit !== "string" || !unit.trim()) {
    return res.status(400).json({ error: "Unit is required" });
  }

  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: "Price must be a valid non-negative number" });
  }

  const numLimit = parseFloat(low_stock_limit);
  if (isNaN(numLimit) || numLimit < 0) {
    return res.status(400).json({ error: "low_stock_limit must be a valid non-negative number" });
  }

  const numOpeningQty = parseFloat(opening_qty);
  if (isNaN(numOpeningQty) || numOpeningQty < 0) {
    return res.status(400).json({ error: "opening_qty must be a valid non-negative number" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check duplicate name
    const existingNameRes = await client.query("SELECT id FROM items WHERE LOWER(name) = LOWER($1)", [name.trim()]);
    if (existingNameRes.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Item with this name already exists" });
    }

    // Insert item
    const itemInsertRes = await client.query(
      `INSERT INTO items (name, item_type, unit, quantity, price, low_stock_limit)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name.trim(), item_type, unit.trim(), numOpeningQty, numPrice, numLimit]
    );

    const newItem = itemInsertRes.rows[0];

    // If opening stock > 0, write stock_history record
    if (numOpeningQty > 0) {
      await client.query(
        `INSERT INTO stock_history (
          item_id,
          change_qty,
          balance_after,
          changed_via,
          reason,
          changed_by
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          newItem.id,
          numOpeningQty,
          numOpeningQty,
          "Opening Stock",
          "Initial opening stock",
          req.user.id
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      id: newItem.id,
      name: newItem.name,
      item_type: newItem.item_type,
      unit: newItem.unit,
      quantity: parseFloat(newItem.quantity),
      price: parseFloat(newItem.price),
      low_stock_limit: parseFloat(newItem.low_stock_limit),
      created_at: newItem.created_at,
      updated_at: newItem.updated_at
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating item:", err);
    res.status(500).json({ error: "Server error creating item" });
  } finally {
    client.release();
  }
}

/**
 * PUT /api/items/:id
 * Updates item details (Admin, Manager only)
 * Business rule: Editing details must never modify quantity!
 */
async function updateItem(req, res) {
  const { id } = req.params;
  const { name, unit, price, low_stock_limit } = req.body;

  if (req.body.quantity !== undefined) {
    return res.status(400).json({ error: "Modifying item quantity via this endpoint is not allowed. Use change stock." });
  }

  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return res.status(400).json({ error: "Invalid item ID" });
  }

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Item name is required" });
  }

  if (!unit || typeof unit !== "string" || !unit.trim()) {
    return res.status(400).json({ error: "Unit is required" });
  }

  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: "Price must be a valid non-negative number" });
  }

  const numLimit = parseFloat(low_stock_limit);
  if (isNaN(numLimit) || numLimit < 0) {
    return res.status(400).json({ error: "low_stock_limit must be a valid non-negative number" });
  }

  try {
    // Check if item exists
    const checkRes = await pool.query("SELECT id FROM items WHERE id = $1", [itemId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Check name collision with another item
    const collisionRes = await pool.query(
      "SELECT id FROM items WHERE LOWER(name) = LOWER($1) AND id <> $2",
      [name.trim(), itemId]
    );
    if (collisionRes.rows.length > 0) {
      return res.status(409).json({ error: "Item with this name already exists" });
    }

    const updateRes = await pool.query(
      `UPDATE items
       SET name = $1, unit = $2, price = $3, low_stock_limit = $4, updated_at = now()
       WHERE id = $5
       RETURNING *`,
      [name.trim(), unit.trim(), numPrice, numLimit, itemId]
    );

    const updated = updateRes.rows[0];
    res.json({
      id: updated.id,
      name: updated.name,
      item_type: updated.item_type,
      unit: updated.unit,
      quantity: parseFloat(updated.quantity),
      price: parseFloat(updated.price),
      low_stock_limit: parseFloat(updated.low_stock_limit),
      created_at: updated.created_at,
      updated_at: updated.updated_at
    });
  } catch (err) {
    console.error("Error updating item:", err);
    res.status(500).json({ error: "Server error updating item" });
  }
}

/**
 * PUT /api/items/:id/stock
 * Adjusts quantity (+/-) with mandatory reason (Admin, Manager, Worker)
 * Passes through shared stockService
 */
async function changeItemStock(req, res) {
  const { id } = req.params;
  const { change_qty, reason, request_id } = req.body;

  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return res.status(400).json({ error: "Invalid item ID" });
  }

  const numChange = parseFloat(change_qty);
  if (isNaN(numChange) || numChange === 0) {
    return res.status(400).json({ error: "change_qty must be a non-zero number" });
  }

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ error: "Reason is required" });
  }

  try {
    const result = await changeStock(null, {
      itemId,
      changeQty: numChange,
      changedVia: "Manual Adjustment",
      reason: reason.trim(),
      userId: req.user.id,
      requestId: request_id || null
    });

    res.json({
      item: result.item,
      history_entry: {
        id: result.history_entry.id,
        item_id: result.history_entry.item_id,
        change_qty: parseFloat(result.history_entry.change_qty),
        balance_after: parseFloat(result.history_entry.balance_after),
        changed_via: result.history_entry.changed_via,
        reason: result.history_entry.reason,
        changed_by: result.history_entry.changed_by,
        created_at: result.history_entry.created_at
      }
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Error modifying item stock:", err);
    res.status(500).json({ error: "Server error updating stock" });
  }
}

/**
 * GET /api/items/:id/history
 * Returns movement history for an item (newest first)
 */
async function getItemHistory(req, res) {
  const { id } = req.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return res.status(400).json({ error: "Invalid item ID" });
  }

  try {
    // Check if item exists
    const itemCheck = await pool.query("SELECT id FROM items WHERE id = $1", [itemId]);
    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    const historyRes = await pool.query(
      `SELECT 
         sh.id,
         sh.created_at,
         sh.changed_via,
         sh.change_qty,
         sh.balance_after,
         sh.reason,
         sh.unit_cost,
         sh.order_id,
         sh.production_order_id,
         u.name AS changed_by_name
       FROM stock_history sh
       JOIN users u ON sh.changed_by = u.id
       WHERE sh.item_id = $1
       ORDER BY sh.created_at DESC, sh.id DESC`,
      [itemId]
    );

    const formatted = historyRes.rows.map((row) => ({
      id: row.id,
      created_at: row.created_at,
      changed_via: row.changed_via,
      change_qty: parseFloat(row.change_qty),
      balance_after: parseFloat(row.balance_after),
      reason: row.reason,
      unit_cost: row.unit_cost !== null ? parseFloat(row.unit_cost) : null,
      order_id: row.order_id,
      production_order_id: row.production_order_id,
      changed_by_name: row.changed_by_name
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching item history:", err);
    res.status(500).json({ error: "Server error fetching stock history" });
  }
}

/**
 * GET /api/items/low-stock
 * Returns all items where quantity < low_stock_limit
 */
async function getLowStockItems(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, item_type, unit, quantity, price, low_stock_limit
       FROM items
       WHERE quantity < low_stock_limit
       ORDER BY name ASC`
    );

    const formatted = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      item_type: row.item_type,
      unit: row.unit,
      quantity: parseFloat(row.quantity),
      price: parseFloat(row.price),
      low_stock_limit: parseFloat(row.low_stock_limit)
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching low stock items:", err);
    res.status(500).json({ error: "Server error fetching low-stock items" });
  }
}

module.exports = {
  getItems,
  createItem,
  updateItem,
  changeItemStock,
  getItemHistory,
  getLowStockItems
};

