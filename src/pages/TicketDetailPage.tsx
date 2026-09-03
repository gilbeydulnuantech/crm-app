import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTicket, useUpdateTicket, useAddTicketComment } from '../hooks/useTickets';
import { useContacts } from '../hooks/useContacts';
import { useCompanies } from '../hooks/useCompanies';
import { useUsers } from '../hooks/useContacts';
import { useAuth } from '../context/AuthContext';
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  TICKET_PRIORITY_BADGE,
  TICKET_STATUS_BADGE,
  TicketStatus,
  TicketPriority,
  TicketTimelineItem,
} from '../types/ticket';
import { toTitleCase } from '../utils/text';

const inputClass =
  'px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '--';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatRemaining(targetIso: string): { label: string; tone: 'good' | 'warning' | 'critical' } {
  const ms = new Date(targetIso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);
  const span = `${hours}h ${mins}m`;
  if (ms < 0) return { label: `Breached by ${span}`, tone: 'critical' };
  if (ms < 2 * 3600000) return { label: `${span} remaining`, tone: 'warning' };
  return { label: `${span} remaining`, tone: 'good' };
}

const TONE_CLASS: Record<'good' | 'warning' | 'critical', string> = {
  good: 'text-emerald-600',
  warning: 'text-amber-600',
  critical: 'text-rose-600',
};

