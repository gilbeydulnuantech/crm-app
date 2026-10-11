import { CSSProperties, useCallback } from 'react';
import { useEventTypes } from '../hooks/useEventTypes';

export const FALLBACK_TYPE_COLOR = '#94A3B8';

export interface EventTypeMeta {
  label: string;
  color: string;
}

// Looks up a type by the key events store. A key that is not in the table (for example an old event whose type
// was removed) still renders, as a grey chip named after the key.
export function useEventTypeLookup(): (key: string | null | undefined) => EventTypeMeta {
  const { data: types = [] } = useEventTypes();
  return useCallback(
    (key) => {
      const hit = key ? types.find((t) => t.key === key) : undefined;
      if (hit) return { label: hit.name, color: hit.color };
      const label = (key ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return { label: label || 'Event', color: FALLBACK_TYPE_COLOR };
    },
    [types]
  );
}

// Tinted card: the type's color at low opacity behind dark text, so any chosen color stays readable.
export function typeCardStyle(color: string): CSSProperties {
  return { backgroundColor: `${color}2E`, color: '#1E293B' };
}
