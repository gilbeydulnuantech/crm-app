import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createTicketPublic } from '../api/tickets';
import { TicketPriority } from '../types/ticket';

const inputClass =
  'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500';

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Low — just a question' },
  { value: 'normal', label: 'Normal — something is off' },
  { value: 'high', label: 'High — blocking my work' },
  { value: 'urgent', label: 'Urgent — everything is down' },
];

// Public, unauthenticated support-request form — no session token, no CRM
// chrome. Anyone with the link can submit a ticket; a hidden honeypot
// field (never shown to real visitors) filters out basic bot spam.
export default function PublicTicketPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [website, setWebsite] = useState(''); // honeypot
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () => createTicketPublic({ name, email, subject, description, priority, website }),
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to submit — please try again.'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !subject.trim()) {
      setError('Please fill in your name, email, and subject.');
      return;
    }
    submit.mutate();
  }

  if (submit.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-md w-full p-8 text-center">
          <i className="fa-solid fa-circle-check text-emerald-500 text-3xl mb-3" />
          <h1 className="text-lg font-bold text-slate-800 mb-1">Request received</h1>
          <p className="text-sm text-slate-500">
            Thanks — we've got your request and will get back to you at <strong>{email}</strong> soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-md w-full p-8">
        <h1 className="text-lg font-bold text-slate-800 mb-1">Contact Support</h1>
        <p className="text-xs text-slate-500 mb-5">Tell us what's going on and we'll take it from here.</p>

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{error}</p>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={inputClass}
              required
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className={inputClass}
              required
            />
          </div>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What do you need help with?"
            className={inputClass}
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any details that would help us..."
            rows={4}
            className={inputClass}
          />
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">How urgent is this?</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} className={inputClass}>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Honeypot — hidden from real visitors via CSS, not just "display:none"
              on the label so it still reads oddly to a screen reader; bots that
              fill every input on the page trip it, humans never see it. */}
          <div className="absolute w-px h-px overflow-hidden opacity-0 -z-10" aria-hidden="true">
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submit.isPending}
          className="w-full mt-5 px-4 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
        >
          {submit.isPending ? 'Sending...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}
