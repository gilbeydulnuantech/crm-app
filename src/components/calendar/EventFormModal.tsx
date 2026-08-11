import { FormEvent, useEffect, useRef, useState } from 'react';
import { CalendarEvent, EVENT_TYPE_META, EVENT_TYPES, EventType } from '../../types/event';
import { useAddEvent, useUpdateEvent } from '../../hooks/useEvents';
import { useUsers } from '../../hooks/useContacts';
import { useAuth } from '../../context/AuthContext';
import { toTitleCase } from '../../utils/text';
import ContactPicker from '../pipeline/ContactPicker';
import OpportunityPicker from './OpportunityPicker';
import ResourcePicker from './ResourcePicker';

interface Props {
  open: boolean;
  event: CalendarEvent | null; // null = add mode
  defaultDate?: Date | null;
  onClose: () => void;
}

const EMPTY = {
  subject: '',
  type: 'meeting' as EventType,
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  isAllDay: false,
  contact_id: '',
  contact_name: '',
  opportunity_id: '',
  opportunity_name: '',
  assigned_user: '',
  location: '',
  resource_ids: [] as number[],
  body: '',
};

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}
function toTimeInput(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  return new Date(`${date}T${time || '00:00'}`).toISOString();
}

function TypeSelect({ value, onChange }: { value: EventType; onChange: (t: EventType) => void }) {
  const [open, setOpen] = useState(false);
  const meta = EVENT_TYPE_META[value];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        <i className="fa-solid fa-chevron-down text-[10px] text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 max-h-52 overflow-y-auto">
            {EVENT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 text-slate-700"
              >
                <span className={`w-2 h-2 rounded-full ${EVENT_TYPE_META[t].dot}`} />
                {EVENT_TYPE_META[t].label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function EventFormModal({ open, event, defaultDate, onClose }: Props) {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const addEvent = useAddEvent();
  const updateEvent = useUpdateEvent();

  const isEdit = !!event;
  const isSaving = addEvent.isPending || updateEvent.isPending;

  useEffect(() => {
    if (!open) return;

    if (event) {
      setForm({
        subject: event.subject ?? '',
        type: event.type ?? 'meeting',
        startDate: toDateInput(event.due_at),
        startTime: toTimeInput(event.due_at),
        endDate: event.end_at ? toDateInput(event.end_at) : '',
        endTime: event.end_at ? toTimeInput(event.end_at) : '',
        isAllDay: !!event.is_all_day,
        contact_id: event.contact_id ? String(event.contact_id) : '',
        contact_name: event.contact_name ?? '',
        opportunity_id: event.opportunity_id ? String(event.opportunity_id) : '',
        opportunity_name: event.opportunity_name ?? '',
        assigned_user: event.user_id ? String(event.user_id) : '',
        location: event.location ?? '',
        resource_ids: (event.resources ?? []).map((r) => r.id),
        body: event.body ?? '',
      });
    } else {
      const base = defaultDate ?? new Date();
      setForm({
        ...EMPTY,
        startDate: toDateInput(base.toISOString()),
        startTime: '09:00',
        assigned_user: user ? String(user.id) : '',
      });
    }
    setError(null);
  }, [event, open, defaultDate, user]);

  if (!open) return null;

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function wrapSelection(before: string, after: string) {
    const el = notesRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = form.body.slice(start, end);
    const next = form.body.slice(0, start) + before + selected + after + form.body.slice(end);
    update('body', next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + before.length;
      el.selectionEnd = start + before.length + selected.length;
    });
  }

  function prefixLines(prefix: (i: number) => string) {
    const el = notesRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const lineStart = form.body.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = form.body.indexOf('\n', end);
    const blockEnd = lineEnd === -1 ? form.body.length : lineEnd;
    const block = form.body.slice(lineStart, blockEnd);
    const prefixed = block
      .split('\n')
      .map((line, i) => prefix(i) + line)
      .join('\n');
    update('body', form.body.slice(0, lineStart) + prefixed + form.body.slice(blockEnd));
    requestAnimationFrame(() => el.focus());
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const due_at = combineDateTime(form.startDate, form.isAllDay ? '00:00' : form.startTime);
    if (!due_at) {
      setError('Start date is required.');
      return;
    }

    const payload = {
      subject: form.subject,
      type: form.type,
      body: form.body || undefined,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      opportunity_id: form.opportunity_id ? Number(form.opportunity_id) : null,
      user_id: form.assigned_user ? Number(form.assigned_user) : null,
      due_at,
      end_at: combineDateTime(form.endDate, form.isAllDay ? '23:59' : form.endTime),
      location: form.location || null,
      is_all_day: form.isAllDay,
      resource_ids: form.resource_ids,
    };

    if (isEdit && event) {
      updateEvent.mutate(
        { id: event.id, payload },
        {
          onSuccess: () => onClose(),
          onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update event.'),
        }
      );
    } else {
      addEvent.mutate(payload, {
        onSuccess: () => {
          setForm(EMPTY);
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add event.'),
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-800">{isEdit ? 'Edit Event' : 'Create New Event'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide mb-2">Event Basics</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Title/Subject <span className="text-slate-400 font-normal">(Required)</span>
                </label>
                <input
                  required
                  value={form.subject}
                  onChange={(e) => update('subject', e.target.value)}
                  placeholder="e.g., Storm Damage Inspection - 123 Main St"
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Activity Type</label>
                <TypeSelect value={form.type} onChange={(t) => update('type', t)} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide mb-2">Time &amp; Schedule</h4>
            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Start Date/Time</label>
                <div className="flex gap-1.5">
                  <input
                    required
                    type="date"
                    value={form.startDate}
                    onChange={(e) => update('startDate', e.target.value)}
                    className="w-1/2 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="time"
                    disabled={form.isAllDay}
                    value={form.startTime}
                    onChange={(e) => update('startTime', e.target.value)}
                    className="w-1/2 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">End Date/Time</label>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => update('endDate', e.target.value)}
                    className="w-1/2 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="time"
                    disabled={form.isAllDay}
                    value={form.endTime}
                    onChange={(e) => update('endTime', e.target.value)}
                    className="w-1/2 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">All-Day Event</label>
                <button
                  type="button"
                  onClick={() => update('isAllDay', !form.isAllDay)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg w-full"
                >
                  <span
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      form.isAllDay ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                      style={{ transform: form.isAllDay ? 'translateX(18px)' : 'translateX(2px)' }}
                    />
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide mb-2">
              Participants &amp; Associations
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <ContactPicker
                contactId={form.contact_id ? Number(form.contact_id) : null}
                contactName={form.contact_name}
                onChange={(id, name) => setForm((f) => ({ ...f, contact_id: id ? String(id) : '', contact_name: name }))}
              />
              <OpportunityPicker
                opportunityId={form.opportunity_id ? Number(form.opportunity_id) : null}
                opportunityName={form.opportunity_name}
                onChange={(id, name) =>
                  setForm((f) => ({ ...f, opportunity_id: id ? String(id) : '', opportunity_name: name }))
                }
              />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Assigned To</label>
                <select
                  value={form.assigned_user}
                  onChange={(e) => update('assigned_user', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {toTitleCase(u.name)}
                      {u.id === user?.id ? ' (Me)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide mb-2">
              Resources &amp; Location
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Location/Address</label>
                <input
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                  placeholder="Enter Address or Meeting Link (e.g., 123 Main St, Zoom link)"
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <ResourcePicker
                selectedIds={form.resource_ids}
                onChange={(ids) => update('resource_ids', ids)}
              />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide mb-2">Details &amp; Notes</h4>
            <label className="block text-xs font-medium text-slate-600 mb-1">Event Notes/Body</label>
            {/* Plain-text formatting tokens (**bold**, *italic*, <u>underline</u>,
                "- "/"1. " list prefixes) saved as-is into activities.body —
                there's no rich-text renderer elsewhere in the app (the detail
                panel shows body as plain text), so this doesn't pretend to be
                a full WYSIWYG editor, just a faster way to type the tokens. */}
            <div className="flex items-center gap-1 border border-slate-200 border-b-0 rounded-t-lg px-2 py-1.5 bg-slate-50">
              <button type="button" onClick={() => wrapSelection('**', '**')} title="Bold" className="w-6 h-6 rounded hover:bg-slate-200 text-slate-600 font-bold text-xs">
                B
              </button>
              <button type="button" onClick={() => wrapSelection('*', '*')} title="Italic" className="w-6 h-6 rounded hover:bg-slate-200 text-slate-600 italic text-xs">
                I
              </button>
              <button type="button" onClick={() => wrapSelection('<u>', '</u>')} title="Underline" className="w-6 h-6 rounded hover:bg-slate-200 text-slate-600 underline text-xs">
                U
              </button>
              <div className="w-px h-4 bg-slate-300 mx-1" />
              <button
                type="button"
                onClick={() => prefixLines(() => '- ')}
                title="Bullet list"
                className="w-6 h-6 rounded hover:bg-slate-200 text-slate-600"
              >
                <i className="fa-solid fa-list-ul text-xs" />
              </button>
              <button
                type="button"
                onClick={() => prefixLines((i) => `${i + 1}. `)}
                title="Numbered list"
                className="w-6 h-6 rounded hover:bg-slate-200 text-slate-600"
              >
                <i className="fa-solid fa-list-ol text-xs" />
              </button>
            </div>
            <textarea
              ref={notesRef}
              value={form.body}
              onChange={(e) => update('body', e.target.value)}
              rows={4}
              placeholder="Add internal notes, meeting agenda, or job details..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-b-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="p-2.5 text-xs rounded-lg text-center bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg"
            >
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save & Schedule Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
