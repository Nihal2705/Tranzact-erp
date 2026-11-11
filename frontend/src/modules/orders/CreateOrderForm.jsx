import { useEffect, useState } from "react";
import Modal from "../../components/Modal";
import OrderLines from "./OrderLines";
import { createOrder } from "./sampleOrders";
import { api } from "../../services/api";

const today = () => new Date().toISOString().slice(0, 10);
const emptyLine = { item_id: "", quantity: "", price: "" };

export default function CreateOrderForm({ open, onClose, onCreated }) {
  const [orderType, setOrderType] = useState("SALES");
  const [party, setParty] = useState("");
  const [orderDate, setOrderDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [items, setItems] = useState([]);
  const [itemsError, setItemsError] = useState("");
  const [errors, setErrors] = useState({ lines: [] });
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  const loadItems = async () => {
    setItemsError("");
    try {
      setItems(await api("/items"));
    } catch (err) {
      setItemsError(err.response?.data?.error || err.message || "Could not load inventory items.");
    }
  };
  useEffect(() => {
    if (!open) return;
    api("/items")
      .then((loadedItems) => {
        setItems(loadedItems);
        setItemsError("");
      })
      .catch((err) => setItemsError(err.response?.data?.error || err.message || "Could not load inventory items."));
  }, [open]);

  const reset = () => {
    setOrderType("SALES"); setParty(""); setOrderDate(today()); setDueDate("");
    setLines([{ ...emptyLine }]); setErrors({ lines: [] }); setServerError("");
  };
  const close = () => { reset(); onClose(); };

  const validate = () => {
    const e = { lines: [] };
    if (!party.trim()) e.party = orderType === "SALES" ? "Customer name is required" : "Supplier name is required";
    if (!orderDate) e.orderDate = "Order date is required";
    if (dueDate && dueDate < orderDate) e.dueDate = "Due date cannot be before order date";
    if (lines.length === 0) e.linesMsg = "Add at least one line";
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
      setServerError(err.response?.data?.error || err.message || "Could not create the order.");
    } finally { setBusy(false); }
  };

  const msg = (m) => m && <p className="mt-0.5 text-xs text-red-600">{m}</p>;
  const box = (m) => `w-full rounded border p-2 text-sm ${m ? "border-red-500" : ""}`;

  return (
    <Modal open={open} wide title="Create Order" onClose={close} onConfirm={submit} confirmText="Create Order" busy={busy}>
      <div className="mt-3 space-y-3">
        {serverError && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{serverError}</div>}
        {itemsError && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{itemsError}
          <button type="button" onClick={loadItems} className="ml-2 underline">Retry</button>
        </div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Order type</label>
            <select className={box()} value={orderType} onChange={(e) => setOrderType(e.target.value)}>
              <option value="SALES">Sales</option><option value="PURCHASE">Purchase</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">{orderType === "SALES" ? "Customer name" : "Supplier name"}</label>
            <input className={box(errors.party)} value={party} onChange={(e) => setParty(e.target.value)} />{msg(errors.party)}
          </div>
          <div>
            <label className="text-sm font-medium">Order date</label>
            <input type="date" className={box(errors.orderDate)} value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />{msg(errors.orderDate)}
          </div>
          <div>
            <label className="text-sm font-medium">Due date</label>
            <input type="date" className={box(errors.dueDate)} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />{msg(errors.dueDate)}
          </div>
        </div>
        <OrderLines lines={lines} setLines={setLines} errors={errors.lines} items={items} />
        {msg(errors.linesMsg)}
      </div>
    </Modal>
  );
}