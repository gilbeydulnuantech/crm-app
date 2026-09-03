import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Shared between CreatePipelineModal (all stages are new, id always null)
// and EditPipelineModal (existing stages carry their real id so updates
// stay in place instead of orphaning deals that reference the old
// stage_id — see update-pipeline-stages' backend comment for why).
export interface StageDraft {
  key: string;
  id: number | null;
  name: string;
  winProbability: string;
}

let stageKeySeq = 0;
export function newStageKey() {
  stageKeySeq += 1;
  return `stage-${stageKeySeq}`;
}

function SortableStageRow({
  index,
  stage,
  canDelete,
  onChange,
  onDelete,
}: {
  index: number;
  stage: StageDraft;
  canDelete: boolean;
  onChange: (patch: Partial<StageDraft>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 ${isDragging ? 'opacity-60' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="px-1 py-1.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none shrink-0"
        title="Drag to reorder"
      >
        <i className="fa-solid fa-grip-vertical text-xs" />
      </button>
      <span className="text-xs text-slate-400 w-14 shrink-0">Stage {index + 1}</span>
      <input
        required
        value={stage.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Stage name"
        className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
      />
      <div className="relative w-20 shrink-0">
        <input
          type="number"
          min={0}
          max={100}
          value={stage.winProbability}
          onChange={(e) => onChange({ winProbability: e.target.value })}
          className="w-full pl-3 pr-6 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        title={canDelete ? 'Remove stage' : 'A pipeline needs at least one stage'}
        className="text-slate-300 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-300 shrink-0 px-1"
      >
        <i className="fa-solid fa-trash text-xs" />
      </button>
    </div>
  );
}

interface Props {
  stages: StageDraft[];
  onChange: (stages: StageDraft[]) => void;
}

export default function StageDraftList({ stages, onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function updateStage(key: string, patch: Partial<StageDraft>) {
    onChange(stages.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function addStage() {
    onChange([...stages, { key: newStageKey(), id: null, name: '', winProbability: '0' }]);
  }

  function removeStage(key: string) {
    onChange(stages.length > 1 ? stages.filter((s) => s.key !== key) : stages);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stages.findIndex((s) => s.key === active.id);
    const newIndex = stages.findIndex((s) => s.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(stages, oldIndex, newIndex));
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stages.map((s) => s.key)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {stages.map((s, i) => (
              <SortableStageRow
                key={s.key}
                index={i}
                stage={s}
                canDelete={stages.length > 1}
                onChange={(patch) => updateStage(s.key, patch)}
                onDelete={() => removeStage(s.key)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addStage}
        className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--theme-accent)] hover:text-[var(--theme-accent-hover)] px-2 py-1.5 border border-dashed border-slate-300 rounded-lg hover:border-[var(--theme-accent)]"
      >
        <i className="fa-solid fa-plus text-[10px]" />
        Add Stage
      </button>
    </div>
  );
}