export default function TicketDetailPage() {
  const { id } = useParams();
  const ticketId = id ? Number(id) : null;
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: ticket, isLoading } = useTicket(ticketId);
  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();
  const { data: users = [] } = useUsers();
  const updateTicket = useUpdateTicket();
  const addComment = useAddTicketComment();

  const [editingSubject, setEditingSubject] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyChannel, setReplyChannel] = useState<'internal' | 'email'>('internal');
  const [resolving, setResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const resolutionRef = useRef<HTMLDivElement>(null);

  // Clicking "Resolve" (up in the header) just reveals the notes panel down
  // near the reply box — with a long conversation thread in between, that
  // change happens off-screen and looks like the click did nothing.
  useEffect(() => {
    if (resolving) resolutionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [resolving]);

  if (isLoading || !ticket) {
    return <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Loading...</div>;
  }

  const customerName = ticket.contact_first_name
    ? toTitleCase(`${ticket.contact_first_name} ${ticket.contact_last_name || ''}`.trim())
    : ticket.submitter_name || 'Unknown';
  const customerEmail = ticket.contact_email || ticket.submitter_email;
  const isPublicSubmission = Boolean(ticket.submitter_name);

  function patch(fields: Parameters<typeof updateTicket.mutate>[0]) {
    setError(null);
    updateTicket.mutate(fields, {
      onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update ticket.'),
    });
  }

  function handleSendReply() {
    if (!replyText.trim() || !ticketId) return;
    addComment.mutate(
      { ticketId, body: replyText.trim(), channel: replyChannel },
      {
        onSuccess: () => setReplyText(''),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to send.'),
      }
    );
  }

  function handleResolve() {
    if (!ticketId) return;
    patch({ id: ticketId, status: 'resolved', resolution_notes: resolutionNotes.trim() || undefined });
    setResolving(false);
    setResolutionNotes('');
  }

  const slaInfo =
    ticket.sla_due_at && ticket.status !== 'resolved' && ticket.status !== 'closed'
      ? formatRemaining(ticket.sla_due_at)
      : null;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={() => navigate('/tickets')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back
        </button>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-semibold text-slate-400">#TK-{ticket.id}</span>
          {editingSubject ? (
            <input
              autoFocus
              value={subjectDraft}
              onChange={(e) => setSubjectDraft(e.target.value)}
              onBlur={() => {
                if (subjectDraft.trim() && subjectDraft !== ticket.subject) patch({ id: ticket.id, subject: subjectDraft.trim() });
                setEditingSubject(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className={`${inputClass} flex-1`}
            />
          ) : (
            <h1
              className="text-lg font-bold text-slate-800 cursor-text hover:bg-slate-50 rounded px-1"
              onClick={() => {
                setSubjectDraft(ticket.subject);
                setEditingSubject(true);
              }}
            >
              {ticket.subject}
              <i className="fa-solid fa-pen text-[10px] text-slate-300 ml-2" />
            </h1>
          )}
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${TICKET_PRIORITY_BADGE[ticket.priority]}`}>
            {ticket.priority}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${TICKET_STATUS_BADGE[ticket.status]}`}>
            {ticket.status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          {ticket.account_name ? `${ticket.account_name} | ` : ''}
          {customerName} · Assigned: {ticket.assigned_name ? toTitleCase(ticket.assigned_name) : 'Unassigned'}
        </p>

        <div className="flex items-center gap-2 mt-3">
          {ticket.assigned_user !== user?.id && (
            <button
              type="button"
              onClick={() => patch({ id: ticket.id, assigned_user: user?.id })}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
            >
              <i className="fa-solid fa-user-check mr-1" /> Assign to Me
            </button>
          )}
          {ticket.priority !== 'urgent' && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <button
              type="button"
              onClick={() => patch({ id: ticket.id, priority: 'urgent' })}
              className="px-3 py-1.5 text-xs font-semibold border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg"
            >
              <i className="fa-solid fa-triangle-exclamation mr-1" /> Escalate
            </button>
          )}
          {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <button
              type="button"
              onClick={() => setResolving((v) => !v)}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              <i className="fa-solid fa-check mr-1" /> Resolve
            </button>
          )}
          {ticket.status !== 'closed' && (
            <button
              type="button"
              onClick={() => patch({ id: ticket.id, status: 'closed' })}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-6 pt-3">
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
        </div>
      )}

      <div className="p-6 flex gap-6 items-start">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-4">
          {isPublicSubmission && (
            <div className="text-[11px] text-[var(--theme-accent-hover)] bg-[var(--theme-accent-tint)] border border-[var(--theme-accent-tint)] rounded-lg px-3 py-2">
              <i className="fa-solid fa-globe mr-1.5" />
              Submitted via the public form by <strong>{ticket.submitter_name}</strong> ({ticket.submitter_email})
              {ticket.contact_id
                ? ' — matched to an existing contact; Company and Assigned To were auto-filled.'
                : ' — no matching contact found.'}
            </div>
          )}

          {/* Description */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ticket Description</h2>
              <div className="flex items-center gap-3">
                <select
                  value={ticket.category || ''}
                  onChange={(e) => patch({ id: ticket.id, category: e.target.value || null })}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1"
                >
                  <option value="">No category</option>
                  {TICKET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400">
                  Source: {isPublicSubmission ? 'Public Form' : 'Internal'}
                </span>
              </div>
            </div>
            {editingDescription ? (
              <textarea
                autoFocus
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                onBlur={() => {
                  if (descriptionDraft !== ticket.description) patch({ id: ticket.id, description: descriptionDraft });
                  setEditingDescription(false);
                }}
                rows={4}
                className={`${inputClass} w-full`}
              />
            ) : (
              <p
                className="text-sm text-slate-700 whitespace-pre-wrap cursor-text hover:bg-slate-50 rounded px-1 -mx-1"
                onClick={() => {
                  setDescriptionDraft(ticket.description || '');
                  setEditingDescription(true);
                }}
              >
                {ticket.description || <span className="text-slate-400 italic">No description — click to add one.</span>}
              </p>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Conversation / Activity</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {ticket.timeline.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No activity yet.</p>
              ) : (
                ticket.timeline.map((item: TicketTimelineItem) =>
                  item.kind === 'event' ? (
                    <div key={`event-${item.id}`} className="flex items-start gap-2.5">
                      <i className="fa-solid fa-circle-dot text-slate-300 text-[8px] mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">{item.summary}</p>
                        <span className="text-[10px] text-slate-400">{formatDateTime(item.created_at)}</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={`comment-${item.id}`}
                      className={`rounded-lg px-3 py-2 ${item.channel === 'email' ? 'bg-blue-50' : 'bg-slate-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">
                          {item.author_name ? toTitleCase(item.author_name) : 'Someone'}
                          {item.channel === 'email' && (
                            <span className="ml-1.5 text-[9px] font-bold text-blue-600 uppercase">
                              <i className="fa-solid fa-envelope mr-0.5" /> Emailed Customer
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDateTime(item.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap">{item.body}</p>
                    </div>
                  )
                )
              )}
            </div>
          </div>

          {/* Response area */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-1 mb-2">
              <button
                type="button"
                onClick={() => setReplyChannel('internal')}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  replyChannel === 'internal' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                Internal Note
              </button>
              <button
                type="button"
                onClick={() => setReplyChannel('email')}
                disabled={!customerEmail}
                title={customerEmail ? '' : 'No customer email on file'}
                className={`px-2.5 py-1 text-xs font-semibold rounded disabled:opacity-40 ${
                  replyChannel === 'email' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <i className="fa-solid fa-envelope mr-1" /> Reply to Customer
              </button>
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={replyChannel === 'email' ? `Email ${customerEmail}...` : 'Add an internal note...'}
              rows={3}
              className={`${inputClass} w-full`}
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleSendReply}
                disabled={addComment.isPending || !replyText.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white rounded-lg disabled:opacity-50"
              >
                {replyChannel === 'email' ? 'Send Email' : 'Add Note'}
              </button>
            </div>
          </div>

          {/* Resolution */}
          {(resolving || ticket.status === 'resolved' || ticket.status === 'closed') && (
            <div ref={resolutionRef} className="bg-white border border-slate-200 rounded-xl p-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Resolution</h2>
              {ticket.status === 'resolved' || ticket.status === 'closed' ? (
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="whitespace-pre-wrap">{ticket.resolution_notes || 'No resolution notes.'}</p>
                  <p className="text-[11px] text-slate-400">
                    Resolved by {ticket.resolved_by_name ? toTitleCase(ticket.resolved_by_name) : '--'} on{' '}
                    {formatDateTime(ticket.resolved_at)}
                  </p>
                </div>
              ) : (
                <>
                  <textarea
                    autoFocus
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="What was the resolution?"
                    rows={3}
                    className={`${inputClass} w-full`}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleResolve}
                      className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-72 shrink-0 space-y-4">
          {/* Customer summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Customer</h2>
            <p className="text-sm font-semibold text-slate-800">{customerName}</p>
            {ticket.account_name && <p className="text-xs text-slate-500">{ticket.account_name}</p>}
            {customerEmail && <p className="text-xs text-slate-500">{customerEmail}</p>}
            {ticket.contact_phone && <p className="text-xs text-slate-500">{ticket.contact_phone}</p>}
            <div className="grid grid-cols-2 gap-1.5 mt-2 text-[11px] text-slate-500">
              {ticket.contact_status && <span>Status: {ticket.contact_status}</span>}
              {ticket.account_owner_name && <span>Owner: {toTitleCase(ticket.account_owner_name)}</span>}
              {ticket.contact_created_at && <span>Customer since: {formatDateTime(ticket.contact_created_at).split(',')[0]}</span>}
            </div>
            <div className="flex gap-3 mt-2 pt-2 border-t border-slate-100 text-[11px]">
              <span className="text-emerald-600 font-semibold">{ticket.open_ticket_count} Open</span>
              <span className="text-slate-400 font-semibold">{ticket.previous_ticket_count} Closed</span>
            </div>
          </div>

          {/* Assigned / Priority / Status */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Assigned To</label>
              <select
                value={ticket.assigned_user || ''}
                onChange={(e) => patch({ id: ticket.id, assigned_user: e.target.value ? Number(e.target.value) : null })}
                className={`${inputClass} w-full`}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {toTitleCase(u.name)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Priority</label>
              <select
                value={ticket.priority}
                onChange={(e) => patch({ id: ticket.id, priority: e.target.value as TicketPriority })}
                className={`${inputClass} w-full`}
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {toTitleCase(p)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Status</label>
              <select
                value={ticket.status}
                onChange={(e) => patch({ id: ticket.id, status: e.target.value as TicketStatus })}
                className={`${inputClass} w-full`}
              >
                {TICKET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {toTitleCase(s)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Contact</label>
              <select
                value={ticket.contact_id || ''}
                onChange={(e) => patch({ id: ticket.id, contact_id: e.target.value ? Number(e.target.value) : null })}
                className={`${inputClass} w-full`}
              >
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {toTitleCase(`${c.first_name} ${c.last_name}`.trim())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Company</label>
              <select
                value={ticket.account_id || ''}
                onChange={(e) => patch({ id: ticket.id, account_id: e.target.value ? Number(e.target.value) : null })}
                className={`${inputClass} w-full`}
              >
                <option value="">None</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SLA panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">SLA</h2>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">First Response</span>
              {ticket.first_response_at ? (
                <span className="text-emerald-600 font-semibold">
                  <i className="fa-solid fa-check mr-1" /> Completed
                </span>
              ) : (
                <span className="text-amber-600 font-semibold">Pending</span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Resolution</span>
              {ticket.status === 'resolved' || ticket.status === 'closed' ? (
                <span className="text-emerald-600 font-semibold">Resolved</span>
              ) : slaInfo ? (
                <span className={`font-semibold ${TONE_CLASS[slaInfo.tone]}`}>{slaInfo.label}</span>
              ) : (
                <span className="text-slate-400">--</span>
              )}
            </div>
            {slaInfo?.tone === 'critical' && (
              <div className="text-[11px] font-bold text-rose-600 bg-rose-50 rounded px-2 py-1 text-center">
                <i className="fa-solid fa-triangle-exclamation mr-1" /> SLA Breached
              </div>
            )}
          </div>

          {/* Related records */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Related</h2>
            {ticket.contact_id && (
              <button
                type="button"
                onClick={() => navigate(`/contacts?contactId=${ticket.contact_id}`)}
                className="block text-xs text-[var(--theme-accent)] hover:underline text-left"
              >
                <i className="fa-solid fa-user mr-1.5" /> {customerName}
              </button>
            )}
            {ticket.account_id && (
              <button
                type="button"
                onClick={() => navigate(`/companies?companyId=${ticket.account_id}`)}
                className="block text-xs text-[var(--theme-accent)] hover:underline text-left"
              >
                <i className="fa-solid fa-building mr-1.5" /> {ticket.account_name}
              </button>
            )}
            {ticket.related_deal && (
              <div className="text-xs text-slate-600">
                <i className="fa-solid fa-sack-dollar mr-1.5 text-slate-400" />
                {ticket.related_deal.name} — ${Number(ticket.related_deal.deal_value || 0).toLocaleString()}
                {ticket.related_deal.stage_name && (
                  <span className="text-slate-400"> ({ticket.related_deal.stage_name})</span>
                )}
              </div>
            )}
            {!ticket.contact_id && !ticket.account_id && !ticket.related_deal && (
              <p className="text-xs text-slate-400 italic">Nothing linked yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
