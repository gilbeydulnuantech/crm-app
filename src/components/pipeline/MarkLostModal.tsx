import { useState } from 'react';

interface Props {
  open: boolean;
  dealName?: string;
  onConfirm: (reason: string, note: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const LOST_REASONS = ['Price', 'Competitor', 'No Response', 'Project Cancelled', 'Not Qualified', 'Other'];

export default function MarkLostModal({ open, dealName, onConfirm, onCancel, isSubmitting }: Props) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  if (!open) return null;

  function handleConfirm() {
    if (!reason) return;
    onConfirm(reason, note.trim());
    setReason('');
    setNote('');
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-1">Mark {dealName ?? 'deal'} as lost?</h3>
        <p className="text-xs text-slate-500 mb-4">
          This closes the deal as lost. The reason is used for reporting.
        </p>

        <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
        <select
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
        >
          <option value="" disabled>
            Select a reason...
          </option>
          {LOST_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <label className="block text-xs font-medium text-slate-600 mb-1">
          Note <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Additional context, e.g. quote details, competitor name..."
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
            disabled={isSubmitting || !reason}
            className="px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-lg"
          >
            {isSubmitting ? 'Saving...' : 'Mark Lost'}
          </button>
        </div>
      </div>
    </div>
  );
}
