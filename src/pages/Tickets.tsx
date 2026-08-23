import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import { TICKET_STATUSES, TICKET_PRIORITY_BADGE, TICKET_STATUS_BADGE, TicketStatus } from '../types/ticket';
import { toTitleCase } from '../utils/text';
import NewTicketModal from '../components/tickets/NewTicketModal';

function formatDate(iso: string | null) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isSlaBreached(t: { sla_due_at: string | null; status: string }) {
  if (!t.sla_due_at || t.status === 'resolved' || t.status === 'closed') return false;
  return new Date(t.sla_due_at).getTime() < Date.now();
}

const TABS: (TicketStatus | 'all')[] = ['all', 'open', 'pending', 'resolved', 'closed'];

const SUPPORT_LINK = `${window.location.origin}/support/new`;

export default function Tickets() {
  const navigate = useNavigate();
  const { data: tickets = [], isLoading, error } = useTickets();
  const [tab, setTab] = useState<TicketStatus | 'all'>('all');
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const filtered = tab === 'all' ? tickets : tickets.filter((t) => t.status === tab);
  const breachedCount = tickets.filter(isSlaBreached).length;

  function handleCopyLink() {
    navigator.clipboard.writeText(SUPPORT_LINK).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    });
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-bold text-slate-800">Support Tickets</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            title={SUPPORT_LINK}
            className="px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2"
          >
            <i className={`fa-solid ${linkCopied ? 'fa-check text-emerald-600' : 'fa-link'}`} />
            {linkCopied ? 'Copied!' : 'Copy Support Link'}
          </button>
          <button
            type="button"
            onClick={() => setNewTicketOpen(true)}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <i className="fa-solid fa-plus" />
            New Ticket
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        {breachedCount > 0 ? (
          <span className="text-rose-600 font-semibold">{breachedCount} ticket{breachedCount === 1 ? '' : 's'} past SLA</span>
        ) : (
          'All tickets within SLA.'
        )}
      </p>

      <div className="flex items-center gap-1 mb-4 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px ${
              tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {toTitleCase(t)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error instanceof Error ? error.message : 'Failed to load tickets.'}
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No tickets here.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="px-4 py-2 font-semibold">Subject</th>
                <th className="px-4 py-2 font-semibold">Contact</th>
                <th className="px-4 py-2 font-semibold">Priority</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Assigned</th>
                <th className="px-4 py-2 font-semibold">SLA Due</th>
                <th className="px-4 py-2 font-semibold text-right">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-2.5 font-medium text-slate-700">
                    {t.subject}
                    {t.comment_count ? <span className="text-slate-400 font-normal"> · {t.comment_count} comment{t.comment_count === 1 ? '' : 's'}</span> : null}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {t.contact_first_name
                      ? toTitleCase(`${t.contact_first_name} ${t.contact_last_name || ''}`.trim())
                      : t.account_name || t.submitter_name || '--'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TICKET_PRIORITY_BADGE[t.priority]}`}>
                      {toTitleCase(t.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TICKET_STATUS_BADGE[t.status]}`}>
                      {toTitleCase(t.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{t.assigned_name ? toTitleCase(t.assigned_name) : 'Unassigned'}</td>
                  <td className="px-4 py-2.5">
                    {isSlaBreached(t) ? (
                      <span className="text-rose-600 font-semibold">Overdue</span>
                    ) : (
                      <span className="text-slate-400">{formatDate(t.sla_due_at)}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-400">{formatDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewTicketModal
        open={newTicketOpen}
        onClose={() => setNewTicketOpen(false)}
        onCreated={(id) => {
          setNewTicketOpen(false);
          navigate(`/tickets/${id}`);
        }}
      />
    </div>
  );
}
