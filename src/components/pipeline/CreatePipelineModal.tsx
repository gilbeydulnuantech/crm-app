import { useEffect, useState } from 'react';
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
import { useCreatePipeline } from '../../hooks/useOpportunities';
import { NewPipelineResult } from '../../api/opportunities';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (pipeline: NewPipelineResult) => void;
}

interface StageDraft {
  key: string;
  name: string;
  winProbability: string;
}

let stageKeySeq = 0;
function newStageKey() {
  stageKeySeq += 1;
  return `stage-${stageKeySeq}`;
}

function defaultStages(): StageDraft[] {
  return [
    { key: newStageKey(), name: 'Prospecting', winProbability: '10' },
    { key: newStageKey(), name: 'Qualified', winProbability: '30' },
    { key: newStageKey(), name: 'Proposal', winProbability: '70' },
    { key: newStageKey(), name: 'Contract Negotiation', winProbability: '90' },
  ];
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
        className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="relative w-20 shrink-0">
        <input
          type="number"
          min={0}
          max={100}
          value={stage.winProbability}
          onChange={(e) => onChange({ winProbability: e.target.value })}
          className="w-full pl-3 pr-6 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

export default function CreatePipelineModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [stages, setStages] = useState<StageDraft[]>(defaultStages);
  const [error, setError] = useState<string | null>(null);
  const createPipeline = useCreatePipeline();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    if (open) {
      setName('');
      setIsDefault(false);
      setStages(defaultStages());
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  function updateStage(key: string, patch: Partial<StageDraft>) {
    setStages((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function addStage() {
    setStages((prev) => [...prev, { key: newStageKey(), name: '', winProbability: '0' }]);
  }

  function removeStage(key: string) {
    setStages((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStages((prev) => {
      const oldIndex = prev.findIndex((s) => s.key === active.id);
      const newIndex = prev.findIndex((s) => s.key === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleSubmit() {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Pipeline name is required.');
      return;
    }
    const cleanedStages = stages
      .map((s) => ({ name: s.name.trim(), win_probability: Number(s.winProbability) || 0 }))
      .filter((s) => s.name);
    if (cleanedStages.length === 0) {
      setError('Add at least one stage.');
      return;
    }

    createPipeline.mutate(
      { name: trimmedName, is_default: isDefault, stages: cleanedStages },
      {
        onSuccess: (result) => {
          onCreated(result);
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create pipeline.'),
      }
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-800">Create New Pipeline</h3>
        <p className="text-sm text-slate-400 mt-0.5">Set up your new sales pipeline.</p>

        <div className="grid grid-cols-2 gap-4 mt-5">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Pipeline Name <span className="text-slate-400 font-normal">(Required)</span>
            </label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Residential Roofing"
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Make Default Pipeline <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <button
              type="button"
              onClick={() => setIsDefault((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg w-full"
            >
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  isDefault ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                  style={{ transform: isDefault ? 'translateX(18px)' : 'translateX(2px)' }}
                />
              </span>
              <span className="text-sm text-slate-600">Set as default for new deals?</span>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-5 pt-4">
          <h4 className="text-sm font-semibold text-slate-800">Configure Pipeline Stages</h4>
          <p className="text-xs text-slate-400 mt-0.5 mb-3">Drag to reorder stages and set win probabilities.</p>

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
            className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-2 py-1.5 border border-dashed border-slate-300 rounded-lg hover:border-indigo-400"
          >
            <i className="fa-solid fa-plus text-[10px]" />
            Add Stage
          </button>
        </div>

        {error && (
          <div className="mt-4 p-2.5 text-xs rounded-lg text-center bg-rose-50 text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createPipeline.isPending}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg"
          >
            {createPipeline.isPending ? 'Creating...' : 'Save & Create Pipeline'}
          </button>
        </div>
      </div>
    </div>
  );
}
