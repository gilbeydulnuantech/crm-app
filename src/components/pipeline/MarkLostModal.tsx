import { useState } from 'react';
import { useUsers } from '../../hooks/useContacts';
import { useAuth } from '../../context/AuthContext';
import { toTitleCase } from '../../utils/text';

export interface MarkLostFollowUp {
  date: string;
  assignedUserId: number | null;
}

export interface MarkLostResult {
  reason: string;
  competitor: string;
  details: string;
  followUp: MarkLostFollowUp | null;
}

interface Props {
  open: boolean;
  dealName?: string;
  dealValue?: number | string | null;
  onConfirm: (result: MarkLostResult) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const LOSS_REASONS = [
  'Price / Out of Budget',
  'Lost to Competitor',
  'Scope / Feature Mismatch',
  'Bad Timing / Project Postponed',
  'Unresponsive / Ghosted',
  'Disqualified / Poor Fit',
];

function currency(val?: number | string | null) {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  if (isNaN(n)) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

function defaultFollowUpDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
}

export default function MarkLostModal({ open, dealName, dealValue, onConfirm, onCancel, isSubmitting }: Props) {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const [reason, setReason] = useState('');
  const [competitor, setCompetitor] = useState('');
  const [details, setDetails] = useState('');
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(defaultFollowUpDate());
  const [followUpAssignee, setFollowUpAssignee] = useState('');

  if (!open) return null;

  function reset() {
    setReason('');
    setCompetitor('');
    setDetails('');
    setScheduleFollowUp(false);
    setFollowUpDate(defaultFollowUpDate());
    setFollowUpAssignee('');
  }

  function handleConfirm() {
    if (!reason) return;
    onConfirm({
      reason,
      competitor: competitor.trim(),
      details: details.trim(),
      followUp: scheduleFollowUp
        ? {
            date: followUpDate,
            assignedUserId: followUpAssignee ? Number(followUpAssignee) : user?.id ?? null,
          }
        : null,
    });
    reset();
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  const value = currency(dealValue);

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 z-[120] flex items-center justify-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-800">Mark Deal as Closed Lost</h3>
          <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Deal: {dealName ?? '--'}
          {value ? ` (${value})` : ''}
        </p>

        <label className="block text-xs font-medium text-slate-600 mb-1">Primary Reason for Loss *</label>
        <select
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] mb-4"
        >
          <option value="" disabled>
            Select a primary reason...
          </option>
          {LOSS_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <label className="block text-xs font-medium text-slate-600 mb-1">
          Competitor <span className="text-slate-400 font-normal">(if applicable)</span>
        </label>
        <input
          list="mark-lost-competitors"
          value={competitor}
          onChange={(e) => setCompetitor(e.target.value)}
          placeholder="Select or type competitor name..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] mb-4"
        />

        <label className="block text-xs font-medium text-slate-600 mb-1">Loss Details & Feedback</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Client cited budget constraints, competitor details, or other context from the debrief..."
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] mb-4"
        />

        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={scheduleFollowUp}
            onChange={(e) => setScheduleFollowUp(e.target.checked)}
            className="rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)]"
          />
          Schedule Follow-up / Re-engagement Task
        </label>

        {scheduleFollowUp && (
          <div className="grid grid-cols-2 gap-3 mb-4 pl-6">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Assign To</label>
              <select
                value={followUpAssignee}
                onChange={(e) => setFollowUpAssignee(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              >
                <option value="">{user ? toTitleCase(user.name) : 'Me'}</option>
                {users
                  .filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {toTitleCase(u.name)}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !reason}
            className="px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-lg"
          >
            {isSubmitting ? 'Saving...' : 'Confirm Closed Lost'}
          </button>
        </div>
      </div>
    </div>
  );
}
