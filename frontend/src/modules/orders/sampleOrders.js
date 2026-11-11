export const sampleItems = [
  { id: 1, name: "Globe Valve", item_type: "FINISHED", unit: "pcs", price: 300 },
  { id: 2, name: "Steel Rod", item_type: "RAW", unit: "kg", price: 80 },
  { id: 3, name: "Bolts", item_type: "RAW", unit: "pcs", price: 5 },
  { id: 4, name: "Gate Valve", item_type: "FINISHED", unit: "pcs", price: 450 },
];

// small helper to write timeline events shorter
const E = (event, date, details = "") => ({ event, date, details });

let ordersStore = [
  { id: 1, order_type: "SALES", party_name: "Acme Traders", order_date: "2026-10-01", due_date: "2026-10-20", total_amount: 15000,
    invoice_status: "Created", goods_status: "Partially Dispatched",
    lines: [{ id: 11, item_id: 1, item_name: "Globe Valve", quantity: 50, price: 300, fulfilled_qty: 30 }],
    events: [E("Order Created", "2026-10-01T10:00:00"), E("Invoice Created", "2026-10-02T11:30:00"), E("Partially Dispatched", "2026-10-12T15:00:00", "30 of 50 Globe Valve")] },

  { id: 2, order_type: "PURCHASE", party_name: "Steel Supplies Ltd", order_date: "2026-10-05", due_date: "2026-10-25", total_amount: 8000,
    invoice_status: "Pending", goods_status: "Not Dispatched",
    lines: [{ id: 21, item_id: 2, item_name: "Steel Rod", quantity: 100, price: 80, fulfilled_qty: 0 }],
    events: [E("Order Created", "2026-10-05T09:15:00")] },

  { id: 3, order_type: "SALES", party_name: "Delta Works", order_date: "2026-10-10", due_date: "2026-11-15", total_amount: 6000,
    invoice_status: "Created", goods_status: "Dispatched",
    lines: [{ id: 31, item_id: 1, item_name: "Globe Valve", quantity: 20, price: 300, fulfilled_qty: 20 }],
    events: [E("Order Created", "2026-10-10T10:00:00"), E("Invoice Created", "2026-10-11T10:00:00"), E("Dispatched", "2026-10-14T16:00:00", "20 of 20 Globe Valve")] },

  { id: 4, order_type: "SALES", party_name: "Bright Engineering", order_date: "2026-10-12", due_date: "2026-10-30", total_amount: 4500,
    invoice_status: "Created", goods_status: "Not Dispatched",
    lines: [{ id: 41, item_id: 4, item_name: "Gate Valve", quantity: 10, price: 450, fulfilled_qty: 0 }],
    events: [E("Order Created", "2026-10-12T09:30:00"), E("Invoice Created", "2026-10-13T12:00:00")] },

  { id: 5, order_type: "PURCHASE", party_name: "Metro Metals", order_date: "2026-10-14", due_date: "2026-10-28", total_amount: 16000,
    invoice_status: "Created", goods_status: "Partially Dispatched",
    lines: [{ id: 51, item_id: 2, item_name: "Steel Rod", quantity: 200, price: 80, fulfilled_qty: 120 }],
    events: [E("Order Created", "2026-10-14T10:20:00"), E("Invoice Created", "2026-10-15T10:00:00"), E("Partially Dispatched", "2026-10-22T14:00:00", "120 of 200 Steel Rod")] },

  { id: 6, order_type: "SALES", party_name: "Sunrise Industries", order_date: "2026-10-16", due_date: "2026-11-05", total_amount: 9000,
    invoice_status: "Pending", goods_status: "Not Dispatched",
    lines: [{ id: 61, item_id: 1, item_name: "Globe Valve", quantity: 30, price: 300, fulfilled_qty: 0 }],
    events: [E("Order Created", "2026-10-16T11:00:00")] },

  { id: 7, order_type: "PURCHASE", party_name: "Bolt House", order_date: "2026-10-18", due_date: "2026-10-30", total_amount: 2500,
    invoice_status: "Created", goods_status: "Dispatched",
    lines: [{ id: 71, item_id: 3, item_name: "Bolts", quantity: 500, price: 5, fulfilled_qty: 500 }],
    events: [E("Order Created", "2026-10-18T09:00:00"), E("Invoice Created", "2026-10-18T15:00:00"), E("Dispatched", "2026-10-25T11:00:00", "500 of 500 Bolts")] },

  { id: 8, order_type: "SALES", party_name: "Kaveri Pumps", order_date: "2026-10-20", due_date: "2026-11-10", total_amount: 8250,
    invoice_status: "Created", goods_status: "Partially Dispatched",
    lines: [
      { id: 81, item_id: 4, item_name: "Gate Valve", quantity: 15, price: 450, fulfilled_qty: 10 },
      { id: 82, item_id: 1, item_name: "Globe Valve", quantity: 5, price: 300, fulfilled_qty: 0 },
    ],
    events: [E("Order Created", "2026-10-20T10:00:00"), E("Invoice Created", "2026-10-21T10:30:00"), E("Partially Dispatched", "2026-10-28T16:00:00", "10 of 15 Gate Valve")] },

  { id: 9, order_type: "SALES", party_name: "Lakshmi Hardware", order_date: "2026-10-22", due_date: "2026-11-12", total_amount: 12000,
    invoice_status: "Created", goods_status: "Dispatched",
    lines: [{ id: 91, item_id: 1, item_name: "Globe Valve", quantity: 40, price: 300, fulfilled_qty: 40 }],
    events: [E("Order Created", "2026-10-22T09:45:00"), E("Invoice Created", "2026-10-22T14:00:00"), E("Dispatched", "2026-10-30T12:00:00", "40 of 40 Globe Valve")] },

  { id: 10, order_type: "PURCHASE", party_name: "Southern Steels", order_date: "2026-10-25", due_date: "2026-11-08", total_amount: 12000,
    invoice_status: "Pending", goods_status: "Not Dispatched",
    lines: [{ id: 101, item_id: 2, item_name: "Steel Rod", quantity: 150, price: 80, fulfilled_qty: 0 }],
    events: [E("Order Created", "2026-10-25T10:10:00")] },

  { id: 11, order_type: "SALES", party_name: "Orion Fabricators", order_date: "2026-10-28", due_date: "2026-11-18", total_amount: 3600,
    invoice_status: "Pending", goods_status: "Not Dispatched",
    lines: [{ id: 111, item_id: 4, item_name: "Gate Valve", quantity: 8, price: 450, fulfilled_qty: 0 }],
    events: [E("Order Created", "2026-10-28T13:00:00")] },

  { id: 12, order_type: "PURCHASE", party_name: "Fasteners Corp", order_date: "2026-11-02", due_date: "2026-11-15", total_amount: 5000,
    invoice_status: "Created", goods_status: "Partially Dispatched",
    lines: [{ id: 121, item_id: 3, item_name: "Bolts", quantity: 1000, price: 5, fulfilled_qty: 400 }],
    events: [E("Order Created", "2026-11-02T09:00:00"), E("Invoice Created", "2026-11-03T10:00:00"), E("Partially Dispatched", "2026-11-05T15:30:00", "400 of 1000 Bolts")] },

  { id: 13, order_type: "SALES", party_name: "Zenith Tools", order_date: "2026-11-04", due_date: "2026-11-20", total_amount: 7500,
    invoice_status: "Created", goods_status: "Partially Dispatched",
    lines: [{ id: 131, item_id: 1, item_name: "Globe Valve", quantity: 25, price: 300, fulfilled_qty: 10 }],
    events: [E("Order Created", "2026-11-04T10:30:00"), E("Invoice Created", "2026-11-05T09:30:00"), E("Partially Dispatched", "2026-11-07T14:00:00", "10 of 25 Globe Valve")] },
];

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const copy = (x) => JSON.parse(JSON.stringify(x));

