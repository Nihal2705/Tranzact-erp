import { useNavigate } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge";
import TypeChip from "./TypeChip";

const today = () => new Date().toISOString().slice(0, 10);
const HEAD = ["Order", "Type", "Party", "Order date", "Due date", "Total", "Invoice", "Goods"];

export default function OrderTable({ rows, loading, error, onRetry, totalCount }) {
  const navigate = useNavigate();

  const Message = ({ children }) => (
    <tr><td colSpan="8" className="px-4 py-12 text-center text-sm text-slate-500">{children}</td></tr>
  );
  const isLate = (o) => o.due_date && o.due_date < today() && o.goods_status !== "Dispatched";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>{HEAD.map((h) => <th key={h} className={`whitespace-nowrap px-4 py-3 font-semibold ${h === "Total" ? "text-right" : ""}`}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading && <Message>Loading orders…</Message>}
            {!loading && error && (
              <Message>
                <span className="text-red-600">{error}</span>
                <button onClick={onRetry} className="ml-3 rounded-xl border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">Retry</button>
              </Message>)}
            {!loading && !error && rows.length === 0 && (
              <Message>{totalCount === 0 ? "No orders yet. Click Create order." : "No orders match your filters."}</Message>)}
            {!loading && !error && rows.map((o) => (
              <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4 font-semibold text-slate-900">#{o.id}</td>
                <td className="px-4 py-4"><TypeChip type={o.order_type} /></td>
                <td className="px-4 py-4 text-slate-700">{o.party_name}</td>
                <td className="whitespace-nowrap px-4 py-4 text-slate-600">{o.order_date}</td>
                <td className={`whitespace-nowrap px-4 py-4 ${isLate(o) ? "font-semibold text-red-600" : "text-slate-600"}`}>
                  {o.due_date || "—"}{isLate(o) && " (late)"}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-slate-900">₹{Number(o.total_amount || 0).toLocaleString("en-IN")}</td>
                <td className="px-4 py-4"><StatusBadge status={o.invoice_status} /></td>
                <td className="px-4 py-4"><StatusBadge status={o.goods_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !error && totalCount > 0 && (
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Showing {rows.length} of {totalCount} orders</div>
      )}
    </div>
  );
}
