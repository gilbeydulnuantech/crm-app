// Cold/Warm/Hot bucketing for contacts.lead_score — recomputed every 15 min
// by the "Lead Scoring Engine" n8n workflow (see its SQL for the exact
// point formula). Thresholds are a starting point, not tuned against real
// outcome data yet.
export function leadScoreTier(score: number): { label: string; classes: string } {
  if (score >= 71) return { label: 'Hot', classes: 'bg-rose-100 text-rose-700' };
  if (score >= 31) return { label: 'Warm', classes: 'bg-amber-100 text-amber-700' };
  return { label: 'Cold', classes: 'bg-slate-100 text-slate-500' };
}

export default function LeadScoreBadge({ score }: { score: number | null | undefined }) {
  const value = score ?? 0;
  const tier = leadScoreTier(value);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${tier.classes}`}
      title={`Lead score: ${value}`}
    >
      {tier.label}
      <span className="opacity-60">{value}</span>
    </span>
  );
}
