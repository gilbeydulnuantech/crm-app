import { useEffect, useMemo, useState } from 'react';
import { VisibilityState } from '@tanstack/react-table';
import { useSearchParams } from 'react-router-dom';
import { Opportunity, PipelineViewMode } from '../types/opportunity';
import { NewPipelineResult } from '../api/opportunities';
import {
  useArchivedOpportunities,
  useArchiveOpportunities,
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
import PipelineStatsBar, { PipelineStatFilter } from '../components/pipeline/PipelineStatsBar';
import PipelineBoard, { PipelineBoardColumnsMenu } from '../components/pipeline/PipelineBoard';
import PipelineListView, { PipelineColumnsMenu } from '../components/pipeline/PipelineListView';
import PipelineSelector from '../components/pipeline/PipelineSelector';
import PipelineTabs, { PipelineTabView } from '../components/pipeline/PipelineTabs';
import ArchivedDealsList from '../components/pipeline/ArchivedDealsList';
import DealFormModal from '../components/pipeline/DealFormModal';
import DealQuickView from '../components/pipeline/DealQuickView';
import DealDetailModal from '../components/pipeline/DealDetailModal';
import AddDealNoteModal from '../components/pipeline/AddDealNoteModal';
import MarkLostModal, { MarkLostResult } from '../components/pipeline/MarkLostModal';
import TaskFormModal from '../components/tasks/TaskFormModal';
import SearchToolbar from '../components/SearchToolbar';

const CLOSED_LOST_STAGE = /lost/i;

function isDealOverdue(o: Opportunity): boolean {
  return o.status === 'Open' && !!o.expected_close && new Date(o.expected_close).getTime() < Date.now();
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [visibleStageIds, setVisibleStageIds] = useState<Set<number>>(new Set());
  const [stagesInitializedForPipeline, setStagesInitializedForPipeline] = useState<number | undefined>(undefined);
  const [view, setView] = useState<PipelineTabView>('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [quickViewDeal, setQuickViewDeal] = useState<Opportunity | null>(null);
  const [detailDeal, setDetailDeal] = useState<Opportunity | null>(null);
  const [highlightDealId, setHighlightDealId] = useState<number | null>(null);
  const [checkedUserIds, setCheckedUserIds] = useState<Set<number>>(new Set());
  const [usersInitialized, setUsersInitialized] = useState(false);
  const [tagFilters, setTagFilters] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [noteDeal, setNoteDeal] = useState<Opportunity | null>(null);
  const [taskDeal, setTaskDeal] = useState<Opportunity | null>(null);
  const [lostDeal, setLostDeal] = useState<Opportunity | null>(null);
  const [statFilter, setStatFilter] = useState<PipelineStatFilter | null>(null);

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
  const { data: archivedOpportunities = [], isLoading: isLoadingArchived } = useArchivedOpportunities(
    pipelineId,
    view === 'archived'
  );
  const { data: users = [] } = useUsers();
  const { data: tags = [] } = useTags();

  // Default to every stage visible once this pipeline's stages load — reset
  // whenever the pipeline itself changes (stage ids differ per pipeline),
  // not on every background refetch of the same pipeline's stages.
  useEffect(() => {
    if (stages.length > 0 && stagesInitializedForPipeline !== pipelineId) {
      setVisibleStageIds(new Set(stages.map((s) => s.id)));
      setStagesInitializedForPipeline(pipelineId);
    }
  }, [stages, pipelineId, stagesInitializedForPipeline]);

  // Default to everyone checked once the team list loads — "All Members"
  // means unrestricted, not "hide everyone until you opt in".
  useEffect(() => {
    if (!usersInitialized && users.length > 0) {
      setCheckedUserIds(new Set(users.map((u) => u.id)));
      setUsersInitialized(true);
    }
  }, [users, usersInitialized]);

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
  const archiveOpportunities = useArchiveOpportunities(pipelineId);
  const addLostDealNote = useAddNote('opportunity', lostDeal?.id ?? null);
  const addTask = useAddTask();

  // Same tabs model as Tasks: view narrows which records (All/Mine/Overdue/
  // Archived), checkedUserIds narrows which teammates on top of that, tags
  // narrow further still, and none of them are mutually exclusive.
  const visibleOpportunities = useMemo(() => {
    let list = view === 'archived' ? archivedOpportunities : opportunities;
    if (view === 'mine') list = list.filter((o) => o.assigned_user === user?.id);
    else if (view === 'overdue') list = list.filter(isDealOverdue);

    if (users.length > 0 && checkedUserIds.size < users.length) {
      list = list.filter((o) => o.assigned_user == null || checkedUserIds.has(o.assigned_user));
    }

    if (tagFilters.size > 0) {
      list = list.filter((o) => {
        // Matches whatever tag pills the card actually shows — DealCard
        // renders the deal's own tags AND the linked contact's tags
        // together (see its `allTags` merge), so filtering on o.tags alone
        // missed any deal whose only visible match came from the contact.
        const dealTagIds = new Set([...(o.tags ?? []), ...(o.contact_tags ?? [])].map((t) => t.id));
        return [...tagFilters].some((id) => dealTagIds.has(id));
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.company_name?.toLowerCase().includes(q) ||
          o.contact_name?.toLowerCase().includes(q)
      );
    }

    if (statFilter) {
      const now = new Date();
      const isThisMonth = (dateStr?: string | null) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      };
      if (statFilter === 'open') list = list.filter((o) => o.status === 'Open');
      else if (statFilter === 'wonMTD') list = list.filter((o) => o.status === 'Won' && isThisMonth(o.closed_at));
      else if (statFilter === 'lostMTD') list = list.filter((o) => o.status === 'Lost' && isThisMonth(o.closed_at));
    }

    return list;
  }, [opportunities, archivedOpportunities, view, user, users, checkedUserIds, tagFilters, search, statFilter]);

  function selectStatFilter(filter: PipelineStatFilter) {
    setStatFilter((prev) => (prev === filter ? null : filter));
  }

  function toggleUser(id: number) {
    setCheckedUserIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllUsers() {
    setCheckedUserIds((prev) =>
      users.length > 0 && users.every((u) => prev.has(u.id)) ? new Set() : new Set(users.map((u) => u.id))
    );
  }

  function toggleTag(id: number) {
    setTagFilters((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleStageColumn(stageId: number) {
    setVisibleStageIds((prev) => {
      const next = new Set(prev);
      next.has(stageId) ? next.delete(stageId) : next.add(stageId);
      return next;
    });
  }

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

  // Server-side guarded too (archive-opportunities rejects status='Open') —
  // archiving clears closed deals off the active board, not deals still in
  // progress that a rep might still need to act on.
  function handleArchive(opportunity: Opportunity) {
    if (opportunity.status === 'Open') {
      setToast('Only Closed Won or Closed Lost deals can be archived.');
      return;
    }
    archiveOpportunities.mutate([opportunity.id], {
      onSuccess: () => setToast(`"${opportunity.name}" archived.`),
      onError: () => setToast('Failed to archive deal.'),
    });
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
          <PipelineStatsBar opportunities={opportunities} activeFilter={statFilter} onSelect={selectStatFilter} />
        </div>
        <button
          onClick={openAddModal}
          className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-sm transition-all shrink-0"
        >
          <i className="fa-solid fa-plus text-xs" />
          <span>Add Deal</span>
        </button>
      </div>

      <PipelineTabs
        view={view}
        onChange={setView}
        users={users}
        currentUserId={user?.id}
        checkedUserIds={checkedUserIds}
        onToggleUser={toggleUser}
        onToggleAllUsers={toggleAllUsers}
        tags={tags}
        tagFilters={tagFilters}
        onToggleTag={toggleTag}
      />

      <SearchToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search deals..."
        endExtra={
          <div className="flex items-center gap-2">
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
            {view !== 'archived' &&
              (viewMode === 'list' ? (
                <PipelineColumnsMenu
                  visibility={columnVisibility}
                  onToggle={(id) => setColumnVisibility((v) => ({ ...v, [id]: v[id] === false }))}
                />
              ) : (
                <PipelineBoardColumnsMenu
                  stages={stages}
                  visibleStageIds={visibleStageIds}
                  onToggle={toggleStageColumn}
                />
              ))}
          </div>
        }
      />

      {view === 'archived' ? (
        <ArchivedDealsList deals={visibleOpportunities} isLoading={isLoadingArchived} pipelineId={pipelineId} />
      ) : viewMode === 'board' ? (
        <PipelineBoard
          stages={stages}
          visibleStageIds={visibleStageIds}
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
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
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
        stages={stages}
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
        onMoveStage={handleMoveStage}
        onArchive={(deal) => {
          setDetailDeal(null);
          handleArchive(deal);
        }}
        onDelete={(deal) => {
          setDetailDeal(null);
          handleDelete(deal);
        }}
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
