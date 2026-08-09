import { FormEvent, useEffect, useState } from 'react';
import { CalendarEvent, EVENT_TYPE_META, EVENT_TYPES } from '../../types/event';
import { useAddEvent, useUpdateEvent } from '../../hooks/useEvents';

interface Props {
  open: boolean;
  event: CalendarEvent | null; // null = add mode
  defaultDate?: Date | null;
  onClose: () => void;
}

const EMPTY = {
  subject: '',
  type: 'meeting' as (typeof EVENT_TYPES)[number],
  body: '',
  contact_id: '',
  opportunity_id: '',
  due_at: '',
};

export default function EventFormModal({ open, event, defaultDate, onClose }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const addEvent = useAddEvent();
  const updateEvent = useUpdateEvent();

  const isEdit = !!event;
  const isSaving = addEvent.isPending || updateEvent.isPending;

  useEffect(() => {
    if (event) {
      setForm({
        subject: event.subject ?? '',
        type: event.type ?? 'meeting',
        body: event.body ?? '',
        contact_id: event.contact_id ? String(event.contact_id) : '',
        opportunity_id: event.opportunity_id ? String(event.opportunity_id) : '',
        due_at: event.due_at?.slice(0, 16) ?? '',
      });
    } else {
      setForm({
        ...EMPTY,
        due_at: defaultDate ? toLocalDatetimeInput(defaultDate) : '',
      });
    }
    setError(null);
  }, [event, open, defaultDate]);

  if (!open) return null;

  function update<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      subject: form.subject,
      type: form.type,
      body: form.body || undefined,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      opportunity_id: form.opportunity_id ? Number(form.opportunity_id) : null,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">{isEdit ? 'Edit Event' : 'New Event'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
            <input
              required
              value={form.subject}
              onChange={(e) => update('subject', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EVENT_TYPE_META[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date &amp; Time</label>
              <input
                required
                type="datetime-local"
                value={form.due_at}
                onChange={(e) => update('due_at', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contact ID</label>
              <input
                type="number"
                value={form.contact_id}
                onChange={(e) => update('contact_id', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="optional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Deal ID</label>
              <input
                type="number"
                value={form.opportunity_id}
                onChange={(e) => update('opportunity_id', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea
              value={form.body}
              onChange={(e) => update('body', e.target.value)}
              rows={3}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="p-2.5 text-xs rounded-lg text-center bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <p className="text-[11px] text-slate-400 italic">
            No end-time, checklist, or attachment fields exist in the schema yet — dropped from this
            form rather than faking storage. See the Calendar CRUD README for what'd need adding.
          </p>

          <div className="flex justify-end gap-2 pt-2">
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
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function toLocalDatetimeInput(date: Date) {
  const d = new Date(date);
  d.setHours(9, 0, 0, 0);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}
