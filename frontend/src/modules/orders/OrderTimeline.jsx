const fmt = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// events: [{ event, date, details }]  (same shape as GET /api/orders/:id/timeline)
export default function OrderTimeline({ events = [], total, isSales, loading, error, onRetry }) {
  const find = (name) => events.find((e) => e.event === name);
  const partials = events.filter((e) => e.event === "Partially Dispatched");

  const rows = [
    { name: "Order Created", ev: find("Order Created") },
    { name: "Invoice Created", ev: find("Invoice Created") },
    ...(partials.length
      ? partials.map((ev) => ({ name: "Partially Dispatched", ev }))
      : [{ name: "Partially Dispatched", ev: null }]),
    { name: "Dispatched", ev: find("Dispatched") },
  ];

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="font-semibold">Timeline</h2>
          {!isSales && <p className="text-xs text-gray-500">For purchase orders, “Dispatched” means goods received.</p>}
        </div>
        <span className="text-sm font-semibold">Order total: ₹{Number(total || 0).toLocaleString("en-IN")}</span>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading timeline…</p>}
      {!loading && error && (
        <p className="text-sm text-red-600">{error}
          <button onClick={onRetry} className="ml-2 rounded border px-2 py-1 text-xs text-gray-700">Retry</button></p>
      )}

      {!loading && !error && (
        <ol className="space-y-3">
          {rows.map((r, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className={r.ev ? "text-green-600" : "text-gray-300"}>{r.ev ? "✔" : "○"}</span>
              <div>
                <div className={r.ev ? "font-medium" : "text-gray-400"}>{r.name}</div>
                {r.ev && <div className="text-xs text-gray-500">{fmt(r.ev.date)}{r.ev.details && ` · ${r.ev.details}`}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}