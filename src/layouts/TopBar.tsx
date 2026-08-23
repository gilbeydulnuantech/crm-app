import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toTitleCase } from '../utils/text';
import { useUnreadEmailContacts, useUsers } from '../hooks/useContacts';
import { useConversations } from '../hooks/useChat';
import { useTasks } from '../hooks/useTasks';
import { useTickets } from '../hooks/useTickets';
import { stripRefTokens } from '../utils/chatRefs';

export default function TopBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Matches AppLayout's NO_SIDEBAR_PATTERN — search/back-arrow track the
  // same full-page-editor condition as the hidden main nav.
  const hideSearch = /^\/documents\/(proposals|contracts|pages)\/(new|\d+\/edit)$/.test(location.pathname);
  const [bellOpen, setBellOpen] = useState(false);
  // The count last "seen" (bell opened at that count) — the red bubble only
  // shows the delta above this, so opening the bell clears it immediately
  // instead of it staying stuck on-screen until every individual row is
  // clicked through one by one.
  const [seenUnreadCount, setSeenUnreadCount] = useState(0);
  const [globalSearch, setGlobalSearch] = useState('');

  const { data: users = [] } = useUsers();
  const prefs = users.find((u) => u.id === user?.id)?.notification_preferences;
  const emailEnabled = prefs?.email !== false;
  const chatEnabled = prefs?.chat !== false;
  const tasksDueEnabled = prefs?.tasks_due !== false;

  const allUnreadContacts = useUnreadEmailContacts();
  const unreadContacts = emailEnabled ? allUnreadContacts : [];
  const emailUnreadCount = unreadContacts.reduce((total, c) => total + c.unreadCount, 0);

  const { data: conversations = [] } = useConversations();
  const unreadConversations = chatEnabled ? conversations.filter((c) => c.unread_count > 0) : [];
  const chatUnreadCount = unreadConversations.reduce((total, c) => total + c.unread_count, 0);

  const { data: allTasks = [] } = useTasks();
  const todayStr = new Date().toDateString();
  const tasksDueToday = tasksDueEnabled
    ? allTasks.filter(
        (t) => t.user_id === user?.id && !t.is_completed && t.due_at && new Date(t.due_at).toDateString() === todayStr
      )
    : [];

  // Tickets are a "specific owner" notification — team-wide ticket alerts
  // (new/unassigned, SLA escalation) go to Team Chat via the automation
  // engine instead; the bell only surfaces what's assigned to THIS user.
  const { data: allTickets = [] } = useTickets();
  const myOpenTickets = allTickets.filter(
    (t) => t.assigned_user === user?.id && (t.status === 'open' || t.status === 'pending')
  );

  const unreadCount = emailUnreadCount + chatUnreadCount + tasksDueToday.length + myOpenTickets.length;
  const badgeCount = Math.max(unreadCount - seenUnreadCount, 0);

  function toggleBell() {
    setBellOpen((v) => {
      const next = !v;
      if (next) setSeenUnreadCount(unreadCount); // opening the bell clears the bubble
      return next;
    });
  }

  function openContact(contactId: number) {
    setBellOpen(false);
    navigate(`/contacts?contactId=${contactId}`);
  }

  function openConversation(conversationId: number) {
    setBellOpen(false);
    navigate(`/team-chat?conversation=${conversationId}`);
  }

  function openTask(taskId: number) {
    setBellOpen(false);
    navigate(`/tasks?highlight=${taskId}`);
  }

  function openTicket(ticketId: number) {
    setBellOpen(false);
    navigate(`/tickets/${ticketId}`);
  }

  function runGlobalSearch(e: FormEvent) {
    e.preventDefault();
    const q = globalSearch.trim();
    if (!q) return;
    navigate(`/contacts?search=${encodeURIComponent(q)}`);
  }

  return (
    <header
      className="h-12 border-b border-slate-200 flex items-center justify-between px-4 shrink-0 gap-4"
      style={{ backgroundColor: 'var(--theme-header)' }}
    >
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-bold text-slate-800 text-sm tracking-wide">CRM</span>
      </div>

      {hideSearch ? (
        <div className="flex-1" />
      ) : (
        <form onSubmit={runGlobalSearch} className="relative flex-1 max-w-sm">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-8 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
          />
          {globalSearch && (
            <button
              type="button"
              onClick={() => setGlobalSearch('')}
              title="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            >
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          )}
        </form>
      )}

      <div className="flex items-center gap-4 shrink-0">
        <div className="relative">
          <button
            onClick={toggleBell}
            title={
              unreadCount > 0
                ? `${emailUnreadCount} unread email${emailUnreadCount === 1 ? '' : 's'} · ${chatUnreadCount} unread message${chatUnreadCount === 1 ? '' : 's'}`
                : 'Notifications'
            }
            className="text-slate-500 hover:text-slate-700 relative"
          >
            <i className="fa-solid fa-bell" />
            {badgeCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} />
              <div className="absolute top-full mt-2 right-0 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1.5 max-h-80 overflow-y-auto">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Notifications
                </div>
                {unreadContacts.length === 0 && unreadConversations.length === 0 && tasksDueToday.length === 0 && myOpenTickets.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-slate-400">Nothing new.</p>
                ) : (
                  <>
                    {unreadContacts.length > 0 && (
                      <div className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        Email ({emailUnreadCount})
                      </div>
                    )}
                    {unreadContacts.map(({ contact, unreadCount: count, latestLog }) => (
                      <button
                        key={`email-${contact.id}`}
                        onClick={() => openContact(contact.id)}
                        className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <i className="fa-solid fa-envelope text-indigo-500 text-xs mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {toTitleCase(`${contact.first_name} ${contact.last_name}`.trim()) || 'No Name'}
                            </span>
                            {count > 1 && (
                              <span className="shrink-0 text-[10px] font-bold text-white bg-indigo-500 rounded-full px-1.5 py-0.5">
                                {count}
                              </span>
                            )}
                          </div>
                          {latestLog.subject && (
                            <div className="text-[11px] text-slate-500 truncate">{latestLog.subject}</div>
                          )}
                        </div>
                      </button>
                    ))}
                    {unreadConversations.length > 0 && (
                      <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-t border-slate-100 mt-1">
                        Chat ({chatUnreadCount})
                      </div>
                    )}
                    {unreadConversations.map((c) => (
                      <button
                        key={`chat-${c.id}`}
                        onClick={() => openConversation(c.id)}
                        className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <i className="fa-solid fa-comment text-indigo-500 text-xs mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {c.type === 'channel' ? `# ${c.name}` : toTitleCase(c.peer_name ?? '')}
                            </span>
                            <span className="shrink-0 text-[10px] font-bold text-white bg-indigo-500 rounded-full px-1.5 py-0.5">
                              {c.unread_count}
                            </span>
                          </div>
                          {c.last_message_body && (
                            <div className="text-[11px] text-slate-500 truncate">
                              {stripRefTokens(c.last_message_body)}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                    {tasksDueToday.length > 0 && (
                      <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-t border-slate-100 mt-1">
                        Tasks Due Today ({tasksDueToday.length})
                      </div>
                    )}
                    {tasksDueToday.map((t) => (
                      <button
                        key={`task-${t.id}`}
                        onClick={() => openTask(t.id)}
                        className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <i className="fa-solid fa-check text-indigo-500 text-xs mt-0.5 shrink-0" />
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {toTitleCase(t.subject)}
                        </span>
                      </button>
                    ))}
                    {myOpenTickets.length > 0 && (
                      <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-t border-slate-100 mt-1">
                        My Tickets ({myOpenTickets.length})
                      </div>
                    )}
                    {myOpenTickets.map((t) => (
                      <button
                        key={`ticket-${t.id}`}
                        onClick={() => openTicket(t.id)}
                        className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <i className="fa-solid fa-headset text-indigo-500 text-xs mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-slate-800 truncate block">{t.subject}</span>
                          {t.sla_due_at && new Date(t.sla_due_at).getTime() < Date.now() && (
                            <span className="text-[10px] text-rose-600 font-semibold">Past SLA</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <span className="text-sm font-medium text-slate-600 flex items-center gap-1">
          {user?.name ? toTitleCase(user.name) : 'Account'}
          <i className="fa-solid fa-chevron-down text-[10px] text-slate-400" />
        </span>
      </div>
    </header>
  );
}
