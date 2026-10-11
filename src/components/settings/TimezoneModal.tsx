import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCompanyProfile, useSaveCompanyProfile } from '../../hooks/useCompanyProfile';

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
  const { isAdmin } = useAuth();
  const { data } = useCompanyProfile(open);
  const saveProfile = useSaveCompanyProfile();

  const [timezone, setTimezone] = useState('');
  const [timeFormat, setTimeFormatChoice] = useState<'12h' | '24h'>('12h');

  useEffect(() => {
    setTimezone(data?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    setTimeFormatChoice(data?.time_format === '24h' ? '24h' : '12h');
  }, [data?.timezone, data?.time_format, open]);

  if (!open) return null;

  function handleSave() {
    if (!data || !timezone) return;
    saveProfile.mutate(
      {
        company_name: data.company_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        website: data.website,
        brand_color: data.brand_color,
        timezone,
        time_format: timeFormat,
      },
      { onSuccess: onClose }
    );
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Timezone &amp; time display</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          The single timezone your whole CRM operates on — used to display and schedule dates and
          times (meetings, reminders, task due dates, booking availability) consistently for
          everyone, regardless of where they're logged in from.
        </p>

        <label className="block text-xs font-medium text-slate-600 mb-1">CRM timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          disabled={!isAdmin}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] disabled:bg-slate-50 disabled:text-slate-400"
        >
          {!TIMEZONES.includes(timezone) && timezone && <option value={timezone}>{timezone}</option>}
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, ' ')} ({formatOffset(tz)})
            </option>
          ))}
        </select>

        <label className="block text-xs font-medium text-slate-600 mt-4 mb-1">Time display</label>
        <div className="inline-flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
          {(['12h', '24h'] as const).map((f) => (
            <button
              key={f}
              type="button"
              disabled={!isAdmin}
              onClick={() => setTimeFormatChoice(f)}
              aria-pressed={timeFormat === f}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md disabled:cursor-not-allowed ${
                timeFormat === f ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
              }`}
            >
              {f === '12h' ? '12-hour' : '24-hour'}
              <span className="ml-1.5 text-[11px] font-normal text-slate-400">{f === '12h' ? '3:30 PM' : '15:30'}</span>
            </button>
          ))}
        </div>

        {!isAdmin && (
          <p className="text-[11px] text-slate-400 mt-1.5">Only an admin can change the CRM timezone and time display.</p>
        )}
        {saveProfile.isError && (
          <p className="text-[11px] text-rose-600 mt-1.5">Failed to save. Try again.</p>
        )}

        <div className="flex justify-end gap-2 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Close
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saveProfile.isPending || !timezone}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              {saveProfile.isPending ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
