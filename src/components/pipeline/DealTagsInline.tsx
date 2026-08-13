import { useMemo, useState } from 'react';
import { Opportunity } from '../../types/opportunity';
import { useCreateTag, useTags } from '../../hooks/useContacts';
import { useTagOpportunity, useUntagOpportunity } from '../../hooks/useOpportunities';
import { getTagColorClasses } from '../../utils/tagColors';

interface Props {
  deal: Opportunity;
  disabled?: boolean;
}

export default function DealTagsInline({ deal, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const dealTags = deal.tags ?? [];
  const { data: allTags = [] } = useTags();
  const createTag = useCreateTag();
  const tagOpportunity = useTagOpportunity(deal.pipeline_id ?? undefined);
  const untagOpportunity = useUntagOpportunity(deal.pipeline_id ?? undefined);

  const assignedIds = new Set(dealTags.map((t) => t.id));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTags.filter((t) => !assignedIds.has(t.id) && (!q || t.name.toLowerCase().includes(q)));
  }, [allTags, assignedIds, query]);

  const exactMatch = allTags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  function handleAssign(tagId: number) {
    setError(null);
    tagOpportunity.mutate(
      { opportunityId: deal.id, tagId },
      { onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add tag.') }
    );
    setQuery('');
  }

  function handleCreateAndAssign() {
    const name = query.trim();
    if (!name) return;
    setError(null);
    createTag.mutate(name, {
      onSuccess: (newTag) => {
        tagOpportunity.mutate(
          { opportunityId: deal.id, tagId: newTag.id },
          { onError: (err) => setError(err instanceof Error ? err.message : 'Failed to attach the new tag.') }
        );
        setQuery('');
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create tag.'),
    });
  }

  function handleUntag(tagId: number) {
    setError(null);
    untagOpportunity.mutate(
      { opportunityId: deal.id, tagId },
      { onError: (err) => setError(err instanceof Error ? err.message : 'Failed to remove tag.') }
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {dealTags.map((t) => (
        <span
          key={t.id}
          className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getTagColorClasses(t.name)}`}
        >
          {t.name}
          {!disabled && (
            <button onClick={() => handleUntag(t.id)} className="opacity-60 hover:opacity-100">
              <i className="fa-solid fa-xmark text-[9px]" />
            </button>
          )}
        </span>
      ))}

      {!disabled && (
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-slate-500 border border-dashed border-slate-300 rounded-full hover:border-indigo-400 hover:text-indigo-600"
          >
            <i className="fa-solid fa-plus text-[9px]" />
            Add Tag
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute top-full mt-1 left-0 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-2">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search or create..."
                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded mb-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {error && <p className="text-[10px] text-rose-600 mb-1.5 px-1">{error}</p>}
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {filtered.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleAssign(t.id)}
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-slate-50 text-slate-700"
                    >
                      {t.name}
                    </button>
                  ))}
                  {query.trim() && !exactMatch && (
                    <button
                      onClick={handleCreateAndAssign}
                      disabled={createTag.isPending}
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-indigo-50 text-indigo-600 font-medium"
                    >
                      + Create "{query.trim()}"
                    </button>
                  )}
                  {filtered.length === 0 && !query.trim() && (
                    <p className="text-[11px] text-slate-400 px-2 py-1">No more tags — type to create one.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
