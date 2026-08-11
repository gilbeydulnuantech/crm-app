// Shared fallback for an unset users.color — used everywhere a per-user
// color renders (Calendar sidebar, Tasks sidebar/cards, Pipeline cards) so
// an unassigned/uncustomized user looks the same neutral gray app-wide.
export const DEFAULT_USER_COLOR = '#94A3B8';

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
