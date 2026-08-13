import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toTitleCase } from '../utils/text';
import { useUnreadEmailContacts } from '../hooks/useContacts';
import { useConversations } from '../hooks/useChat';
import { stripRefTokens } from '../utils/chatRefs';

export default function TopBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bellOpen, setBellOpen] = useState(false);
  const unreadContacts = useUnreadEmailContacts();
  const emailUnreadCount = unreadContacts.reduce((total, c) => total + c.unreadCount, 0);
  const { data: conversations = [] } = useConversations();
  const unreadConversations = conversations.filter((c) => c.unread_count > 0);
  const chatUnreadCount = unreadConversations.reduce((total, c) => total + c.unread_count, 0);
  const unreadCount = emailUnreadCount + chatUnreadCount;

  function openContact(contactId: number) {
    setBellOpen(false);
    navigate(`/contacts?contactId=${contactId}`);
  }

  function openConversation(conversationId: number) {
    setBellOpen(false);
    navigate(`/team-chat?conversation=${conversationId}`);
  }

  return (
    <header className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
      <span className="font-bold text-slate-800 text-sm tracking-wide">CRM</span>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setBellOpen((v) => !v)}
            title={
              unreadCount > 0
                ? `${emailUnreadCount} unread email${emailUnreadCount === 1 ? '' : 's'} · ${chatUnreadCount} unread message${chatUnreadCount === 1 ? '' : 's'}`
                : 'Notifications'
            }
            className="text-slate-500 hover:text-slate-700 relative"
          >
            <i className="fa-solid fa-bell" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
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
                {unreadContacts.length === 0 && unreadConversations.length === 0 ? (
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
