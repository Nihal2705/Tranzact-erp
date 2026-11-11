import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";

const MENU = [
  { to: "/dashboard", label: "Dashboard", roles: ["Admin", "Manager"] },
  { to: "/inventory", label: "Inventory", roles: ["Admin", "Manager", "Worker"] },
  {
    to: "/orders",   label: "Orders",roles: ["Admin", "Manager"]
  },
  { to: "/production", label: "Production", roles: ["Admin", "Manager", "Worker"] },
  { to: "/reports", label: "Reports", roles: ["Admin", "Manager"] },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ordersOpen, setOrdersOpen] = useState(location.pathname.startsWith("/orders"));
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) { navigate("/login"); return null; }

  const logout = () => { localStorage.clear(); navigate("/login"); };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-56 shrink-0 border-r border-white/10 bg-[#14295c] md:block">
        <div className="p-4 text-lg font-bold text-white">TranZact ERP</div>
        <nav className="flex flex-col">
          {MENU.filter((m) => m.roles.includes(user.role)).map((m) => {
  if (!m.children) {
    return (
      <NavLink key={m.label} to={m.to}
        className={({ isActive }) => `block px-4 py-2 text-sm ${isActive ? "bg-white/10 text-blue-100 font-semibold" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
        {m.label}
      </NavLink>
    );
  }
  return (
    <div key={m.label}>
      <button onClick={() => setOrdersOpen(!ordersOpen)}
        className="flex w-full items-center justify-between px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white">
        <span>{m.label}</span>
        <span className={`text-xs transition-transform ${ordersOpen ? "rotate-180" : ""}`}>▼</span>
      </button>
      {ordersOpen && (
        <div className="ml-4 border-l border-white/20">
          {m.children.map((c) => (
            <NavLink key={c.label} to={c.to} end
              className={({ isActive }) => `block px-4 py-2 text-sm ${isActive ? "bg-white/10 text-blue-100 font-semibold" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
              {c.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
})}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-white px-4 py-3">
          <span className="text-sm text-gray-500">Welcome</span>
          <div className="flex items-center gap-3 text-sm">
            <span>{user.name} <span className="text-gray-500">({user.role})</span></span>
            <button onClick={logout} className="rounded border px-3 py-1 hover:bg-gray-50">Logout</button>
          </div>
        </header>
        <main className="p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
