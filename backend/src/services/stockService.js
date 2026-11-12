const pool = require("../config/db");

/**
 * Shared Stock Service for atomic inventory mutations
 *
 * @param {object} client - pg pool client (optional; if omitted, checks out a client & manages transaction)
 * @param {object} params
 * @param {number} params.itemId - ID of the item to modify
 * @param {number} params.changeQty - Amount to add (+) or subtract (-)
 * @param {string} params.changedVia - One of agreed values: 'Opening Stock', 'Manual Adjustment', 'Sales Dispatch', 'Purchase Inward', 'Production Consumption', 'Production Output'
 * @param {string} params.reason - Explanation for mutation
 * @param {number} params.userId - User ID performing the action
 * @param {number} [params.orderId] - Optional associated order ID
 * @param {number} [params.productionOrderId] - Optional associated production order ID
 * @param {string} [params.requestId] - Frontend UUID to enforce idempotency
 * @param {number} [params.unitCost] - Material price at moment of production
 */
async function changeStock(clientOrPool, params) {
  const {
    itemId,
    changeQty,
    changedVia,
    reason,
    userId,
    orderId = null,
    productionOrderId = null,
    requestId = null,
    unitCost = null
  } = params;

  // Determine whether caller supplied a dedicated transaction client
  const isDedicatedClient = Boolean(clientOrPool && typeof clientOrPool.query === "function" && clientOrPool !== pool);
  const client = isDedicatedClient ? clientOrPool : await pool.connect();
  const manageOwnTransaction = !isDedicatedClient;

  try {
    if (manageOwnTransaction) {
      await client.query("BEGIN");
    }

    // 1. Idempotency Check: if requestId provided, check if already recorded
    if (requestId) {
      const existingHistoryRes = await client.query(
        "SELECT * FROM stock_history WHERE request_id = $1 AND item_id = $2",
        [requestId, itemId]
      );

      if (existingHistoryRes.rows.length > 0) {
        const itemRes = await client.query(
          "SELECT id, name, item_type, unit, quantity, price, low_stock_limit FROM items WHERE id = $1",
          [itemId]
        );

        if (manageOwnTransaction) {
          await client.query("COMMIT");
        }

        return {
          item: {
            ...itemRes.rows[0],
            quantity: parseFloat(itemRes.rows[0].quantity),
            price: parseFloat(itemRes.rows[0].price),
            low_stock_limit: parseFloat(itemRes.rows[0].low_stock_limit)
          },
          history_entry: existingHistoryRes.rows[0],
          is_duplicate: true
        };
      }
    }

    // 2. Lock item row with SELECT ... FOR UPDATE
    const itemLockRes = await client.query(
      "SELECT id, name, item_type, unit, quantity, price, low_stock_limit FROM items WHERE id = $1 FOR UPDATE",
      [itemId]
    );

    if (itemLockRes.rows.length === 0) {
      const err = new Error("Item not found");
      err.statusCode = 404;
      throw err;
    }

    const currentItem = itemLockRes.rows[0];
    const currentQty = parseFloat(currentItem.quantity);
    const change = parseFloat(changeQty);
    const newQty = currentQty + change;

    // 3. Prevent negative stock balance
    if (newQty < 0) {
      const err = new Error(`Stock cannot go below zero. Current stock: ${currentQty}, attempted change: ${change}`);
      err.statusCode = 400;
      throw err;
    }

    // 4. Update items table
    const updateItemRes = await client.query(
      "UPDATE items SET quantity = $1, updated_at = now() WHERE id = $2 RETURNING id, name, item_type, unit, quantity, price, low_stock_limit, updated_at",
      [newQty, itemId]
    );

    // 5. Insert into stock_history table
    const historyRes = await client.query(
      `INSERT INTO stock_history (
        item_id,
        change_qty,
        balance_after,
        changed_via,
        reason,
        unit_cost,
        order_id,
        production_order_id,
        changed_by,
        request_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        itemId,
        change,
        newQty,
        changedVia,
        reason || null,
        unitCost !== null ? parseFloat(unitCost) : null,
        orderId,
        productionOrderId,
        userId,
        requestId || null
      ]
    );

    if (manageOwnTransaction) {
      await client.query("COMMIT");
    }

    const updatedItem = updateItemRes.rows[0];
    return {
      item: {
        ...updatedItem,
        quantity: parseFloat(updatedItem.quantity),
        price: parseFloat(updatedItem.price),
        low_stock_limit: parseFloat(updatedItem.low_stock_limit)
      },
      history_entry: historyRes.rows[0],
      is_duplicate: false
    };
  } catch (err) {
    if (manageOwnTransaction) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackErr) {
        console.error("Rollback error:", rollbackErr);
      }
    }
    throw err;
  } finally {
    if (manageOwnTransaction) {
      client.release();
    }
  }
}

module.exports = { changeStock };

