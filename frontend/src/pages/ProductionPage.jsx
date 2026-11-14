import { useEffect, useState } from "react";
import CreateProductionForm from "../modules/production/CreateProductionForm";
import ProductionTable from "../modules/production/ProductionTable";
import { fetchProduction } from "../modules/production/sampleProduction";
import { STAGES, errorMessage } from "../modules/production/productionUtils";

function Stat({ icon, tone, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold ${tone}`}>{icon}</div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

export default function ProductionPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const canCreate = user.role !== "Worker";      // Workers cannot create production orders

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setOrders(await fetchProduction()); }
    catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const q = search.trim().toLowerCase().replace("#", "");
  const rows = orders.filter((p) =>
    (tab === "ALL" || p.status === tab) &&
    (!q || (p.finished_item_name || "").toLowerCase().includes(q) || String(p.id) === q));

  const completed = orders.filter((p) => p.status === "COMPLETED").length;
  const inProgress = orders.filter((p) => p.status === "WIP" || p.status === "IN-TESTING").length;

  const onCreated = (order) => {
    setOrders([order, ...orders]); setShowForm(false);
    setToast("Production order created"); setTimeout(() => setToast(""), 3000);
    load();
  };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed right-5 top-5 z-50 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Production</h1>
          <p className="mt-1 text-sm text-slate-500">Plan and follow what is being made.</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(true)}
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">+ Create production order</button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat icon="▦" tone="bg-blue-100 text-blue-700" label="Total orders" value={orders.length} />
        <Stat icon="✓" tone="bg-green-100 text-green-700" label="Completed" value={completed} />
        <Stat icon="◷" tone="bg-amber-100 text-amber-700" label="In progress" value={inProgress} />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search production…"
            className="h-10 w-full rounded-full border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
        </div>
        <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 text-sm">
          {["ALL", ...STAGES].map((s) => (
            <button key={s} onClick={() => setTab(s)}
              className={`rounded-lg px-3 py-1.5 font-medium ${tab === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
              {s === "ALL" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      <ProductionTable rows={rows} loading={loading} error={error} onRetry={load} totalCount={orders.length} />

      {canCreate && <CreateProductionForm open={showForm} onClose={() => setShowForm(false)} onCreated={onCreated} />}
    </div>
  );
}
