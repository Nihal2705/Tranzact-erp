import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { fetchOrders } from "../modules/orders/sampleOrders";
import { fetchProduction } from "../modules/production/sampleProduction";

// Menu order from the design: Dashboard, Inventory, Orders, Production, Reports
const MENU = [
  { to: "/dashboard", label: "Dashboard", roles: ["Admin", "Manager"] },
  { to: "/inventory", label: "Inventory", roles: ["Admin", "Manager", "Worker"] },
  { to: "/orders", label: "Orders", roles: ["Admin", "Manager"] },
  { to: "/production", label: "Production", roles: ["Admin", "Manager", "Worker"] },
  { to: "/reports", label: "Reports", roles: ["Admin", "Manager"] },
];

const TITLES = { dashboard: "Dashboard", inventory: "Inventory", orders: "Orders", production: "Production", reports: "Reports" };
const DETAIL_TITLES = { orders: "Order details", production: "Production details" };

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
const READ_KEY = "readNotifications";

const readSet = () => {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); }
  catch { return new Set(); }
};
const saveSet = (set) => {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...set].slice(-200))); } catch { /* ignore */ }
};

function Icon({ name }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "Dashboard": return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
    case "Inventory": return <svg {...p}><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v8" /></svg>;
    case "Orders": return <svg {...p}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M3 4h2l2.5 11h10.5l2-8H6.5" /></svg>;
    case "Production": return <svg {...p}><path d="M3 21V11l6 4v-4l6 4V5h6v16H3z" /></svg>;
    default: return <svg {...p}><path d="M5 21V10M12 21V4M19 21v-8" /></svg>;
  }
}

