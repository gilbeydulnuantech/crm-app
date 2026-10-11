// Company-wide clock display (Settings > Timezone): "12h" shows 3:30 PM, "24h" shows 15:30.
//
// Time text is produced all over the app with Date#toLocaleTimeString / toLocaleString, so rather than
// editing every call, those two are wrapped once: when a call asks for a time but does not choose a
// clock itself (hour12 / hourCycle), the company preference is applied. Calls that choose their own
// clock keep it. Nothing happens until a preference has been set.
export type TimeFormat = '12h' | '24h';

let preference: TimeFormat | null = null;

export function setTimeFormat(next: TimeFormat | null) {
  preference = next;
}

export function getTimeFormat(): TimeFormat {
  return preference ?? '12h';
}

// "8 AM" / "08:00" — used where the app builds an hour label itself.
export function formatHourLabel(h: number): string {
  return getTimeFormat() === '24h' ? `${String(h).padStart(2, '0')}:00` : `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
}

const TIME_FIELDS = ['hour', 'minute', 'second', 'timeStyle', 'dayPeriod', 'fractionalSecondDigits'] as const;

function withClock(options: Intl.DateTimeFormatOptions | undefined, defaultIsTime: boolean): Intl.DateTimeFormatOptions | undefined {
  if (!preference) return options;
  if (options && (options.hour12 !== undefined || options.hourCycle !== undefined)) return options;
  const hasTime = options ? TIME_FIELDS.some((k) => (options as Record<string, unknown>)[k] !== undefined) : defaultIsTime;
  if (!hasTime) return options;
  return { ...options, hourCycle: preference === '24h' ? 'h23' : 'h12' };
}

let installed = false;
export function installTimeFormatPatch() {
  if (installed) return;
  installed = true;
  const proto = Date.prototype;
  const origTime = proto.toLocaleTimeString;
  const origFull = proto.toLocaleString;
  proto.toLocaleTimeString = function (this: Date, locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
    return origTime.call(this, locales, withClock(options, true));
  };
  proto.toLocaleString = function (this: Date, locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
    // With no options, toLocaleString prints a date AND a time; with options only the listed fields.
    return origFull.call(this, locales, withClock(options, true));
  };
}

// Short clock text for calendar cards: 12-hour drops ":00" ("12 PM", "1:30 PM"); 24-hour is always "HH:MM" ("12:00", "13:30").
export function formatClock(value: string | Date, timeZone?: string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  const is24 = getTimeFormat() === '24h';
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: is24 ? 'h23' : 'h12',
    timeZone,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const minute = get('minute');
  if (is24) return `${get('hour').padStart(2, '0')}:${minute}`;
  return `${get('hour')}${minute === '00' ? '' : `:${minute}`} ${get('dayPeriod').toUpperCase()}`;
}

// "12 PM – 1 PM" / "12:00 – 13:00"; just the start when there is no end.
export function formatClockRange(start: string | Date, end?: string | Date | null, timeZone?: string): string {
  const a = formatClock(start, timeZone);
  if (!end) return a;
  const b = formatClock(end, timeZone);
  return b ? `${a} – ${b}` : a;
}
