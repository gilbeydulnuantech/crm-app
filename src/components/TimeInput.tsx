import { getTimeFormat } from '../utils/timeFormat';

interface Props {
  value: string; // "HH:MM" (24-hour, as stored) or "" when not set
  onChange: (value: string) => void;
  required?: boolean;
  label: string; // accessible name, e.g. "Start time"
}

const STEP = 5;
const HOURS_24 = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1));

const selectClass =
  'flex-1 min-w-0 px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

// The browser's own <input type="time"> shows AM/PM or 24-hour depending on the computer's regional settings,
// and a website can't override that. This picker is built from selects so it follows the company setting
// (Settings > Timezone > Time display): 15:30 in 24-hour, or 3 : 30 PM in 12-hour. The value is always "HH:MM".
export default function TimeInput({ value, onChange, required, label }: Props) {
  const is24 = getTimeFormat() === '24h';
  const [hh = '', mm = ''] = value ? value.split(':') : [];
  const h24 = hh === '' ? null : Number(hh);

  const minutes = Array.from({ length: 60 / STEP }, (_, i) => String(i * STEP).padStart(2, '0'));
  // An existing event can start at, say, 09:07 — keep that minute selectable instead of silently rounding it.
  if (mm && !minutes.includes(mm)) {
    minutes.push(mm);
    minutes.sort();
  }

  const minuteSelect = (onMinute: (m: string) => void, disabled: boolean) => (
    <select
      aria-label={`${label}, minutes`}
      required={required}
      value={mm}
      disabled={disabled}
      onChange={(e) => onMinute(e.target.value || '00')}
      className={`${selectClass} disabled:bg-slate-50 disabled:text-slate-300`}
    >
      {disabled && <option value="">--</option>}
      {minutes.map((x) => (
        <option key={x} value={x}>
          {x}
        </option>
      ))}
    </select>
  );

  if (is24) {
    return (
      <div className="flex items-center gap-1" role="group" aria-label={label}>
        <select
          aria-label={`${label}, hour`}
          required={required}
          value={hh}
          onChange={(e) => onChange(e.target.value ? `${e.target.value}:${mm || '00'}` : '')}
          className={selectClass}
        >
          <option value="">--</option>
          {HOURS_24.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <span className="text-slate-400 text-sm">:</span>
        {minuteSelect((m) => onChange(`${hh}:${m}`), hh === '')}
      </div>
    );
  }

  const period = h24 !== null && h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 === null ? '' : String(h24 % 12 || 12);
  const compose = (h12: string, m: string, p: string) => {
    if (!h12) return '';
    const h = (Number(h12) % 12) + (p === 'PM' ? 12 : 0);
    return `${String(h).padStart(2, '0')}:${m || '00'}`;
  };

  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <select
        aria-label={`${label}, hour`}
        required={required}
        value={hour12}
        onChange={(e) => onChange(compose(e.target.value, mm, period))}
        className={selectClass}
      >
        <option value="">--</option>
        {HOURS_12.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <span className="text-slate-400 text-sm">:</span>
      {minuteSelect((m) => onChange(compose(hour12, m, period)), hour12 === '')}
      <select
        aria-label={`${label}, AM or PM`}
        value={period}
        disabled={hour12 === ''}
        onChange={(e) => onChange(compose(hour12, mm, e.target.value))}
        className={`${selectClass} flex-none w-[4.25rem] disabled:bg-slate-50 disabled:text-slate-300`}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
