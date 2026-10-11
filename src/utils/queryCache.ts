// Remembers the last server answer for settings that change how the screen LOOKS (card text size, event colors), so the
// first paint already uses them instead of flashing the defaults while the request is still in flight.
// It is only a placeholder: the real answer is always fetched and replaces it. Never throws (private windows block storage).
const PREFIX = 'crm.cache.';

export function readCache<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeCache<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable: skip */
  }
}
