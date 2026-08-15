import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Opportunity, PipelineViewMode } from '../types/opportunity';
import { NewPipelineResult } from '../api/opportunities';
import {
  useDeleteOpportunities,
  useMoveOpportunityStage,
  useOpportunities,
  usePipelines,
  useStages,
  useUpdateOpportunity,
} from '../hooks/useOpportunities';
import { useTags, useUsers } from '../hooks/useContacts';
import { useAddNote } from '../hooks/useNotes';
import { useAddTask } from '../hooks/useTasks';
import { useAuth } from '../context/AuthContext';
import PipelineStatsBar from '../components/pipeline/PipelineStatsBar';
import PipelineBoard from '../components/pipeline/PipelineBoard';
import PipelineListView from '../components/pipeline/PipelineListView';
import PipelineSelector from '../components/pipeline/PipelineSelector';
import PipelineFilterPanel, {
  countActiveDealFilters,
  DealFilters,
  EMPTY_DEAL_FILTERS,
} from '../components/pipeline/PipelineFilterPanel';
import DealFormModal from '../components/pipeline/DealFormModal';
import DealQuickView from '../components/pipeline/DealQuickView';
import DealDetailModal from '../components/pipeline/DealDetailModal';
import AddDealNoteModal from '../components/pipeline/AddDealNoteModal';
import MarkLostModal, { MarkLostResult } from '../components/pipeline/MarkLostModal';
import TaskFormModal from '../components/tasks/TaskFormModal';
import SearchToolbar from '../components/SearchToolbar';

const CLOSED_LOST_STAGE = /lost/i;

function dateRangeForPreset(filters: DealFilters): [Date, Date] | null {
  const now = new Date();
  switch (filters.datePreset) {
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return [start, end];
    }
    case 'next_30': {
      const end = new Date(now);
      end.setDate(now.getDate() + 30);
      return [now, end];
    }
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      const end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59);
      return [start, end];
    }
    case 'custom': {
      if (!filters.customStart && !filters.customEnd) return null;
      const start = filters.customStart ? new Date(filters.customStart) : new Date(0);
      const end = filters.customEnd ? new Date(filters.customEnd + 'T23:59:59') : new Date(8640000000000000);
      return [start, end];
    }
    default:
      return null;
  }
}

function matchesDealFilters(o: Opportunity, filters: DealFilters, currentUserId?: number): boolean {
  if (filters.owner === 'mine' && o.assigned_user !== currentUserId) return false;
  if (filters.owner === 'unassigned' && o.assigned_user) return false;
  if (!['all', 'mine', 'unassigned'].includes(filters.owner) && String(o.assigned_user ?? '') !== filters.owner) {
    return false;
  }

  const range = dateRangeForPreset(filters);
  if (range) {
    if (!o.expected_close) return false;
    const closeDate = new Date(o.expected_close);
    if (closeDate < range[0] || closeDate > range[1]) return false;
  }

  const min = filters.minValue ? Number(filters.minValue) : null;
  const max = filters.maxValue ? Number(filters.maxValue) : null;
  if (min !== null || max !== null) {
    if (o.deal_value == null) return false;
    if (min !== null && o.deal_value < min) return false;
    if (max !== null && o.deal_value > max) return false;
  }

  if (filters.tagIds.length > 0) {
    const dealTagIds = new Set((o.tags ?? []).map((t) => t.id));
    if (!filters.tagIds.some((id) => dealTagIds.has(id))) return false;
  }

  return true;
}

