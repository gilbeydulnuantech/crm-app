import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUsers } from '../hooks/useContacts';
import {
  useConversations,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
  useStartDm,
} from '../hooks/useChat';
import { Conversation } from '../types/chat';
import { toTitleCase } from '../utils/text';
import { DEFAULT_USER_COLOR } from '../utils/userColor';

interface DmEntry {
  userId: number;
  name: string;
  color: string;
  conversation: Conversation | null;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function TeamChat() {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: conversations = [] } = useConversations();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  // Deep link from the notification bell — ?conversation=<id> selects that
  // thread once the conversation list has loaded, then clears the param.
  // Same pattern as Contacts.tsx's own ?contactId= deep link.
  useEffect(() => {
    const param = searchParams.get('conversation');
    if (!param) return;
    const id = Number(param);
    if (!conversations.some((c) => c.id === id)) return;
    setActiveConversationId(id);
    const next = new URLSearchParams(searchParams);
    next.delete('conversation');
    setSearchParams(next, { replace: true });
  }, [searchParams, conversations, setSearchParams]);

  const markRead = useMarkConversationRead();
  const startDm = useStartDm();
  const { data: messages = [], isLoading: messagesLoading } = useMessages(activeConversationId);
  const sendMessage = useSendMessage(activeConversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Jumps to the newest message whenever one arrives (polling picks up
  // someone else's message, or we just sent our own) and when switching
  // into a different conversation.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [activeConversationId, messages]);

  const channelConversations = useMemo(
    () => conversations.filter((c) => c.type === 'channel'),
    [conversations]
  );

  // Every other active user shows up under Direct Messages, whether or not
  // a DM thread with them exists yet — clicking one that has no thread
  // creates it on the fly (see selectDm).
  const dmEntries = useMemo<DmEntry[]>(() => {
    const dmByPeer = new Map(conversations.filter((c) => c.type === 'dm').map((c) => [c.peer_id, c]));
    return users
      .filter((u) => u.id !== user?.id)
      .map((u) => ({
        userId: u.id,
        name: u.name,
        color: u.color || DEFAULT_USER_COLOR,
        conversation: dmByPeer.get(u.id) ?? null,
      }));
  }, [users, conversations, user?.id]);

  const q = search.trim().toLowerCase();
  const visibleDmEntries = q ? dmEntries.filter((d) => d.name.toLowerCase().includes(q)) : dmEntries;
  const visibleChannels = q
    ? channelConversations.filter((c) => (c.name ?? '').toLowerCase().includes(q))
    : channelConversations;

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;
  const activeDmEntry = dmEntries.find((d) => d.conversation?.id === activeConversationId);
  const activeTitle = activeConversation
    ? activeConversation.type === 'channel'
      ? `# ${activeConversation.name}`
      : toTitleCase(activeConversation.peer_name ?? activeDmEntry?.name ?? '')
    : null;

  useEffect(() => {
    if (activeConversationId != null) {
      markRead.mutate(activeConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  function selectChannel(conversation: Conversation) {
    setActiveConversationId(conversation.id);
  }

  function selectDm(entry: DmEntry) {
    if (entry.conversation) {
      setActiveConversationId(entry.conversation.id);
      return;
    }
    startDm.mutate(entry.userId, {
      onSuccess: (result) => setActiveConversationId(result.id),
    });
  }

  function handleSend() {
    const text = draft.trim();
    if (!text || activeConversationId == null) return;
    setDraft('');
    sendMessage.mutate(text);
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-slate-200">
          <h1 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Team Chat</h1>
        </div>

        <div className="p-3">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full pl-7 pr-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-4">
          <div>
            <h2 className="px-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
              Direct Messages
            </h2>
            <div className="space-y-0.5">
              {visibleDmEntries.map((entry) => {
                const isActive = entry.conversation?.id === activeConversationId;
                const unread = entry.conversation?.unread_count ?? 0;
                return (
                  <button
                    key={entry.userId}
                    onClick={() => selectDm(entry)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="flex-1 truncate">{toTitleCase(entry.name)}</span>
                    {unread > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </button>
                );
              })}
              {visibleDmEntries.length === 0 && (
                <p className="px-2 text-xs text-slate-400">No people found.</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="px-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
              Channels
            </h2>
            <div className="space-y-0.5">
              {visibleChannels.map((c) => {
                const isActive = c.id === activeConversationId;
                return (
                  <button
                    key={c.id}
                    onClick={() => selectChannel(c)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-slate-400 shrink-0">#</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    {c.unread_count > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {c.unread_count > 99 ? '99+' : c.unread_count}
                      </span>
                    )}
                  </button>
                );
              })}
              {visibleChannels.length === 0 && (
                <p className="px-2 text-xs text-slate-400">No channels found.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {activeConversationId == null ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
            Select a person or channel to start chatting.
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
              <h2 className="text-sm font-bold text-slate-800">{activeTitle}</h2>
              <span className="text-sm font-medium text-slate-600">
                {user?.name ? toTitleCase(user.name) : ''}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messagesLoading ? (
                <p className="text-sm text-slate-400 text-center">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-slate-400 text-center">No messages yet — say hello.</p>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        {!isMine && (
                          <span className="text-xs font-semibold text-slate-700">
                            {toTitleCase(m.sender_name ?? '')}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">{formatTime(m.created_at)}</span>
                      </div>
                      <div
                        className={`max-w-md px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                          isMine
                            ? 'bg-indigo-600 text-white rounded-br-sm'
                            : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm'
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-slate-200 bg-white shrink-0 flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim() || sendMessage.isPending}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
