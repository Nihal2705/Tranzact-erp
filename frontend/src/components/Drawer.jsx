// Side panel that slides in from the right. Used for the two "Create" forms (as in the design).
export default function Drawer({ open, title, subtitle, onClose, onConfirm, confirmText = "Create", busy = false, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between px-6 pb-3 pt-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg leading-none text-slate-500 hover:bg-slate-50">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4">{children}</div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} disabled={busy}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Saving…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
