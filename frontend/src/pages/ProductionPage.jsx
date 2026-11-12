import { useEffect, useState } from "react";
import CreateProductionForm from "../modules/production/CreateProductionForm";
import ProductionTable from "../modules/production/ProductionTable";
import { fetchProduction } from "../modules/production/sampleProduction";
import { STAGES, errorMessage } from "../modules/production/productionUtils";

export default function ProductionPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const canCreate = user.role !== "Worker";     

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
    (!q || p.finished_item_name.toLowerCase().includes(q) || String(p.id) === q));

  const onCreated = (order) => {
    setOrders([order, ...orders]); setShowForm(false);
    setToast("Production order created"); setTimeout(() => setToast(""), 3000);
  };

  return (
    <div className="space-y-7">
      {toast && <div className="fixed right-4 top-4 z-50 rounded-xl bg-green-600 px-6 py-3 text-base font-medium text-white shadow-lg">{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Production</h1>
          <p className="mt-1 text-lg italic text-gray-500">Track what the factory is making, stage by stage</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(true)}
            className="rounded-xl bg-blue-800 px-6 py-3 text-lg font-semibold text-white shadow-md transition hover:bg-blue-900 hover:shadow-lg">
            + Create Production Order
          </button>
        )}
      </div>

      {/* Status tabs (exact status words) */}
      <div className="flex flex-wrap gap-2 border-b border-gray-300">
        {["ALL", ...STAGES].map((s) => (
          <button key={s} onClick={() => setTab(s)}
            className={`-mb-px border-b-[3px] px-5 py-3 text-base transition ${tab === s ? "border-blue-800 font-semibold text-blue-800" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
            {s === "ALL" ? "All" : s}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by finished good or order number"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-800/30" />
      </div>

      <ProductionTable rows={rows} loading={loading} error={error} onRetry={load} totalCount={orders.length} />

      {canCreate && <CreateProductionForm open={showForm} onClose={() => setShowForm(false)} onCreated={onCreated} />}
    </div>
  );
}
