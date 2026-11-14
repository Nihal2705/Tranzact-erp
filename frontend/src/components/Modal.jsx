// Centred pop-up. Used for confirmation dialogs (title + message + Cancel / Confirm).
export default function Modal({ open, title, message, children, onClose, onConfirm, confirmText = "Confirm", busy = false, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className={`flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-2xl ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="px-6 pb-2 pt-5">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        <div className="overflow-y-auto px-6 pb-4">
          {message && <p className="text-sm leading-relaxed text-slate-600">{message}</p>}
          {children}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          {onConfirm && (
            <button onClick={onConfirm} disabled={busy}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? "Saving…" : confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
