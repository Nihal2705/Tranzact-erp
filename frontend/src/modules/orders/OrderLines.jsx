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
  const err = (m) => m && <p className="mt-0.5 text-xs text-red-600">{m}</p>;
  const border = (m) => (m ? "border-red-500" : "");

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium">Order lines</span>
        <button type="button" onClick={add} className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">+ Add line</button>
      </div>
      <div className="space-y-2">
        {lines.map((l, i) => {
          const e = errors[i] || {};
          return (
            <div key={i} className="grid grid-cols-12 items-start gap-2">
              <div className="col-span-5">
                <select className={`w-full rounded border p-2 text-sm ${border(e.item)}`} value={l.item_id}
                  onChange={(ev) => onPick(i, ev.target.value)}>
                  <option value="">Select item</option>
                  {items.filter((s) => !used(i).includes(s.id) || s.id === l.item_id)
                    .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>{err(e.item)}
              </div>
              <div className="col-span-2">
                <input type="number" placeholder="Qty" className={`w-full rounded border p-2 text-sm ${border(e.quantity)}`}
                  value={l.quantity} onChange={(ev) => update(i, { quantity: ev.target.value })} />{err(e.quantity)}
              </div>
              <div className="col-span-2">
                <input type="number" placeholder="Price" className={`w-full rounded border p-2 text-sm ${border(e.price)}`}
                  value={l.price} onChange={(ev) => update(i, { price: ev.target.value })} />{err(e.price)}
              </div>
              <div className="col-span-2 pt-2 text-right text-sm">₹{((Number(l.quantity) || 0) * (Number(l.price) || 0)).toLocaleString("en-IN")}</div>
              <button type="button" onClick={() => remove(i)} disabled={lines.length === 1}
                className="col-span-1 pt-1 text-lg text-gray-400 hover:text-red-600 disabled:opacity-30">×</button>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-right font-semibold">Order total: ₹{total.toLocaleString("en-IN")}</p>
    </div>
  );
}