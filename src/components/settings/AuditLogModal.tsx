import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalAuditLog } from '../../hooks/useActivity';
import { useUsers } from '../../hooks/useContacts';
import { humanizeAuditSummary, toTitleCase } from '../../utils/text';

interface Props {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

export default function AuditLogModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { data: users = [] } = useUsers();

  const [actorId, setActorId] = useState('');
  const [entityType, setEntityType] = useState<'' | 'contact' | 'company'>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const filters = {
    actorId: actorId ? Number(actorId) : null,
    entityType: entityType || null,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
    page,
  };
  const { data: entries = [], isLoading } = useGlobalAuditLog(filters, open);

  if (!open) return null;

  function updateFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  function openEntity(entityType: string, entityId: number) {
    onClose();
    if (entityType === 'contact') navigate(`/contacts?contactId=${entityId}`);
    else if (entityType === 'company') navigate(`/companies?companyId=${entityId}`);
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <h3 className="text-lg font-bold text-slate-800">Audit Log</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 px-6 mt-1">
          Every deal, task, event, and note created, archived, or restored across all contacts and companies.
        </p>

        <div className="grid grid-cols-4 gap-2 px-6 mt-4">
          <select
            value={actorId}
            onChange={(e) => updateFilter(setActorId, e.target.value)}
            className={inputClass}
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {toTitleCase(u.name)}
              </option>
            ))}
          </select>
          <select
            value={entityType}
            onChange={(e) => updateFilter(setEntityType, e.target.value as '' | 'contact' | 'company')}
            className={inputClass}
          >
            <option value="">All Records</option>
            <option value="contact">Contacts</option>
            <option value="company">Companies</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => updateFilter(setDateFrom, e.target.value)}
            className={inputClass}
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => updateFilter(setDateTo, e.target.value)}
            className={inputClass}
            title="To date"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 mt-4 space-y-1.5">
          {isLoading ? (
            <p className="text-sm text-slate-400 py-6 text-center">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No matching activity.</p>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => openEntity(entry.entity_type, entry.entity_id)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left border border-slate-100 rounded-lg hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 truncate">{humanizeAuditSummary(entry.summary)}</p>
                  <p className="text-[11px] text-slate-400">
                    {entry.entity_type === 'contact' ? 'Contact' : 'Company'}:{' '}
                    {toTitleCase(entry.entity_name || '') || '--'}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-slate-400">
                  {new Date(entry.created_at).toLocaleDateString()}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 mt-4">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            Previous
          </button>
          <span className="text-xs text-slate-400">Page {page}</span>
          <button
            type="button"
            disabled={entries.length < 50}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
