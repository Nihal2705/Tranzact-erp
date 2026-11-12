import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import OrderTimeline from "../modules/orders/OrderTimeline";
import { fetchOrder, fetchTimeline, updateOrderStatus } from "../modules/orders/sampleOrders";
import { errorMessage } from "../modules/orders/orderUtils";

const today = () => new Date().toISOString().slice(0, 10);
const money = (n) => Number(n || 0).toLocaleString("en-IN");

function Info({ label, children }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-base text-gray-900">{children}</div>
    </div>
  );
}

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const blocked = user.role === "Worker";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qty, setQty] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [requestId, setRequestId] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");

  const [events, setEvents] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setOrder(await fetchOrder(id)); }
    catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  };

  const loadTimeline = async () => {
    setTimelineLoading(true); setTimelineError("");
    try { setEvents(await fetchTimeline(id)); }
    catch (err) { setTimelineError(errorMessage(err)); }
    finally { setTimelineLoading(false); }
  };

  useEffect(() => { if (!blocked) { load(); loadTimeline(); } }, [id]);

  if (blocked) return <p className="text-red-600">You do not have permission to view orders.</p>;
  if (loading) return <p className="text-gray-500">Loading order…</p>;
  if (error) return <p className="text-red-600">{error} <button onClick={load} className="ml-2 rounded border px-2 py-1 text-xs text-gray-700">Retry</button></p>;
  if (!order) return <p>Order not found. <Link className="text-blue-600" to="/orders">Back to orders</Link></p>;

  const isSales = order.order_type === "SALES";
  const verb = isSales ? "Dispatch" : "Receive";
  const direction = isSales ? "down" : "up";
  const lines = order.lines || [];
  const toSend = lines.filter((l) => Number(qty[l.id]) > 0);
  const isLate = order.due_date && order.due_date < today() && order.goods_status !== "Dispatched";
  const remainingOf = (l) => Number(l.quantity) - Number(l.fulfilled_qty);

  const openConfirm = (kind) => {
    if (!requestId) setRequestId(crypto.randomUUID());
    setConfirm(kind);
  };

  const askDispatch = () => {
    setFormError("");
    for (const l of lines) {
      const n = Number(qty[l.id] || 0);
      if (isNaN(n) || n < 0) return setFormError(`${l.item_name}: enter a valid number`);
      if (n > remainingOf(l)) return setFormError(`${l.item_name}: cannot exceed remaining (${remainingOf(l)})`);
    }
    if (toSend.length === 0) return setFormError("Enter a quantity for at least one line");
    openConfirm("dispatch");
  };

  const apply = async () => {
    setBusy(true); setFormError("");
    const payload = confirm === "invoice"
      ? { invoice_status: "Created" }
      : { dispatch: toSend.map((l) => ({ order_item_id: l.id, qty: Number(qty[l.id]) })), request_id: requestId };
    try {
      const data = await updateOrderStatus(id, payload);
      setOrder(data);
      loadTimeline();
      setQty({}); setRequestId(""); setConfirm(null);
      setToast(payload.invoice_status ? "Invoice created" : `Goods ${isSales ? "dispatched" : "received"}`);
      setTimeout(() => setToast(""), 3000);
    } catch (err) {
      setConfirm(null);
      if (err.response?.status === 401) return navigate("/login");
      setFormError(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      {toast && <div className="fixed right-4 top-4 z-50 rounded bg-green-600 px-4 py-2 text-sm text-white shadow">{toast}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="text-sm text-gray-500">
          <Link to="/orders" className="text-blue-600 hover:underline">Orders</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">Order #{order.id}</span>
        </nav>
        <div className="flex gap-2">
          <button disabled={order.invoice_status === "Created"} onClick={() => openConfirm("invoice")}
            className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40">
            Create Invoice
          </button>
          <button disabled={order.goods_status === "Dispatched"} onClick={askDispatch}
            className="rounded-lg border border-blue-800 bg-white px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40">
            {verb} Goods
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Order #{order.id}</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Invoice</span><StatusBadge status={order.invoice_status} />
          <span className="ml-2 text-xs text-gray-500">Goods</span><StatusBadge status={order.goods_status} />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-5 md:grid-cols-5">
          <Info label={isSales ? "Customer" : "Supplier"}>{order.party_name}</Info>
          <Info label="Order Type">{isSales ? "Sales" : "Purchase"}</Info>
          <Info label="Order Date">{order.order_date}</Info>
          <Info label="Due Date">
            <span className={isLate ? "font-semibold text-red-600" : ""}>
              {order.due_date || "—"}{isLate && " (late)"}
            </span>
          </Info>
          <Info label="Order Total">₹{money(order.total_amount)}</Info>
        </div>
      </div>

      {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-lg font-semibold text-gray-900">Items</h2>
              <span className="text-sm text-gray-500">{lines.length} {lines.length === 1 ? "item" : "items"}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-left text-blue-800">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Ordered</th>
                    <th className="px-4 py-3">{isSales ? "Dispatched" : "Received"} so far</th>
                    <th className="px-4 py-3">Remaining</th>
                    <th className="px-4 py-3">{verb} now</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="px-4 py-3 font-medium text-gray-900">{l.item_name}</td>
                      <td className="px-4 py-3">{Number(l.quantity)}</td>
                      <td className="px-4 py-3">{Number(l.fulfilled_qty)}</td>
                      <td className="px-4 py-3">{remainingOf(l)}</td>
                      <td className="px-4 py-3">
                        <input type="number" min="0" placeholder="0"
                          className="w-24 rounded-lg border p-2 text-sm disabled:bg-gray-100"
                          value={qty[l.id] || ""} disabled={remainingOf(l) <= 0}
                          onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t bg-gray-50 px-5 py-3 text-sm">
              <span className="text-gray-500">{lines.length} {lines.length === 1 ? "line" : "lines"}</span>
              <span className="text-base font-semibold text-gray-900">Order total: ₹{money(order.total_amount)}</span>
            </div>
          </div>
        </div>

        <div>
          <OrderTimeline events={events} total={order.total_amount} isSales={isSales}
            loading={timelineLoading} error={timelineError} onRetry={loadTimeline} />
        </div>
      </div>

      <Modal open={confirm === "invoice"} title="Create invoice?" message="The invoice status will change to Created."
        onClose={() => setConfirm(null)} onConfirm={apply} busy={busy} />
      <Modal open={confirm === "dispatch"} title={`${verb} goods?`} busy={busy}
        message={toSend.map((l) =>
          `${verb} ${qty[l.id]} of ${Number(l.quantity)} ${l.item_name}? Stock will go ${direction} by ${qty[l.id]}.`).join(" ")}
        onClose={() => setConfirm(null)} onConfirm={apply} />
    </div>
  );
}