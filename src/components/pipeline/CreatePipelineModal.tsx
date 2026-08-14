import { useEffect, useState } from 'react';
import { useCreatePipeline } from '../../hooks/useOpportunities';
import { NewPipelineResult } from '../../api/opportunities';
import StageDraftList, { StageDraft, newStageKey } from './StageDraftList';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (pipeline: NewPipelineResult) => void;
}

function defaultStages(): StageDraft[] {
  return [
    { key: newStageKey(), id: null, name: 'Prospecting', winProbability: '10' },
    { key: newStageKey(), id: null, name: 'Qualified', winProbability: '30' },
    { key: newStageKey(), id: null, name: 'Proposal', winProbability: '70' },
    { key: newStageKey(), id: null, name: 'Contract Negotiation', winProbability: '90' },
  ];
}

export default function CreatePipelineModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [stages, setStages] = useState<StageDraft[]>(defaultStages);
  const [error, setError] = useState<string | null>(null);
  const createPipeline = useCreatePipeline();

  useEffect(() => {
    if (open) {
      setName('');
      setIsDefault(false);
      setStages(defaultStages());
      setError(null);
    }
  }, [open]);

  if (!open) return null;

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
            disabled={createPipeline.isPending}
            className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] disabled:opacity-60 text-white rounded-lg"
          >
            {createPipeline.isPending ? 'Creating...' : 'Save & Create Pipeline'}
          </button>
        </div>
      </div>
    </div>
  );
}
