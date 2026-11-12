export default function Modal({ open, title, message, children, onClose, onConfirm, confirmText = "Confirm", busy = false, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white p-5 shadow-xl ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
        {children}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">Cancel</button>
          {onConfirm && (
            <button onClick={onConfirm} disabled={busy}
              className="rounded bg-blue-900 px-3 py-1.5 text-sm text-white hover:bg-blue-900 disabled:opacity-50">
              {busy ? "Saving…" : confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}