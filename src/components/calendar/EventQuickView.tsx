import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarEvent } from '../../types/event';
import { useDeleteEvent } from '../../hooks/useEvents';
import { toTitleCase } from '../../utils/text';
import { DEFAULT_USER_COLOR, hexToRgba } from '../../utils/userColor';

interface Props {
  event: CalendarEvent | null;
  onClose: () => void;
  onViewFullDetails: (event: CalendarEvent) => void;
  onEdit: (event: CalendarEvent) => void;
  isAdmin: boolean;
  currentUserId?: number;
}

function Row({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <i className={`fa-solid ${icon} text-slate-400 w-4 text-center text-xs shrink-0`} />
      <span className="truncate">{children}</span>
    </div>
  );
}

export default function EventQuickView({ event, onClose, onViewFullDetails, onEdit, isAdmin, currentUserId }: Props) {
  const navigate = useNavigate();
  const deleteEvent = useDeleteEvent();

  if (!event) return null;

  const canEdit = isAdmin || event.user_id === currentUserId;

  const dateLabel = new Date(event.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const startLabel = new Date(event.due_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endLabel = event.end_at
    ? new Date(event.end_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : null;

  function handleDelete() {
    if (!confirm(`Delete "${event!.subject}"? This cannot be undone.`)) return;
    deleteEvent.mutate(event!.id, { onSuccess: onClose });
  }

  function goToContact() {
    if (!event!.contact_id) return;
    onClose();
    navigate(`/contacts?contactId=${event!.contact_id}`);
  }

  function goToCompany() {
    if (!event!.company_id) return;
    onClose();
    navigate(`/companies?companyId=${event!.company_id}`);
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 z-[95] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800 truncate pr-2">{event.subject}</h3>
          <div className="flex items-center gap-3 shrink-0">
            {canEdit && (
              <>
                <button onClick={() => onEdit(event)} className="text-slate-400 hover:text-indigo-600" title="Edit">
                  <i className="fa-solid fa-pen text-xs" />
                </button>
                <button onClick={handleDelete} className="text-slate-400 hover:text-rose-600" title="Delete">
                  <i className="fa-solid fa-trash text-xs" />
                </button>
              </>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600" title="Close">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        <div className="space-y-2.5 text-sm text-slate-700">
          <Row icon="fa-calendar">
            {dateLabel} · {startLabel}
            {endLabel ? ` – ${endLabel}` : ''}
          </Row>
          {event.contact_name && (
            <Row icon="fa-user">
              {event.contact_id ? (
                <button onClick={goToContact} className="text-[var(--theme-accent)] hover:underline">
                  {toTitleCase(event.contact_name)}
                </button>
              ) : (
                toTitleCase(event.contact_name)
              )}
            </Row>
          )}
          {event.company_name && (
            <Row icon="fa-building">
              {event.company_id ? (
                <button onClick={goToCompany} className="text-[var(--theme-accent)] hover:underline">
                  {toTitleCase(event.company_name)}
                </button>
              ) : (
                toTitleCase(event.company_name)
              )}
            </Row>
          )}
          {event.assigned_user_name && (
            <Row icon="fa-user-tie">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full"
                style={{
                  backgroundColor: hexToRgba(event.assigned_user_color || DEFAULT_USER_COLOR, 0.14),
                  color: event.assigned_user_color || DEFAULT_USER_COLOR,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: event.assigned_user_color || DEFAULT_USER_COLOR }}
                />
                {toTitleCase(event.assigned_user_name)}
              </span>
            </Row>
          )}
          {event.resources && event.resources.length > 0 && (
            <Row icon="fa-truck">{event.resources.map((r) => r.name).join(', ')}</Row>
          )}
          {event.location && <Row icon="fa-location-dot">{event.location}</Row>}
        </div>

        <button
          onClick={() => onViewFullDetails(event)}
          className="w-full mt-5 bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white text-sm font-semibold py-2 rounded-lg"
        >
          View Full Details
        </button>
      </div>
    </div>
  );
}
