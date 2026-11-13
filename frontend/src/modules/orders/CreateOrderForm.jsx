import { useEffect, useState } from "react";
import Drawer from "../../components/Drawer";
import OrderLines from "./OrderLines";
import { createOrder } from "./sampleOrders";
import { api } from "../../services/api";
import { errorMessage } from "./orderUtils";

const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const emptyLine = { item_id: "", quantity: "", price: "" };

const box = (bad) =>
  `h-10 w-full rounded-xl border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${bad ? "border-red-500" : "border-slate-300 focus:border-teal-600"}`;

export default function CreateOrderForm({ open, onClose, onCreated }) {
  const [orderType, setOrderType] = useState("SALES");
  const [party, setParty] = useState("");
  const [orderDate, setOrderDate] = useState(plusDays(0));
  const [dueDate, setDueDate] = useState(plusDays(7));
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [items, setItems] = useState([]);
  const [itemsError, setItemsError] = useState("");
  const [errors, setErrors] = useState({ lines: [] });
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  const loadItems = async () => {
    setItemsError("");
    try { setItems(await api("/items")); }
    catch (err) { setItemsError(errorMessage(err)); }
  };
  useEffect(() => { if (open) loadItems(); }, [open]);

  const reset = () => {
    setOrderType("SALES"); setParty(""); setOrderDate(plusDays(0)); setDueDate(plusDays(7));
    setLines([{ ...emptyLine }]); setErrors({ lines: [] }); setServerError("");
  };
  const close = () => { reset(); onClose(); };

  const validate = () => {
    const e = { lines: [] };
    if (!party.trim()) e.party = orderType === "SALES" ? "Customer name is required" : "Supplier name is required";
    if (!orderDate) e.orderDate = "Order date is required";
    if (dueDate && dueDate < orderDate) e.dueDate = "Due date cannot be before order date";
    if (items.length === 0) e.linesMsg = "No inventory items are available";
    let bad = false;
    e.lines = lines.map((l) => {
      const le = {};
      if (!l.item_id) le.item = "Select an item";
      if (l.quantity === "" || isNaN(Number(l.quantity))) le.quantity = "Enter a number";
      else if (Number(l.quantity) <= 0) le.quantity = "Must be more than 0";
      if (l.price === "" || isNaN(Number(l.price))) le.price = "Enter a number";
      else if (Number(l.price) < 0) le.price = "Cannot be negative";
      if (Object.keys(le).length) bad = true;
      return le;
    });
    setErrors(e);
    return !e.party && !e.orderDate && !e.dueDate && !e.linesMsg && !bad;
  };

  const submit = async () => {
    setServerError("");
    if (!validate()) return;
    setBusy(true);
    try {
      const order = await createOrder({
        order_type: orderType, party_name: party.trim(), order_date: orderDate, due_date: dueDate || null,
        lines: lines.map((l) => ({ item_id: Number(l.item_id), quantity: Number(l.quantity), price: Number(l.price) })),
      });
      onCreated(order);
      reset();
    } catch (err) {
      setServerError(errorMessage(err));
    } finally { setBusy(false); }
  };

  const msg = (m) => m && <p className="mt-1 text-xs text-red-600">{m}</p>;
  const label = "mb-1.5 block text-xs font-semibold text-slate-700";

  return (
    <Drawer open={open} title="Create order" subtitle="Add the party and the items." onClose={close}
      onConfirm={submit} confirmText="Create order" busy={busy}>
      <div className="space-y-4">
        {serverError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}
        {itemsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{itemsError}
            <button type="button" onClick={loadItems} className="ml-2 underline">Retry</button></div>)}

        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm">
          {["SALES", "PURCHASE"].map((t) => (
            <button key={t} type="button" onClick={() => setOrderType(t)}
              className={`rounded-lg px-4 py-1.5 font-medium ${orderType === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
              {t === "SALES" ? "Sales" : "Purchase"}
            </button>
          ))}
        </div>

        <div>
          <label className={label}>Party name</label>
          <input className={box(errors.party)} value={party} placeholder={orderType === "SALES" ? "Customer name" : "Supplier name"}
            onChange={(e) => setParty(e.target.value)} />{msg(errors.party)}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Order date</label>
            <input type="date" className={box(errors.orderDate)} value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />{msg(errors.orderDate)}
          </div>
          <div>
            <label className={label}>Due date</label>
            <input type="date" className={box(errors.dueDate)} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />{msg(errors.dueDate)}
          </div>
        </div>

        <OrderLines lines={lines} setLines={setLines} errors={errors.lines} items={items} />
        {msg(errors.linesMsg)}

        <p className="text-xs text-slate-500">New orders start as Invoice <b>Pending</b> and Goods <b>Not Dispatched</b>.</p>
      </div>
    </Drawer>
  );
}
