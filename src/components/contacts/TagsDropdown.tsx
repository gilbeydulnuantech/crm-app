import { useMemo, useState } from 'react';
import { Contact } from '../../types/contact';
import { useCreateTag, useTagContact, useTags, useUntagContact } from '../../hooks/useContacts';
import { getTagColorClasses } from '../../utils/tagColors';

interface Props {
  contact: Contact;
  disabled?: boolean;
}

export default function TagsDropdown({ contact, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // get-contacts already embeds each contact's tags via a json_agg subquery,
  // so this renders instantly from data already in memory instead of firing
  // a redundant get-entity-tags round trip on every modal open. Tag/untag
  // mutations invalidate ['contacts'], which keeps this in sync.
  const contactTags = contact.tags ?? [];
  const { data: allTags = [] } = useTags();
  const createTag = useCreateTag();
  const tagContact = useTagContact();
  const untagContact = useUntagContact();

  const assignedIds = new Set(contactTags.map((t) => t.id));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTags.filter((t) => !assignedIds.has(t.id) && (!q || t.name.toLowerCase().includes(q)));
  }, [allTags, assignedIds, query]);

  const exactMatch = allTags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  function handleAssign(tagId: number) {
    setError(null);
    tagContact.mutate(
      { contactId: contact.id, tagId },
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
        tagContact.mutate(
          { contactId: contact.id, tagId: newTag.id },
          { onError: (err) => setError(err instanceof Error ? err.message : 'Failed to attach the new tag.') }
        );
        setQuery('');
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create tag.'),
    });
  }

  function handleUntag(tagId: number) {
    setError(null);
    untagContact.mutate(
      { contactId: contact.id, tagId },
      { onError: (err) => setError(err instanceof Error ? err.message : 'Failed to remove tag.') }
    );
  }

  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">Tags</label>
      <div className="flex flex-wrap items-center gap-1.5">
        {contactTags.map((t) => (
          <span
            key={t.id}
            className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getTagColorClasses(
              t.name
            )}`}
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
                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded mb-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
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
    </div>
  );
}
