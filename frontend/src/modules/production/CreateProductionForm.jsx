import { useEffect, useState } from "react";
import Drawer from "../../components/Drawer";
import { createProduction, fetchItems } from "./sampleProduction";
import { errorMessage } from "./productionUtils";

const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const box = (bad) =>
  `h-10 w-full rounded-xl border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${bad ? "border-red-500" : "border-slate-300 focus:border-teal-600"}`;

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
    try { setItems(await fetchItems()); }   // GET /api/items (BOM comes with each finished item)
    catch (err) { setItemsError(errorMessage(err)); }
  };
  useEffect(() => { if (open) loadItems(); }, [open]);

  const finished = items.filter((i) => i.item_type === "FINISHED" && (i.bom || []).length > 0);
  const chosen = finished.find((i) => i.id === Number(itemId));
  const qty = Number(target) > 0 ? Number(target) : 0;

  // Raw materials needed = BOM quantity per unit x target, shown next to stock
  const rows = chosen
    ? chosen.bom.map((b) => {
        const raw = items.find((i) => i.id === b.raw_item_id);
        const needed = Number(b.qty_per_unit) * qty;
        const stock = Number(raw?.quantity) || 0;
        return { name: b.raw_item_name, unit: raw?.unit || "", needed, stock, short: stock < needed };
      })
    : [];
  const hasShortage = rows.some((r) => r.short);

  const reset = () => { setItemId(""); setTarget("10"); setPlannedDate(plusDays(7)); setErrors({}); setServerError(""); };
  const close = () => { reset(); onClose(); };

  const validate = () => {
    const e = {};
    if (!itemId) e.item = "Choose a finished product";
    if (target === "" || isNaN(Number(target))) e.target = "Must be a number";
    else if (Number(target) <= 0) e.target = "Must be more than 0";
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
  const label = "mb-1.5 block text-xs font-semibold text-slate-700";

  return (
    <Drawer open={open} title="Create production order" subtitle="Starts as PLANNED." onClose={close}
      onConfirm={submit} confirmText="Create" busy={busy}>
      <div className="space-y-4">
        {serverError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}
        {itemsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{itemsError}
            <button onClick={loadItems} className="ml-2 underline">Retry</button></div>)}

        <div>
          <label className={label}>Finished product</label>
          <select className={box(errors.item)} value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Choose item…</option>
            {finished.map((i) => <option key={i.id} value={i.id}>{i.name} ({Number(i.quantity)} in stock)</option>)}
          </select>{msg(errors.item)}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Quantity to make</label>
            <input type="number" className={box(errors.target)} value={target} onChange={(e) => setTarget(e.target.value)} />{msg(errors.target)}
          </div>
          <div>
            <label className={label}>Planned date</label>
            <input type="date" className={box(errors.date)} value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />{msg(errors.date)}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold text-slate-700">Raw materials needed (from recipe)</div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Material</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Needed</th>
                  <th className="px-3 py-2.5 text-right font-semibold">In stock</th>
                </tr>
              </thead>
              <tbody>
                {!chosen && <tr><td colSpan="3" className="px-3 py-6 text-center text-slate-400">Choose a product to see the materials.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.name} className="border-t border-slate-100">
                    <td className="px-3 py-3 text-slate-800">{r.name}</td>
                    <td className="px-3 py-3 text-right">{r.needed} {r.unit}</td>
                    <td className={`px-3 py-3 text-right ${r.short ? "font-bold text-red-600" : "text-slate-700"}`}>{r.stock} {r.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {hasShortage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            Some materials are short. You can still create the order, but completing it will be refused until stock is added.
          </div>
        )}
      </div>
    </Drawer>
  );
}
