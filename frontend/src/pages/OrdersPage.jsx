import { useEffect, useState } from "react";
import CreateOrderForm from "../modules/orders/CreateOrderForm";
import OrderTable from "../modules/orders/OrderTable";
import { fetchOrders } from "../modules/orders/sampleOrders";

const GROUP = {
  "Not Dispatched": "PENDING",
  "Partially Dispatched": "PROCESSING",
  Dispatched: "COMPLETED",
};
const groupOf = (order) => GROUP[order.goods_status];


const Icon = ({ d, className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);
const ICONS = {
  total: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  pending: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  processing: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  completed: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  arrow: "M7 17L17 7M17 7H8M17 7v9",
  search: "M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z",
};

const CARDS = [
  {
    key: "ALL", label: "Total Orders", icon: ICONS.total,
    grad: "bg-gradient-to-br from-blue-100 via-blue-50 to-white",
    iconBg: "bg-blue-600", color: "text-gray-900",
    pill: "border-blue-400 text-blue-700", ring: "ring-blue-500",
  },
  {
    key: "PENDING", label: "Pending", icon: ICONS.pending,
    grad: "bg-gradient-to-br from-red-100 via-red-50 to-white",
    iconBg: "bg-red-500", color: "text-red-600",
    pill: "border-red-400 text-red-700", ring: "ring-red-500",
  },
  {
    key: "PROCESSING", label: "Processing", icon: ICONS.processing,
    grad: "bg-gradient-to-br from-orange-100 via-orange-50 to-white",
    iconBg: "bg-orange-500", color: "text-orange-600",
    pill: "border-orange-400 text-orange-700", ring: "ring-orange-500",
  },
  {
    key: "COMPLETED", label: "Completed", icon: ICONS.completed,
    grad: "bg-gradient-to-br from-green-100 via-green-50 to-white",
    iconBg: "bg-green-600", color: "text-green-600",
    pill: "border-green-400 text-green-700", ring: "ring-green-500",
  },
];

const TABS = [
  { key: "ALL", label: "All" },
  { key: "SALES", label: "Sales" },
  { key: "PURCHASE", label: "Purchase" },
];

   const inputCls =
     "rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-gray-900 " +
     "transition hover:border-slate-400 focus:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/30";
export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [invoiceFilter, setInvoiceFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setOrders(await fetchOrders()); }
    catch { setError("Could not load orders. Please try again."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const counts = {
    ALL: orders.length,
    PENDING: orders.filter((o) => groupOf(o) === "PENDING").length,
    PROCESSING: orders.filter((o) => groupOf(o) === "PROCESSING").length,
    COMPLETED: orders.filter((o) => groupOf(o) === "COMPLETED").length,
  };

  const q = search.trim().toLowerCase().replace("#", "");
  const rows = orders.filter((o) =>
    (tab === "ALL" || o.order_type === tab) &&
    (statusFilter === "ALL" || groupOf(o) === statusFilter) &&
    (invoiceFilter === "ALL" || o.invoice_status === invoiceFilter) &&
    (!q || String(o.id).includes(q) || o.party_name.toLowerCase().includes(q)) &&
    (!from || o.order_date >= from) &&
    (!to || o.order_date <= to));

  const clickCard = (key) => setStatusFilter(statusFilter === key ? "ALL" : key);
  const clearFilters = () => {
    setTab("ALL"); setStatusFilter("ALL"); setInvoiceFilter("ALL"); setSearch(""); setFrom(""); setTo("");
  };
  const anyFilter = tab !== "ALL" || statusFilter !== "ALL" || invoiceFilter !== "ALL" || search || from || to;

  const onCreated = (order) => {
    setOrders([order, ...orders]); setShowForm(false);
    setToast("Order created"); setTimeout(() => setToast(""), 3000);
  };

  const pillText = (key) => {
    if (key === "ALL") return `${counts.ALL} in total`;
    const pct = counts.ALL ? Math.round((counts[key] / counts.ALL) * 100) : 0;
    return `${pct}% of all orders`;
  };

  return (
    <div className="space-y-7 text-base">
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-xl bg-green-600 px-6 py-3 text-lg font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Orders</h1>
          <p className="mt-1 text-lg italic text-gray-500">Here's what's happening with your orders</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-blue-800 px-6 py-3 text-lg font-semibold text-white shadow-md transition hover:bg-blue-900 hover:shadow-lg"
        >
          + Create Order
        </button>
      </div>

      {/* Stat cards */}
      
{/* Stat Cards */}
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  {CARDS.map((c) => {
    const active = statusFilter === c.key;

    return (
      <button
        key={c.key}
        onClick={() => clickCard(c.key)}
        className={`group rounded-2xl p-4 text-left shadow-sm
          transition duration-200 hover:-translate-y-1 hover:shadow-md
          ${c.grad}
          ${active ? `ring-2 ${c.ring}` : "ring-1 ring-black/5"}`}
      >
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 items-center justify-center
              rounded-full text-white ${c.iconBg}`}>
              <Icon d={c.icon} className="h-4 w-4" />
            </span>

            <span className="text-sm font-medium text-gray-800">
              {c.label}
            </span>
          </div>

          <span className="flex h-8 w-8 items-center justify-center
            rounded-full bg-white/80 text-gray-700 shadow-sm
            transition group-hover:bg-white">
            <Icon d={ICONS.arrow} className="h-4 w-4" />
          </span>
        </div>

        <div className={`mt-3 text-4xl font-bold tracking-tight ${c.color}`}>
          {counts[c.key]}
        </div>

        <span className={`mt-2 inline-block rounded-full border
          bg-white/70 px-2.5 py-1 text-xs font-medium ${c.pill}`}>
          {pillText(c.key)}
        </span>
      </button>
    );
  })}
</div>

      {/* Tabs: classic underline style */}
      <div className="flex items-center gap-2 border-b border-gray-300">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-[3px] px-4 py-2 text-sm transition ${
              tab === t.key
                ? "border-blue-900 font-semibold text-blue-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

     
      {/* Toolbar card: search + filters */}
<div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
  <div className="relative min-w-[200px] flex-1">
    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-blue-800">
      <Icon d={ICONS.search} className="h-4 w-4" />
    </span>
    <input
      className={`${inputCls} w-full pl-10`}
      placeholder="Search by order ID or customer"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>

  <select className={`${inputCls} min-w-[120px]`} value={invoiceFilter} onChange={(e) => setInvoiceFilter(e.target.value)}>
    <option value="ALL">All invoices</option>
    <option value="Pending">Invoice Pending</option>
    <option value="Created">Invoice Created</option>
  </select>

  <select className={`${inputCls} min-w-[120px]`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
    <option value="ALL">All statuses</option>
    <option value="PENDING">Pending</option>
    <option value="PROCESSING">Processing</option>
    <option value="COMPLETED">Completed</option>
  </select>

  <div className="flex items-end gap-1">
    <div className="min-w-[110px]">
      <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">From</label>
      <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
    </div>
    <div className="min-w-[110px]">
      <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">To</label>
      <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
    </div>
  </div>

  {anyFilter && (
    <button
      onClick={clearFilters}
      className="whitespace-nowrap rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-red-600 hover:shadow-lg"
    >
      Clear filters
    </button>
  )}
</div>

      <OrderTable rows={rows} loading={loading} error={error} onRetry={load} totalCount={orders.length} />

      <CreateOrderForm open={showForm} onClose={() => setShowForm(false)} onCreated={onCreated} />
    </div>
  );
}