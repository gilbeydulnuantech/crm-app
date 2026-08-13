import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Opportunity, Stage } from '../../types/opportunity';
import PipelineColumn from './PipelineColumn';

interface Props {
  stages: Stage[];
  opportunities: Opportunity[];
  onCardClick: (opportunity: Opportunity) => void;
  onViewDetails: (opportunity: Opportunity) => void;
  onMoveStage: (opportunityId: number, stageId: number) => void;
  onEditDeal: (opportunity: Opportunity) => void;
  onAddNote: (opportunity: Opportunity) => void;
  onCreateTask: (opportunity: Opportunity) => void;
  onMarkWon: (opportunity: Opportunity) => void;
  onMarkLost: (opportunity: Opportunity) => void;
  onArchive: (opportunity: Opportunity) => void;
  onDelete: (opportunity: Opportunity) => void;
  canEditDeal: (opportunity: Opportunity) => boolean;
  isAdmin: boolean;
  highlightDealId?: number | null;
}

export default function PipelineBoard({
  stages,
  opportunities,
  onCardClick,
  onViewDetails,
  onMoveStage,
  onEditDeal,
  onAddNote,
  onCreateTask,
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

  const sortedStages = [...stages].sort((a, b) => a.display_order - b.display_order);

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