const ZLogo = () => (
  <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
    <path d="M3 4h26v6L12 22h17v6H3v-6l17-12H3z" fill="#2dd4bf" />
  </svg>
);

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false); // phone menu

  // Search + notifications share one small data cache (orders, production, low stock)
  const [data, setData] = useState({ orders: [], production: [], lowStock: [] });
  const [panel, setPanel] = useState(null); // null | "search" | "bell"
  const [query, setQuery] = useState("");
  const [read, setRead] = useState(readSet);
  const searchBox = useRef(null);
  const bellBox = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const loggedIn = !!user && !!localStorage.getItem("token");
  const isWorker = user?.role === "Worker";

  const refresh = useCallback(async () => {
    if (!loggedIn) return;
    // Each call is independent: if one fails (for example no permission) the others still work
    const [o, p, l] = await Promise.allSettled([
      isWorker ? Promise.resolve([]) : fetchOrders(),
      fetchProduction(),
      api("/items/low-stock"),
    ]);
    const list = (r) => (r.status === "fulfilled" && Array.isArray(r.value) ? r.value : []);
    const low = l.status === "fulfilled" ? (Array.isArray(l.value) ? l.value : l.value?.items || []) : [];
    setData({ orders: list(o), production: list(p), lowStock: low });
  }, [loggedIn, isWorker]);

  // Load on start, every minute, and again whenever the page changes (new order, dispatch...)
  useEffect(() => { refresh(); }, [refresh, location.pathname]);
  useEffect(() => {
    const t = setInterval(refresh, 60000);
    return () => clearInterval(t);
  }, [refresh]);

  // Close the dropdowns on outside click, Esc, or page change
  useEffect(() => {
    const onDown = (e) => {
      if (searchBox.current?.contains(e.target) || bellBox.current?.contains(e.target)) return;
      setPanel(null);
    };
    const onKey = (e) => { if (e.key === "Escape") setPanel(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, []);
  useEffect(() => { setPanel(null); }, [location.pathname]);

  // ---- Search results -------------------------------------------------------
  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace("#", "");
    if (!q) return [];
    const out = [];
    data.orders
      .filter((o) => String(o.id) === q || (o.party_name || "").toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((o) => out.push({ key: `o${o.id}`, to: `/orders/${o.id}`, group: "Orders",
        title: `#${o.id} · ${o.party_name || "Order"}`, sub: `${o.order_type === "PURCHASE" ? "Purchase" : "Sales"} · due ${o.due_date || "-"}` }));
    data.production
      .filter((p) => String(p.id) === q || (p.finished_item_name || "").toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((p) => out.push({ key: `p${p.id}`, to: `/production/${p.id}`, group: "Production",
        title: `#${p.id} · ${p.finished_item_name || "Production order"}`, sub: p.status }));
    return out;
  }, [query, data]);

  const goTo = (to) => { setQuery(""); setPanel(null); navigate(to); };

  // ---- Notifications --------------------------------------------------------
  const notifications = useMemo(() => {
    const list = [];
    const now = today();
    data.orders.forEach((o) => {
      if (o.due_date && o.due_date < now && o.goods_status !== "Dispatched")
        list.push({ key: `late-${o.id}-${o.due_date}`, to: `/orders/${o.id}`, tone: "red",
          text: `Order #${o.id} (${o.party_name}) is overdue`, sub: `Due ${o.due_date}, goods ${String(o.goods_status || "not dispatched").toLowerCase()}` });
      if (o.goods_status === "Dispatched" && o.invoice_status === "Pending")
        list.push({ key: `inv-${o.id}`, to: `/orders/${o.id}`, tone: "amber",
          text: `Order #${o.id}: dispatched, invoice still pending`, sub: o.party_name });
    });
    data.production.forEach((p) => {
      if (p.status === "PENDING")
        list.push({ key: `prod-${p.id}`, to: `/production/${p.id}`, tone: "amber",
          text: `Production #${p.id} (${p.finished_item_name || "item"}) is waiting`, sub: "Status: PENDING" });
    });
    data.lowStock.forEach((it, i) => {
      const id = it.id ?? it.item_id ?? i;
      const qty = it.current_stock ?? it.stock ?? it.quantity;
      list.push({ key: `low-${id}`, to: "/inventory", tone: "red",
        text: `Low stock: ${it.name || it.item_name || `item ${id}`}`, sub: qty !== undefined ? `${qty} left` : "Below minimum level" });
    });
    return list;
  }, [data]);

  const unread = notifications.filter((n) => !read.has(n.key));

  const markAllRead = () => {
    const next = new Set([...read, ...notifications.map((n) => n.key)]);
    saveSet(next); setRead(next);
  };
  const openNotification = (n) => {
    const next = new Set(read); next.add(n.key);
    saveSet(next); setRead(next); goTo(n.to);
  };

  // All hooks are above this line
  if (!loggedIn) return <Navigate to="/login" replace />;

  const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); navigate("/login"); };
  const initials = (user.name || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const [seg1, seg2] = location.pathname.split("/").filter(Boolean);
  const title = seg2 ? (DETAIL_TITLES[seg1] || TITLES[seg1]) : TITLES[seg1] || "";

  const dot = { red: "bg-red-500", amber: "bg-amber-500" };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col bg-gradient-to-b from-teal-700 to-teal-950 text-teal-50 transition-transform md:static md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-2.5 px-5 py-5">
          <ZLogo />
          <span className="text-base font-bold text-white">TranZact ERP</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {MENU.filter((m) => m.roles.includes(user.role)).map((m) => (
            <NavLink key={m.to} to={m.to} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-white/15 text-white" : "text-teal-100 hover:bg-white/10"}`}>
              <Icon name={m.label} />{m.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-t border-white/15 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-300 text-xs font-bold text-teal-900">{initials}</div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{user.name}</div>
            <div className="text-xs text-teal-200">{user.role}</div>
          </div>
        </div>
      </aside>

      {/* Right side */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3 md:px-8">
          <button onClick={() => setOpen(true)} aria-label="Open menu"
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-lg md:hidden">☰</button>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

          <div className="ml-auto flex items-center gap-3">
            {/* Global search: orders and production orders */}
            <div ref={searchBox} className="relative hidden md:block">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
              <input aria-label="Search" value={query} placeholder="Search orders, production…"
                onChange={(e) => { setQuery(e.target.value); setPanel("search"); }}
                onFocus={() => setPanel("search")}
                onKeyDown={(e) => { if (e.key === "Enter" && results[0]) goTo(results[0].to); }}
                className="h-10 w-56 rounded-full border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm focus:border-teal-600 focus:outline-none lg:w-72" />

              {panel === "search" && query.trim() && (
                <div className="absolute right-0 top-12 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  {results.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-slate-500">No results for “{query.trim()}”</p>
                  ) : (
                    <ul className="max-h-96 overflow-y-auto py-1">
                      {results.map((r, i) => (
                        <li key={r.key}>
                          {(i === 0 || results[i - 1].group !== r.group) && (
                            <div className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{r.group}</div>
                          )}
                          <button onClick={() => goTo(r.to)} className="block w-full px-4 py-2 text-left hover:bg-teal-50">
                            <div className="truncate text-sm font-medium text-slate-900">{r.title}</div>
                            <div className="truncate text-xs text-slate-500">{r.sub}</div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div ref={bellBox} className="relative">
              <button aria-label="Notifications" onClick={() => setPanel(panel === "bell" ? null : "bell")}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">
                🔔
                {unread.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                    {unread.length > 9 ? "9+" : unread.length}
                  </span>
                )}
              </button>

              {panel === "bell" && (
                <div className="absolute right-0 top-12 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-900">Notifications</span>
                    {unread.length > 0 && (
                      <button onClick={markAllRead} className="text-xs font-medium text-teal-700 hover:underline">Mark all as read</button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">You are all caught up.</p>
                  ) : (
                    <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
                      {notifications.map((n) => (
                        <li key={n.key}>
                          <button onClick={() => openNotification(n)}
                            className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${read.has(n.key) ? "opacity-60" : ""}`}>
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot[n.tone]}`} />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-slate-900">{n.text}</span>
                              <span className="block truncate text-xs text-slate-500">{n.sub}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold leading-tight text-slate-900">{user.name}</div>
              <div className="text-xs text-slate-500">{user.role}</div>
            </div>
            <button onClick={logout}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Logout</button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-5 md:p-8">
          <div className="mx-auto max-w-7xl"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}