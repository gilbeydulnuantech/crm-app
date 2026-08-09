import { useState } from 'react';

interface Props {
  open: boolean;
  count: number;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function ArchiveReasonModal({ open, count, onConfirm, onCancel, isSubmitting }: Props) {
  const [reason, setReason] = useState('');

  if (!open) return null;

  function handleConfirm() {
    onConfirm(reason);
    setReason('');
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-1">
          Archive {count} contact{count === 1 ? '' : 's'}?
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Archived contacts are hidden from the main list but not deleted — you can restore them
          later from the Archived tab.
        </p>

        <label className="block text-xs font-medium text-slate-600 mb-1">
          Reason <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Duplicate, no longer at company, unresponsive..."
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-lg"
          >
            {isSubmitting ? 'Archiving...' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}
