// Column visibility is a per-rep display preference, not shared data — kept
// in localStorage (scoped by user id, since a shared browser could have
// multiple reps logging in/out) rather than the backend. Stage visibility
// stores the HIDDEN ids, not the visible ones, so a newly added stage
// defaults to visible instead of silently disappearing because it wasn't
// in an old saved "visible" list. Shared between Pipeline.tsx (which owns
// the hide/show toggle UI) and anywhere else that needs to respect the
// same per-rep preference read-only, e.g. Dashboard's stage-based charts.
export function hiddenStagesKey(userId: number | undefined, pipelineId: number | undefined) {
  return `pipeline-hidden-stages:${userId ?? 'anon'}:${pipelineId ?? 'none'}`;
}

export function loadHiddenStageIds(userId: number | undefined, pipelineId: number | undefined): Set<number> {
  try {
    const raw = localStorage.getItem(hiddenStagesKey(userId, pipelineId));
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
  } catch {
    return new Set();
  }
}
