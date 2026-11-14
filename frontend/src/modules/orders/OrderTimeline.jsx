const fmt = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// events: [{ event, date, details }]  (GET /api/orders/:id/timeline)
export default function OrderTimeline({ events = [], total, isSales, loading, error, onRetry }) {
  const find = (name) => events.find((e) => e.event === name);
  const partials = events.filter((e) => e.event === "Partially Dispatched");

  // The 4 stages from the guide. A partial dispatch can appear more than once.
  const rows = [
    { name: "Order Created", ev: find("Order Created") },
    { name: "Invoice Created", ev: find("Invoice Created") },
    ...(partials.length ? partials.map((ev) => ({ name: "Partially Dispatched", ev })) : [{ name: "Partially Dispatched", ev: null }]),
    { name: "Dispatched", ev: find("Dispatched") },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Timeline</h2>
        <span className="text-sm font-semibold text-slate-900">₹{Number(total || 0).toLocaleString("en-IN")}</span>
      </div>
      {!isSales && <p className="mt-1 text-xs text-slate-500">For purchase orders, “Dispatched” means goods received.</p>}

      <div className="mt-4">
        {loading && <p className="text-sm text-slate-500">Loading timeline…</p>}
        {!loading && error && (
          <p className="text-sm text-red-600">{error}
            <button onClick={onRetry} className="ml-2 rounded-xl border border-slate-300 px-2 py-1 text-xs text-slate-700">Retry</button></p>)}
        {!loading && !error && (
          <ol>
            {rows.map((r, i) => (
              <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                {i !== rows.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-slate-200" />}
                <span className={`relative mt-1 h-3 w-3 shrink-0 rounded-full ${r.ev ? "bg-teal-600" : "border-2 border-slate-300 bg-white"}`} />
                <div>
                  <div className={`text-sm ${r.ev ? "font-semibold text-slate-900" : "text-slate-400"}`}>{r.name}</div>
                  {r.ev && <div className="text-xs text-slate-500">{fmt(r.ev.date)}{r.ev.details && ` · ${r.ev.details}`}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
