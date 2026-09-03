import { useState } from 'react';
import { Pipeline } from '../../types/opportunity';
import { NewPipelineResult } from '../../api/opportunities';
import { useDeletePipeline } from '../../hooks/useOpportunities';
import CreatePipelineModal from './CreatePipelineModal';
import EditPipelineModal from './EditPipelineModal';

interface Props {
  pipelines: Pipeline[];
  pipelineId: number | undefined;
  isAdmin: boolean;
  onChange: (id: number) => void;
  onCreated: (pipeline: NewPipelineResult) => void;
}

export default function PipelineSelector({ pipelines, pipelineId, isAdmin, onChange, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deletePipeline = useDeletePipeline();

  const current = pipelines.find((p) => p.id === pipelineId);

  function selectPipeline(id: number) {
    onChange(id);
    setOpen(false);
  }

  function handleDelete() {
    if (!current) return;
    setDeleteError(null);
    if (!confirm(`Delete pipeline "${current.name}"? This also deletes its stages and cannot be undone.`)) {
      return;
    }
    deletePipeline.mutate(current.id, {
      onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Failed to delete pipeline.'),
    });
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-lg font-bold text-slate-800 hover:text-[var(--theme-accent)]"
        >
          <span>Pipeline: {current?.name ?? '--'}</span>
          <i
            className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
        {isAdmin && current && (
          <>
            <button
              onClick={() => setEditOpen(true)}
              title="Edit pipeline"
              className="text-slate-300 hover:text-[var(--theme-accent)]"
            >
              <i className="fa-solid fa-pen text-xs" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deletePipeline.isPending}
              title="Delete pipeline"
              className="text-slate-300 hover:text-rose-600 disabled:opacity-50"
            >
              <i className="fa-solid fa-trash text-xs" />
            </button>
          </>
        )}
      </div>

      {deleteError && <p className="absolute top-full mt-1 text-xs text-rose-600 whitespace-nowrap">{deleteError}</p>}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 text-sm">
            {pipelines.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPipeline(p.id)}
                className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between ${
                  p.id === pipelineId ? 'text-[var(--theme-accent)] font-semibold' : 'text-slate-700'
                }`}
              >
                {p.name}
                {p.id === pipelineId && <i className="fa-solid fa-check text-xs" />}
              </button>
            ))}

            {isAdmin && (
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    setOpen(false);
                    setCreateOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-[var(--theme-accent)] hover:bg-[var(--theme-accent-tint)] font-medium flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-plus text-xs" />
                  Create New Pipeline
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <CreatePipelineModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(pipeline) => {
          onChange(pipeline.id);
          onCreated(pipeline);
        }}
      />

      <EditPipelineModal open={editOpen} pipeline={current ?? null} onClose={() => setEditOpen(false)} />
    </div>
  );
}
