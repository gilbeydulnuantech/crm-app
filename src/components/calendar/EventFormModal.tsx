import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarEvent, EVENT_TYPE_META, EVENT_TYPES, EventType } from '../../types/event';
import { useAddEvent, useEvents, useUpdateEvent } from '../../hooks/useEvents';
import { useContacts, useSendContactEmail, useUsers } from '../../hooks/useContacts';
import { useAuth } from '../../context/AuthContext';
import { toTitleCase } from '../../utils/text';
import ContactPicker from '../pipeline/ContactPicker';
import CompanyPicker from '../contacts/CompanyPicker';
import ResourcePicker from './ResourcePicker';

interface Props {
  open: boolean;
  event: CalendarEvent | null; // null = add mode
  defaultDate?: Date | null;
  defaultContactId?: number | null;
  defaultAccountId?: number | null;
  defaultCompanyName?: string;
  onClose: () => void;
}

const EMPTY = {
  subject: '',
  type: 'meeting' as EventType,
  contact_id: '',
  contact_name: '',
  account_id: '',
  company_name: '',
  date: '',
  startTime: '',
  endTime: '',
  assigned_user: '',
  location: '',
  resource_ids: [] as number[],
  body: '',
  sendConfirmation: true,
};

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}
function toTimeInput(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function combineDateTime(date: string, time: string): string | null {
  if (!date || !time) return null;
  return new Date(`${date}T${time}`).toISOString();
}

function TypeSelect({ value, onChange }: { value: EventType; onChange: (t: EventType) => void }) {
  const [open, setOpen] = useState(false);
  const meta = EVENT_TYPE_META[value];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
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

export default function EventFormModal({
  open,
  event,
  defaultDate,
  defaultContactId,
  defaultAccountId,
  defaultCompanyName,
  onClose,
}: Props) {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: contacts = [] } = useContacts();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const addEvent = useAddEvent();
  const updateEvent = useUpdateEvent();
  const sendConfirmationEmail = useSendContactEmail();

  const isEdit = !!event;
  const isSaving = addEvent.isPending || updateEvent.isPending;

  useEffect(() => {
    if (!open) return;

    if (event) {
      setForm({
        subject: event.subject ?? '',
        type: event.type ?? 'meeting',
        contact_id: event.contact_id ? String(event.contact_id) : '',
        contact_name: event.contact_name ?? '',
        account_id: event.company_id ? String(event.company_id) : '',
        company_name: event.company_name ?? '',
        date: toDateInput(event.due_at),
        startTime: toTimeInput(event.due_at),
        endTime: event.end_at ? toTimeInput(event.end_at) : '',
        assigned_user: event.user_id ? String(event.user_id) : '',
        location: event.location ?? '',
        resource_ids: (event.resources ?? []).map((r) => r.id),
        body: event.body ?? '',
        sendConfirmation: false,
      });
    } else {
      const base = defaultDate ?? new Date();
      const defaultContact = defaultContactId ? contacts.find((c) => c.id === defaultContactId) : undefined;
      setForm({
        ...EMPTY,
        contact_id: defaultContactId ? String(defaultContactId) : '',
        contact_name: defaultContact ? `${defaultContact.first_name} ${defaultContact.last_name}`.trim() : '',
        account_id: defaultContact?.account_id
          ? String(defaultContact.account_id)
          : defaultAccountId
            ? String(defaultAccountId)
            : '',
        company_name: defaultContact?.company_name ?? defaultCompanyName ?? '',
        date: toDateInput(base.toISOString()),
        startTime: '09:00',
        assigned_user: user ? String(user.id) : '',
      });
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, open, defaultDate, defaultContactId, defaultAccountId, defaultCompanyName, user]);

  // Which resources are already booked by another event overlapping this
  // date/time — informational, not a hard block on selecting them anyway.
  const { data: dayEvents = [] } = useEvents(form.date, form.date, open && !!form.date);

  const bookedResourceIds = useMemo(() => {
    const ids = new Set<number>();
    if (!form.date || !form.startTime) return ids;
    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime || form.startTime}`);
    dayEvents.forEach((e) => {
      if (event && e.id === event.id) return; // skip the event being edited
      if (!e.resources || e.resources.length === 0) return;
      const eStart = new Date(e.due_at);
      const eEnd = e.end_at ? new Date(e.end_at) : eStart;
      if (start < eEnd && eStart < end) {
        e.resources.forEach((r) => ids.add(r.id));
      }
    });
    return ids;
  }, [dayEvents, form.date, form.startTime, form.endTime, event]);

  // Same overlap logic as bookedResourceIds, but surfaced as an actual list
  // of "already busy" time ranges for the chosen team member and contact —
  // shown as soon as a date is picked so a scheduler can see open slots
  // before committing to a start time, instead of only finding out about a
  // double-booking after the fact.
  function busySlotsFor(matchesEvent: (e: CalendarEvent) => boolean) {
    return dayEvents
      .filter((e) => {
        if (event && e.id === event.id) return false; // skip the event being edited
        return matchesEvent(e);
      })
      .map((e) => ({
        id: e.id,
        subject: e.subject,
        start: new Date(e.due_at),
        end: e.end_at ? new Date(e.end_at) : new Date(e.due_at),
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  const userBusySlots = useMemo(
    () => (form.assigned_user ? busySlotsFor((e) => e.user_id === Number(form.assigned_user)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayEvents, form.assigned_user, event]
  );
  const contactBusySlots = useMemo(
    () => (form.contact_id ? busySlotsFor((e) => e.contact_id === Number(form.contact_id)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayEvents, form.contact_id, event]
  );

  function formatSlot(s: { start: Date; end: Date }) {
    const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    return `${s.start.toLocaleTimeString(undefined, opts)} - ${s.end.toLocaleTimeString(undefined, opts)}`;
  }

  const selectedStart = form.date && form.startTime ? new Date(`${form.date}T${form.startTime}`) : null;
  const selectedEnd =
    form.date && form.startTime ? new Date(`${form.date}T${form.endTime || form.startTime}`) : null;
  function overlapsSelection(s: { start: Date; end: Date }) {
    if (!selectedStart || !selectedEnd) return false;
    return selectedStart < s.end && s.start < selectedEnd;
  }
  const hasConflict =
    userBusySlots.some(overlapsSelection) || contactBusySlots.some(overlapsSelection);

  if (!open) return null;

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleContactChange(id: number | null, name: string) {
    const matched = id ? contacts.find((c) => c.id === id) : undefined;
    setForm((f) => ({
      ...f,
      contact_id: id ? String(id) : '',
      contact_name: name,
      account_id: matched?.account_id ? String(matched.account_id) : f.account_id,
      company_name: matched?.company_name ?? (id ? f.company_name : ''),
      // Only auto-fill if the user hasn't already typed a location.
      location:
        !f.location && matched
          ? [matched.city, matched.state, matched.country].filter(Boolean).join(', ')
          : f.location,
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const due_at = combineDateTime(form.date, form.startTime);
    if (!due_at) {
      setError('Date and start time are required.');
      return;
    }

    const payload = {
      subject: form.subject,
      type: form.type,
      body: form.body || undefined,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      account_id: form.account_id ? Number(form.account_id) : null,
      user_id: form.assigned_user ? Number(form.assigned_user) : null,
      due_at,
      end_at: combineDateTime(form.date, form.endTime),
      location: form.location || null,
      resource_ids: form.resource_ids,
    };

    function maybeSendConfirmation() {
      const contact = form.contact_id ? contacts.find((c) => c.id === Number(form.contact_id)) : undefined;
      if (!form.sendConfirmation || !contact?.email) return;
      const when = new Date(due_at!).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
      sendConfirmationEmail.mutate({
        contactId: contact.id,
        subject: `Appointment Confirmed: ${form.subject}`,
        message: `Hi ${contact.first_name || 'there'},\n\nThis confirms your upcoming ${EVENT_TYPE_META[form.type].label.toLowerCase()} "${form.subject}" scheduled for ${when}.${
          form.location ? `\nLocation: ${form.location}` : ''
        }\n\nSee you then!`,
        to: contact.email,
        from: user?.email ?? '',
        attachments: [],
      });
    }

    if (isEdit && event) {
      updateEvent.mutate(
        { id: event.id, payload },
        {
          onSuccess: () => {
            maybeSendConfirmation();
            onClose();
          },
          onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update event.'),
        }
      );
    } else {
      addEvent.mutate(payload, {
        onSuccess: () => {
          maybeSendConfirmation();
          setForm(EMPTY);
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add event.'),
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">{isEdit ? 'Edit Event' : 'New Event'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Event Title</label>
            <input
              required
              value={form.subject}
              onChange={(e) => update('subject', e.target.value)}
              placeholder="Roof Inspection - ABC Roofing"
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Event Type</label>
            <TypeSelect value={form.type} onChange={(t) => update('type', t)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ContactPicker
              contactId={form.contact_id ? Number(form.contact_id) : null}
              contactName={form.contact_name}
              onChange={handleContactChange}
              accountId={form.account_id ? Number(form.account_id) : null}
            />
            <CompanyPicker
              accountId={form.account_id ? Number(form.account_id) : null}
              companyName={form.company_name}
              onChange={(accountId, name) =>
                setForm((f) => ({ ...f, account_id: accountId ? String(accountId) : '', company_name: name }))
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <div className="grid grid-cols-3 gap-3">
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              />
              <div>
                <span className="block text-[11px] text-slate-400 mb-1">Start Time</span>
                <input
                  required
                  type="time"
                  value={form.startTime}
                  onChange={(e) => update('startTime', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                />
              </div>
              <div>
                <span className="block text-[11px] text-slate-400 mb-1">End Time</span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => update('endTime', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Assigned To</label>
            <select
              value={form.assigned_user}
              onChange={(e) => update('assigned_user', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
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

          {form.date && (userBusySlots.length > 0 || contactBusySlots.length > 0) && (
            <div
              className={`rounded-lg border p-2.5 space-y-1.5 ${
                hasConflict ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5 ${
                  hasConflict ? 'text-rose-700' : 'text-amber-700'
                }`}
              >
                <i className="fa-solid fa-triangle-exclamation" />
                Already Booked on {new Date(`${form.date}T00:00`).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              {userBusySlots.length > 0 && (
                <div className={`text-xs ${hasConflict ? 'text-rose-700' : 'text-amber-800'}`}>
                  <p className="font-medium">
                    {users.find((u) => String(u.id) === form.assigned_user)?.name
                      ? toTitleCase(users.find((u) => String(u.id) === form.assigned_user)!.name)
                      : 'Assigned user'}
                    :
                  </p>
                  {userBusySlots.map((s) => (
                    <p key={s.id} className={overlapsSelection(s) ? 'font-semibold' : ''}>
                      {formatSlot(s)}
                    </p>
                  ))}
                </div>
              )}
              {contactBusySlots.length > 0 && (
                <div className={`text-xs ${hasConflict ? 'text-rose-700' : 'text-amber-800'}`}>
                  <p className="font-medium">{toTitleCase(form.contact_name) || 'Contact'}:</p>
                  {contactBusySlots.map((s) => (
                    <p key={s.id} className={overlapsSelection(s) ? 'font-semibold' : ''}>
                      {formatSlot(s)}
                    </p>
                  ))}
                </div>
              )}
              {hasConflict && (
                <p className="text-[11px] text-rose-700 font-medium">
                  The selected time overlaps with an existing event above — pick a different time. Saving will be rejected until this is resolved.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
            <input
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              placeholder="123 Main Street"
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            />
            <p className="text-[11px] text-slate-400 mt-1">Auto-filled from the contact's address — edit freely.</p>
          </div>

          <ResourcePicker
            selectedIds={form.resource_ids}
            onChange={(ids) => update('resource_ids', ids)}
            bookedIds={bookedResourceIds}
          />

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea
              value={form.body}
              onChange={(e) => update('body', e.target.value)}
              rows={3}
              placeholder="Initial roof inspection..."
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sendConfirmation}
                onChange={(e) => update('sendConfirmation', e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-[var(--theme-accent)]"
              />
              Send confirmation to contact
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-not-allowed" title="No reminder/notification system exists yet">
              <input type="checkbox" disabled className="rounded border-slate-300" />
              Add reminder
              <span className="text-[10px] text-slate-400">(coming soon)</span>
            </label>
          </div>

          {error && (
            <div className="p-2.5 text-xs rounded-lg text-center bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

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
              className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] disabled:opacity-60 text-white rounded-lg"
            >
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
