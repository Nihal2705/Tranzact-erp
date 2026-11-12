import { useEffect, useState } from "react";
import Modal from "../../components/Modal";
import { createProduction, fetchItems } from "./sampleProduction";
import { errorMessage } from "./productionUtils";

const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const box = (bad) =>
  `mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${bad ? "border-red-500" : "border-slate-300 focus:border-teal-600"}`;

export default function CreateProductionForm({ open, onClose, onCreated }) {
  const [items, setItems] = useState([]);
  const [itemsError, setItemsError] = useState("");
  const [itemId, setItemId] = useState("");
  const [target, setTarget] = useState("10");
  const [plannedDate, setPlannedDate] = useState(plusDays(7));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  const loadItems = async () => {
    setItemsError("");
    try { setItems(await fetchItems()); }   // later: api.get("/items")  (BOM comes with each finished item)
    catch (err) { setItemsError(errorMessage(err)); }
  };
  useEffect(() => { if (open) loadItems(); }, [open]);

  const finished = items.filter((i) => i.item_type === "FINISHED" && i.bom.length > 0);
  const chosen = finished.find((i) => i.id === Number(itemId));
  const qty = Number(target) > 0 ? Number(target) : 0;

    const rows = chosen
    ? chosen.bom.map((b) => {
        const raw = items.find((i) => i.id === b.raw_item_id);
        const needed = b.qty_per_unit * qty;
        return { name: b.raw_item_name, unit: raw.unit, perUnit: b.qty_per_unit, needed, stock: raw.quantity, short: Math.max(0, needed - raw.quantity) };
      })
    : [];
  const hasShortage = rows.some((r) => r.short > 0);

  const reset = () => { setItemId(""); setTarget("10"); setPlannedDate(plusDays(7)); setErrors({}); setServerError(""); };
  const close = () => { reset(); onClose(); };

  const validate = () => {
    const e = {};
    if (!itemId) e.item = "Choose a finished good";
    if (target === "" || isNaN(Number(target))) e.target = "Target quantity must be a number";
    else if (Number(target) <= 0) e.target = "Target quantity must be more than 0";
    if (!plannedDate) e.date = "Planned date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setServerError("");
    if (!validate()) return;
    setBusy(true);
    try {
      const order = await createProduction({ finished_item_id: Number(itemId), target_qty: Number(target), planned_date: plannedDate });
      onCreated(order);
      reset();
    } catch (err) {
      setServerError(errorMessage(err));
    } finally { setBusy(false); }
  };

  const msg = (m) => m && <p className="mt-1 text-xs text-red-600">{m}</p>;
  const label = "text-sm font-medium text-slate-700";

  return (
    <Modal open={open} wide title="Create Production Order" onClose={close} onConfirm={submit} confirmText="Create Production Order" busy={busy}>
      <div className="mt-3 space-y-5">
        {serverError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}
        {itemsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{itemsError}
            <button onClick={loadItems} className="ml-2 rounded border border-red-300 px-2 py-0.5 text-xs">Retry</button></div>)}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={label}>Finished good to manufacture *</label>
            <select className={box(errors.item)} value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">-- Choose item --</option>
              {finished.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.quantity} in stock)</option>)}
            </select>{msg(errors.item)}
          </div>
          <div>
            <label className={label}>Target quantity *</label>
            <input type="number" className={box(errors.target)} value={target} onChange={(e) => setTarget(e.target.value)} />{msg(errors.target)}
          </div>
          <div className="sm:col-span-3">
            <label className={label}>Planned date *</label>
            <input type="date" className={box(errors.date)} value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />{msg(errors.date)}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-700">Raw materials needed (BOM check)</span>
            {chosen && <span className="text-xs text-slate-500">Target: {qty} {chosen.unit}</span>}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Raw material</th>
                  <th className="px-4 py-2.5 text-right font-medium">Per unit</th>
                  <th className="px-4 py-2.5 text-right font-medium">Required</th>
                  <th className="px-4 py-2.5 text-right font-medium">In stock</th>
                </tr>
              </thead>
              <tbody>
                {!chosen && <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-400">Choose a finished good to see the materials needed.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.name} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{r.perUnit} {r.unit}</td>
                    <td className="px-4 py-3 text-right font-semibold">{r.needed} {r.unit}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.short > 0 ? "text-red-600" : "text-green-600"}`}>
                      {r.stock} {r.unit} {r.short > 0 ? `(short by ${r.short})` : "(OK)"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {hasShortage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Some materials are short. You can still create the order, but completing it will be refused until stock is added.
          </div>
        )}
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          New production orders always start with <b>PLANNED</b> status.
        </div>
      </div>
    </Modal>
  );
}
