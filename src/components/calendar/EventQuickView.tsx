import { ReactNode } from 'react';
import { CalendarEvent } from '../../types/event';
import { toTitleCase } from '../../utils/text';

interface Props {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
}

function Row({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <i className={`fa-solid ${icon} text-slate-400 w-4 text-center text-xs shrink-0`} />
      <span className="truncate">{children}</span>
    </div>
  );
}

export default function EventQuickView({ event, onClose, onEdit }: Props) {
  if (!event) return null;

  const dateLabel = new Date(event.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const startLabel = new Date(event.due_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endLabel = event.end_at
    ? new Date(event.end_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : null;

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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="space-y-2.5 text-sm text-slate-700">
          <Row icon="fa-calendar">
            {dateLabel} · {startLabel}
            {endLabel ? ` – ${endLabel}` : ''}
          </Row>
          {event.contact_name && <Row icon="fa-user">{toTitleCase(event.contact_name)}</Row>}
          {event.company_name && <Row icon="fa-building">{event.company_name}</Row>}
          {event.assigned_user_name && <Row icon="fa-user-tie">{toTitleCase(event.assigned_user_name)}</Row>}
          {event.resources && event.resources.length > 0 && (
            <Row icon="fa-truck">{event.resources.map((r) => r.name).join(', ')}</Row>
          )}
          {event.location && <Row icon="fa-location-dot">{event.location}</Row>}
        </div>

        <button
          onClick={() => onEdit(event)}
          className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
