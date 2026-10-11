import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarEvent, EventType } from '../../types/event';
import { useEventTypes } from '../../hooks/useEventTypes';
import { useProducts } from '../../hooks/useProducts';
import { useSaveStaff, useStaff } from '../../hooks/useStaff';
import { useStaffFeature } from '../../hooks/useIndustry';
import { useEventTypeLookup } from '../../utils/eventTypes';
import EventTypeCreateInline from '../EventTypeCreateInline';
import { useAddEvent, useEvents, useUpdateEvent } from '../../hooks/useEvents';
import { useQueryClient } from '@tanstack/react-query';
import { createCalendarContact } from '../../api/contacts';
import { useContacts, useUsers } from '../../hooks/useContacts';
import { useAuth } from '../../context/AuthContext';
import { toTitleCase } from '../../utils/text';
import ContactPicker from '../pipeline/ContactPicker';
import CompanyPicker from '../contacts/CompanyPicker';
import ResourcePicker from './ResourcePicker';
import ProductTitleInput from './ProductTitleInput';
import TimeInput from '../TimeInput';
import { formatClockRange } from '../../utils/timeFormat';

interface Props {
  open: boolean;
  event: CalendarEvent | null; // null = add mode
  defaultDate?: Date | null;
  defaultContactId?: number | null;
  defaultAccountId?: number | null;
  defaultCompanyName?: string;
  // Set when a slot is clicked in the Day view: pre-fills the start time, team member and room.
  defaultStartTime?: string; // "HH:MM"
  defaultUserId?: number | null;
  defaultResourceId?: number | null;
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
  product_id: '',
  staff_id: '',
  // A client who is not in Contacts yet: typed into the contact box and created when the event is saved.
  new_contact: false,
  new_email: '',
  new_phone: '',
};

