import StatusBadge from "../../components/StatusBadge";
import { useNavigate } from "react-router-dom";

const today = () => new Date().toISOString().slice(0, 10);

export default function OrderTable({ rows, loading, error, onRetry, totalCount }) {
  const navigate = useNavigate();

  const Message = ({ children }) => (
    <tr><td colSpan="10" className="p-8 text-center text-gray-500">{children}</td></tr>
  );

 
  const isLate = (o) => o.due_date && o.due_date < today() && o.goods_status !== "Dispatched";

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-600">
          <tr>
            {["Order ID", "Type", "Customer / Supplier", "Date", "Due Date", "Items", "Amount", "Invoice", "Goods", "Action"].map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-3">{h}</th>))}
          </tr>
        </thead>
        <tbody>
          {loading && <Message>Loading orders…</Message>}
          {!loading && error && (
            <Message>
              <span className="text-red-600">{error}</span>
              <button onClick={onRetry} className="ml-3 rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">Retry</button>
            </Message>)}
          {!loading && !error && rows.length === 0 && (
            <Message>{totalCount === 0 ? "No orders yet. Click Create Order." : "No orders match your filters."}</Message>)}
          {!loading && !error && rows.map((o) => (
            <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="cursor-pointer border-t hover:bg-gray-50">
              <td className="px-3 py-3 font-medium">#{o.id}</td>
              <td className="px-3 py-3">{o.order_type === "SALES" ? "Sales" : "Purchase"}</td>
              <td className="px-3 py-3">{o.party_name}</td>
              <td className="whitespace-nowrap px-3 py-3">{o.order_date}</td>
              <td className={`whitespace-nowrap px-3 py-3 ${isLate(o) ? "font-semibold text-red-600" : ""}`}>
                {o.due_date || "—"}{isLate(o) && " (late)"}
              </td>
              <td className="px-3 py-3">{o.lines.length} {o.lines.length === 1 ? "item" : "items"}</td>
              <td className="whitespace-nowrap px-3 py-3">₹{o.total_amount.toLocaleString("en-IN")}</td>
              <td className="px-3 py-3"><StatusBadge status={o.invoice_status} /></td>
              <td className="px-3 py-3"><StatusBadge status={o.goods_status} /></td>
              <td className="px-3 py-3">
                <button onClick={(e) => { e.stopPropagation(); navigate(`/orders/${o.id}`); }}
                  className="rounded border px-3 py-1 text-xs hover:bg-gray-100">View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}