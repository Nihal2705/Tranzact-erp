import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

const ZLogo = ({ className = "h-8 w-8" }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M3 4h26v6L12 22h17v6H3v-6l17-12H3z" fill="#2dd4bf" />
  </svg>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError("Email and password are required");
    setBusy(true);
    try {
      const data = await api("/auth/login", { method: "POST", body: { email: email.trim(), password } });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate(data.user.role === "Worker" ? "/inventory" : "/dashboard");
    } catch (err) {
      if (err.response?.status === 401) setError("Invalid email or password");
      else if (!err.response) setError("Cannot reach the server. Check your connection and try again.");
      else setError(err.response?.data?.error || "Unable to sign in");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 " +
    "focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30";

  return (
    <div className="flex min-h-screen">
      {/* Left teal panel */}
      <div className="relative hidden flex-1 flex-col justify-between bg-gradient-to-b from-teal-900 to-teal-950 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <ZLogo />
          <span className="text-lg font-bold">TranZact ERP</span>
        </div>

        <div>
          <h1 className="text-5xl font-bold leading-tight">
            Smarter inventory.<span className="block">Stronger business.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-teal-100/90">
            Stock, orders and production for your factory, always in sync.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Live stock", "Partial dispatch", "Production tracking"].map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-teal-50">{t}</span>
            ))}
          </div>
        </div>

        <div className="text-sm text-teal-300">Admin · Manager · Worker access</div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue.</p>

          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}

          <label className="mt-5 block text-xs font-semibold text-slate-700">Email</label>
          <input className={`${field} mt-1.5`} type="email" placeholder="admin@tranzact.com" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="mt-4 block text-xs font-semibold text-slate-700">Password</label>
          <input className={`${field} mt-1.5`} type="password" placeholder="••••••••" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />

          <button disabled={busy}
            className="mt-6 h-11 w-full rounded-xl bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-500">No sign-up page. Accounts are created by the Admin.</p>
        </form>
      </div>
    </div>
  );
}
