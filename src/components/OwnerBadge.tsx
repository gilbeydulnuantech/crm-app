import { useState } from 'react';
import { DEFAULT_USER_COLOR, hexToRgba } from '../utils/userColor';
import { toTitleCase } from '../utils/text';

interface Props {
  name?: string | null;
  color?: string | null;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm';
  emptyLabel?: string;
  className?: string;
}

// Shared owner/assignee pill — colored dot + name when no photo, the actual
// uploaded avatar in place of the dot once one exists. Replaces what used to
// be hand-duplicated across Task/Deal/Event cards and quickviews.
export default function OwnerBadge({
  name,
  color,
  avatarUrl,
  size = 'sm',
  emptyLabel = 'Unassigned',
  className = '',
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const resolvedColor = name ? color || DEFAULT_USER_COLOR : undefined;
  const photoSize = size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const textSize = size === 'xs' ? 'text-[10px]' : 'text-xs';

  return (
    <span
      style={resolvedColor ? { backgroundColor: hexToRgba(resolvedColor, 0.14), color: resolvedColor } : undefined}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold truncate ${textSize} ${
        resolvedColor ? '' : 'bg-slate-100 text-slate-500'
      } ${className}`}
    >
      {avatarUrl && !imgFailed ? (
        <img
          src={avatarUrl}
          alt={name ?? ''}
          className={`rounded-full object-cover shrink-0 ${photoSize}`}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: resolvedColor || '#94A3B8' }}
        />
      )}
      <span className="truncate">{name ? toTitleCase(name) : emptyLabel}</span>
    </span>
  );
}
