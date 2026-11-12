import { api } from "../../services/api";

export async function fetchItems() {
  return api("/items");
}

const sameId = (a, b) => String(a) === String(b);

function withProductionDetails(order, items) {
  if (!order) return null;

  const finishedItem = items.find((item) => sameId(item.id, order.finished_item_id));

  const materials = (order.materials || []).map((material) => {
    const rawItem = items.find((item) => sameId(item.id, material.raw_item_id));
    const bomLine = finishedItem?.bom?.find((line) => sameId(line.raw_item_id, material.raw_item_id));

    return {
      ...material,
      unit: rawItem?.unit || "",
      qty_per_unit: bomLine?.qty_per_unit,
      unit_cost: Number(rawItem?.price) || 0,
    };
  });

  return {
    ...order,
    finished_unit: finishedItem?.unit || "",
    materials,
    est_cost: materials.reduce((sum, m) => sum + Number(m.qty_needed) * m.unit_cost, 0),
  };
}

export async function fetchProduction() {
  const [orders, items] = await Promise.all([api("/production"), fetchItems()]);
  return orders.map((order) => withProductionDetails(order, items));
}

export async function fetchProductionOrder(id) {
  const orders = await fetchProduction();
  return orders.find((order) => sameId(order.id, id)) || null;
}

export async function createProduction(data) {
  const created = await api("/production", { method: "POST", body: data });
  const id = created?.id ?? created?.order?.id;
  return (id && (await fetchProductionOrder(id))) || created?.order || created;
}

export async function updateProductionStatus(id, payload) {
  await api(`/production/${id}/status`, { method: "PUT", body: payload });
  return fetchProductionOrder(id);
}