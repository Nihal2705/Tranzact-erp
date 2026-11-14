import { api } from "../../services/api";

export async function fetchOrders() {
  return api("/orders");
}

export async function fetchOrder(id) {
  const orders = await fetchOrders();
  return orders.find((order) => String(order.id) === String(id)) || null;
}

export async function createOrder(data) {
  const created = await api("/orders", { method: "POST", body: data });
  const id = created?.id ?? created?.order?.id;
  return (id && (await fetchOrder(id))) || created?.order || created;
}

export async function updateOrderStatus(orderId, payload) {
  await api(`/orders/${orderId}/status`, { method: "PUT", body: payload });
  return fetchOrder(orderId);
}

export async function fetchTimeline(orderId) {
  return api(`/orders/${orderId}/timeline`);
}