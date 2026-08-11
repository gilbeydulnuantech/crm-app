import { ReactNode } from 'react';
import { Opportunity, Stage } from '../../types/opportunity';
import { toTitleCase } from '../../utils/text';

interface Props {
  deal: Opportunity | null;
  stagesById: Map<number, Stage>;
  onClose: () => void;
  onEdit: (deal: Opportunity) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-800',
  Won: 'bg-emerald-100 text-emerald-800',
  Lost: 'bg-rose-100 text-rose-700',
};

function currency(n?: number | null) {
  if (n === undefined || n === null) return '--';
  return `$${n.toLocaleString()}`;
}

function Row({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <i className={`fa-solid ${icon} text-slate-400 w-4 text-center text-xs shrink-0`} />
      <span className="truncate">{children}</span>
    </div>
  );
}

export default function DealQuickView({ deal, stagesById, onClose, onEdit }: Props) {
  if (!deal) return null;

  const closeLabel = deal.expected_close
    ? new Date(deal.expected_close).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 z-[95] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0 pr-2">
            <h3 className="text-base font-bold text-slate-800 truncate">{deal.name}</h3>
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${
                STATUS_COLORS[deal.status] ?? 'bg-slate-100 text-slate-800'
              }`}
            >
              {deal.status}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="space-y-2.5 text-sm text-slate-700">
          {closeLabel && <Row icon="fa-calendar">Expected close {closeLabel}</Row>}
          {deal.contact_name && <Row icon="fa-user">{toTitleCase(deal.contact_name)}</Row>}
          {deal.company_name && <Row icon="fa-building">{deal.company_name}</Row>}
          <Row icon="fa-layer-group">{stagesById.get(deal.stage_id)?.name ?? '--'}</Row>
          <Row icon="fa-sack-dollar">{currency(deal.deal_value)}</Row>
          {deal.assigned_user_name && <Row icon="fa-user-tie">{toTitleCase(deal.assigned_user_name)}</Row>}
        </div>

        <button
          onClick={() => onEdit(deal)}
          className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
