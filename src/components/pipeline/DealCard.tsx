/*
import { useDraggable } from '@dnd-kit/core';
import { Opportunity } from '../../types/opportunity';

interface Props {
  opportunity: Opportunity;
  onClick: () => void;
}

function currency(n?: number | null) {
  if (n === undefined || n === null) return '--';
  return `$${n.toLocaleString()}`;
}

function initials(name?: string) {
  if (!name) return '--';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function DealCard({ opportunity, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
    data: { opportunity },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="text-xs font-semibold text-slate-800">{opportunity.name}</div>
      <div className="text-[11px] text-slate-500">
        {opportunity.company_name || opportunity.contact_name || 'No Company'}
      </div>
      {opportunity.expected_close && (
        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
          <i className="fa-regular fa-calendar" />
          {new Date(opportunity.expected_close).toLocaleDateString()}
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs font-bold text-emerald-600">
          {currency(opportunity.deal_value)}
        </span>
        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[9px] flex items-center justify-center font-semibold">
          {initials(opportunity.assigned_user_name)}
        </span>
      </div>
    </div>
  );
}
*/

import { useDraggable } from '@dnd-kit/core';
import { Opportunity } from '../../types/opportunity';
import { toTitleCase } from '../../utils/text';

interface Props {
  opportunity: Opportunity;
  onClick: () => void;
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

export default function DealCard({ opportunity, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
    data: { opportunity },
  });

  // Apply dnd-kit transform styles
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

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
      className={`bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-40 ring-2 ring-indigo-400 border-transparent scale-105' : ''
      }`}
    >
      {/* Deal Name */}
      <div className="text-xs font-bold text-slate-800 truncate">
        {opportunity.name}
      </div>

      {/* Company/Contact Name */}
      <div className="text-[11px] text-slate-500 truncate">
        {opportunity.company_name || toTitleCase(opportunity.contact_name) || 'No Company'}
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
          className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[9px] flex items-center justify-center font-bold border border-white shadow-sm"
        >
          {initials(opportunity.assigned_user_name)}
        </div>
      </div>
    </div>
  );
}