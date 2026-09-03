// Shared data-viz palette for every chart on the Dashboard (and anywhere
// else that adds one). Colors are drawn from the app's existing Tailwind
// palette (not a bespoke hex set) so charts read as part of the same design
// system as the rest of the CRM, and the categorical order below is the one
// that passed the dataviz skill's validator (adjacent CVD deltaE + normal-
// vision floor) — see:
//   node scripts/validate_palette.js "<hex,...>" --mode light --surface "#ffffff"
// Re-run that check before reordering or swapping any of these hexes.
export const CHART_CATEGORICAL = [
  '#3b82f6', // blue-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#22c55e', // green-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
] as const;

// Reserved status roles — never reused as a categorical series color.
export const CHART_STATUS = {
  good: '#059669', // emerald-600
  warning: '#d97706', // amber-600
  critical: '#e11d48', // rose-600
  neutral: '#94a3b8', // slate-400
} as const;

// Brand/primary — used for single-series charts (revenue trend) and any
// "this is the app's own accent" mark, matching the theme accent color used
// for buttons/links everywhere else in the UI. A CSS custom property (not a
// static hex) so it follows whatever accent color is picked in Settings →
// Theme — SVG fill/stroke and inline `style.color` both resolve var()
// natively, no JS re-render needed when the theme changes.
export const CHART_BRAND = 'var(--theme-accent)';

// Chart chrome — gridlines, axes, ink — pulled from the same slate scale
// Tailwind classes already use across the app (text-slate-800 etc.).
export const CHART_CHROME = {
  grid: '#eef2f6', // slate-100-ish hairline
  axisText: '#64748b', // slate-500
  ink: '#1e293b', // slate-800
  mutedInk: '#94a3b8', // slate-400
  track: '#e2e8f0', // slate-200
} as const;

export function chartCategoryColor(index: number): string {
  return CHART_CATEGORICAL[index % CHART_CATEGORICAL.length];
}
