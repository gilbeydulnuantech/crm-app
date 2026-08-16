import { useMemo } from 'react';
import { Opportunity } from '../../types/opportunity';

export type PipelineStatFilter = 'open' | 'wonMTD' | 'lostMTD';

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

interface Props {
  opportunities: Opportunity[];
  activeFilter: PipelineStatFilter | null;
  onSelect: (filter: PipelineStatFilter) => void;
}

export default function PipelineStatsBar({ opportunities, activeFilter, onSelect }: Props) {
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

  const cards: { filter?: PipelineStatFilter; label: string; value: string | number; tone?: string }[] = [
    { filter: 'open', label: 'Open', value: stats.openCount },
    { label: 'Pipeline', value: formatCurrency(stats.pipelineValue) },
    { filter: 'wonMTD', label: 'Won MTD', value: stats.wonThisMonth, tone: 'text-emerald-600' },
    { filter: 'lostMTD', label: 'Lost MTD', value: stats.lostThisMonth, tone: 'text-rose-600' },
    { label: 'Revenue', value: formatCurrency(stats.totalWonValue) },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {cards.map((c) => {
        const isActive = c.filter != null && activeFilter === c.filter;
        const clickable = c.filter != null;
        return (
          <button
            key={c.label}
            onClick={clickable ? () => onSelect(c.filter!) : undefined}
            disabled={!clickable}
            title={clickable ? `Filter to ${c.label}` : undefined}
            className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-medium transition-all ${
              clickable ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'
            } ${
              isActive
                ? 'border-indigo-400 ring-1 ring-indigo-100 bg-indigo-50 text-indigo-700'
                : `border-slate-200 text-slate-600 ${clickable ? 'hover:border-slate-300' : ''}`
            }`}
          >
            <span className={`font-bold ${c.tone ?? (isActive ? 'text-indigo-700' : 'text-slate-800')}`}>
              {c.value}
            </span>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
