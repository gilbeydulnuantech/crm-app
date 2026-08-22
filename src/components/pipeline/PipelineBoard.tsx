import { useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Opportunity, Stage } from '../../types/opportunity';
import PipelineColumn from './PipelineColumn';

interface Props {
  stages: Stage[];
  visibleStageIds: Set<number>;
  opportunities: Opportunity[];
  onCardClick: (opportunity: Opportunity) => void;
  onViewDetails: (opportunity: Opportunity) => void;
  onMoveStage: (opportunityId: number, stageId: number) => void;
  onEditDeal: (opportunity: Opportunity) => void;
  onAddNote: (opportunity: Opportunity) => void;
  onCreateTask: (opportunity: Opportunity) => void;
  onCreateProposal: (opportunity: Opportunity) => void;
  onCreateContract: (opportunity: Opportunity) => void;
  onMarkWon: (opportunity: Opportunity) => void;
  onMarkLost: (opportunity: Opportunity) => void;
  onArchive: (opportunity: Opportunity) => void;
  onDelete: (opportunity: Opportunity) => void;
  canEditDeal: (opportunity: Opportunity) => boolean;
  isAdmin: boolean;
  highlightDealId?: number | null;
}

// Manages which stage columns render on the board — the "Move to Stage"
// submenu on each card still lists every stage (via the full `stages` prop
// PipelineColumn/DealCardMenu already receive), so hiding a column here
// never blocks moving a deal into it.
export function PipelineBoardColumnsMenu({
  stages,
  visibleStageIds,
  onToggle,
}: {
  stages: Stage[];
  visibleStageIds: Set<number>;
  onToggle: (stageId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const sortedStages = [...stages].sort((a, b) => a.display_order - b.display_order);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 py-1.5 px-2.5 border border-slate-200 rounded-md bg-white transition-colors"
      >
        <span>Columns</span>
        <i className="fa-solid fa-gear text-[10px]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1.5 max-h-64 overflow-y-auto">
            {sortedStages.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 px-3 py-1 text-xs text-slate-600 cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={visibleStageIds.has(s.id)}
                  onChange={() => onToggle(s.id)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-[var(--theme-accent)]"
                />
                {s.name}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PipelineBoard({
  stages,
  visibleStageIds,
  opportunities,
  onCardClick,
  onViewDetails,
  onMoveStage,
  onEditDeal,
  onAddNote,
  onCreateTask,
  onCreateProposal,
  onCreateContract,
  onMarkWon,
  onMarkLost,
  onArchive,
  onDelete,
  canEditDeal,
  isAdmin,
  highlightDealId,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const opportunityId = active.id as number;
    const targetStageId = over.id as number;
    const current = opportunities.find((o) => o.id === opportunityId);
    if (current && canEditDeal(current) && current.stage_id !== targetStageId) {
      onMoveStage(opportunityId, targetStageId);
    }
  }

  const sortedStages = [...stages]
    .filter((s) => visibleStageIds.has(s.id))
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full min-w-max">
          {sortedStages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              stages={stages}
              opportunities={opportunities.filter((o) => o.stage_id === stage.id)}
              onCardClick={onCardClick}
              onViewDetails={onViewDetails}
              onEditDeal={onEditDeal}
              onAddNote={onAddNote}
              onCreateTask={onCreateTask}
              onCreateProposal={onCreateProposal}
              onCreateContract={onCreateContract}
              onMoveStage={(o, stageId) => onMoveStage(o.id, stageId)}
              onMarkWon={onMarkWon}
              onMarkLost={onMarkLost}
              onArchive={onArchive}
              onDelete={onDelete}
              canEditDeal={canEditDeal}
              isAdmin={isAdmin}
              highlightDealId={highlightDealId}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
