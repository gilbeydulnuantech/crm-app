import { useEffect, useRef, useState } from 'react';
import { sendChatMessage } from '../api/chatbot';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

// Floating chat bubble for the public-facing pages (proposal/contract/pay
// pages) a lead lands on via an emailed link — lets them ask Apex Roofing
// questions (pricing, process, warranty, timeline) without waiting on a
// human reply. Session id is per-tab, not persisted — a fresh page load
// starts a new conversation, matching the throwaway nature of these public
// document pages.
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef(`widget-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setSending(true);
    try {
      const reply = await sendChatMessage(text, sessionId.current);
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[200]">
      {open && (
        <div className="mb-3 w-80 max-w-[90vw] h-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-slate-800 text-white flex items-center justify-between shrink-0">
            <span className="text-sm font-semibold">Ask us anything</span>
            <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-white">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-xs text-slate-400 text-center mt-6">
                Ask about pricing, our process, warranty, or timeline.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm px-3 py-2 rounded-xl max-w-[85%] whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[var(--theme-accent)] text-white ml-auto'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {m.text}
              </div>
            ))}
            {sending && <div className="text-xs text-slate-400">Typing...</div>}
            {error && <div className="text-xs text-rose-600">{error}</div>}
          </div>
          <div className="p-2.5 border-t border-slate-100 flex gap-2 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a question..."
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="px-3 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 disabled:opacity-50 rounded-lg"
            >
              <i className="fa-solid fa-paper-plane" />
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-[var(--theme-accent)] text-white shadow-lg flex items-center justify-center hover:opacity-90"
      >
        <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-comment-dots'} text-xl`} />
      </button>
    </div>
  );
}
