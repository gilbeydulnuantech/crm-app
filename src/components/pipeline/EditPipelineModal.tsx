import { useEffect, useState } from 'react';
import { Pipeline } from '../../types/opportunity';
import { useStages, useUpdatePipeline, useUpdatePipelineStages } from '../../hooks/useOpportunities';
import StageDraftList, { StageDraft, newStageKey } from './StageDraftList';

interface Props {
  open: boolean;
  pipeline: Pipeline | null;
  onClose: () => void;
}

export default function EditPipelineModal({ open, pipeline, onClose }: Props) {
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [stages, setStages] = useState<StageDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const updatePipeline = useUpdatePipeline();
  const updateStages = useUpdatePipelineStages();
  const { data: existingStages = [] } = useStages(pipeline?.id);

  useEffect(() => {
    if (open && pipeline) {
      setName(pipeline.name);
      setIsDefault(pipeline.is_default);
      setError(null);
    }
  }, [open, pipeline]);

  // Seed stage drafts from the pipeline's real stages — each keeps its real
  // `id` so saving updates those rows in place rather than recreating them,
  // which would orphan any deal currently sitting in that stage.
  useEffect(() => {
    if (open && existingStages.length > 0) {
      setStages(
        [...existingStages]
          .sort((a, b) => a.display_order - b.display_order)
          .map((s) => ({ key: newStageKey(), id: s.id, name: s.name, winProbability: String(s.win_probability) }))
      );
    }
  }, [open, existingStages]);

  if (!open || !pipeline) return null;

  const isSaving = updatePipeline.isPending || updateStages.isPending;

  function handleSubmit() {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Pipeline name is required.');
      return;
    }
    const cleanedStages = stages
      .map((s) => ({ id: s.id, name: s.name.trim(), win_probability: Number(s.winProbability) || 0 }))
      .filter((s) => s.name);
    if (cleanedStages.length === 0) {
      setError('Add at least one stage.');
      return;
    }

    updatePipeline.mutate(
      { id: pipeline!.id, payload: { name: trimmedName, is_default: isDefault } },
      {
        onSuccess: () => {
          updateStages.mutate(
            { pipelineId: pipeline!.id, stages: cleanedStages },
            {
              onSuccess: () => onClose(),
              onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update stages.'),
            }
          );
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update pipeline.'),
      }
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-800">Edit Pipeline</h3>

        <div className="grid grid-cols-2 gap-4 mt-5">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pipeline Name</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
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
                  isDefault ? 'bg-[var(--theme-accent)]' : 'bg-slate-300'
                }`}
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                  style={{ transform: isDefault ? 'translateX(18px)' : 'translateX(2px)' }}
                />
              </span>
              <span className="text-sm text-slate-600">Set as default?</span>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-5 pt-4">
          <h4 className="text-sm font-semibold text-slate-800">Pipeline Stages</h4>
          <p className="text-xs text-slate-400 mt-0.5 mb-3">
            Drag to reorder, rename, or add/remove stages. A stage with deals in it can't be removed.
          </p>

          <StageDraftList stages={stages} onChange={setStages} />
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
            disabled={isSaving}
            className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] disabled:opacity-60 text-white rounded-lg"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
