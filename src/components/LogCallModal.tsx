import { useState } from 'react';
import { useLogCallActivity } from '../hooks/useActivity';

const OUTCOMES = ['Connected', 'No Answer', 'Voicemail', 'Busy'];

interface Props {
  open: boolean;
  entityType: 'contact' | 'company';
  entityId: number;
  entityLabel: string;
  onClose: () => void;
}

export default function LogCallModal({ open, entityType, entityId, entityLabel, onClose }: Props) {
  const logCall = useLogCallActivity(entityType, entityId);
  const [outcome, setOutcome] = useState(OUTCOMES[0]);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setOutcome(OUTCOMES[0]);
    setDuration('');
    setNotes('');
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    const durationMinutes = duration ? Number(duration) : undefined;
    const summary =
      `Logged a call with ${entityLabel} — ${outcome}` +
      (durationMinutes ? ` (${durationMinutes} min)` : '');

    logCall.mutate(
      { summary, detail: { outcome, duration_minutes: durationMinutes, notes: notes.trim() || undefined } },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to log call.'),
      }
    );
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/78 z-[120] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Log a Call</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Outcome</label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
          >
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Duration (minutes)</label>
          <input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Optional"
            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What was discussed..."
            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
          />
        </div>

        {error && (
          <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={logCall.isPending}
          className="w-full bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {logCall.isPending ? 'Saving...' : 'Save Call'}
        </button>
      </div>
    </div>
  );
}
