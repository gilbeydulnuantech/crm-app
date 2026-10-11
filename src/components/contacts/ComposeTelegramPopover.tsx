import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Contact } from '../../types/contact';
import { sendTelegramMessage } from '../../api/contacts';
import { toTitleCase } from '../../utils/text';

interface Props {
  contact: Contact;
  open: boolean;
  onClose: () => void;
}

const MAX_LENGTH = 4096; // Telegram's own per-message limit

// Manual Telegram message to a contact who has linked Telegram. The server
// re-checks everything (ownership, linked, STOP opt-out, Do Not Contact) — this
// box only exists for contacts the card already shows as reachable.
export default function ComposeTelegramPopover({ contact, open, onClose }: Props) {
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: () => sendTelegramMessage(contact.id, message.trim()),
    onSuccess: (res) => {
      if (!res.success) {
        setError(res.error || 'Could not send the message.');
        return;
      }
      // The sent message is logged on the contact's timeline.
      qc.invalidateQueries({ queryKey: ['entity-activity', 'contact', contact.id] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not send the message.'),
  });

  useEffect(() => {
    if (open) {
      setMessage('');
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!message.trim()) {
      setError('Write a message first.');
      return;
    }
    send.mutate();
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center pt-24 px-4">
      <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700">Send Telegram message</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">To</label>
            <input
              disabled
              value={`${toTitleCase(`${contact.first_name || ''} ${contact.last_name || ''}`.trim())} (Telegram)`}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md bg-slate-50 text-slate-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Message</label>
            <textarea
              required
              rows={5}
              maxLength={MAX_LENGTH}
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Plain text. They'll see it in their Telegram chat with the bot."
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            />
            <p className="text-[10px] text-slate-400 text-right">
              {message.length}/{MAX_LENGTH}
            </p>
          </div>
          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1.5">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={send.isPending}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={send.isPending || !message.trim()}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
            >
              {send.isPending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
