import { useNavigate } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge";

const HEAD = ["Finished Good", "Target Qty", "Completed Qty", "Progress", "Status", "Planned Date", "Action"];

export default function ProductionTable({ rows, loading, error, onRetry, totalCount }) {
  const navigate = useNavigate();

  const Message = ({ children }) => (
    <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-500">{children}</td></tr>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>{HEAD.map((h) => <th key={h} className="whitespace-nowrap px-4 py-3.5">{h}</th>)}</tr>
        </thead>
        <tbody>
          {loading && <Message>Loading production orders…</Message>}
          {!loading && error && (
            <Message>
              <span className="text-red-600">{error}</span>
              <button onClick={onRetry} className="ml-3 rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">Retry</button>
            </Message>)}
          {!loading && !error && rows.length === 0 && (
            <Message>{totalCount === 0 ? "No production orders yet. Click Create Production Order." : "No production orders match your filters."}</Message>)}
          {!loading && !error && rows.map((p) => {
            const pct = p.target_qty > 0 ? Math.min(100, Math.round((p.completed_qty / p.target_qty) * 100)) : 0;
            return (
              <tr key={p.id} onClick={() => navigate(`/production/${p.id}`)}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-800">{p.finished_item_name}</div>
                  <div className="text-xs text-slate-400">Production Order #{p.id}</div>
                </td>
                <td className="px-4 py-4">{p.target_qty}</td>
                <td className="px-4 py-4">{p.completed_qty}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-blue-800" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-4"><StatusBadge status={p.status} /></td>
                <td className="whitespace-nowrap px-4 py-4">{p.planned_date}</td>
                <td className="px-4 py-4">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/production/${p.id}`); }}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-100">View</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
