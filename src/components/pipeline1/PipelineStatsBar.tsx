import { useMemo } from 'react';
import { Opportunity } from '../../types/opportunity';

function currency(n: number) {
  return `$${n.toLocaleString()}`;
}

export default function PipelineStatsBar({ opportunities }: { opportunities: Opportunity[] }) {
  const stats = useMemo(() => {
    const now = new Date();
    const open = opportunities.filter((o) => o.status === 'Open');
    const wonThisMonth = opportunities.filter(
      (o) =>
        o.status === 'Won' &&
        o.closed_at &&
        new Date(o.closed_at).getMonth() === now.getMonth() &&
        new Date(o.closed_at).getFullYear() === now.getFullYear()
    );
    const lostThisMonth = opportunities.filter(
      (o) =>
        o.status === 'Lost' &&
        o.closed_at &&
        new Date(o.closed_at).getMonth() === now.getMonth() &&
        new Date(o.closed_at).getFullYear() === now.getFullYear()
    );
    const pipelineValue = open.reduce((sum, o) => sum + (o.deal_value ?? 0), 0);
    const totalValue = opportunities.reduce((sum, o) => sum + (o.deal_value ?? 0), 0);

    return {
      openCount: open.length,
      pipelineValue,
      wonThisMonth: wonThisMonth.length,
      lostThisMonth: lostThisMonth.length,
      totalValue,
    };
  }, [opportunities]);

  const cards = [
    { label: 'Opportunities', value: stats.openCount },
    { label: 'Pipeline Value', value: currency(stats.pipelineValue) },
    { label: 'Won This Month', value: stats.wonThisMonth, tone: 'text-emerald-600' },
    { label: 'Lost This Month', value: stats.lostThisMonth, tone: 'text-rose-600' },
    { label: 'Total Value', value: currency(stats.totalValue) },
  ];

  return (
    <div className="px-4 pt-4 grid grid-cols-5 gap-3 shrink-0">
      {cards.map((c) => (
        <div key={c.label} className="border border-slate-200 rounded-lg p-3 text-center">
          <div className={`text-xl font-bold ${c.tone ?? 'text-slate-800'}`}>{c.value}</div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
