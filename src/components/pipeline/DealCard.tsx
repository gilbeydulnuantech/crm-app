import { useDraggable } from '@dnd-kit/core';
import { Opportunity } from '../../types/opportunity';
import { toTitleCase } from '../../utils/text';
import { DEFAULT_USER_COLOR, hexToRgba } from '../../utils/userColor';

interface Props {
  opportunity: Opportunity;
  onClick: () => void;
  canEdit: boolean;
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
    minimumFractionDigits: 2,
  }).format(n);
}

/**
 * Generates initials from a name (e.g., "Juan Smith" -> "JS")
 */
function initials(name?: string) {
  if (!name) return '--';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function DealCard({ opportunity, onClick, canEdit }: Props) {
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

  return (
    <div
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
      } ${isDragging ? 'opacity-40 ring-2 ring-indigo-400 border-transparent scale-105' : ''}`}
    >
      {/* Deal Name */}
      <div className="flex items-center gap-1.5">
        <div className="text-xs font-bold text-slate-800 truncate flex-1">{opportunity.name}</div>
        {!canEdit && (
          <i
            className="fa-solid fa-lock text-slate-300 text-[10px] shrink-0"
            title="Assigned to someone else"
          />
        )}
      </div>

      {/* Contact (always present) with Company as extra context when set */}
      <div className="text-[11px] text-slate-500 truncate">
        {toTitleCase(opportunity.contact_name) || 'No Contact'}
        {opportunity.company_name && ` · ${opportunity.company_name}`}
      </div>

      {/* Expected Close Date */}
      {opportunity.expected_close && (
        <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
          <i className="fa-regular fa-calendar text-[9px]" />
          {new Date(opportunity.expected_close).toLocaleDateString()}
        </div>
      )}

      {/* Footer: Value and Owner */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-50">
        <span className="text-xs font-bold text-emerald-600">
          {currency(opportunity.deal_value)}
        </span>
        
        <div
          title={opportunity.assigned_user_name || 'Unassigned'}
          style={ownerColor ? { backgroundColor: ownerColor } : undefined}
          className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-bold border border-white shadow-sm ${
            ownerColor ? 'text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {initials(opportunity.assigned_user_name)}
        </div>
      </div>
    </div>
  );
}