export async function fetchOrders() {
  await wait();
  return copy(ordersStore);
}

export async function fetchOrder(id) {
  await wait(200);
  const o = ordersStore.find((x) => String(x.id) === String(id));
  return o ? copy(o) : null;
}

export async function createOrder(data) {
  await wait();
  const id = Math.max(0, ...ordersStore.map((o) => o.id)) + 1;
  const lines = data.lines.map((l, i) => ({
    id: id * 100 + i,
    item_id: l.item_id,
    item_name: sampleItems.find((s) => s.id === l.item_id).name,
    quantity: l.quantity, price: l.price, fulfilled_qty: 0,
  }));
  const order = {
    id, order_type: data.order_type, party_name: data.party_name,
    order_date: data.order_date, due_date: data.due_date,
    total_amount: lines.reduce((s, l) => s + l.quantity * l.price, 0),
    invoice_status: "Pending", goods_status: "Not Dispatched",
    lines, events: [{ event: "Order Created", date: new Date().toISOString(), details: "" }],
  };
  ordersStore = [order, ...ordersStore];
  return copy(order);
}

export async function saveOrder(order) {
  await wait();
  ordersStore = ordersStore.map((o) => (o.id === order.id ? copy(order) : o));
  return copy(order);
}

export const sampleOrders = ordersStore;

