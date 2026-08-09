import { useDroppable } from '@dnd-kit/core';
import { Opportunity, Stage } from '../../types/opportunity';
import DealCard from './DealCard';

interface Props {
  stage: Stage;
  opportunities: Opportunity[];
  onCardClick: (opportunity: Opportunity) => void;
}

function currency(n: number) {
  return `$${n.toLocaleString()}`;
}

const CLOSED_WON = /won/i;
const CLOSED_LOST = /lost/i;

export default function PipelineColumn({ stage, opportunities, onCardClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const isWon = CLOSED_WON.test(stage.name);
  const isLost = CLOSED_LOST.test(stage.name);
  const total = opportunities.reduce((sum, o) => sum + (o.deal_value ?? 0), 0);

  const colClasses = isWon
    ? 'bg-emerald-50 border-emerald-100'
    : isLost
      ? 'bg-rose-50 border-rose-100'
      : 'bg-slate-50 border-slate-200';
  const headerClasses = isWon
    ? 'border-emerald-100 text-emerald-700'
    : isLost
      ? 'border-rose-100 text-rose-700'
      : 'border-slate-200 text-slate-700';

  return (
    <div
      ref={setNodeRef}
      className={`w-64 shrink-0 flex flex-col rounded-xl border transition-colors ${colClasses} ${
        isOver ? 'ring-2 ring-indigo-400' : ''
      }`}
    >
      <div className={`p-3 border-b ${headerClasses}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{stage.name}</span>
          <span className="text-[10px] bg-white border border-slate-200 rounded-full px-1.5 py-0.5 text-slate-500">
            {opportunities.length}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">{currency(total)}</div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[80px]">
        {opportunities.map((o) => (
          <DealCard key={o.id} opportunity={o} onClick={() => onCardClick(o)} />
        ))}
        {opportunities.length === 0 && (
          <div className="text-center text-[11px] text-slate-300 py-6">Drop deals here</div>
        )}
      </div>
    </div>
  );
}
