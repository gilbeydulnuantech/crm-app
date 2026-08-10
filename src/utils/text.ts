// Data in this app arrives however a rep typed it (or however a CSV import
// had it) — contact names, companies, locations, etc. often come back
// all-lowercase or all-caps. This normalizes display without touching the
// underlying value (email addresses and tag names are case-sensitive/
// meaningful as-is, so callers should skip those).
export function toTitleCase(value?: string | null): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}
