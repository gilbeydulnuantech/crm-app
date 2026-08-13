import { useDraggable } from '@dnd-kit/core';
import { Opportunity, Stage } from '../../types/opportunity';
import { toTitleCase } from '../../utils/text';
import { DEFAULT_USER_COLOR, hexToRgba } from '../../utils/userColor';
import { getTagColorClasses } from '../../utils/tagColors';
import DealCardMenu from './DealCardMenu';

interface Props {
  opportunity: Opportunity;
  stages: Stage[];
  onClick: () => void;
  onEdit: () => void;
  onAddNote: () => void;
  onCreateTask: () => void;
  onMoveStage: (stageId: number) => void;
  onMarkWon: () => void;
  onMarkLost: () => void;
  onArchive: () => void;
  onDelete: () => void;
  canEdit: boolean;
  isAdmin: boolean;
  highlighted?: boolean;
}

/**
 * Formats values to USD currency.
 * Fixes the "0800" bug by casting to Number and using Intl.NumberFormat.
 */
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
  onEdit,
  onAddNote,
  onCreateTask,
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
      } ${isDragging ? 'opacity-40 ring-2 ring-indigo-400 border-transparent scale-105' : ''} ${
        highlighted ? 'ring-2 ring-indigo-500 ring-offset-2 shadow-lg' : ''
      }`}
    >
      {/* Deal Name + Value */}
      <div className="flex items-center gap-1.5">
        <div className="text-xs font-bold text-slate-800 truncate flex-1">
          {opportunity.name} <span className="font-semibold text-emerald-600">- {currency(opportunity.deal_value)}</span>
        </div>
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
          onViewDetails={onClick}
          onEdit={onEdit}
          onAddNote={onAddNote}
          onCreateTask={onCreateTask}
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
        {opportunity.company_name && ` - ${opportunity.company_name}`}
      </div>

      {/* Tags (deal's own tags, plus the contact's own tags for context) */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {allTags.map((t) => (
            <span
              key={t.id}
              className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full ${getTagColorClasses(t.name)}`}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Owner and Expected Close Date */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-50">
        <span
          style={ownerColor ? { backgroundColor: hexToRgba(ownerColor, 0.18), color: ownerColor } : undefined}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold truncate max-w-[70%] ${
            ownerColor ? '' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <i className="fa-solid fa-user text-[9px]" />
          <span className="truncate">{opportunity.assigned_user_name ? toTitleCase(opportunity.assigned_user_name) : 'Unassigned'}</span>
        </span>

        {opportunity.expected_close && (
          <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
            <i className="fa-regular fa-calendar text-[9px]" />
            {new Date(opportunity.expected_close).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
