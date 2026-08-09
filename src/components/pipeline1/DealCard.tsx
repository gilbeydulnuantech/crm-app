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
