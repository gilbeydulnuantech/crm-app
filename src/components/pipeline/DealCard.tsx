import { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Opportunity, Stage } from '../../types/opportunity';
import { toTitleCase } from '../../utils/text';
import { DEFAULT_USER_COLOR, hexToRgba } from '../../utils/userColor';
import { getTagColorClasses } from '../../utils/tagColors';
import { useTasks } from '../../hooks/useTasks';
import OwnerBadge from '../OwnerBadge';
import DealCardMenu from './DealCardMenu';
import WinScoreBadge from './WinScoreBadge';

interface Props {
  opportunity: Opportunity;
  stages: Stage[];
  onClick: () => void;
  onViewDetails: () => void;
  onEdit: () => void;
  onAddNote: () => void;
  onCreateTask: () => void;
  onCreateProposal: () => void;
  onCreateContract: () => void;
  onMoveStage: (stageId: number) => void;
  onMarkWon: () => void;
  onMarkLost: () => void;
  onArchive: () => void;
  onDelete: () => void;
  canEdit: boolean;
  isAdmin: boolean;
  highlighted?: boolean;
}

function currency(val?: number | string | null) {
  if (val === undefined || val === null || val === '') return '--';

  const n = Number(val);
  if (isNaN(n)) return '--';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(n);
}

