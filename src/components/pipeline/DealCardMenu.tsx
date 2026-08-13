import { useEffect, useRef, useState } from 'react';
import { Opportunity, Stage } from '../../types/opportunity';

interface Props {
  opportunity: Opportunity;
  stages: Stage[];
  canEdit: boolean;
  isAdmin: boolean;
  onViewDetails: () => void;
  onEdit: () => void;
  onAddNote: () => void;
  onCreateTask: () => void;
  onMoveStage: (stageId: number) => void;
  onMarkWon: () => void;
  onMarkLost: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-left hover:bg-slate-50 ${
        danger ? 'text-rose-600' : 'text-slate-700'
      }`}
    >
      <i className={`fa-solid ${icon} w-3.5 text-[11px]`} />
      {label}
    </button>
  );
}

export default function DealCardMenu({
  opportunity,
  stages,
  canEdit,
  isAdmin,
  onViewDetails,
  onEdit,
  onAddNote,
  onCreateTask,
  onMoveStage,
  onMarkWon,
  onMarkLost,
  onArchive,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [stageSubmenuOpen, setStageSubmenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setStageSubmenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function close() {
    setOpen(false);
    setStageSubmenuOpen(false);
  }

  function run(fn: () => void) {
    close();
    fn();
  }

  const sortedStages = stages.slice().sort((a, b) => a.display_order - b.display_order);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
      >
        <i className="fa-solid fa-ellipsis-vertical text-[11px]" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-6 z-[60] w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1"
        >
          <MenuItem icon="fa-eye" label="View Details" onClick={() => run(onViewDetails)} />

          {canEdit && (
            <>
              <MenuItem icon="fa-pen" label="Edit Deal" onClick={() => run(onEdit)} />
              <MenuItem icon="fa-note-sticky" label="Add Note" onClick={() => run(onAddNote)} />
              <MenuItem icon="fa-list-check" label="Create Task" onClick={() => run(onCreateTask)} />

              <div
                className="relative"
                onMouseEnter={() => setStageSubmenuOpen(true)}
                onMouseLeave={() => setStageSubmenuOpen(false)}
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium text-left text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-arrow-right-arrow-left w-3.5 text-[11px]" />
                    Move to Stage
                  </span>
                  <i className="fa-solid fa-chevron-right text-[9px] text-slate-400" />
                </button>
                {stageSubmenuOpen && (
                  <div className="absolute left-full top-0 -ml-px w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 max-h-56 overflow-y-auto">
                    {sortedStages.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        disabled={s.id === opportunity.stage_id}
                        onClick={() => run(() => onMoveStage(s.id))}
                        className="w-full flex items-center px-3 py-1.5 text-xs font-medium text-left text-slate-700 hover:bg-slate-50 disabled:text-slate-300 disabled:cursor-default"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {opportunity.status === 'Open' && (
                <>
                  <MenuItem icon="fa-circle-check" label="Mark as Won" onClick={() => run(onMarkWon)} />
                  <MenuItem icon="fa-circle-xmark" label="Mark as Lost" onClick={() => run(onMarkLost)} />
                </>
              )}

              <div className="my-1 border-t border-slate-100" />
              <MenuItem icon="fa-box-archive" label="Archive Deal" onClick={() => run(onArchive)} />
            </>
          )}

          {isAdmin && <MenuItem icon="fa-trash" label="Delete Deal" danger onClick={() => run(onDelete)} />}
        </div>
      )}
    </div>
  );
}
