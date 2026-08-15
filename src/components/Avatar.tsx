const AVATAR_COLOR_PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700',
  'bg-cyan-100 text-cyan-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLOR_PALETTE[Math.abs(hash) % AVATAR_COLOR_PALETTE.length];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Props {
  name: string;
  size?: 'xs' | 'sm';
}

// Deterministic initials avatar — same name always renders the same color,
// same approach as getTagColorClasses, no image upload/storage required.
export default function Avatar({ name, size = 'sm' }: Props) {
  const dims = size === 'xs' ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-[11px]';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold shrink-0 ${dims} ${colorFor(
        name || '?'
      )}`}
    >
      {initialsFor(name)}
    </span>
  );
}