export default function Pipeline() {
  const { user, isAdmin } = useAuth();
  const { data: pipelines = [] } = usePipelines();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPipelineId = searchParams.get('pipeline');
  const [pipelineId, setPipelineIdState] = useState<number | undefined>(
    urlPipelineId ? Number(urlPipelineId) : undefined
  );
  const [viewMode, setViewMode] = useState<PipelineViewMode>('board');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [quickViewDeal, setQuickViewDeal] = useState<Opportunity | null>(null);
  const [detailDeal, setDetailDeal] = useState<Opportunity | null>(null);
  const [highlightDealId, setHighlightDealId] = useState<number | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<DealFilters>(EMPTY_DEAL_FILTERS);
  const [toast, setToast] = useState<string | null>(null);
  const [noteDeal, setNoteDeal] = useState<Opportunity | null>(null);
  const [taskDeal, setTaskDeal] = useState<Opportunity | null>(null);
  const [lostDeal, setLostDeal] = useState<Opportunity | null>(null);

  // Keeps ?pipeline= in sync so the current board is bookmarkable/refreshable.
  function setPipelineId(id: number) {
    setPipelineIdState(id);
    const next = new URLSearchParams(searchParams);
    next.set('pipeline', String(id));
    setSearchParams(next, { replace: true });
  }

  // Default to the pipeline marked is_default, falling back to the first one
  // returned — also self-corrects a stale/invalid ?pipeline= id once the
  // real pipeline list has loaded.
  useEffect(() => {
    if (pipelines.length === 0) return;
    if (pipelineId && pipelines.some((p) => p.id === pipelineId)) return;
    const def = pipelines.find((p) => p.is_default) ?? pipelines[0];
    setPipelineId(def.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelines, pipelineId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const { data: stages = [] } = useStages(pipelineId);
  const stagesById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);
  const { data: opportunities = [], isLoading } = useOpportunities(pipelineId);
  const { data: users = [] } = useUsers();
  const { data: tags = [] } = useTags();

  // Deep link from Task/Contact/Company quick views — ?pipeline=<id> already
  // switches to the right board (handled above); ?highlight=<dealId> then
  // scrolls that specific card into view and rings it for a few seconds,
  // once its data has loaded. Deliberately doesn't open any panel — see the
  // ?deal= removal history for why auto-opening a panel here was undesired.
  useEffect(() => {
    const param = searchParams.get('highlight');
    if (!param) return;
    const id = Number(param);
    if (!opportunities.some((o) => o.id === id)) return;
    setHighlightDealId(id);
    const next = new URLSearchParams(searchParams);
    next.delete('highlight');
    setSearchParams(next, { replace: true });
  }, [searchParams, opportunities, setSearchParams]);

  useEffect(() => {
    if (highlightDealId == null) return;
    document
      .getElementById(`deal-card-${highlightDealId}`)
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    const t = setTimeout(() => setHighlightDealId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightDealId]);

  const moveStage = useMoveOpportunityStage(pipelineId);
  const updateOpportunity = useUpdateOpportunity(pipelineId);
  const deleteOpportunities = useDeleteOpportunities(pipelineId);
  const addLostDealNote = useAddNote('opportunity', lostDeal?.id ?? null);
  const addTask = useAddTask();

  const visibleOpportunities = useMemo(() => {
    let list = opportunities;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.company_name?.toLowerCase().includes(q) ||
          o.contact_name?.toLowerCase().includes(q)
      );
    }

    return list.filter((o) => matchesDealFilters(o, filters, user?.id));
  }, [opportunities, search, filters, user]);

  const activeFilterCount = countActiveDealFilters(filters);

  function openAddModal() {
    setEditingOpportunity(null);
    setFormOpen(true);
  }

  function openEditModal(opportunity: Opportunity) {
    setEditingOpportunity(opportunity);
    setFormOpen(true);
  }

  function handleMoveStage(opportunityId: number, stageId: number) {
    moveStage.mutate({ id: opportunityId, stage_id: stageId });
  }

  function handleMarkWon(opportunity: Opportunity) {
    updateOpportunity.mutate({
      id: opportunity.id,
      payload: { status: 'Won', closed_at: new Date().toISOString() },
    });
  }

  function handleConfirmMarkLost({ reason, competitor, details, followUp }: MarkLostResult) {
    if (!lostDeal) return;

    // Best-effort — only re-homes the deal onto a "Closed Lost"-ish stage if
    // its pipeline actually has one; status/probability are authoritative
    // either way.
    const lostStage = stages.find((s) => CLOSED_LOST_STAGE.test(s.name));

    updateOpportunity.mutate({
      id: lostDeal.id,
      payload: {
        status: 'Lost',
        closed_at: new Date().toISOString(),
        lost_reason: reason,
        probability: 0,
        ...(lostStage ? { stage_id: lostStage.id } : {}),
      },
    });

    const noteBody = [competitor && `Competitor: ${competitor}`, details].filter(Boolean).join('\n');
    if (noteBody) {
      addLostDealNote.mutate({ body: noteBody, requesterId: user?.id });
    }

    if (followUp) {
      addTask.mutate({
        subject: `Re-engage: ${lostDeal.name}`,
        contact_id: lostDeal.contact_id,
        opportunity_id: lostDeal.id,
        user_id: followUp.assignedUserId,
        due_at: new Date(`${followUp.date}T09:00`).toISOString(),
        task_type: 'Follow-up',
      });
    }

    setLostDeal(null);
  }

  function handleArchive(opportunity: Opportunity) {
    setToast(`Archiving "${opportunity.name}" isn't available yet.`);
  }

  function handleDelete(opportunity: Opportunity) {
    if (!confirm(`Delete "${opportunity.name}"? This cannot be undone.`)) return;
    deleteOpportunities.mutate([opportunity.id]);
  }

  // View All, Edit Owned Only: standard users can see every deal but only
  // edit/delete/move-stage/mark-won-lost the ones assigned to them. Admins
  // can act on anything. Backend enforces this too (Pipeline.json).
  function canEditDeal(opportunity: Opportunity) {
    return isAdmin || opportunity.assigned_user === user?.id;
  }

  function handlePipelineCreated(pipeline: NewPipelineResult) {
    setToast(`Pipeline "${pipeline.name}" created successfully.`);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-4 shrink-0 border-b border-slate-200">
        <PipelineSelector
          pipelines={pipelines}
          pipelineId={pipelineId}
          isAdmin={isAdmin}
          onChange={setPipelineId}
          onCreated={handlePipelineCreated}
        />
        <div className="flex-1 flex justify-center min-w-0">
          <PipelineStatsBar opportunities={opportunities} />
        </div>
        <button
          onClick={openAddModal}
          className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-sm transition-all shrink-0"
        >
          <i className="fa-solid fa-plus text-xs" />
          <span>Add Deal</span>
        </button>
      </div>

      <SearchToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search deals..."
        rightExtra={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterPanelOpen(true)}
              className="relative flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 py-1.5 px-2.5 border border-slate-200 rounded-md bg-white transition-colors"
            >
              <i className="fa-solid fa-filter text-[10px]" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[9px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

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
          </div>
        }
      />

      {viewMode === 'board' ? (
        <PipelineBoard
          stages={stages}
          opportunities={visibleOpportunities}
          onCardClick={setQuickViewDeal}
          onViewDetails={setDetailDeal}
          onMoveStage={handleMoveStage}
          onEditDeal={openEditModal}
          onAddNote={setNoteDeal}
          onCreateTask={setTaskDeal}
          onMarkWon={handleMarkWon}
          onMarkLost={setLostDeal}
          onArchive={handleArchive}
          onDelete={handleDelete}
          canEditDeal={canEditDeal}
          isAdmin={isAdmin}
          highlightDealId={highlightDealId}
        />
      ) : (
        <PipelineListView
          opportunities={visibleOpportunities}
          stages={stages}
          onRowClick={setQuickViewDeal}
          isLoading={isLoading}
        />
      )}

      {pipelineId && (
        <DealFormModal
          open={formOpen}
          opportunity={editingOpportunity}
          pipelineId={pipelineId}
          onClose={() => setFormOpen(false)}
        />
      )}

      <DealQuickView
        deal={quickViewDeal}
        stages={stages}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        onClose={() => setQuickViewDeal(null)}
        onEdit={(deal) => {
          setQuickViewDeal(null);
          openEditModal(deal);
        }}
        onMarkWon={handleMarkWon}
        onMarkLost={(deal) => {
          setQuickViewDeal(null);
          setLostDeal(deal);
        }}
        onOpenFullDetails={(deal) => {
          setQuickViewDeal(null);
          setDetailDeal(deal);
        }}
      />

      <DealDetailModal
        deal={detailDeal}
        stagesById={stagesById}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        onClose={() => setDetailDeal(null)}
        onEdit={(deal) => {
          setDetailDeal(null);
          openEditModal(deal);
        }}
        onMarkWon={handleMarkWon}
        onMarkLost={(deal) => {
          setDetailDeal(null);
          setLostDeal(deal);
        }}
      />

      <PipelineFilterPanel
        open={filterPanelOpen}
        value={filters}
        users={users}
        tags={tags}
        onChange={setFilters}
        onClose={() => setFilterPanelOpen(false)}
      />

      {noteDeal && (
        <AddDealNoteModal opportunityId={noteDeal.id} dealName={noteDeal.name} onClose={() => setNoteDeal(null)} />
      )}

      <TaskFormModal
        open={!!taskDeal}
        defaultOpportunity={taskDeal}
        onClose={() => setTaskDeal(null)}
      />

      <MarkLostModal
        open={!!lostDeal}
        dealName={lostDeal?.name}
        dealValue={lostDeal?.deal_value}
        onConfirm={handleConfirmMarkLost}
        onCancel={() => setLostDeal(null)}
        isSubmitting={updateOpportunity.isPending}
      />

      {toast && (
        <div className="fixed bottom-4 right-4 z-[200] bg-slate-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in">
          <i className="fa-solid fa-circle-check text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
