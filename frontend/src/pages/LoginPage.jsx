import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

const TLogo = ({ className = "h-8 w-8" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
    <polygon points="0,6 100,6 100,24 0,44" />
    <polygon points="36,46 64,40 64,98 36,98" />
  </svg>
);

const Wordmark = ({ text = "text-white", erp = "text-blue-300", size = "text-2xl", logo = "h-7 w-7" }) => (
  <div className="flex items-end">
    <TLogo className={`${logo} ${text}`} />
    <span className={`-ml-0.5 font-extrabold leading-none tracking-tight ${size} ${text}`}>ranZact</span>
    <span className={`ml-2 font-extrabold leading-none tracking-tight ${size} ${erp}`}>ERP</span>
  </div>
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
      const data = await api("/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });
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
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 shadow-sm " +
    "placeholder:text-gray-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200";

  return (
    <div className="flex min-h-screen">
      {/* Left navy panel */}
      <div className="relative hidden flex-1 flex-col overflow-hidden bg-[#14295c] p-14 text-white lg:flex">
        {/* Big faint cut-T watermark */}
        <TLogo className="absolute left-16 top-[14%] h-80 w-80 text-white opacity-[0.08]" />

        {/* Top: logo */}
        <div className="relative">
          <Wordmark size="text-3xl" logo="h-9 w-9" />
        </div>

        {/* Middle: heading, vertically centred */}
        <div className="relative flex flex-1 items-center">
          <div className="pl-6">
            <h1 className="text-7xl font-extrabold leading-[1.1]">
              Welcome to
              <span className="block">TranZact ERP</span>
            </h1>
            <p className="mt-8 max-w-xl text-2xl leading-relaxed text-blue-100/80">
              Streamline your operations, empower your team. Stock, orders and production in one place.
            </p>
          </div>
        </div>

        {/* Bottom: footer */}
        <div className="relative text-sm text-blue-200/60">© 2026 TranZact ERP</div>
      </div>

      {/* Right white panel */}
      <div className="flex flex-1 items-center justify-center bg-white p-6">
        <form onSubmit={submit} className="w-full max-w-md">
          <Wordmark text="text-[#14295c]" erp="text-blue-600" size="text-4xl" logo="h-10 w-10" />

          <h2 className="mt-8 text-4xl font-extrabold text-gray-900">Sign in</h2>
          <p className="mt-2 text-lg text-gray-500">Enter your credentials to access your account.</p>

          {error && (
            <div className="mt-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-base text-red-600">{error}</div>
          )}

          <label className="mt-7 block text-base font-medium text-gray-700">Business email</label>
          <input className={`${field} mt-2`} type="email" placeholder="name@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />

          <label className="mt-5 block text-base font-medium text-gray-700">Password</label>
          <input className={`${field} mt-2`} type="password" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />

          <button disabled={busy}
            className="mt-8 w-full rounded-lg bg-blue-600 py-3.5 text-lg font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Signing in…" : "Sign In"}
          </button>

          <p className="mt-6 text-center text-base text-gray-500">Need an account? Ask your Admin.</p>
        </form>
      </div>
    </div>
  );
}