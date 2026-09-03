import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePages, useSavePage } from '../hooks/usePages';
import ScopeOfWorkEditor from '../components/ScopeOfWorkEditor';
import { RichTextEditorHandle } from '../components/RichTextEditor';
import PagePreviewOverlay from '../components/PagePreviewOverlay';

// Not yet resolved anywhere — these get filled in once Pages are wired to a
// contract's "Thank You page" (step 2/3). For now they're just tokens a rep
// can drop into the content.
const PAGE_DYNAMIC_FIELDS = [
  { token: '{{contact_full_name}}', label: 'Contact Full Name' },
  { token: '{{first_name}}', label: 'First Name' },
  { token: '{{last_name}}', label: 'Last Name' },
  { token: '{{owner_name}}', label: 'Owner Name' },
  { token: '{{signature_name}}', label: 'Signature Name' },
  { token: '{{signed_at}}', label: 'Signed Date' },
];

export default function PageEditorPage() {
  const { id } = useParams();
  const isEdit = id != null && id !== 'new';
  const navigate = useNavigate();

  const { data: pages = [] } = usePages();
  const savePage = useSavePage();

  const [pageId, setPageId] = useState<number | undefined>(undefined);
  const [name, setName] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadedExisting, setLoadedExisting] = useState(false);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const toolbarContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEdit || loadedExisting) return;
    const p = pages.find((x) => String(x.id) === id);
    if (!p) return;
    setPageId(p.id);
    setName(p.name);
    setContentHtml(p.content_html);
    setLoadedExisting(true);
  }, [isEdit, loadedExisting, pages, id]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Give this page a name.');
    const plainText = contentHtml.replace(/<[^>]*>/g, '').trim();
    if (!plainText) return setError('Write the page content.');

    savePage.mutate(
      { id: pageId, name: name.trim(), content_html: contentHtml },
      {
        onSuccess: () => navigate('/documents/pages'),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <button
          type="button"
          onClick={() => navigate('/documents/pages')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 shrink-0"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back
        </button>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New Page"
          className="flex-1 max-w-md text-center text-sm font-semibold text-slate-800 border border-slate-200 rounded-full px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-transparent"
        />

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="text-xs font-semibold text-[var(--theme-accent)] hover:underline"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={savePage.isPending}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
          >
            {savePage.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div ref={toolbarContainerRef} className="relative shrink-0" />

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border-b border-rose-200 px-4 py-1.5 shrink-0">{error}</p>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-slate-100">
          <div className="max-w-[850px] mx-auto py-8 px-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10">
              <ScopeOfWorkEditor
                ref={editorRef}
                value={contentHtml}
                onChange={setContentHtml}
                toolbarContainer={toolbarContainerRef}
              />
            </div>
          </div>
        </div>

        <div className="w-80 shrink-0 border-l border-slate-200 bg-white overflow-y-auto p-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Document properties</h3>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Insert dynamic field</label>
            <div className="flex flex-col gap-1.5">
              {PAGE_DYNAMIC_FIELDS.map((f) => (
                <button
                  key={f.token}
                  type="button"
                  onClick={() => editorRef.current?.insertText(f.token)}
                  className="w-full text-left text-[11px] font-medium border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)]"
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 italic mt-2">
              Tokens resolve once this page is linked to a contract's "Thank You page."
            </p>
          </div>
        </div>
      </div>

      <PagePreviewOverlay open={previewOpen} onClose={() => setPreviewOpen(false)} name={name} contentHtml={contentHtml} />
    </div>
  );
}
