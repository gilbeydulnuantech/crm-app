import { FormEvent, useState } from 'react';
import {
  useCalendarIntegrations,
  useAddCalendarIntegration,
  useUpdateCalendarIntegration,
  useDeleteCalendarIntegration,
} from '../../hooks/useCalendarIntegrations';
import { useUsers } from '../../hooks/useContacts';
import { toTitleCase } from '../../utils/text';
import Avatar from '../Avatar';
import ConfirmDialog from '../ConfirmDialog';

interface Props {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

export default function CalendarIntegrationsModal({ open, onClose }: Props) {
  const { data: integrations = [], isLoading } = useCalendarIntegrations(open);
  const { data: users = [] } = useUsers();
  const addIntegration = useAddCalendarIntegration();
  const updateIntegration = useUpdateCalendarIntegration();
  const deleteIntegration = useDeleteCalendarIntegration();

  const [label, setLabel] = useState('');
  const [link, setLink] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletedMessage, setDeletedMessage] = useState<string | null>(null);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!link.trim()) {
      setError('Paste the Google Calendar link or calendar ID.');
      return;
    }
    if (!ownerId) {
      setError('Pick which rep this calendar belongs to.');
      return;
    }
    addIntegration.mutate(
      { label: label.trim() || undefined, calendar_link: link.trim(), owner_user_id: Number(ownerId) },
      {
        onSuccess: () => {
          setLabel('');
          setLink('');
          setOwnerId('');
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add calendar.'),
      }
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <h3 className="text-lg font-bold text-slate-800">Google Calendar Integrations</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 px-6 mt-1">
          When a lead books a slot on a rep's calendar, it's synced in automatically as a new event (and a
          new contact if they're not in the CRM yet). Syncs every 5 minutes.
        </p>
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mx-6 mt-2">
          Use the rep's <strong>calendar ID</strong> (their Gmail address, or "primary"), not a booking-page
          link. Find it in Google Calendar under Settings → [calendar] → "Integrate calendar" → Calendar ID.
          That calendar must be shared with the Google account this integration is authorized as.
        </p>

        <form onSubmit={handleSubmit} className="px-6 mt-4 space-y-2 border-b border-slate-100 pb-4">
          <input
            type="text"
            placeholder="Calendar ID (e.g. juan@company.com or primary)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className={inputClass}
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Label (optional, e.g. Juan's Calendar)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={inputClass}
            />
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputClass}>
              <option value="">Owner...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {toTitleCase(u.name)}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>
          )}
          <button
            type="submit"
            disabled={addIntegration.isPending}
            className="w-full px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {addIntegration.isPending && <i className="fa-solid fa-spinner fa-spin" />}
            Add Calendar
          </button>
        </form>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {deletedMessage && (
            <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5 flex items-center gap-1.5">
              <i className="fa-solid fa-circle-check" />
              {deletedMessage}
            </p>
          )}
          {isLoading ? (
            <p className="text-sm text-slate-400 py-4 text-center">Loading...</p>
          ) : integrations.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No calendars connected yet.</p>
          ) : (
            integrations.map((ci) => (
              <div
                key={ci.id}
                className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg ${
                  ci.is_active ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-60'
                }`}
              >
                <Avatar name={ci.owner_name || '?'} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {ci.label || ci.calendar_id}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {ci.owner_name ? toTitleCase(ci.owner_name) : 'Unassigned'} · Used for CRM → Google sync
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateIntegration.mutate({ id: ci.id, isActive: !ci.is_active })}
                  disabled={updateIntegration.isPending}
                  className={`shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded-lg border disabled:opacity-40 ${
                    ci.is_active
                      ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {ci.is_active ? 'Pause' : 'Resume'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setConfirmDeleteId(ci.id);
                  }}
                  className="shrink-0 text-slate-400 hover:text-rose-600"
                  title="Remove"
                >
                  <i className="fa-solid fa-trash text-xs" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Remove Calendar Integration"
        body="This stops syncing new bookings from this calendar. Events already imported stay on the Calendar page."
        confirmLabel="Remove"
        danger
        isSubmitting={deleteIntegration.isPending}
        error={deleteError}
        onCancel={() => {
          setConfirmDeleteId(null);
          setDeleteError(null);
        }}
        onConfirm={() => {
          if (confirmDeleteId == null) return;
          const removed = integrations.find((ci) => ci.id === confirmDeleteId);
          deleteIntegration.mutate(confirmDeleteId, {
            onSuccess: () => {
              setConfirmDeleteId(null);
              setDeleteError(null);
              setDeletedMessage(`Removed "${removed?.label || removed?.calendar_id || 'calendar'}".`);
              setTimeout(() => setDeletedMessage(null), 4000);
            },
            onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Failed to remove calendar.'),
          });
        }}
      />
    </>
  );
}