// Accepts either an ISO timestamp (from a stored due_at) or a plain Date
// (e.g. from a Month view day-click) and reads its LOCAL calendar date.
// `iso.slice(0, 10)` — the previous approach — reads the UTC calendar date
// instead: for any timezone ahead of UTC (e.g. UTC+8), local midnight on a
// given day is still the *previous* day in UTC, so clicking "Aug 23" ended
// up pre-filling the form with "Aug 22".
function toDateInput(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function toTimeInput(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function addMinutesToTime(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function combineDateTime(date: string, time: string): string | null {
  if (!date || !time) return null;
  return new Date(`${date}T${time}`).toISOString();
}

function TypeSelect({ value, onChange }: { value: EventType; onChange: (t: EventType) => void }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { data: types = [] } = useEventTypes();
  const typeOf = useEventTypeLookup();
  const meta = typeOf(value);
  // An older event can carry a type that is no longer in the list; keep it selectable so saving doesn't change it.
  const options = types.some((t) => t.key === value) || !value ? types.map((t) => ({ key: t.key, name: t.name, color: t.color })) : [{ key: value, name: meta.label, color: meta.color }, ...types.map((t) => ({ key: t.key, name: t.name, color: t.color }))];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
      >
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
          {meta.label}
        </span>
        <i className="fa-solid fa-chevron-down text-[10px] text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 max-h-60 overflow-y-auto">
            {options.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  onChange(t.key);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 text-slate-700"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCreating(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--theme-accent-hover)] hover:bg-slate-50 border-t border-slate-100"
            >
              <i className="fa-solid fa-plus text-[10px]" />
              New type...
            </button>
          </div>
        </>
      )}
      {creating && (
        <div className="mt-1.5">
          <EventTypeCreateInline
            onCancel={() => setCreating(false)}
            onCreated={(t) => {
              onChange(t.key);
              setCreating(false);
            }}
          />
        </div>
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
  defaultStartTime,
  defaultUserId,
  defaultResourceId,
  onClose,
}: Props) {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: contacts = [] } = useContacts();
  const { data: products = [] } = useProducts();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [creatingContact, setCreatingContact] = useState(false);
  const [addingStaff, setAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const staffFeature = useStaffFeature();
  const staffLabel = staffFeature.label;
  const { data: allStaff = [] } = useStaff();
  const saveStaff = useSaveStaff();
  const qc = useQueryClient();
  const addEvent = useAddEvent();
  const updateEvent = useUpdateEvent();

  const isEdit = !!event;
  const isSaving = addEvent.isPending || updateEvent.isPending || creatingContact;

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
        product_id: event.product_id ? String(event.product_id) : '',
        staff_id: event.staff_id ? String(event.staff_id) : '',
        new_contact: false,
        new_email: '',
        new_phone: '',
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
        date: toDateInput(base),
        startTime: defaultStartTime ?? '09:00',
        endTime: defaultStartTime ? addMinutesToTime(defaultStartTime, 60) : '',
        assigned_user: defaultUserId ? String(defaultUserId) : user ? String(user.id) : '',
        resource_ids: defaultResourceId ? [defaultResourceId] : [],
      });
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, open, defaultDate, defaultContactId, defaultAccountId, defaultCompanyName, defaultStartTime, defaultUserId, defaultResourceId, user]);

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

  // Who can be double-booked: the chosen staff member if there is one (so two staff can take the same time under one
  // owner), otherwise the assigned user, counting only events where that user is the one doing the work (no staff member).
  const userBusySlots = useMemo(
    () =>
      form.staff_id
        ? busySlotsFor((e) => e.staff_id === Number(form.staff_id))
        : form.assigned_user
          ? busySlotsFor((e) => e.user_id === Number(form.assigned_user) && !e.staff_id)
          : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayEvents, form.assigned_user, form.staff_id, event]
  );
  const contactBusySlots = useMemo(
    () => (form.contact_id ? busySlotsFor((e) => e.contact_id === Number(form.contact_id)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayEvents, form.contact_id, event]
  );

  function formatSlot(s: { start: Date; end: Date }) {
    return formatClockRange(s.start, s.end);
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
      new_contact: id ? false : f.new_contact,
      account_id: matched?.account_id ? String(matched.account_id) : f.account_id,
      company_name: matched?.company_name ?? (id ? f.company_name : ''),
      // Only auto-fill if the user hasn't already typed a location.
      location:
        !f.location && matched
          ? [matched.city, matched.state, matched.country].filter(Boolean).join(', ')
          : f.location,
    }));
  }

  // Therapists come from the assigned user's own list (the person saving, if the event is unassigned).
  const staffOwnerId = form.assigned_user ? Number(form.assigned_user) : user?.id ?? null;
  const therapistOptions = allStaff.filter(
    (s) => (s.owner_user_id === staffOwnerId && s.is_active) || String(s.id) === form.staff_id
  );

  async function handleAddStaff() {
    const name = newStaffName.trim();
    if (!name) return;
    try {
      const res = await saveStaff.mutateAsync({ name, owner_user_id: staffOwnerId ?? undefined });
      if (!res.success || !res.id) throw new Error(res.error || 'Could not add.');
      update('staff_id', String(res.id));
      setNewStaffName('');
      setAddingStaff(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add.');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const due_at = combineDateTime(form.date, form.startTime);
    if (!due_at) {
      setError('Date and start time are required.');
      return;
    }

    let contactId = form.contact_id ? Number(form.contact_id) : null;
    if (form.new_contact && contactId === null) {
      // The client isn't in Contacts yet: the Calendar Contact Create workflow adds them (or finds
      // them by email/phone) and returns the id, which the event is then saved against.
      setCreatingContact(true);
      try {
        const res = await createCalendarContact({
          name: form.contact_name.trim(),
          email: form.new_email.trim() || undefined,
          phone: form.new_phone.trim() || undefined,
          owner_id: form.assigned_user ? Number(form.assigned_user) : undefined,
          account_id: form.account_id ? Number(form.account_id) : undefined,
        });
        if (!res.success || !res.contact_id) throw new Error(res.error || 'Could not add the contact.');
        contactId = res.contact_id;
        // Remember the id so a retry after a failed save (for example a time clash) doesn't add them twice.
        setForm((f) => ({ ...f, contact_id: String(contactId), contact_name: res.name || f.contact_name, new_contact: false }));
        qc.invalidateQueries({ queryKey: ['contacts'] });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not add the contact.');
        return;
      } finally {
        setCreatingContact(false);
      }
    }

    const payload = {
      subject: form.subject,
      type: form.type,
      body: form.body || undefined,
      contact_id: contactId,
      account_id: form.account_id ? Number(form.account_id) : null,
      user_id: form.assigned_user ? Number(form.assigned_user) : null,
      due_at,
      end_at: combineDateTime(form.date, form.endTime),
      location: form.location || null,
      resource_ids: form.resource_ids,
      product_id: form.product_id ? Number(form.product_id) : null,
      staff_id: form.staff_id ? Number(form.staff_id) : null,
      // The confirmation email itself is sent by the "Calendar - Event confirmation email" automation rule (editable under Automation).
      ...(isEdit ? {} : { notify_contact: form.sendConfirmation }),
    };

    if (isEdit && event) {
      updateEvent.mutate(
        { id: event.id, payload },
        {
          onSuccess: () => {
            onClose();
          },
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
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4">
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
            <ProductTitleInput
              value={form.subject}
              onChange={(v) => update('subject', v)}
              productId={form.product_id ? Number(form.product_id) : null}
              onProductChange={(id) => {
                // Picking a service also fills in its event type (set on the service in Products); the rep can still change it below.
                const typeKey = id ? products.find((p) => p.id === id)?.event_type_key : null;
                setForm((f) => ({ ...f, product_id: id ? String(id) : '', ...(typeKey ? { type: typeKey } : {}) }));
              }}
              placeholder="Pick a product or service, or type a title"
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
              onCreateNew={(name) => setForm((f) => ({ ...f, new_contact: true, contact_id: '', contact_name: name }))}
              onQueryChange={(text) =>
                setForm((f) => ({ ...f, contact_name: text, new_contact: text.trim() ? f.new_contact : false }))
              }
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

          {form.new_contact && !form.contact_id && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  <i className="fa-solid fa-user-plus text-slate-400 mr-1.5" />
                  New contact: {toTitleCase(form.contact_name)}
                </span>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, new_contact: false, new_email: '', new_phone: '' }))}
                  className="text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  value={form.new_email}
                  onChange={(e) => update('new_email', e.target.value)}
                  placeholder="Email (optional)"
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                />
                <input
                  type="tel"
                  value={form.new_phone}
                  onChange={(e) => update('new_phone', e.target.value)}
                  placeholder="Phone (optional)"
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Added to Contacts when you save. The owner is whoever the event is assigned to
                {form.assigned_user
                  ? ` (${toTitleCase(users.find((u) => String(u.id) === form.assigned_user)?.name ?? '')})`
                  : ' (you, if left unassigned)'}
                . If this email or phone already exists, that contact is used instead.
              </p>
            </div>
          )}

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
                <TimeInput required label="Start time" value={form.startTime} onChange={(v) => update('startTime', v)} />
              </div>
              <div>
                <span className="block text-[11px] text-slate-400 mb-1">End Time</span>
                <TimeInput label="End time" value={form.endTime} onChange={(v) => update('endTime', v)} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Assigned To</label>
            <select
              value={form.assigned_user}
              onChange={(e) => {
                const next = e.target.value;
                // A therapist belongs to one user's list, so changing the assignee clears one from someone else's list.
                setForm((f) => {
                  const keep = allStaff.find((s) => String(s.id) === f.staff_id && String(s.owner_user_id) === (next || String(user?.id ?? '')));
                  return { ...f, assigned_user: next, staff_id: keep ? f.staff_id : '' };
                });
              }}
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

          {(staffFeature.enabled || !!form.staff_id) && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{staffLabel}</label>
            <select
              value={form.staff_id}
              onChange={(e) => {
                if (e.target.value === '__new') setAddingStaff(true);
                else update('staff_id', e.target.value);
              }}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            >
              <option value="">No {staffLabel.toLowerCase()}</option>
              {therapistOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {toTitleCase(s.name)}
                  {!s.is_active ? ' (hidden)' : ''}
                </option>
              ))}
              <option value="__new">+ Add {staffLabel.toLowerCase()}...</option>
            </select>
            {addingStaff && (
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <input
                  autoFocus
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStaff();
                    }
                  }}
                  maxLength={100}
                  placeholder={`${staffLabel} name`}
                  className="flex-1 min-w-0 px-2 py-1 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                />
                <button
                  type="button"
                  onClick={handleAddStaff}
                  disabled={saveStaff.isPending}
                  className="px-2.5 py-1 text-xs font-semibold text-white rounded-md disabled:opacity-50"
                  style={{ backgroundColor: 'var(--theme-accent)' }}
                >
                  {saveStaff.isPending ? 'Adding...' : 'Add'}
                </button>
                <button type="button" onClick={() => setAddingStaff(false)} className="text-xs text-slate-400 hover:text-slate-600">
                  Cancel
                </button>
              </div>
            )}
            {therapistOptions.length === 0 && !addingStaff && (
              <p className="text-[11px] text-slate-400 mt-1">None on this person's list yet. Add one with "+ Add {staffLabel.toLowerCase()}".</p>
            )}
          </div>
          )}

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
                    {form.staff_id
                      ? toTitleCase(allStaff.find((s) => String(s.id) === form.staff_id)?.name ?? staffLabel)
                      : users.find((u) => String(u.id) === form.assigned_user)?.name
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
                className="rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)]"
              />
              Send confirmation to contact
              <span className="text-[10px] text-slate-400">(new events only; wording is set in Automation)</span>
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