export default function DealCard({
  opportunity,
  stages,
  onClick,
  onViewDetails,
  onEdit,
  onAddNote,
  onCreateTask,
  onCreateProposal,
  onCreateContract,
  onMoveStage,
  onMarkWon,
  onMarkLost,
  onArchive,
  onDelete,
  canEdit,
  isAdmin,
  highlighted,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
    data: { opportunity },
    disabled: !canEdit,
  });

  // The card's background/left border/owner badge are the assigned owner's
  // color — same picker/palette as the Calendar and Tasks sidebars, so a
  // deal's owner is recognizable at a glance without reading the badge's
  // initials. A light tint (not the full color) keeps card text readable.
  const ownerColor = opportunity.assigned_user
    ? opportunity.assigned_user_color || DEFAULT_USER_COLOR
    : undefined;

  const style = {
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined),
    backgroundColor: ownerColor ? hexToRgba(ownerColor, 0.14) : undefined,
    borderLeftWidth: '3px',
    borderLeftColor: ownerColor || '#E2E8F0',
  };

  const allTags = [...(opportunity.tags ?? []), ...(opportunity.contact_tags ?? [])];

  // Reads from the same ['tasks'] cache every other task view already
  // populates (activities table, type='task') — no extra network round trip
  // per card. An open deal with no scheduled activity is easy to lose track
  // of, so this surfaces that at a glance instead of only inside Deal Quick
  // View's "Next Activity" line.
  const { data: allTasks = [] } = useTasks();
  const dealTasks = useMemo(
    () => allTasks.filter((t) => t.opportunity_id === opportunity.id && !t.is_completed),
    [allTasks, opportunity.id]
  );
  const activityStatus = useMemo(() => {
    const now = Date.now();
    const isFuture = (dueAt?: string | null) => !!dueAt && new Date(dueAt).getTime() >= now;
    const isPast = (dueAt?: string | null) => !!dueAt && new Date(dueAt).getTime() < now;

    if (dealTasks.some((t) => isPast(t.due_at))) return { icon: '🔴', label: 'Overdue Task' };
    if (dealTasks.some((t) => t.task_type === 'Meeting' && isFuture(t.due_at))) {
      return { icon: '🟢', label: 'Upcoming Meeting' };
    }
    if (dealTasks.some((t) => isFuture(t.due_at))) return { icon: '🔵', label: 'Upcoming Task' };
    return { icon: '⚪', label: 'No Activity Scheduled' };
  }, [dealTasks]);

  return (
    <div
      id={`deal-card-${opportunity.id}`}
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Prevent click if we were dragging
        if (transform && (Math.abs(transform.x) > 5 || Math.abs(transform.y) > 5)) return;
        onClick();
      }}
      className={`${ownerColor ? '' : 'bg-white'} border border-slate-200 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all ${
        canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${isDragging ? 'opacity-40 ring-2 ring-[var(--theme-accent)] border-transparent scale-105' : ''} ${
        highlighted ? 'ring-2 ring-[var(--theme-accent)] ring-offset-2 shadow-lg' : ''
      }`}
    >
      {/* Deal Name + Value */}
      <div className="flex items-center gap-1.5">
        <div className="text-xs font-bold text-slate-800 truncate flex-1">
          {toTitleCase(opportunity.name)} <span className="font-semibold text-emerald-600">- {currency(opportunity.deal_value)}</span>
        </div>
        {opportunity.status === 'Open' && (
          <WinScoreBadge score={opportunity.win_score} reason={opportunity.win_score_reason} size="xs" />
        )}
        {opportunity.status === 'Won' && (
          <span
            className="shrink-0 bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
            title="Closed Won"
          >
            Closed Won
          </span>
        )}
        {opportunity.status === 'Lost' && (
          <span
            className="shrink-0 bg-rose-100 text-rose-700 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
            title={opportunity.lost_reason ? `Closed Lost — ${opportunity.lost_reason}` : 'Closed Lost'}
          >
            Closed Lost
          </span>
        )}
        {!canEdit && (
          <i
            className="fa-solid fa-lock text-slate-300 text-[10px] shrink-0"
            title="Assigned to someone else"
          />
        )}
        <DealCardMenu
          opportunity={opportunity}
          stages={stages}
          canEdit={canEdit}
          isAdmin={isAdmin}
          onViewDetails={onViewDetails}
          onEdit={onEdit}
          onAddNote={onAddNote}
          onCreateTask={onCreateTask}
          onCreateProposal={onCreateProposal}
          onCreateContract={onCreateContract}
          onMoveStage={onMoveStage}
          onMarkWon={onMarkWon}
          onMarkLost={onMarkLost}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      </div>

      {/* Contact - Company */}
      <div className="text-[11px] text-slate-500 truncate mt-0.5">
        {toTitleCase(opportunity.contact_name) || 'No Contact'}
        {opportunity.company_name && ` - ${toTitleCase(opportunity.company_name)}`}
      </div>

      {/* Tags (deal's own tags, plus the contact's own tags for context) —
          only the first 2 show, the rest collapse into a "+N" badge so a
          heavily-tagged deal doesn't blow out the card's height. */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {allTags.slice(0, 2).map((t) => (
            <span
              key={t.id}
              className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full ${getTagColorClasses(t.name)}`}
            >
              {t.name}
            </span>
          ))}
          {allTags.length > 2 && (
            <span
              className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-slate-100 text-slate-500"
              title={allTags.slice(2).map((t) => t.name).join(', ')}
            >
              +{allTags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Footer: Owner, then Expected Close Date underneath, then a mini
          activity-status indicator — an open deal with nothing scheduled
          is easy to let go stale, so this stays visible without opening
          the card. */}
      <div className="mt-2.5 pt-2 border-t border-slate-50 space-y-1">
        <OwnerBadge
          name={opportunity.assigned_user_name}
          color={opportunity.assigned_user_color}
          avatarUrl={opportunity.assigned_user_avatar_url}
          size="xs"
          className="max-w-full"
        />

        <div className="flex items-center justify-between gap-2">
          {opportunity.expected_close ? (
            <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
              <i className="fa-regular fa-calendar text-[9px]" />
              {new Date(opportunity.expected_close).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}
            </span>
          ) : (
            <span />
          )}

          {opportunity.status === 'Open' && (
            <span
              className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0"
              title={activityStatus.label}
            >
              <span>{activityStatus.icon}</span>
              <span className="truncate">{activityStatus.label}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
