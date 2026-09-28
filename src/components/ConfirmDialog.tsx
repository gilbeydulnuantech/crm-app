interface Props {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// App-styled stand-in for window.confirm() — same visual language as
// ArchiveReasonModal, so a delete/merge/etc. confirmation doesn't drop out
// of the app's branding into an unstyled native browser dialog.
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  danger = true,
  isSubmitting,
  error,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[120] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
        {body && <p className="text-xs text-slate-500 mb-4">{body}</p>}
        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 mb-3">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60 ${
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)]'
            }`}
          >
            {isSubmitting ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
