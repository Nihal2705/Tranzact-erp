import { useEffect, useState } from "react";
import CreateOrderForm from "../modules/orders/CreateOrderForm";
import OrderTable from "../modules/orders/OrderTable";
import { fetchOrders } from "../modules/orders/sampleOrders";
import { errorMessage } from "../modules/orders/orderUtils";

const TABS = [
  { key: "ALL", label: "All" },
  { key: "SALES", label: "Sales" },
  { key: "PURCHASE", label: "Purchase" },
];

const input =
  "h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30";

export default function OrdersPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const blocked = user.role === "Worker";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setOrders(await fetchOrders()); }
    catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (!blocked) load(); }, []);

  if (blocked) return <p className="text-red-600">You do not have permission to view orders.</p>;

  const q = search.trim().toLowerCase().replace("#", "");
  const rows = orders.filter((o) =>
    (tab === "ALL" || o.order_type === tab) &&
    (status === "ALL" || (status === "INV_PENDING" ? o.invoice_status === "Pending" : o.goods_status === "Not Dispatched")) &&
    (!q || (o.party_name || "").toLowerCase().includes(q) || String(o.id) === q) &&
    (!from || o.order_date >= from) &&
    (!to || o.order_date <= to));

  const onCreated = (order) => {
    setOrders([order, ...orders]); setShowForm(false);
    setToast("Order created"); setTimeout(() => setToast(""), 3000);
    load(); // reload so dates and totals match the database
  };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed right-5 top-5 z-50 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">Sales and purchase orders in one list.</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">+ Create order</button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search party or order…"
            className={`${input} w-full rounded-full bg-slate-50 pl-9`} />
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`rounded-lg px-3.5 py-1.5 font-medium ${tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{t.label}</button>
          ))}
        </div>

        <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="INV_PENDING">Invoice Pending</option>
          <option value="NOT_DISP">Not Dispatched</option>
        </select>
        <input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
      </div>

      <OrderTable rows={rows} loading={loading} error={error} onRetry={load} totalCount={orders.length} />

      <CreateOrderForm open={showForm} onClose={() => setShowForm(false)} onCreated={onCreated} />
    </div>
  );
}
