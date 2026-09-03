// Tags are user-defined free text, so there's no fixed name->color mapping.
// Assign a color deterministically from a soft palette so the same tag name
// always renders the same color everywhere it appears.
const TAG_COLOR_PALETTE = [
  'bg-blue-100 text-blue-800',
  'bg-emerald-100 text-emerald-800',
  'bg-orange-100 text-orange-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-teal-100 text-teal-800',
  'bg-amber-100 text-amber-800',
  'bg-cyan-100 text-cyan-800',
  'bg-rose-100 text-rose-800',
  'bg-[var(--theme-accent-tint)] text-[var(--theme-accent-hover)]',
];

export function getTagColorClasses(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % TAG_COLOR_PALETTE.length;
  return TAG_COLOR_PALETTE[index];
}
