import { useState } from 'react';
import { Pipeline } from '../../types/opportunity';
import { useAddPipeline } from '../../hooks/useOpportunities';

interface Props {
  pipelines: Pipeline[];
  pipelineId: number | undefined;
  isAdmin: boolean;
  onChange: (id: number) => void;
}

export default function PipelineSelector({ pipelines, pipelineId, isAdmin, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const addPipeline = useAddPipeline();

  const current = pipelines.find((p) => p.id === pipelineId);

  function closeAll() {
    setOpen(false);
    setCreating(false);
    setError(null);
  }

  function selectPipeline(id: number) {
    onChange(id);
    closeAll();
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    addPipeline.mutate(name, {
      onSuccess: (result) => {
        if (result?.id) onChange(result.id);
        setNewName('');
        closeAll();
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create pipeline.'),
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-lg font-bold text-slate-800 hover:text-indigo-600"
      >
        <span>Pipeline: {current?.name ?? '--'}</span>
        <i
          className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={closeAll} />
          <div className="absolute top-full mt-1 left-0 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 text-sm">
            {pipelines.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPipeline(p.id)}
                className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between ${
                  p.id === pipelineId ? 'text-indigo-600 font-semibold' : 'text-slate-700'
                }`}
              >
                {p.name}
                {p.id === pipelineId && <i className="fa-solid fa-check text-xs" />}
              </button>
            ))}

            {isAdmin && (
              <div className="border-t border-slate-100 mt-1 pt-1">
                {creating ? (
                  <div className="px-3 py-2 space-y-1.5">
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                      placeholder="Pipeline name..."
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {error && <p className="text-[10px] text-rose-600">{error}</p>}
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleCreate}
                        disabled={addPipeline.isPending || !newName.trim()}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold py-1 rounded"
                      >
                        {addPipeline.isPending ? 'Creating...' : 'Create'}
                      </button>
                      <button
                        onClick={() => {
                          setCreating(false);
                          setNewName('');
                          setError(null);
                        }}
                        className="flex-1 border border-slate-200 text-slate-600 text-xs font-medium py-1 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreating(true)}
                    className="w-full text-left px-3 py-2 text-indigo-600 hover:bg-indigo-50 font-medium flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-plus text-xs" />
                    Create New Pipeline
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
