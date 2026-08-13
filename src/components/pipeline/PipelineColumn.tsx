import { useDroppable } from '@dnd-kit/core';
import { Opportunity, Stage } from '../../types/opportunity';
import DealCard from './DealCard';

interface Props {
  stage: Stage;
  stages: Stage[];
  opportunities: Opportunity[];
  onCardClick: (opportunity: Opportunity) => void;
  onViewDetails: (opportunity: Opportunity) => void;
  onEditDeal: (opportunity: Opportunity) => void;
  onAddNote: (opportunity: Opportunity) => void;
  onCreateTask: (opportunity: Opportunity) => void;
  onMoveStage: (opportunity: Opportunity, stageId: number) => void;
  onMarkWon: (opportunity: Opportunity) => void;
  onMarkLost: (opportunity: Opportunity) => void;
  onArchive: (opportunity: Opportunity) => void;
  onDelete: (opportunity: Opportunity) => void;
  canEditDeal: (opportunity: Opportunity) => boolean;
  isAdmin: boolean;
  highlightDealId?: number | null;
}

// FIX 1: Use Intl.NumberFormat for clean, localized currency
const currency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);

const CLOSED_WON = /won/i;
const CLOSED_LOST = /lost/i;

export default function PipelineColumn({
  stage,
  stages,
  opportunities,
  onCardClick,
  onViewDetails,
  onEditDeal,
  onAddNote,
  onCreateTask,
  onMoveStage,
  onMarkWon,
  onMarkLost,
  onArchive,
  onDelete,
  canEditDeal,
  isAdmin,
  highlightDealId,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const isWon = CLOSED_WON.test(stage.name);
  const isLost = CLOSED_LOST.test(stage.name);

  // FIX 2: Wrap o.deal_value in Number() to prevent string concatenation (the "0800" bug)
  const total = opportunities.reduce((sum, o) => sum + Number(o.deal_value ?? 0), 0);

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
        {/* This will now display correctly as $800.00 instead of $0800.00 */}
        <div className="text-[10px] text-slate-400 mt-0.5">{currency(total)}</div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[80px]">
        {opportunities.map((o) => (
          <DealCard
            key={o.id}
            opportunity={o}
            stages={stages}
            onClick={() => onCardClick(o)}
            onViewDetails={() => onViewDetails(o)}
            onEdit={() => onEditDeal(o)}
            onAddNote={() => onAddNote(o)}
            onCreateTask={() => onCreateTask(o)}
            onMoveStage={(stageId) => onMoveStage(o, stageId)}
            onMarkWon={() => onMarkWon(o)}
            onMarkLost={() => onMarkLost(o)}
            onArchive={() => onArchive(o)}
            onDelete={() => onDelete(o)}
            canEdit={canEditDeal(o)}
            isAdmin={isAdmin}
            highlighted={o.id === highlightDealId}
          />
        ))}
        {opportunities.length === 0 && (
          <div className="text-center text-[11px] text-slate-300 py-6">Drop deals here</div>
        )}
      </div>
    </div>
  );
}