const fail = (status, message) =>
  Object.assign(new Error(message), { response: { status, data: { error: message } } });

const doneRequests = new Set(); // request_ids already applied

export async function updateOrderStatus(orderId, payload) {
  await wait();
  const order = ordersStore.find((o) => o.id === Number(orderId));
  if (!order) throw fail(404, "Order not found");

  // same request_id again (double click / retry): change nothing, return current order
  if (payload.request_id && doneRequests.has(payload.request_id)) return copy(order);

  const updated = copy(order); // work on a copy, so an error leaves the store untouched
  const now = new Date().toISOString();

  if (payload.invoice_status === "Created") {
    if (updated.invoice_status === "Created") throw fail(400, "Invoice is already created");
    updated.invoice_status = "Created";
    updated.events.push({ event: "Invoice Created", date: now, details: "" });
  }

  if (payload.dispatch) {
    const sent = [];
    for (const d of payload.dispatch) {
      const line = updated.lines.find((l) => l.id === d.order_item_id);
      if (!line) throw fail(400, "Order line not found");
      const remaining = line.quantity - line.fulfilled_qty;
      if (!(d.qty > 0)) throw fail(400, "Quantity must be more than 0");
      if (d.qty > remaining) throw fail(400, `${line.item_name}: cannot exceed remaining (${remaining})`);
      line.fulfilled_qty += d.qty;
      sent.push(`${d.qty} of ${line.quantity} ${line.item_name}`);
    }
    const all = updated.lines.every((l) => l.fulfilled_qty === l.quantity);
    updated.goods_status = all ? "Dispatched" : "Partially Dispatched";
    updated.events.push({ event: all ? "Dispatched" : "Partially Dispatched", date: now, details: sent.join(", ") });
    if (payload.request_id) doneRequests.add(payload.request_id);
  }

  ordersStore = ordersStore.map((o) => (o.id === updated.id ? copy(updated) : o));
  return copy(updated);
}

export async function fetchTimeline(orderId) {   // later: const { data } = await api.get(`/orders/${orderId}/timeline`)
  await wait(200);
  const order = ordersStore.find((o) => o.id === Number(orderId));
  if (!order) throw Object.assign(new Error("Order not found"), { response: { status: 404, data: { error: "Order not found" } } });
  return copy(order.events).sort((a, b) => new Date(a.date) - new Date(b.date));
}