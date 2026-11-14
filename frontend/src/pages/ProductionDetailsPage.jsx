import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import { fetchProductionOrder, updateProductionStatus } from "../modules/production/sampleProduction";
import { STAGES, fmtMoney, errorMessage } from "../modules/production/productionUtils";

export default function ProductionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [qtyInput, setQtyInput] = useState("0");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const data = await fetchProductionOrder(id);
      setP(data); setQtyInput(String(data?.completed_qty ?? 0));
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <p className="text-slate-500">Loading production order…</p>;
  if (error) return <p className="text-red-600">{error} <button onClick={load} className="ml-2 rounded-xl border border-slate-300 px-3 py-1 text-sm text-slate-700">Retry</button></p>;
  if (!p) return <p>Production order not found. <Link className="text-teal-600" to="/production">Back to production</Link></p>;

  const idx = STAGES.indexOf(p.status);
  const next = STAGES[idx + 1];
  const done = p.status === "COMPLETED";
  const canTrack = p.status === "WIP" || p.status === "IN-TESTING";

  const target = Number(p.target_qty) || 0;
  const completed = Number(p.completed_qty) || 0;
  const progress = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
  const unit = p.finished_unit || "pcs";

  const materials = (p.materials || []).map((m) => {
    const needed = Number(m.qty_needed) || 0;
    const stock = Number(m.qty_in_stock) || 0;
    const cost = Number(m.unit_cost) || 0;
    return { ...m, needed, stock, cost, short: Math.max(0, needed - stock), perUnit: m.qty_per_unit ?? (target ? needed / target : 0) };
  });
  const unavailable = materials.filter((m) => m.short > 0);
  const totalCost = done ? Number(p.total_cost) || 0 : materials.reduce((s, m) => s + m.needed * m.cost, 0);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };
  const handleError = (err) => {
    if (err.response?.status === 401) return navigate("/login");
    setFormError(errorMessage(err));
  };
  const openConfirm = () => {
    if (!requestId) setRequestId(crypto.randomUUID());
    setFormError("");
    setConfirm(true);
  };

  const move = async () => {
    setBusy(true); setFormError("");
    try {
      const data = await updateProductionStatus(id, { status: next, request_id: requestId });
      setP(data); setQtyInput(String(data.completed_qty));
      setConfirm(false); setRequestId("");
      flash(`Moved to ${next}`);
    } catch (err) { setConfirm(false); handleError(err); }
    finally { setBusy(false); }
  };

  const updateProgress = async () => {
    setFormError("");
    const n = Number(qtyInput);
    if (qtyInput === "" || isNaN(n)) return setFormError("Completed quantity must be a number");
    if (n < 0) return setFormError("Completed quantity cannot be negative");
    if (n > target) return setFormError(`Completed quantity cannot be more than ${target}`);
    setBusy(true);
    try {
      const data = await updateProductionStatus(id, { completed_qty: n });
      setP(data); setQtyInput(String(data.completed_qty));
      flash("Progress updated");
    } catch (err) { handleError(err); }
    finally { setBusy(false); }
  };

  const th = "px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="space-y-6">
      {toast && <div className="fixed right-5 top-5 z-50 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/production" className="text-sm font-medium text-teal-600 hover:text-teal-800">← Back to production</Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Production order #{p.id} · {p.finished_item_name} ×{target}</h1>
          <p className="mt-1 text-sm text-slate-500">Planned date {p.planned_date}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={p.status} />
          {next && (
            <button onClick={openConfirm} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
              Move to {next}
            </button>
          )}
        </div>
      </div>

      {formError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{formError}</div>}

      {/* Stages */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Stages (one step at a time, forward only)</h2>

        <div className="mt-5 grid grid-cols-5">
          {STAGES.map((s, i) => {
            const reached = i <= idx;
            return (
              <div key={s} className="flex flex-col items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${reached ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-500"} ${i === idx && !done ? "ring-4 ring-teal-100" : ""}`}>
                  {reached && (i < idx || done) ? "✓" : i + 1}
                </div>
                <span className={`text-[11px] uppercase tracking-wide ${i === idx ? "font-bold text-slate-900" : "text-slate-500"}`}>{s}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 text-sm text-slate-500">Progress {progress}% · {completed} of {target} {unit}</div>

        {canTrack && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-sm">
            <span className="font-medium text-slate-700">Update completed quantity:</span>
            <input type="number" min="0" value={qtyInput} onChange={(e) => setQtyInput(e.target.value)}
              className="h-10 w-24 rounded-xl border border-slate-300 px-3 text-right focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
            <span className="text-slate-500">of {target}</span>
            <button onClick={updateProgress} disabled={busy}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50">
              {busy ? "Saving…" : "Update"}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Raw materials */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="px-5 py-4"><h2 className="text-lg font-semibold text-slate-900">Raw materials {done ? "used" : "needed"}</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className={th}>Material</th>
                  <th className={`${th} text-right`}>Per unit</th>
                  <th className={`${th} text-right`}>Total {done ? "used" : "needed"}</th>
                  {!done && <th className={`${th} text-right`}>In stock</th>}
                  <th className={`${th} text-right`}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.raw_item_id} className="border-t border-slate-100">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{m.raw_item_name}</td>
                    <td className="px-5 py-3.5 text-right">{m.perUnit} {m.unit}</td>
                    <td className="px-5 py-3.5 text-right">{m.needed} {m.unit}</td>
                    {!done && <td className={`px-5 py-3.5 text-right ${m.short > 0 ? "font-bold text-red-600" : ""}`}>{m.stock} {m.unit}</td>}
                    <td className="px-5 py-3.5 text-right">{fmtMoney(m.needed * m.cost)}</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
                  <td className="px-5 py-3.5" colSpan={done ? 3 : 4}>Total material cost{!done && " (estimated)"}</td>
                  <td className="px-5 py-3.5 text-right">{fmtMoney(totalCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {!done && unavailable.length > 0 && (
            <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-xs font-medium text-red-700">
              Shortage: {unavailable.map((m) => `${m.raw_item_name} (${m.short} ${m.unit})`).join(", ")}.
              Completing this order will be refused until stock is added.
            </div>
          )}
        </div>

        {/* Output */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Output when completed</h2>
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-slate-200 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-xl text-green-700">▣</div>
            <div>
              <div className="text-xs text-slate-500">{p.finished_item_name} {done ? "added to stock" : "will be added to stock"}</div>
              <div className="text-2xl font-bold text-slate-900">+{target} {unit}</div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Raw materials are removed from stock and finished goods are added only when the order is COMPLETED.
          </p>
        </div>
      </div>

      <Modal open={confirm} title={`Move to ${next}?`} busy={busy} onClose={() => setConfirm(false)} onConfirm={move}
        message={next === "COMPLETED"
          ? `Complete this production order? ${target} ${p.finished_item_name} will be added to stock and the raw materials will be used. This cannot be undone.`
          : "This moves the production order one stage forward. It cannot go back."} />
    </div>
  );
}
