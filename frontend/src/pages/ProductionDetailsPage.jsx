import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import { fetchProductionOrder, updateProductionStatus } from "../modules/production/sampleProduction";
import { STAGES, fmtMoney, errorMessage } from "../modules/production/productionUtils";

// One small label + value pair
function Fact({ label, children, note }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1.5 text-xl font-semibold text-slate-900">{children}</dd>
      {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

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
  if (error) return <p className="text-red-600">{error} <button onClick={load} className="ml-2 rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700">Retry</button></p>;
  if (!p) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-slate-700">Production order not found.</p>
        <Link to="/production" className="mt-3 inline-block text-blue-600">← Back to production</Link>
      </div>
    );
  }

  // ---- calculations ----
  const idx = STAGES.indexOf(p.status);
  const next = STAGES[idx + 1];
  const done = p.status === "COMPLETED";
  const canTrack = p.status === "WIP" || p.status === "IN-TESTING";

  const target = Number(p.target_qty) || 0;
  const completed = Number(p.completed_qty) || 0;
  const remaining = Math.max(0, target - completed);
  const progress = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;

  const materials = p.materials.map((m) => ({ ...m, shortage: Math.max(0, Number(m.qty_needed) - Number(m.qty_in_stock)) }));
  const unavailable = materials.filter((m) => m.shortage > 0);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };
  const handleError = (err) => {
    if (err.response?.status === 401) return navigate("/login");
    setFormError(errorMessage(err));            // screen keeps the old numbers
  };
  const openConfirm = () => {                   // one request_id per action; same id if the user retries
    if (!requestId) setRequestId(crypto.randomUUID());
    setFormError("");
    setConfirm(true);
  };

 
  const move = async () => {
    setBusy(true); setFormError("");
    try {
      // REAL: const { data } = await api.put(`/production/${id}/status`, { status: next, request_id: requestId });
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

  const th = "px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="space-y-6">
      {toast && <div className="fixed right-4 top-4 z-50 rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white shadow-lg">{toast}</div>}

      {/* 1. HEADER */}
      <div>
        <Link to="/production" className="text-sm font-medium text-blue-800 hover:text-blue-900">← Back to production</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{p.finished_item_name}</h1>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-1.5 text-slate-500">Production Order #{p.id} · Planned {p.planned_date}</p>
          </div>
          {next ? (
            <button onClick={openConfirm}
              className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900">
              Move to {next} →
            </button>
          ) : (
            <span className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700">✓ Completed</span>
          )}
        </div>
      </div>

      {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}

      {/* 2. OVERVIEW: stages + facts + progress */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Production overview</h2>
          <p className="mt-0.5 text-sm text-slate-500">Moves forward only, one stage at a time.</p>
        </div>

        <div className="space-y-7 px-6 py-6">
          {/* stage tracker (exact status words) */}
          <div className="flex items-center">
            {STAGES.map((stage, i) => {
              const finished = i < idx || (i === idx && done);
              const current = i === idx && !done;
              return (
                <div key={stage} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold
                      ${finished ? "bg-blue-800 text-white" : current ? "bg-blue-800 text-white ring-4 ring-blue-100" : "bg-slate-100 text-slate-400"}`}>
                      {finished ? "✓" : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${current ? "text-blue-800" : finished ? "text-slate-700" : "text-slate-400"}`}>{stage}</span>
                  </div>
                  {i !== STAGES.length - 1 && <div className={`mx-2 mb-6 h-0.5 flex-1 ${i < idx ? "bg-blue-800" : "bg-slate-200"}`} />}
                </div>
              );
            })}
          </div>

          {/* facts */}
          <dl className="grid grid-cols-2 gap-x-8 gap-y-6 border-t border-slate-100 pt-6 md:grid-cols-3">
            <Fact label="Target quantity">{target} <span className="text-sm font-normal text-slate-500">{p.finished_unit}</span></Fact>
            <Fact label="Completed">{completed} <span className="text-sm font-normal text-slate-500">{p.finished_unit}</span></Fact>
            <Fact label="Remaining">{remaining} <span className="text-sm font-normal text-slate-500">{p.finished_unit}</span></Fact>
            <Fact label="Finished goods produced"
              note={done ? "Added to stock on completion" : `Will add ${target} ${p.finished_unit} to stock on completion`}>
              {done ? `${target} ${p.finished_unit}` : "—"}
            </Fact>
            <Fact label={done ? "Total cost" : "Estimated cost"}
              note={done ? `Total cost for ${target} ${p.finished_unit}` : "From current raw material prices"}>
              {done ? fmtMoney(p.total_cost) : `~${fmtMoney(p.est_cost)}`}
            </Fact>
            <Fact label="Planned date">{p.planned_date}</Fact>
          </dl>

          {/* progress */}
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Progress</span>
              <span className="font-semibold text-slate-900">{progress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-blue-800 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* update completed qty (WIP / IN-TESTING only) */}
          {canTrack && (
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6 text-sm">
              <span className="font-medium text-slate-700">Update completed quantity:</span>
              <input type="number" min="0" value={qtyInput} onChange={(e) => setQtyInput(e.target.value)}
                className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-right focus:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-800/30" />
              <span className="text-slate-500">of {target}</span>
              <button onClick={updateProgress} disabled={busy}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50">
                {busy ? "Saving…" : "Update"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. RAW MATERIALS */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Raw materials</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {done ? "Materials used for this production order." : "Materials needed for this production order, compared with stock."}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Material</th>
                <th className={`${th} text-right`}>Required</th>
                <th className={`${th} text-right`}>{done ? "Stock now" : "In stock"}</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materials.map((m) => {
                const short = !done && m.shortage > 0;
                return (
                  <tr key={m.raw_item_id}>
                    <td className="px-6 py-4 font-medium text-slate-900">{m.raw_item_name}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{m.qty_needed} {m.unit}</td>
                    <td className={`px-6 py-4 text-right ${short ? "font-semibold text-red-600" : "text-slate-700"}`}>{m.qty_in_stock} {m.unit}</td>
                    <td className="px-6 py-4">
                      {done ? <span className="text-slate-500">Used</span>
                        : short ? <span className="font-medium text-red-600">Short by {m.shortage} {m.unit}</span>
                        : <span className="font-medium text-green-700">Available</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-sm">
          {done ? <span className="text-slate-500">Raw materials were deducted from stock when this order was completed.</span>
            : unavailable.length === 0 ? <span className="text-slate-500">All required materials are in stock.</span>
            : <span className="font-medium text-red-700">
                Shortage: {unavailable.map((m) => `${m.raw_item_name} (${m.shortage} ${m.unit})`).join(", ")}.
                Completing this order will be refused until stock is added.
              </span>}
        </div>
      </section>

      <Modal open={confirm} title={`Move to ${next}?`} busy={busy} onClose={() => setConfirm(false)} onConfirm={move}
        message={next === "COMPLETED"
          ? `Complete this production order? ${target} ${p.finished_item_name} will be added to stock and the raw materials will be used. This cannot be undone.`
          : "This moves the production order one stage forward. It cannot go back."} />
    </div>
  );
}
