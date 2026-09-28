import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface ColumnDef {
  key: string;
  label: string;
  locked?: boolean; // always visible, no checkbox
}

export const CONTACT_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name', locked: true },
  { key: 'company_name', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'owner_name', label: 'Owner' },
  { key: 'tags', label: 'Tags' },
  { key: 'lead_status', label: 'Status' },
  { key: 'lead_score', label: 'Lead Score' },
  { key: 'lead_source', label: 'Lead Source' },
  { key: 'location', label: 'Location' },
  { key: 'created_at', label: 'Created At' },
  { key: 'last_activity_at', label: 'Last Activity' },
];

export const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> = {
  // Internal database row numbers have no business meaning to a rep —
  // still available via Columns for anyone who genuinely wants it.
  id: false,
  name: true,
  company_name: true,
  email: false,
  phone: true,
  job_title: false,
  owner_name: true,
  tags: true,
  lead_status: true,
  lead_score: true,
  lead_source: false,
  location: false,
  created_at: false,
  last_activity_at: true,
};

export const DEFAULT_COLUMN_ORDER: string[] = CONTACT_COLUMNS.map((c) => c.key);

interface Props {
  open: boolean;
  visible: Record<string, boolean>;
  order: string[];
  onChange: (next: Record<string, boolean>) => void;
  onReorder: (next: string[]) => void;
  onReset: () => void;
  onClose: () => void;
}

function SortableColumnRow({ col, checked, onToggle }: { col: ColumnDef; checked: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: col.key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 rounded-lg ${isDragging ? 'opacity-60 bg-slate-50' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="px-1.5 py-1.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none"
        title="Drag to reorder"
      >
        <i className="fa-solid fa-grip-vertical text-xs" />
      </button>
      <label
        className={`flex-1 flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm ${
          col.locked ? 'text-slate-400' : 'text-slate-700 hover:bg-slate-50 cursor-pointer'
        }`}
      >
        <input
          type="checkbox"
          checked={col.locked ? true : checked}
          disabled={col.locked}
          onChange={onToggle}
          className="rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)] disabled:opacity-50"
        />
        {col.label}
        {col.locked && <span className="text-[10px] text-slate-400 ml-auto">always shown</span>}
      </label>
    </div>
  );
}

export default function ManageColumnsModal({ open, visible, order, onChange, onReorder, onReset, onClose }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (!open) return null;

  function toggle(key: string) {
    onChange({ ...visible, [key]: !visible[key] });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(order, oldIndex, newIndex));
  }

  const columnsByKey = Object.fromEntries(CONTACT_COLUMNS.map((c) => [c.key, c]));
  const orderedColumns = order.map((key) => columnsByKey[key]).filter(Boolean);

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Manage Columns</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={onReset}
              className="text-slate-400 hover:text-[var(--theme-accent)]"
              title="Reset to default"
            >
              <i className="fa-solid fa-arrow-rotate-left text-sm" />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {orderedColumns.map((col) => (
                <SortableColumnRow
                  key={col.key}
                  col={col}
                  checked={!!visible[col.key]}
                  onToggle={() => toggle(col.key)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <button
          onClick={onClose}
          className="w-full mt-5 bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white text-sm font-semibold py-2 rounded-lg"
        >
          Done
        </button>
      </div>
    </div>
  );
}
