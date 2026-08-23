import { useState } from 'react';
import { useContacts } from '../../hooks/useContacts';
import { useCompanies } from '../../hooks/useCompanies';
import { useUsers } from '../../hooks/useContacts';
import { useCreateTicket } from '../../hooks/useTickets';
import { TICKET_PRIORITIES, TicketPriority } from '../../types/ticket';
import { toTitleCase } from '../../utils/text';

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}

// Ticket VIEWING/editing lives on its own full page (TicketDetailPage) —
// this modal only ever handles the "New Ticket" creation step, then hands
// off to that page immediately.
export default function NewTicketModal({ open, onClose, onCreated }: Props) {
  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();
  const { data: users = [] } = useUsers();
  const createTicket = useCreateTicket();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [contactId, setContactId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function handleCreate() {
    setError(null);
    if (!subject.trim()) return setError('Give this ticket a subject.');
    createTicket.mutate(
      {
        subject: subject.trim(),
        description: description.trim() || undefined,
        priority,
        contact_id: contactId ? Number(contactId) : null,
        account_id: accountId ? Number(accountId) : null,
        assigned_user: assignedUser ? Number(assignedUser) : null,
      },
      {
        onSuccess: (res) => {
          setSubject('');
          setDescription('');
          setPriority('normal');
          setContactId('');
          setAccountId('');
          setAssignedUser('');
          onCreated(res.id);
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create ticket.'),
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">New Ticket</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className={inputClass}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
            className={inputClass}
          />

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} className={inputClass}>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {toTitleCase(p)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Contact</label>
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputClass}>
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {toTitleCase(`${c.first_name} ${c.last_name}`.trim())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Company</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
                <option value="">None</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Assigned To</label>
            <select value={assignedUser} onChange={(e) => setAssignedUser(e.target.value)} className={inputClass}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {toTitleCase(u.name)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={createTicket.isPending}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
          >
            Create Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
