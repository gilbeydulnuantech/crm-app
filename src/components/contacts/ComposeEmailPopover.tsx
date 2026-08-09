import { FormEvent, useEffect, useState } from 'react';
import { Contact } from '../../types/contact';
import { useSendContactEmail } from '../../hooks/useContacts';

interface Props {
  contact: Contact;
  open: boolean;
  onClose: () => void;
}

export default function ComposeEmailPopover({ contact, open, onClose }: Props) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const sendEmail = useSendContactEmail();

  useEffect(() => {
    if (open) {
      setSubject('');
      setMessage('');
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    sendEmail.mutate(
      { contactId: contact.id, subject, message },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to send email.'),
      }
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center pt-24 px-4">
      <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700">Send Email</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {!contact.email ? (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2.5">
            This contact has no email address on file.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">To</label>
              <input
                disabled
                value={contact.email}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md bg-slate-50 text-slate-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Subject</label>
              <input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Message</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <div className="p-2 text-xs rounded-md text-center bg-rose-50 text-rose-700 border border-rose-200">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendEmail.isPending}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-md"
              >
                {sendEmail.isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
