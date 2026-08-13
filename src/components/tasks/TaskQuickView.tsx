import { useNavigate } from 'react-router-dom';
import { Task, taskStatus } from '../../types/task';
import { toTitleCase } from '../../utils/text';
import { useToggleTaskComplete } from '../../hooks/useTasks';
import { DEFAULT_USER_COLOR, hexToRgba } from '../../utils/userColor';

interface Props {
  task: Task | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

const STATUS_DOT: Record<string, string> = {
  Completed: 'bg-emerald-500',
  Overdue: 'bg-rose-500',
  'Due Today': 'bg-amber-500',
  Upcoming: 'bg-blue-500',
};

function currency(n?: number | null) {
  if (n === undefined || n === null) return '--';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-0.5">{label}</label>
      {children}
    </div>
  );
}

export default function TaskQuickView({ task, canEdit, onClose, onEdit }: Props) {
  const navigate = useNavigate();
  const toggleComplete = useToggleTaskComplete();

  if (!task) return null;

  const status = taskStatus(task);
  const ownerColor = task.assigned_user_name ? task.assigned_user_color || DEFAULT_USER_COLOR : undefined;

  function handleComplete() {
    toggleComplete.mutate({ id: task!.id, is_completed: true });
    onClose();
  }

  function goToContact() {
    if (!task!.contact_id) return;
    onClose();
    navigate(`/contacts?contactId=${task!.contact_id}`);
  }

  function goToCompany() {
    if (!task!.company_id) return;
    onClose();
    navigate(`/companies?companyId=${task!.company_id}`);
  }

  function goToDeal() {
    if (!task!.opportunity_id) return;
    onClose();
    const params = new URLSearchParams();
    if (task!.opportunity_pipeline_id) params.set('pipeline', String(task!.opportunity_pipeline_id));
    params.set('highlight', String(task!.opportunity_id));
    navigate(`/pipeline?${params.toString()}`);
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 z-[95] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <h3 className="text-sm font-bold text-slate-800">Task Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p
            className={`text-sm font-bold ${task.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}
          >
            {task.subject}
          </p>

          <div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status] ?? 'bg-slate-400'}`} />
              <span className="text-sm text-slate-600">{status}</span>
            </div>
            {task.due_at && (
              <p className="text-xs text-slate-400 mt-1">
                Due:{' '}
                {new Date(task.due_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: '2-digit',
                  year: 'numeric',
                })}{' '}
                ·{' '}
                {new Date(task.due_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
          </div>

          <Field label="Assigned To">
            {task.assigned_user_name ? (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full"
                style={{
                  backgroundColor: hexToRgba(ownerColor!, 0.14),
                  color: ownerColor,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ownerColor }} />
                {toTitleCase(task.assigned_user_name)}
              </span>
            ) : (
              <p className="text-sm text-slate-700">Unassigned</p>
            )}
          </Field>

          {task.contact_name && (
            <Field label="Related Contact">
              {task.contact_id ? (
                <button
                  onClick={goToContact}
                  className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline text-left block"
                >
                  {toTitleCase(task.contact_name)}
                </button>
              ) : (
                <p className="text-sm text-slate-700">{toTitleCase(task.contact_name)}</p>
              )}
              {task.contact_email && <p className="text-xs text-slate-400">{task.contact_email}</p>}
            </Field>
          )}

          {task.company_name && (
            <Field label="Related Company">
              {task.company_id ? (
                <button
                  onClick={goToCompany}
                  className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline text-left block"
                >
                  {task.company_name}
                </button>
              ) : (
                <p className="text-sm text-slate-700">{task.company_name}</p>
              )}
            </Field>
          )}

          {task.opportunity_name && (
            <Field label="Related Deal">
              <button
                onClick={goToDeal}
                className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline text-left block"
              >
                {task.opportunity_name} · {currency(task.opportunity_value)}
              </button>
            </Field>
          )}

          {task.body && (
            <Field label="Description">
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{task.body}</p>
            </Field>
          )}

          {task.created_at && (
            <Field label="Created">
              <p className="text-sm text-slate-600">
                {new Date(task.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: '2-digit',
                  year: 'numeric',
                })}
              </p>
            </Field>
          )}
        </div>

        {canEdit ? (
          <div className="flex gap-2 px-5 py-4 border-t border-slate-100 shrink-0">
            {!task.is_completed && (
              <button
                onClick={handleComplete}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg"
              >
                Complete
              </button>
            )}
            <button
              onClick={() => onEdit(task)}
              className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 rounded-lg"
            >
              Edit
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center px-5 py-4 border-t border-slate-100 shrink-0">
            Assigned to someone else — view only.
          </p>
        )}
      </div>
    </div>
  );
}
