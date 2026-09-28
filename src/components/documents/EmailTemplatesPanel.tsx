import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmailTemplates, useSetEmailTemplateActive, useDeleteEmailTemplate, useSendEmailTemplate } from '../../hooks/useEmailTemplates';
import { EmailTemplate } from '../../api/emailTemplates';
import { useEmailEventGroups, useSaveEmailEventGroup, useDeleteEmailEventGroup } from '../../hooks/useEmailEventGroups';
import { useContacts } from '../../hooks/useContacts';
import { useCompanyProfile } from '../../hooks/useCompanyProfile';
import ConfirmDialog from '../ConfirmDialog';
import ContactPicker from '../pipeline/ContactPicker';
import { fillContactEmailTokens } from '../../utils/emailTemplateTokens';
import { EMAIL_TRIGGER_EVENTS, TRIGGER_EVENT_LABEL } from '../../constants/emailTriggerEvents';

const TRIGGER_LABEL = TRIGGER_EVENT_LABEL;

export default function EmailTemplatesPanel() {
  const navigate = useNavigate();
  const { data: templates = [], isLoading, error } = useEmailTemplates();
  const { data: eventGroups = [] } = useEmailEventGroups();
  const saveEventGroup = useSaveEmailEventGroup();
  const deleteEventGroup = useDeleteEmailEventGroup();
  const { data: contacts = [] } = useContacts();
  const { data: companyProfile } = useCompanyProfile();
  const setActive = useSetEmailTemplateActive();
  const deleteTemplate = useDeleteEmailTemplate();

  const [creatingEvent, setCreatingEvent] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventTriggers, setNewEventTriggers] = useState<string[]>([]);
  const [createEventError, setCreateEventError] = useState<string | null>(null);
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<number | null>(null);

  function toggleNewEventTrigger(value: string) {
    setNewEventTriggers((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function handleCreateEvent(e: FormEvent) {
    e.preventDefault();
    setCreateEventError(null);
    if (!newEventName.trim()) return setCreateEventError('Give this event a name.');
    if (newEventTriggers.length === 0) return setCreateEventError('Pick at least one trigger for this event.');
    saveEventGroup.mutate(
      { name: newEventName.trim(), description: newEventDescription.trim(), trigger_events: newEventTriggers },
      {
        onSuccess: () => {
          setCreatingEvent(false);
          setNewEventName('');
          setNewEventDescription('');
          setNewEventTriggers([]);
        },
        onError: (err) => setCreateEventError(err instanceof Error ? err.message : 'Failed to create event.'),
      }
    );
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const sendTemplate = useSendEmailTemplate();

  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  function toggleSeries(key: string) {
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const [sendBarTemplateId, setSendBarTemplateId] = useState<number | null>(null);
  const [sendContactId, setSendContactId] = useState<number | null>(null);
  const [sendContactName, setSendContactName] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  function toggleSendBar(templateId: number) {
    setSendError(null);
    setSendBarTemplateId((current) => (current === templateId ? null : templateId));
    setSendContactId(null);
    setSendContactName('');
  }

  function handleSend(t: { id: number; subject: string; body: string }) {
    setSendError(null);
    if (!sendContactId) return setSendError('Pick a contact to send to.');
    const contact = contacts.find((c) => c.id === sendContactId);
    if (!contact?.email) return setSendError('That contact has no email address on file.');

    const ownCompanyName = companyProfile?.company_name || '';
    const subject = fillContactEmailTokens(t.subject, contact, ownCompanyName);
    const message = fillContactEmailTokens(t.body, contact, ownCompanyName);

    sendTemplate.mutate(
      { to: contact.email, subject, message, contact_id: sendContactId },
      {
        onSuccess: () => {
          setSendBarTemplateId(null);
          setSendContactId(null);
          setSendContactName('');
        },
        onError: (err) => setSendError(err instanceof Error ? err.message : 'Failed to send.'),
      }
    );
  }

  function renderTemplateRow(t: EmailTemplate) {
    return (
      <div key={t.id} className="bg-white px-4 py-3 border border-slate-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 truncate">{t.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{t.subject}</p>
          </div>
          {t.trigger_event && (
            <span
              className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                t.is_active ? 'bg-[var(--theme-accent-tint)] text-[var(--theme-accent-hover)]' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {t.is_active ? 'Auto-sends' : 'Auto-send off'} · {TRIGGER_LABEL[t.trigger_event] || t.trigger_event}
            </span>
          )}
          {t.trigger_event && (
            <button
              type="button"
              onClick={() => setActive.mutate({ id: t.id, is_active: !t.is_active })}
              disabled={setActive.isPending}
              title={t.is_active ? 'Turn off auto-send' : 'Turn on auto-send'}
              className="shrink-0 text-slate-400 hover:text-[var(--theme-accent)] disabled:opacity-30"
            >
              <i className={`fa-solid ${t.is_active ? 'fa-toggle-on' : 'fa-toggle-off'} text-sm`} />
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(`/documents/templates/email/${t.id}/edit`)}
            title="Edit"
            className="shrink-0 text-slate-400 hover:text-[var(--theme-accent)]"
          >
            <i className="fa-solid fa-pen text-xs" />
          </button>
          <button
            type="button"
            onClick={() => toggleSendBar(t.id)}
            title="Send email"
            className="shrink-0 text-[11px] font-semibold text-emerald-600 hover:underline"
          >
            Send
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setConfirmDeleteId(t.id);
            }}
            title="Delete"
            className="shrink-0 text-slate-400 hover:text-rose-600"
          >
            <i className="fa-solid fa-trash text-xs" />
          </button>
        </div>

        {sendBarTemplateId === t.id && (
          <div className="flex items-start gap-3 mt-3 pt-3 border-t border-slate-100">
            <div className="flex-1 max-w-sm">
              <ContactPicker
                contactId={sendContactId}
                contactName={sendContactName}
                onChange={(id, name) => {
                  setSendContactId(id);
                  setSendContactName(name);
                }}
                required={false}
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <button
                type="button"
                onClick={() => handleSend(t)}
                disabled={sendTemplate.isPending}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:opacity-90 rounded-lg disabled:opacity-50"
              >
                {sendTemplate.isPending ? 'Sending...' : 'Send email'}
              </button>
              <button
                type="button"
                onClick={() => setSendBarTemplateId(null)}
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
            {sendError && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1 mt-5">
                {sendError}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderPlaceholderRow(triggerKey: string) {
    return (
      <div
        key={triggerKey}
        className="flex items-center justify-between gap-3 px-4 py-3 border border-dashed border-slate-200 rounded-lg bg-slate-50"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-400 truncate">{TRIGGER_LABEL[triggerKey] || triggerKey}</p>
          <p className="text-[11px] text-slate-400">Not created yet — this step won't send until you add it.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/documents/templates/email/new')}
          className="shrink-0 text-xs font-semibold text-[var(--theme-accent)] hover:underline"
        >
          + Create
        </button>
      </div>
    );
  }

  const seriesTemplateIds = new Set(
    templates.filter((t) => t.trigger_event && eventGroups.some((g) => g.trigger_events.includes(t.trigger_event!))).map((t) => t.id)
  );
  const otherTemplates = templates.filter((t) => !seriesTemplateIds.has(t.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">Email Templates</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCreateEventError(null);
              setCreatingEvent((v) => !v);
            }}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 hover:border-slate-300 rounded-lg"
          >
            + Create Event
          </button>
          <button
            type="button"
            onClick={() => navigate('/documents/templates/email/new')}
            className="px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg"
          >
            + New Template
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500 -mt-2 mb-4">
        Reusable emails, like a thank-you note. Pick one from a proposal's "Customize the send email" section to
        fill in its subject/body, or set an auto-send trigger to have it fire on its own — e.g. the moment a lead
        approves a proposal. Group a multi-step sequence (like a booking's confirmation → reminders) into a named
        Event with "+ Create Event" — matches the n8n workflow that actually sends them, just for your own
        organization here.
      </p>

      {creatingEvent && (
        <form onSubmit={handleCreateEvent} className="mb-4 p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Event name</label>
            <input
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              placeholder="e.g. Event: Contact Booked — Confirmed"
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
            <input
              value={newEventDescription}
              onChange={(e) => setNewEventDescription(e.target.value)}
              placeholder="What this series does, e.g. matches the 'Book confirmed: email reminders' n8n workflow"
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Steps in this event (in send order — click to add/remove)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EMAIL_TRIGGER_EVENTS.map((t) => {
                const selected = newEventTriggers.includes(t.value);
                const order = newEventTriggers.indexOf(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => toggleNewEventTrigger(t.value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                      selected
                        ? 'bg-[var(--theme-accent)] text-white border-[var(--theme-accent)]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {selected ? `${order + 1}. ` : ''}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          {createEventError && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{createEventError}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saveEventGroup.isPending}
              className="px-4 py-1.5 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
            >
              {saveEventGroup.isPending ? 'Saving...' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={() => setCreatingEvent(false)}
              className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error instanceof Error ? error.message : 'Failed to load email templates.'}
        </p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No email templates yet.</p>
      ) : (
        <div className="space-y-6">
          {eventGroups.map((group) => {
            const isExpanded = expandedSeries.has(String(group.id));
            const createdCount = group.trigger_events.filter((triggerKey) =>
              templates.some((x) => x.trigger_event === triggerKey)
            ).length;
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSeries(String(group.id))}
                    className="flex-1 flex items-center gap-2 text-left group min-w-0"
                  >
                    <i
                      className={`fa-solid fa-chevron-right text-[10px] text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-700 truncate">
                      {group.name}
                    </h3>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      ({createdCount}/{group.trigger_events.length})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteEventId(group.id)}
                    title="Delete event group"
                    className="shrink-0 text-slate-300 hover:text-rose-600"
                  >
                    <i className="fa-solid fa-trash text-[11px]" />
                  </button>
                </div>
                {isExpanded && (
                  <>
                    {group.description && <p className="text-[11px] text-slate-400 mt-1 mb-2 ml-4">{group.description}</p>}
                    <div className="space-y-2 ml-4 mt-2">
                      {group.trigger_events.map((triggerKey) => {
                        const t = templates.find((x) => x.trigger_event === triggerKey);
                        return t ? renderTemplateRow(t) : renderPlaceholderRow(triggerKey);
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          <div>
            {eventGroups.length > 0 && (
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Other Templates</h3>
            )}
            <div className="space-y-2">{otherTemplates.map((t) => renderTemplateRow(t))}</div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Delete Email Template"
        body="This permanently removes the template. If it's set to auto-send, that automation stops."
        confirmLabel="Delete"
        danger
        error={deleteError}
        isSubmitting={deleteTemplate.isPending}
        onCancel={() => {
          setConfirmDeleteId(null);
          setDeleteError(null);
        }}
        onConfirm={() => {
          if (confirmDeleteId == null) return;
          setDeleteError(null);
          deleteTemplate.mutate(confirmDeleteId, {
            onSuccess: () => setConfirmDeleteId(null),
            onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Failed to delete.'),
          });
        }}
      />

      <ConfirmDialog
        open={confirmDeleteEventId != null}
        title="Delete Event Group"
        body="This only removes the grouping — the templates themselves (and their auto-send triggers) are untouched."
        confirmLabel="Delete"
        danger
        isSubmitting={deleteEventGroup.isPending}
        onCancel={() => setConfirmDeleteEventId(null)}
        onConfirm={() => {
          if (confirmDeleteEventId == null) return;
          deleteEventGroup.mutate(confirmDeleteEventId, {
            onSuccess: () => setConfirmDeleteEventId(null),
          });
        }}
      />
    </div>
  );
}
