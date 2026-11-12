import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";

const MENU = [
  { to: "/dashboard", label: "Dashboard", roles: ["Admin", "Manager"] },
  { to: "/inventory", label: "Inventory", roles: ["Admin", "Manager", "Worker"] },
  { to: "/orders", label: "Orders", roles: ["Admin", "Manager"] },
  { to: "/production", label: "Production", roles: ["Admin", "Manager", "Worker"] },
  { to: "/reports", label: "Reports", roles: ["Admin", "Manager"] },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user || !localStorage.getItem("token")) return <Navigate to="/login" replace />;

  const logout = () => { localStorage.clear(); navigate("/login"); };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-56 shrink-0 border-r border-white/10 bg-[#14295c] md:block">
        <div className="p-4 text-lg font-bold text-white">TranZact ERP</div>
        <nav className="flex flex-col">
          {MENU.filter((m) => m.roles.includes(user.role)).map((m) => (
            <NavLink key={m.to} to={m.to}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm ${isActive ? "bg-white/10 font-semibold text-blue-100" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
              {m.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
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