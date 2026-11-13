import { useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

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

  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user || !localStorage.getItem("token")) return <Navigate to="/login" replace />;

  const logout = () => { localStorage.clear(); navigate("/login"); };
  const initials = (user.name || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const [seg1, seg2] = location.pathname.split("/").filter(Boolean);
  const title = seg2 ? (DETAIL_TITLES[seg1] || TITLES[seg1]) : TITLES[seg1] || "";

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
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3 md:px-8">
          <button onClick={() => setOpen(true)} aria-label="Open menu"
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-lg md:hidden">☰</button>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

          <div className="ml-auto flex items-center gap-3">
            {/* Search and bell are visual only, as in the design */}
            <div className="relative hidden lg:block">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
              <input aria-label="Search" placeholder="Search anything…"
                className="h-10 w-72 rounded-full border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm focus:border-teal-600 focus:outline-none" />
            </div>
            <button aria-label="Notifications" className="relative hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 sm:flex">
              🔔<span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </button>
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
