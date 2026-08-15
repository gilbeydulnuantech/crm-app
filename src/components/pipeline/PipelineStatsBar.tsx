import { useMemo } from 'react';
import { Opportunity } from '../../types/opportunity';

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export default function PipelineStatsBar({ opportunities }: { opportunities: Opportunity[] }) {
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const open = opportunities.filter((o) => o.status === 'Open');
    const won = opportunities.filter((o) => o.status === 'Won');
    const lost = opportunities.filter((o) => o.status === 'Lost');

    const isThisMonth = (dateStr?: string | null) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    const wonThisMonth = won.filter((o) => isThisMonth(o.closed_at));
    const lostThisMonth = lost.filter((o) => isThisMonth(o.closed_at));

    // Number(...) guards against deal_value arriving as a numeric string —
    // reduce would otherwise concatenate instead of summing.
    const pipelineValue = open.reduce((sum, o) => sum + Number(o.deal_value ?? 0), 0);
    const totalWonValue = won.reduce((sum, o) => sum + Number(o.deal_value ?? 0), 0);

    return {
      openCount: open.length,
      pipelineValue,
      wonThisMonth: wonThisMonth.length,
      lostThisMonth: lostThisMonth.length,
      totalWonValue,
    };
  }, [opportunities]);

  const cards = [
    { label: 'Open', value: stats.openCount },
    { label: 'Pipeline', value: formatCurrency(stats.pipelineValue) },
    { label: 'Won MTD', value: stats.wonThisMonth, tone: 'text-emerald-600' },
    { label: 'Lost MTD', value: stats.lostThisMonth, tone: 'text-rose-600' },
    { label: 'Revenue', value: formatCurrency(stats.totalWonValue) },
  ];

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {cards.map((c, i) => (
        <div key={c.label} className="flex items-center gap-2.5 shrink-0">
          {i > 0 && <span className="w-px h-4 bg-slate-200 shrink-0" />}
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span className={`text-xs font-bold ${c.tone ?? 'text-slate-800'}`}>{c.value}</span>
            <span className="text-[9px] text-slate-400 uppercase tracking-wide">{c.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
