// FAKE data store for Production. Same shapes as Person 4's API replies.
// When the API is ready, replace each function body with a call through services/api.js.
import { STAGES } from "./productionUtils";

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const copy = (x) => JSON.parse(JSON.stringify(x));
const fail = (status, message) =>
  Object.assign(new Error(message), { response: { status, data: { error: message } } });

// Items with stock and BOM (recipe).  later: GET /api/items
let itemsStore = [
  { id: 2, name: "Steel Rod", item_type: "RAW", unit: "kg", quantity: 150, price: 80, bom: [] },
  { id: 3, name: "Bolts", item_type: "RAW", unit: "pcs", quantity: 30, price: 5, bom: [] },
  { id: 5, name: "Brass Ingot", item_type: "RAW", unit: "kg", quantity: 80, price: 340, bom: [] },
  { id: 1, name: "Globe Valve", item_type: "FINISHED", unit: "pcs", quantity: 45, price: 300,
    bom: [{ raw_item_id: 2, qty_per_unit: 2 }, { raw_item_id: 3, qty_per_unit: 4 }] },
  { id: 4, name: "Gate Valve", item_type: "FINISHED", unit: "pcs", quantity: 12, price: 450,
    bom: [{ raw_item_id: 2, qty_per_unit: 3 }, { raw_item_id: 3, qty_per_unit: 6 }, { raw_item_id: 5, qty_per_unit: 0.5 }] },
];

let productionStore = [
  { id: 12, finished_item_id: 1, target_qty: 10, completed_qty: 4, status: "WIP", planned_date: "2026-11-05", created_at: "2026-10-28", total_cost: null, completed_at: null },
  { id: 13, finished_item_id: 4, target_qty: 5, completed_qty: 0, status: "PLANNED", planned_date: "2026-11-12", created_at: "2026-11-01", total_cost: null, completed_at: null },
  { id: 14, finished_item_id: 1, target_qty: 10, completed_qty: 10, status: "COMPLETED", planned_date: "2026-10-20", created_at: "2026-10-10", total_cost: 1800, completed_at: "2026-10-22" },
];

const itemById = (id) => itemsStore.find((i) => i.id === id);

// Add the materials list (BOM quantity x target) to a production order
const withMaterials = (p) => {
  const finished = itemById(p.finished_item_id);
  const materials = finished.bom.map((b) => {
    const raw = itemById(b.raw_item_id);
    return {
      raw_item_id: raw.id, raw_item_name: raw.name, unit: raw.unit,
      qty_per_unit: b.qty_per_unit, qty_needed: b.qty_per_unit * p.target_qty,
      qty_in_stock: raw.quantity, unit_cost: raw.price,
    };
  });
  return {
    ...copy(p), finished_item_name: finished.name, finished_unit: finished.unit, materials,
    est_cost: materials.reduce((s, m) => s + m.qty_needed * m.unit_cost, 0),
  };
};

export async function fetchItems() {                  // later: api.get("/items")
  await wait(200);
  return copy(itemsStore).map((i) => ({
    ...i, bom: i.bom.map((b) => ({ ...b, raw_item_name: itemById(b.raw_item_id).name })),
  }));
}

export async function fetchProduction() {             // later: api.get("/production")
  await wait();
  return productionStore.map(withMaterials);
}

export async function fetchProductionOrder(id) {      // later: find in api.get("/production")
  await wait(200);
  const p = productionStore.find((x) => String(x.id) === String(id));
  return p ? withMaterials(p) : null;
}

export async function createProduction(data) {        // later: api.post("/production", data)
  await wait();
  const item = itemById(data.finished_item_id);
  if (!item || item.item_type !== "FINISHED" || item.bom.length === 0)
    throw fail(400, "Choose a finished item that has a recipe (BOM)");
  const id = Math.max(0, ...productionStore.map((p) => p.id)) + 1;
  const p = { id, finished_item_id: item.id, target_qty: data.target_qty, completed_qty: 0, status: "PLANNED",
    planned_date: data.planned_date, created_at: new Date().toISOString().slice(0, 10), total_cost: null, completed_at: null };
  productionStore = [p, ...productionStore];
  return withMaterials(p);
}

// Mirrors PUT /api/production/:id/status
const doneRequests = new Set();
export async function updateProductionStatus(id, payload) { // later: api.put(`/production/${id}/status`, payload)
  await wait();
  const p = productionStore.find((x) => x.id === Number(id));
  if (!p) throw fail(404, "Production order not found");
  if (payload.request_id && doneRequests.has(payload.request_id)) return withMaterials(p); // repeated: change nothing
  if (p.status === "COMPLETED") throw fail(409, "This production order is already completed");

  const next = { ...p };

  if (payload.completed_qty !== undefined) {
    if (!["WIP", "IN-TESTING"].includes(p.status)) throw fail(400, "Progress can only be updated during WIP or IN-TESTING");
    const n = Number(payload.completed_qty);
    if (isNaN(n) || n < 0 || n > p.target_qty) throw fail(400, `Completed quantity must be between 0 and ${p.target_qty}`);
    next.completed_qty = n;
  }

  if (payload.status) {
    const expected = STAGES[STAGES.indexOf(p.status) + 1];
    if (payload.status !== expected) throw fail(400, `Status can only move to ${expected}`);
    next.status = payload.status;

    if (next.status === "COMPLETED") {
      const mats = withMaterials(p).materials;
      const short = mats.find((m) => m.qty_in_stock < m.qty_needed);
      if (short) throw fail(400, `Not enough ${short.raw_item_name} in stock`);   // nothing changes
      mats.forEach((m) => { itemById(m.raw_item_id).quantity -= m.qty_needed; });  // Production Consumption
      itemById(p.finished_item_id).quantity += p.target_qty;                        // Production Output
      next.total_cost = mats.reduce((s, m) => s + m.qty_needed * m.unit_cost, 0);
      next.completed_qty = p.target_qty;
      next.completed_at = new Date().toISOString().slice(0, 10);
    }
  }

  productionStore = productionStore.map((x) => (x.id === next.id ? next : x));
  if (payload.request_id) doneRequests.add(payload.request_id);
  return withMaterials(next);
}
