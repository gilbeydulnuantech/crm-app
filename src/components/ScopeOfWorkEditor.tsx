import { forwardRef, RefObject, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScopeTemplates, useSaveScopeTemplate, useDeleteScopeTemplate } from '../hooks/useScopeTemplates';
import RichTextEditor, { RichTextEditorHandle } from './RichTextEditor';

interface Props {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  toolbarPlacement?: 'top' | 'right';
  toolbarContainer?: RefObject<HTMLDivElement | null>;
}

const ScopeOfWorkEditor = forwardRef<RichTextEditorHandle, Props>(function ScopeOfWorkEditor(
  { value, onChange, label = 'Scope of Work', toolbarPlacement, toolbarContainer },
  ref
) {
  const { data: templates = [] } = useScopeTemplates();
  const saveTemplate = useSaveScopeTemplate();
  const deleteTemplate = useDeleteScopeTemplate();

  const [insertValue, setInsertValue] = useState('');
  const [manageOpen, setManageOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  // toolbarContainer isn't attached to the DOM yet on the first render pass
  // (refs land after commit) — force one extra render so the portal target
  // is actually there by the time we check it.
  const [, forceRerender] = useState(0);
  useEffect(() => {
    forceRerender((n) => n + 1);
  }, []);

  function handleInsert(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setInsertValue('');
    if (!id) return;
    const tmpl = templates.find((t) => String(t.id) === id);
    if (!tmpl) return;
    const isEmpty = !value.replace(/<[^>]*>/g, '').trim();
    onChange(isEmpty ? tmpl.content_html : `${value}${tmpl.content_html}`);
  }

  function handleSaveTemplate() {
    setSaveError(null);
    const isEmpty = !value.replace(/<[^>]*>/g, '').trim();
    if (isEmpty) return setSaveError('Write some content first.');
    if (!templateName.trim()) return setSaveError('Give the template a name.');
    saveTemplate.mutate(
      { name: templateName.trim(), content_html: value },
      {
        onSuccess: () => {
          setTemplateName('');
          setSaveOpen(false);
        },
        onError: (err) => setSaveError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  const usePortal = !!(toolbarContainer && toolbarContainer.current);

  const controlsRow = (
    <div
      className={
        usePortal
          ? 'flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1'
          : 'flex items-center justify-end gap-1.5 mb-1'
      }
    >
      <select
        value={insertValue}
        onChange={handleInsert}
        className="text-[10px] font-medium border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-500 bg-white hover:border-slate-300 focus:outline-none"
      >
        <option value="">Insert saved...</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {templates.length > 0 && (
        <button
          type="button"
          onClick={() => setManageOpen((s) => !s)}
          className="text-[10px] font-semibold text-slate-400 hover:text-rose-600"
          title="Manage saved templates"
        >
          <i className="fa-solid fa-gear" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setSaveOpen((s) => !s)}
        className="ml-auto text-[10px] font-semibold text-indigo-600 hover:underline"
      >
        Save Scope of Work
      </button>
      {saveOpen && (
        <>
          <input
            type="text"
            autoFocus
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveTemplate();
              }
            }}
            placeholder="Name"
            className="text-[11px] px-1.5 py-0.5 border border-slate-200 rounded-md w-32 focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
          />
          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={saveTemplate.isPending}
            className="text-[10px] font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-md px-2 py-0.5 disabled:opacity-50"
          >
            {saveTemplate.isPending ? 'Saving...' : 'Save'}
          </button>
        </>
      )}
    </div>
  );

  return (
    <div>
      {usePortal ? (
        createPortal(controlsRow, toolbarContainer!.current!)
      ) : (
        <div className="flex items-center justify-between mb-1 flex-wrap gap-y-1">
          <label className="text-[11px] font-medium text-slate-500">{label}</label>
          {controlsRow}
        </div>
      )}

      {saveError && <p className="text-[11px] text-rose-600 mb-1.5">{saveError}</p>}

      {manageOpen && templates.length > 0 && (
        <div className="mb-1.5 border border-slate-200 rounded-md divide-y divide-slate-100 max-h-32 overflow-y-auto">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-2 py-1 text-[11px]">
              <span className="truncate text-slate-600">{t.name}</span>
              <button
                type="button"
                onClick={() => deleteTemplate.mutate(t.id)}
                className="text-slate-400 hover:text-rose-600 shrink-0"
              >
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          ))}
        </div>
      )}

      <RichTextEditor
        ref={ref}
        value={value}
        onChange={onChange}
        toolbarPlacement={toolbarPlacement}
        toolbarContainer={toolbarContainer}
      />
    </div>
  );
});

export default ScopeOfWorkEditor;
