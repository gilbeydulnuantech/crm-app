// Recomputed every 15 min by the "Deal Intelligence Engine" n8n workflow —
// a per-deal win likelihood (0-100) plus a deterministic "why" reason,
// distinct from the manually-editable `probability` field. See that
// workflow's SQL for the exact formula (stage position + contact lead
// score + proposal/contract/payment milestones + activity recency).
export function winScoreTone(score: number): string {
  if (score >= 70) return 'bg-emerald-100 text-emerald-700';
  if (score >= 40) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-500';
}

export default function WinScoreBadge({
  score,
  reason,
  size = 'sm',
}: {
  score?: number | null;
  reason?: string | null;
  size?: 'xs' | 'sm';
}) {
  if (score == null) return null;
  const sizeClasses = size === 'xs' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full shrink-0 ${sizeClasses} ${winScoreTone(score)}`}
      title={reason ? `${score}% — ${reason}` : `Win score: ${score}%`}
    >
      <i className="fa-solid fa-bullseye" />
      {score}%
    </span>
  );
}
