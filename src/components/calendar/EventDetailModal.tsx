import { useState } from 'react';
import { CalendarEvent, EVENT_TYPE_META } from '../../types/event';
import { useDeleteEvent, useUpdateEvent } from '../../hooks/useEvents';
import { toTitleCase } from '../../utils/text';
import OwnerBadge from '../OwnerBadge';

interface Props {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onOpenContact?: (contactId: number) => void;
  onOpenCompany?: (companyId: number) => void;
  onOpenOpportunity?: (opportunityId: number) => void;
  isAdmin: boolean;
  currentUserId?: number;
}

export default function EventDetailModal({
  event,
  onClose,
  onEdit,
  onOpenContact,
  onOpenCompany,
  onOpenOpportunity,
  isAdmin,
  currentUserId,
}: Props) {
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState('');

  if (!event) return null;

  // View All, Edit Owned Only: standard users can see every event but only
  // edit/reschedule/complete/delete the ones assigned to them. Admins can
  // act on anything. Backend enforces this too (Calendar Events.json).
  const canEdit = isAdmin || event.user_id === currentUserId;

  const meta = EVENT_TYPE_META[event.type];

  function handleComplete() {
    updateEvent.mutate({
      id: event!.id,
      payload: { is_completed: true, completed_at: new Date().toISOString() },
    });
  }

  function handleReschedule() {
    if (!newDate) return;
    updateEvent.mutate(
      { id: event!.id, payload: { due_at: new Date(newDate).toISOString() } },
      { onSuccess: () => setRescheduling(false) }
    );
  }

  function handleDelete() {
    if (!confirm(`Delete "${event!.subject}"? This cannot be undone.`)) return;
    deleteEvent.mutate(event!.id, { onSuccess: onClose });
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">{event.subject}</h2>
            <span className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${meta?.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta?.dot}`} />
              {meta?.label}
              {event.is_completed && ' · Completed'}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Field label="Date" value={new Date(event.due_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} />
          <Field
            label={event.is_all_day ? 'Time' : 'Start Time'}
            value={
              event.is_all_day
                ? 'All Day'
                : new Date(event.due_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
            }
          />
          {event.end_at && !event.is_all_day && (
            <Field
              label="End Time"
              value={new Date(event.end_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            />
          )}
          {event.location && <Field label="Location" value={event.location} />}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Assigned To</label>
            <OwnerBadge
              name={event.assigned_user_name}
              color={event.assigned_user_color}
              avatarUrl={event.assigned_user_avatar_url}
              emptyLabel="--"
            />
          </div>

          {event.company_name && (
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Company</label>
              <button
                onClick={() => event.company_id && onOpenCompany?.(event.company_id)}
                className="text-sm text-indigo-600 hover:underline"
              >
                {toTitleCase(event.company_name)}
              </button>
            </div>
          )}

          {event.contact_name && (
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Contact</label>
              <button
                onClick={() => event.contact_id && onOpenContact?.(event.contact_id)}
                className="text-sm text-indigo-600 hover:underline"
              >
                {toTitleCase(event.contact_name)}
              </button>
            </div>
          )}

          {event.opportunity_name && (
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Pipeline / Deal</label>
              <button
                onClick={() => event.opportunity_id && onOpenOpportunity?.(event.opportunity_id)}
                className="text-sm text-indigo-600 hover:underline"
              >
                {event.opportunity_name}
              </button>
            </div>
          )}

          {event.resources && event.resources.length > 0 && (
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Equipment/Resources</label>
              <div className="flex flex-wrap gap-1.5">
                {event.resources.map((r) => (
                  <span
                    key={r.id}
                    className="px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full"
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Field label="Notes" value={event.body} />

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Attachments</label>
            <p className="text-xs text-slate-400 italic">
              No attachment storage exists in the schema yet (no `attachments`/file table) — this is
              a placeholder until that's added.
            </p>
          </div>

          {rescheduling && (
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">New Date &amp; Time</label>
              <input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReschedule}
                  className="flex-1 bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white text-xs font-semibold py-1.5 rounded-lg"
                >
                  Save New Time
                </button>
                <button
                  onClick={() => setRescheduling(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium py-1.5 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {canEdit ? (
          <div className="p-4 border-t border-slate-200 shrink-0 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(event)}
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium py-2 rounded-lg"
              >
                Edit
              </button>
              <button
                onClick={() => setRescheduling(true)}
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium py-2 rounded-lg"
              >
                Reschedule
              </button>
            </div>
            <div className="flex gap-2">
              {!event.is_completed && (
                <button
                  onClick={handleComplete}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 rounded-lg"
                >
                  Complete
                </button>
              )}
              <button
                onClick={handleDelete}
                className="flex-1 border border-rose-200 hover:bg-rose-50 text-rose-600 text-sm font-medium py-2 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-slate-200 shrink-0">
            <p className="text-xs text-slate-400 text-center">
              This event is assigned to someone else — you can view it but not edit it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <p className="text-sm text-slate-700">{value || '--'}</p>
    </div>
  );
}
