import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import OrderTimeline from "../modules/orders/OrderTimeline";
import { fetchOrder, fetchTimeline, updateOrderStatus } from "../modules/orders/sampleOrders";
import { errorMessage } from "../modules/orders/orderUtils";

const today = () => new Date().toISOString().slice(0, 10);
const money = (n) => Number(n || 0).toLocaleString("en-IN");

const ico = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
const DocIcon = () => <svg {...ico}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></svg>;
const TruckIcon = () => <svg {...ico}><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>;
const ClockIcon = () => <svg {...ico}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;

function Stat({ icon, tone, label, children }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-0.5">{children}</div>
      </div>
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
  if (loading) return <p className="text-slate-500">Loading order…</p>;
  if (error) return <p className="text-red-600">{error} <button onClick={load} className="ml-2 rounded-xl border border-slate-300 px-3 py-1 text-sm text-slate-700">Retry</button></p>;
  if (!order) return <p>Order not found. <Link className="text-teal-600" to="/orders">Back to orders</Link></p>;

  const isSales = order.order_type === "SALES";
  const verb = isSales ? "Dispatch" : "Receive";
  const direction = isSales ? "down" : "up";
  const lines = order.lines || [];
  const remainingOf = (l) => Number(l.quantity) - Number(l.fulfilled_qty);
  const toSend = lines.filter((l) => Number(qty[l.id]) > 0);
  const late = order.due_date && order.due_date < today() && order.goods_status !== "Dispatched";
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };

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
      flash(payload.invoice_status ? "Invoice created" : `Goods ${isSales ? "dispatched" : "received"}`);
    } catch (err) {
      setConfirm(null);
      if (err.response?.status === 401) return navigate("/login");
      setFormError(errorMessage(err));
    } finally { setBusy(false); }
  };

  const th = "px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="space-y-6">
      {toast && <div className="fixed right-5 top-5 z-50 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/orders" className="text-sm font-medium text-teal-600 hover:text-teal-800">← Back to orders</Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Order #{order.id} · {order.party_name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSales ? "Sales" : "Purchase"} order · placed {order.order_date} · due {order.due_date || "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <button disabled={order.invoice_status === "Created"} onClick={() => openConfirm("invoice")}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            {order.invoice_status === "Created" ? "Invoice created" : "Create invoice"}
          </button>
          <button disabled={order.goods_status === "Dispatched"} onClick={askDispatch}
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
            {verb} goods
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon="₹" tone="bg-teal-100 text-teal-700" label="Order total">
          <div className="text-2xl font-bold text-slate-900">₹{money(order.total_amount)}</div>
        </Stat>
        <Stat icon={<DocIcon />} tone="bg-blue-100 text-blue-700" label="Invoice"><StatusBadge status={order.invoice_status} /></Stat>
        <Stat icon={<TruckIcon />} tone="bg-amber-100 text-amber-700" label="Goods"><StatusBadge status={order.goods_status} /></Stat>
        <Stat icon={<ClockIcon />} tone="bg-red-100 text-red-600" label="Due date">
          <div className={`text-2xl font-bold ${late ? "text-red-600" : "text-slate-900"}`}>{order.due_date || "—"}</div>
        </Stat>
      </div>

      {formError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{formError}</div>}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="px-5 py-4"><h2 className="text-lg font-semibold text-slate-900">Order lines</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className={th}>Item</th>
                  <th className={`${th} text-right`}>Ordered</th>
                  <th className={`${th} text-right`}>{isSales ? "Dispatched" : "Received"}</th>
                  <th className={`${th} text-right`}>Remaining</th>
                  <th className={`${th} text-right`}>{verb} now</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-semibold text-slate-900">{l.item_name}</td>
                    <td className="px-5 py-4 text-right">{Number(l.quantity)}</td>
                    <td className="px-5 py-4 text-right">{Number(l.fulfilled_qty)}</td>
                    <td className="px-5 py-4 text-right">{remainingOf(l)}</td>
                    <td className="px-5 py-4 text-right">
                      {remainingOf(l) <= 0 ? (
                        <span className="text-slate-400">Done</span>
                      ) : (
                        <input type="number" min="0" placeholder="0" value={qty[l.id] || ""}
                          onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })}
                          className="h-10 w-24 rounded-xl border border-slate-300 px-3 text-right text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            You can {verb.toLowerCase()} part of an order. Stock goes {direction} by the quantity you {verb.toLowerCase()}.
          </div>
        </div>

        <OrderTimeline events={events} total={order.total_amount} isSales={isSales}
          loading={timelineLoading} error={timelineError} onRetry={loadTimeline} />
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
