import { useEffect, useMemo, useState } from 'react';
import { Opportunity, PipelineViewMode } from '../types/opportunity';
import {
  useMoveOpportunityStage,
  useOpportunities,
  usePipelines,
  useStages,
} from '../hooks/useOpportunities';
import PipelineStatsBar from '../components/pipeline/PipelineStatsBar';
import PipelineBoard from '../components/pipeline/PipelineBoard';
import PipelineListView from '../components/pipeline/PipelineListView';
import DealFormModal from '../components/pipeline/DealFormModal';
import DealDetailPanel from '../components/pipeline/DealDetailPanel';
import SearchToolbar from '../components/SearchToolbar';

export default function Pipeline() {
  const { data: pipelines = [] } = usePipelines();
  const [pipelineId, setPipelineId] = useState<number | undefined>();
  const [viewMode, setViewMode] = useState<PipelineViewMode>('board');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);

  // Default to the pipeline marked is_default, falling back to the first one
  // returned, once pipelines load.
  useEffect(() => {
    if (pipelineId || pipelines.length === 0) return;
    const def = pipelines.find((p) => p.is_default) ?? pipelines[0];
    setPipelineId(def.id);
  }, [pipelines, pipelineId]);

  const { data: stages = [] } = useStages(pipelineId);
  const { data: opportunities = [], isLoading } = useOpportunities(pipelineId);
  const moveStage = useMoveOpportunityStage(pipelineId);

  const visibleOpportunities = useMemo(() => {
    if (!search.trim()) return opportunities;
    const q = search.trim().toLowerCase();
    return opportunities.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.company_name?.toLowerCase().includes(q) ||
        o.contact_name?.toLowerCase().includes(q)
    );
  }, [opportunities, search]);

  function openAddModal() {
    setEditingOpportunity(null);
    setFormOpen(true);
  }

  function openEditModal(opportunity: Opportunity) {
    setActiveOpportunity(null);
    setEditingOpportunity(opportunity);
    setFormOpen(true);
  }

  function handleMoveStage(opportunityId: number, stageId: number) {
    moveStage.mutate({ id: opportunityId, stage_id: stageId });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 py-4 flex items-center justify-between shrink-0 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-800">Sales Pipeline</h1>
          {pipelines.length > 1 && (
            <select
              value={pipelineId ?? ''}
              onChange={(e) => setPipelineId(Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-600"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-sm transition-all"
        >
          <i className="fa-solid fa-plus text-xs" />
          <span>Add Deal</span>
        </button>
      </div>

      <PipelineStatsBar opportunities={opportunities} />

      <SearchToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search deals..."
        rightExtra={
          <div className="flex items-center gap-1 border border-slate-200 rounded-md p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('board')}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${
                viewMode === 'board' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500'
              }`}
            >
              <i className="fa-solid fa-table-columns text-[10px] mr-1" />
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${
                viewMode === 'list' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500'
              }`}
            >
              <i className="fa-solid fa-list text-[10px] mr-1" />
              List
            </button>
          </div>
        }
      />

      {viewMode === 'board' ? (
        <PipelineBoard
          stages={stages}
          opportunities={visibleOpportunities}
          onCardClick={setActiveOpportunity}
          onMoveStage={handleMoveStage}
        />
      ) : (
        <PipelineListView
          opportunities={visibleOpportunities}
          stages={stages}
          onRowClick={setActiveOpportunity}
          isLoading={isLoading}
        />
      )}

      {pipelineId && (
        <DealFormModal
          open={formOpen}
          opportunity={editingOpportunity}
          stages={stages}
          pipelineId={pipelineId}
          onClose={() => setFormOpen(false)}
        />
      )}

      {pipelineId && (
        <DealDetailPanel
          opportunity={activeOpportunity}
          stages={stages}
          pipelineId={pipelineId}
          onClose={() => setActiveOpportunity(null)}
          onEdit={openEditModal}
        />
      )}
    </div>
  );
}
