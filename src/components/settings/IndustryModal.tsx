import { useEffect, useState } from 'react';
import { BookingHours } from '../../api/companyProfile';
import { useApplyIndustryPreset, useIndustrySettings, useSaveIndustryFeatures } from '../../hooks/useIndustry';

interface Props {
  open: boolean;
  onClose: () => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOT_OPTIONS = [15, 20, 30, 45, 60, 90, 120];
const BUFFER_OPTIONS = [0, 5, 10, 15, 30, 45, 60];
const hourLabel = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;
const inputClass =
  'px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-2 py-1.5 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 rounded border-slate-300 text-[var(--theme-accent)]" />
      <span>
        <span className="text-sm text-slate-700">{label}</span>
        {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
      </span>
    </label>
  );
}

export default function IndustryModal({ open, onClose }: Props) {
  const { data, isLoading } = useIndustrySettings(open);
  const apply = useApplyIndustryPreset();
  const saveFeatures = useSaveIndustryFeatures();
  const [pick, setPick] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [staffEnabled, setStaffEnabled] = useState(false);
  const [onlineChoice, setOnlineChoice] = useState(false);
  const [staffLabel, setStaffLabel] = useState('Therapist');
  const [hours, setHours] = useState<BookingHours>({ start: 9, end: 17, days: [1, 2, 3, 4, 5], slot_minutes: 60 });

  useEffect(() => {
    if (!data?.success) return;
    setPick(data.industry ?? '');
    setStaffEnabled(data.staff_enabled);
    setOnlineChoice(data.online_provider_choice);
    setStaffLabel(data.staff_label);
    setHours(data.booking_hours);
  }, [data, open]);

  if (!open) return null;
  const preset = data?.presets.find((p) => p.key === pick);

  function handleApply() {
    if (!pick) return;
    setError(null);
    setMessage(null);
    apply.mutate(pick, {
      onSuccess: (res) => {
        if (!res.success) return setError(res.error || 'Could not apply.');
        setMessage(
          `Applied. ${res.types_added ?? 0} event type${res.types_added === 1 ? '' : 's'} added${res.renamed ? ', "Meeting" renamed' : ''}. Nothing you created was removed.`
        );
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'Could not apply.'),
    });
  }

  function handleSave() {
    setError(null);
    setMessage(null);
    saveFeatures.mutate(
      { staff_enabled: staffEnabled, online_provider_choice: onlineChoice, staff_label: staffLabel, booking_hours: hours },
      {
        onSuccess: (res) => (res.success ? setMessage('Saved.') : setError(res.error || 'Could not save.')),
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not save.'),
      }
    );
  }

  const toggleDay = (d: number) =>
    setHours((h) => ({ ...h, days: h.days.includes(d) ? h.days.filter((x) => x !== d) : [...h.days, d].sort() }));

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-800">Industry &amp; features</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Pick your type of business to start with sensible event types and settings. You can change everything afterwards.</p>

        {isLoading && <p className="text-xs text-slate-400">Loading...</p>}
        {data?.success && (
          <>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Industry</label>
            <div className="flex items-center gap-2">
              <select value={pick} onChange={(e) => setPick(e.target.value)} className={`${inputClass} flex-1`}>
                <option value="">Choose...</option>
                {data.presets.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApply}
                disabled={!pick || apply.isPending}
                className="px-3 py-1.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                {apply.isPending ? 'Applying...' : 'Apply'}
              </button>
            </div>
            {preset && (
              <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
                <p>{preset.description}</p>
                <p>
                  <span className="font-medium">Adds event types:</span> {preset.event_types.join(', ')}.
                </p>
                <p>
                  <span className="font-medium">Sets:</span> staff {preset.staff_enabled ? 'on' : 'off'} (called "{preset.staff_label}"), online hours{' '}
                  {hourLabel(preset.booking.start)}–{hourLabel(preset.booking.end)}, {preset.booking.slot_minutes}-minute slots{preset.booking.buffer_minutes ? `, ${preset.booking.buffer_minutes}-minute gap` : ''}
                  {preset.appointment_name !== 'Meeting' ? `, "Meeting" renamed to "${preset.appointment_name}" if you haven't changed it` : ''}.
                </p>
                <p className="text-slate-400">Applying again is safe: it only adds what is missing and never removes your own data.</p>
              </div>
            )}

            <div className="border-t border-slate-100 mt-5 pt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Features</div>
              <Switch
                checked={staffEnabled}
                onChange={setStaffEnabled}
                label="Use staff on bookings"
                hint="Adds the Staff list in Settings and a staff member field on every event."
              />
              <div className="flex items-center gap-2 pl-6 pb-1.5">
                <span className="text-xs text-slate-500">Call them</span>
                <input value={staffLabel} onChange={(e) => setStaffLabel(e.target.value)} maxLength={30} className={`${inputClass} w-40`} placeholder="Therapist" />
              </div>
              <Switch
                checked={onlineChoice}
                onChange={setOnlineChoice}
                label="Let clients book online and choose their staff member"
                hint="The public booking page shows the services and staff you mark as online, plus an 'Any available' option."
              />
            </div>

            <div className="border-t border-slate-100 mt-4 pt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Online booking hours</div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <select value={hours.start} onChange={(e) => setHours({ ...hours, start: Number(e.target.value) })} className={inputClass} aria-label="Opens">
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">to</span>
                <select value={hours.end} onChange={(e) => setHours({ ...hours, end: Number(e.target.value) })} className={inputClass} aria-label="Closes">
                  {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
                <select value={hours.slot_minutes} onChange={(e) => setHours({ ...hours, slot_minutes: Number(e.target.value) })} className={inputClass} aria-label="Slot length">
                  {SLOT_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} min slots
                    </option>
                  ))}
                </select>
                <select value={hours.step_minutes ?? hours.slot_minutes} onChange={(e) => setHours({ ...hours, step_minutes: Number(e.target.value) })} className={inputClass} aria-label="Start times every">
                  {SLOT_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      Start every {m} min
                    </option>
                  ))}
                </select>
                <select value={hours.buffer_minutes ?? 0} onChange={(e) => setHours({ ...hours, buffer_minutes: Number(e.target.value) })} className={inputClass} aria-label="Gap between bookings">
                  {BUFFER_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m === 0 ? 'No gap' : `${m} min gap`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DAY_NAMES.map((n, d) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleDay(d)}
                    aria-pressed={hours.days.includes(d)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                      hours.days.includes(d) ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-tint)] text-slate-800' : 'border-slate-200 text-slate-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">Times are in your CRM timezone.</p>
            </div>
          </>
        )}

        {message && <p className="text-xs text-emerald-600 mt-3">{message}</p>}
        {error && <p className="text-xs text-rose-600 mt-3">{error}</p>}

        <div className="flex justify-end gap-2 pt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveFeatures.isPending || !data?.success}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            {saveFeatures.isPending ? 'Saving...' : 'Save features'}
          </button>
        </div>
      </div>
    </div>
  );
}
