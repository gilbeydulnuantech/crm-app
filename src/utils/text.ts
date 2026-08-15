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

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
