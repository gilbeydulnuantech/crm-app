import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUsers, useUpdateUserTimezone } from '../../hooks/useContacts';

interface Props {
  open: boolean;
  onClose: () => void;
}

// Intl.supportedValuesOf is available in all browsers this app targets —
// pulling the list live avoids maintaining a stale hardcoded IANA list.
const TIMEZONES: string[] = (() => {
  try {
    // ES2020 lib target doesn't type this (added in ES2022) — it's
    // well-supported at runtime, so cast rather than bump the app-wide lib.
    return (Intl as unknown as { supportedValuesOf(key: string): string[] }).supportedValuesOf('timeZone');
  } catch {
    return [Intl.DateTimeFormat().resolvedOptions().timeZone];
  }
})();

const BROWSER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

function formatOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    return offset;
  } catch {
    return '';
  }
}

export default function TimezoneModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const updateTimezone = useUpdateUserTimezone();
  const currentUser = users.find((u) => u.id === user?.id);

  const [timezone, setTimezone] = useState('');

  useEffect(() => {
    setTimezone(currentUser?.timezone || BROWSER_TIMEZONE);
  }, [currentUser?.timezone, open]);

  if (!open) return null;

  function handleSave() {
    if (!user || !timezone) return;
    updateTimezone.mutate({ userId: user.id, timezone });
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Timezone</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Used to display dates and times — meetings, reminders, task due dates — in your local time.
        </p>

        <label className="block text-xs font-medium text-slate-600 mb-1">Your timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
        >
          {!TIMEZONES.includes(timezone) && timezone && <option value={timezone}>{timezone}</option>}
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, ' ')} ({formatOffset(tz)})
            </option>
          ))}
        </select>

        {currentUser?.timezone && (
          <p className="text-[11px] text-slate-400 mt-1.5">
            Currently set to {currentUser.timezone.replace(/_/g, ' ')}.
          </p>
        )}
        {updateTimezone.isError && (
          <p className="text-[11px] text-rose-600 mt-1.5">Failed to save timezone. Try again.</p>
        )}

        <div className="flex justify-end gap-2 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateTimezone.isPending || !timezone}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            {updateTimezone.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
