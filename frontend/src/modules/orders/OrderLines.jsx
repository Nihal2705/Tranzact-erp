const box = (bad) =>
  `h-10 w-full rounded-xl border bg-white px-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${bad ? "border-red-500" : "border-slate-300 focus:border-teal-600"}`;

// lines: [{ item_id, quantity, price }]   items: from GET /api/items   errors: [{ item, quantity, price }]
export default function OrderLines({ lines, setLines, errors = [], items = [] }) {
  const update = (i, patch) => setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const remove = (i) => setLines(lines.filter((_, idx) => idx !== i));
  const used = (i) => lines.filter((_, idx) => idx !== i).map((l) => l.item_id);

  const onPick = (i, value) => {
    const item = items.find((s) => s.id === Number(value));
    update(i, { item_id: item ? item.id : "", price: item ? item.price : "" });
  };
  const add = () => setLines([...lines, { item_id: "", quantity: "", price: "" }]);

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.price) || 0), 0);
  const err = (m) => m && <p className="mt-0.5 text-[11px] text-red-600">{m}</p>;

  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-slate-700">Items</div>
      <div className="rounded-xl border border-slate-200">
        <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <div className="col-span-6">Item</div>
          <div className="col-span-2 text-right">Qty</div>
          <div className="col-span-3 text-right">Price</div>
          <div className="col-span-1" />
        </div>
        <div className="space-y-2 p-3">
          {lines.map((l, i) => {
            const e = errors[i] || {};
            return (
              <div key={i} className="grid grid-cols-12 items-start gap-2">
                <div className="col-span-6">
                  <select className={box(e.item)} value={l.item_id} onChange={(ev) => onPick(i, ev.target.value)}>
                    <option value="">Select item</option>
                    {items.filter((s) => !used(i).includes(s.id) || s.id === l.item_id)
                      .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>{err(e.item)}
                </div>
                <div className="col-span-2">
                  <input type="number" placeholder="Qty" className={`${box(e.quantity)} text-right`}
                    value={l.quantity} onChange={(ev) => update(i, { quantity: ev.target.value })} />{err(e.quantity)}
                </div>
                <div className="col-span-3">
                  <input type="number" placeholder="Price" className={`${box(e.price)} text-right`}
                    value={l.price} onChange={(ev) => update(i, { price: ev.target.value })} />{err(e.price)}
                </div>
                <div className="col-span-1 pt-2 text-center">
                  <button type="button" onClick={() => remove(i)} disabled={lines.length === 1} aria-label="Remove line"
                    className="text-lg leading-none text-slate-400 hover:text-red-600 disabled:opacity-30">×</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button type="button" onClick={add}
        className="mt-3 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">+ Add line</button>

      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
        <span className="text-sm text-slate-500">Order total</span>
        <span className="text-xl font-bold text-slate-900">₹{total.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}
