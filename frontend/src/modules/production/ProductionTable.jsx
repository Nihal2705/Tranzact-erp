import { useNavigate } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge";

const HEAD = ["Order", "Product", "Target qty", "Completed", "Progress", "Planned date", "Status"];

export default function ProductionTable({ rows, loading, error, onRetry, totalCount }) {
  const navigate = useNavigate();

  const Message = ({ children }) => (
    <tr><td colSpan="7" className="px-4 py-12 text-center text-sm text-slate-500">{children}</td></tr>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>{HEAD.map((h) => <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading && <Message>Loading production orders…</Message>}
            {!loading && error && (
              <Message>
                <span className="text-red-600">{error}</span>
                <button onClick={onRetry} className="ml-3 rounded-xl border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">Retry</button>
              </Message>)}
            {!loading && !error && rows.length === 0 && (
              <Message>{totalCount === 0 ? "No production orders yet. Click Create production order." : "No production orders match your filters."}</Message>)}
            {!loading && !error && rows.map((p) => {
              const target = Number(p.target_qty) || 0;
              const pct = target > 0 ? Math.min(100, Math.round((Number(p.completed_qty) / target) * 100)) : 0;
              return (
                <tr key={p.id} onClick={() => navigate(`/production/${p.id}`)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-4 font-semibold text-slate-900">#{p.id}</td>
                  <td className="px-4 py-4 text-slate-700">{p.finished_item_name}</td>
                  <td className="px-4 py-4">{target}</td>
                  <td className="px-4 py-4">{Number(p.completed_qty)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-teal-600" style={{ width: `${pct}%` }} /></div>
                      <span className="text-xs text-slate-500">{pct}%</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">{p.planned_date}</td>
                  <td className="px-4 py-4"><StatusBadge status={p.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading && !error && totalCount > 0 && (
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Showing {rows.length} of {totalCount} orders</div>
      )}
    </div>
  );
}
