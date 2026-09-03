import { useState } from 'react';

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
  'bg-[var(--theme-accent-tint)] text-[var(--theme-accent-hover)]',
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
  size?: 'xs' | 'sm' | 'lg';
  avatarUrl?: string | null;
}

// Falls back to the deterministic initials avatar (same name always renders
// the same color, same approach as getTagColorClasses) whenever a user
// hasn't uploaded a photo, or it fails to load.
export default function Avatar({ name, size = 'sm', avatarUrl }: Props) {
  const dims = size === 'xs' ? 'w-5 h-5 text-[9px]' : size === 'lg' ? 'w-16 h-16 text-xl' : 'w-7 h-7 text-[11px]';
  // Drive hotlinking occasionally 429s — fall back to the initials avatar
  // below rather than showing a broken-image icon.
  const [loadFailed, setLoadFailed] = useState(false);

  if (avatarUrl && !loadFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`inline-block rounded-full object-cover shrink-0 ${dims}`}
        onError={() => setLoadFailed(true)}
      />
    );
  }

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
