import { Opportunity, Stage } from '../../types/opportunity';
import { toTitleCase } from '../../utils/text';
import { DEFAULT_USER_COLOR, hexToRgba } from '../../utils/userColor';

interface Props {
  deals: Opportunity[];
  stagesById: Map<number, Stage>;
  onDealClick: (deal: Opportunity) => void;
  emptyLabel?: string;
}

function currency(n?: number | null) {
  if (n === undefined || n === null) return '--';
  return `$${n.toLocaleString()}`;
}

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-800',
  Won: 'bg-emerald-100 text-emerald-800',
  Lost: 'bg-rose-100 text-rose-700',
};

export default function DealListView({ deals, stagesById, onDealClick, emptyLabel = 'No deals.' }: Props) {
  const sorted = [...deals].sort(
    (a, b) => new Date(a.expected_close!).getTime() - new Date(b.expected_close!).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">{emptyLabel}</div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 space-y-2">
      {sorted.map((d) => {
        const ownerColor = d.assigned_user ? d.assigned_user_color || DEFAULT_USER_COLOR : undefined;
        return (
        <div
          key={d.id}
          onClick={() => onDealClick(d)}
          className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-slate-50"
          style={
            ownerColor
              ? { backgroundColor: hexToRgba(ownerColor, 0.08), borderLeft: `3px solid ${ownerColor}` }
              : undefined
          }
        >
          <div className="w-20 shrink-0 text-xs text-slate-500">
            {new Date(d.expected_close!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate">{d.name}</div>
            {(d.company_name || d.contact_name) && (
              <div className="text-xs text-slate-400 truncate">
                {d.company_name || toTitleCase(d.contact_name)}
              </div>
            )}
          </div>
          {/* Pipeline stage shown above the deal value, matching the Pipeline board's card. */}
          <div className="shrink-0 text-right space-y-0.5">
            <div className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--theme-accent-tint)] text-[var(--theme-accent-hover)]">
              {stagesById.get(d.stage_id)?.name ?? '--'}
            </div>
            <div className="text-sm font-bold text-emerald-600">{currency(d.deal_value)}</div>
          </div>
          <span
            className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              STATUS_COLORS[d.status] ?? 'bg-slate-100 text-slate-800'
            }`}
          >
            {d.status}
          </span>
        </div>
        );
      })}
    </div>
  );
}
