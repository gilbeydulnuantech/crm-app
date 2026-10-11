import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StaffMember } from '../../api/staff';
import { useUsers } from '../../hooks/useContacts';
import { useDeleteStaff, useSaveStaff, useStaff } from '../../hooks/useStaff';
import { toTitleCase } from '../../utils/text';
import CommissionReportModal from './CommissionReportModal';

interface Props {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'px-2 py-1 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

function Row({ member, showOwner }: { member: StaffMember; showOwner: boolean }) {
  const save = useSaveStaff();
  const del = useDeleteStaff();
  const [name, setName] = useState(member.name);
  const [phone, setPhone] = useState(member.phone ?? '');
  const [email, setEmail] = useState(member.email ?? '');
  const [commission, setCommission] = useState(String(member.commission_percent));
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function commit(patch: Partial<{ name: string; phone: string; email: string; is_active: boolean; bookable_online: boolean }> = {}) {
    const pct = Number(commission);
    if (commission === '' || !(pct >= 0 && pct <= 100)) setCommission(String(member.commission_percent));
    const next = { name: name.trim(), phone: phone.trim(), email: email.trim(), is_active: member.is_active, bookable_online: member.bookable_online, commission_percent: commission !== '' && pct >= 0 && pct <= 100 ? pct : member.commission_percent, ...patch };
    if (!next.name) {
      setName(member.name);
      return;
    }
    const unchanged =
      next.name === member.name && next.phone === (member.phone ?? '') && next.email === (member.email ?? '') && next.is_active === member.is_active && next.bookable_online === member.bookable_online && next.commission_percent === Number(member.commission_percent);
    if (unchanged) return;
    setError(null);
    save.mutate(
      { id: member.id, ...next },
      {
        onSuccess: (res) => !res.success && setError(res.error || 'Could not save.'),
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not save.'),
      }
    );
  }

  return (
    <div className={`py-2 ${member.is_active ? '' : 'opacity-60'}`}>
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => commit()}
          maxLength={100}
          aria-label="Name"
          className={`${inputClass} flex-1 min-w-0 font-medium`}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => commit()}
          maxLength={50}
          placeholder="Phone"
          aria-label="Phone"
          className={`${inputClass} w-32`}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => commit()}
          maxLength={255}
          placeholder="Email"
          aria-label="Email"
          className={`${inputClass} w-40 hidden sm:block`}
        />
        <div className="flex items-center gap-0.5 shrink-0" title="Share of the amount paid that this person earns">
          <input
            value={commission}
            onChange={(e) => setCommission(e.target.value.replace(/[^0-9.]/g, ''))}
            onBlur={() => commit()}
            inputMode="decimal"
            aria-label="Commission percent"
            className={`${inputClass} w-14 text-right`}
          />
          <span className="text-xs text-slate-400">%</span>
        </div>
        <label className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0 cursor-pointer" title="Clients can choose this person on the public booking page">
          <input
            type="checkbox"
            checked={member.bookable_online}
            onChange={(e) => commit({ bookable_online: e.target.checked })}
            className="rounded border-slate-300"
          />
          Online
        </label>
        <button
          type="button"
          onClick={() => commit({ is_active: !member.is_active })}
          title={member.is_active ? 'Hide (keeps past bookings, stops offering them)' : 'Show again'}
          className="w-7 text-slate-400 hover:text-slate-700 shrink-0"
        >
          <i className={`fa-solid ${member.is_active ? 'fa-eye' : 'fa-eye-slash'} text-xs`} />
        </button>
        {confirming ? (
          <span className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => del.mutate(member.id, { onError: (err) => setError(err instanceof Error ? err.message : 'Could not delete.') })}
              className="px-2 py-1 text-[11px] font-semibold text-white bg-rose-600 rounded-md"
            >
              Delete
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-[11px] text-slate-400 hover:text-slate-600">
              Keep
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} title="Delete" className="w-7 text-slate-300 hover:text-rose-500 shrink-0">
            <i className="fa-solid fa-trash text-xs" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 mt-0.5 pl-1 text-[11px] text-slate-400">
        <span>
          {member.event_count} booking{member.event_count === 1 ? '' : 's'}
        </span>
        {showOwner && member.owner_name && <span>On {toTitleCase(member.owner_name)}'s list</span>}
        {confirming && member.event_count > 0 && (
          <span className="text-amber-600">Their {member.event_count} booking(s) will keep working but show no therapist. Hiding is safer.</span>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-600 pl-1">{error}</p>}
    </div>
  );
}

// Staff are the people who perform bookings but never sign in. Every user keeps their own list; an admin sees (and can
// add to) everyone's.
export default function StaffModal({ open, onClose }: Props) {
  const { isAdmin, user } = useAuth();
  const { data: staff = [], isLoading } = useStaff();
  const { data: users = [] } = useUsers();
  const save = useSaveStaff();
  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, StaffMember[]>();
    staff.forEach((s) => {
      const key = s.owner_name ?? 'No owner';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return [...map.entries()];
  }, [staff]);

  if (!open) return null;

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    save.mutate(
      { name: trimmed, ...(isAdmin && ownerId ? { owner_user_id: Number(ownerId) } : {}) },
      {
        onSuccess: (res) => {
          if (res.success) setName('');
          else setError(res.error || 'Could not add.');
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not add.'),
      }
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-800">Staff</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          The therapists who perform your bookings. They don't sign in. You pick one in the "Therapist" box when you create an event, and
          the name shows on the event card.
          {isAdmin ? ' As admin you see everyone’s staff.' : ' This is your own list.'}
        </p>

        <div className="flex items-center gap-2 mb-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            maxLength={100}
            placeholder="New therapist name"
            className={`${inputClass} flex-1`}
          />
          {isAdmin && (
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value ? Number(e.target.value) : '')} className={inputClass} aria-label="Whose list">
              <option value="">My list{user ? ` (${toTitleCase(user.name)})` : ''}</option>
              {users
                .filter((u) => u.id !== user?.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {toTitleCase(u.name)}'s list
                  </option>
                ))}
            </select>
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={save.isPending || !name.trim()}
            className="px-3 py-1 text-sm font-semibold text-white rounded-md disabled:opacity-50"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            {save.isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
        {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}

        {isLoading && <p className="text-xs text-slate-400 py-2">Loading...</p>}
        {!isLoading && staff.length === 0 && <p className="text-xs text-slate-400 py-2">No staff yet. Add the first one above.</p>}
        {grouped.map(([owner, members]) => (
          <div key={owner} className="mb-2">
            {isAdmin && (
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100 pb-1 mt-2">
                {toTitleCase(owner)}
              </div>
            )}
            <div className="divide-y divide-slate-100">
              {members.map((m) => (
                <Row key={m.id} member={m} showOwner={false} />
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-4">
          <button type="button" onClick={() => setReportOpen(true)} className="text-sm font-medium text-[var(--theme-accent-hover)] hover:underline">
            <i className="fa-solid fa-file-invoice-dollar text-xs mr-1.5" />
            Commission report
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
            Close
          </button>
        </div>
        <CommissionReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
      </div>
    </div>
  );
}
