import { ChangeEvent, forwardRef, RefObject, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';
import ResizableImage from './richtext/ResizableImage';
import AlignableTable from './richtext/extensions/AlignableTable';
import PageBreak from './richtext/extensions/PageBreak';
import VideoEmbed, { toEmbedUrl } from './richtext/extensions/VideoEmbed';
import ProductList from './richtext/extensions/ProductList';
import FillableField, { FillableFieldType } from './richtext/extensions/FillableField';
import FontSize from './richtext/extensions/FontSize';
import Indent from './richtext/extensions/Indent';
import EditorToolbar from './richtext/EditorToolbar';
import { AddElementType } from './richtext/AddElementPanel';
import { uploadContentImage } from '../api/contentImages';
import { generateId } from '../utils/id';

interface Props {
  value: string;
  onChange: (html: string) => void;
  // 'top' (default) matches every existing usage — a horizontal bar above the
  // content. 'right' docks the same tools in a collapsible vertical panel,
  // for the full-page document editor.
  toolbarPlacement?: 'top' | 'right';
  // When set (with toolbarPlacement="right"), the toolbar portals into this
  // element instead of rendering inline next to the content — lets the page
  // place it as a true right-hand rail outside the document card, rather
  // than nested inside it.
  toolbarContainer?: RefObject<HTMLDivElement | null>;
}

export interface RichTextEditorHandle {
  insertPageBreak: () => void;
  insertText: (text: string) => void;
}

const FILLABLE_TYPE_MAP: Partial<Record<AddElementType, FillableFieldType>> = {
  signature: 'signature',
  textField: 'text',
  date: 'date',
  initials: 'initials',
  checkbox: 'checkbox',
};

const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(function RichTextEditor(
  { value, onChange, toolbarPlacement = 'top', toolbarContainer },
  ref
) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [addElementOpen, setAddElementOpen] = useState(false);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const addElementRef = useRef<HTMLDivElement>(null);
  // Sibling refs (like toolbarContainer) aren't guaranteed attached during
  // this component's first render — force one extra pass after mount so the
  // portal target is actually there by the time we check it.
  const [, forceRerender] = useState(0);
  useEffect(() => {
    forceRerender((n) => n + 1);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      AlignableTable.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ResizableImage.configure({ inline: false }),
      PageBreak,
      VideoEmbed,
      ProductList,
      FillableField,
      TextStyle,
      Underline,
      Color,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Indent,
      GlobalDragHandle,
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'rte-content min-h-[220px] px-3 py-2 focus:outline-none' },
    },
  });

  async function uploadAndInsertImage(file: File) {
    if (!editor) return;
    setUploadError(null);
    if (!file.type.startsWith('image/')) return setUploadError('Please choose an image file.');
    if (file.size > 7 * 1024 * 1024) return setUploadError('Image is too large (max 7MB).');

    setUploading(true);
    try {
      const res = await uploadContentImage(file);
      // A default width (rather than the image's full natural resolution)
      // so a freshly inserted image is a reasonable size to wrap text
      // around immediately, instead of dominating the page until resized.
      if (res.url) editor.chain().focus().insertContent({ type: 'image', attrs: { src: res.url, width: '320px' } }).run();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  }

  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await uploadAndInsertImage(file);
  }

  function handleAddElement(type: AddElementType) {
    setAddElementOpen(false);
    if (!editor) return;

    if (type === 'text') {
      editor.chain().focus().insertContent({ type: 'paragraph' }).run();
      return;
    }
    if (type === 'image') {
      fileInputRef.current?.click();
      return;
    }
    if (type === 'video') {
      const url = window.prompt('Paste a YouTube, Vimeo, or other embeddable video URL:');
      if (url && url.trim()) {
        editor.chain().focus().insertContent({ type: 'videoEmbed', attrs: { src: toEmbedUrl(url.trim()) } }).run();
      }
      return;
    }
    if (type === 'table') {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      return;
    }
    if (type === 'productList') {
      editor
        .chain()
        .focus()
        .insertContent({ type: 'productList', attrs: { items: [{ id: generateId(), name: '', qty: 1, price: 0 }] } })
        .run();
      return;
    }
    if (type === 'pageBreak') {
      editor.chain().focus().insertContent({ type: 'pageBreak' }).run();
      return;
    }

    const fieldType = FILLABLE_TYPE_MAP[type];
    if (fieldType) {
      editor
        .chain()
        .focus()
        .insertContent({ type: 'fillableField', attrs: { fieldId: generateId(), fieldType, label: '' } })
        .run();
    }
  }

  // Re-sync if the caller resets `value` externally (e.g. switching which
  // proposal is loaded into the form) — skipped while the user is actively
  // typing so we don't stomp on their cursor/selection.
  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  useEffect(() => {
    if (!addElementOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (addElementRef.current && !addElementRef.current.contains(e.target as Node)) {
        setAddElementOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addElementOpen]);

  useImperativeHandle(ref, () => ({
    insertPageBreak: () => {
      editor?.chain().focus('end').insertContent({ type: 'pageBreak' }).run();
    },
    insertText: (text: string) => {
      editor?.chain().focus().insertContent(text).run();
    },
  }));

  if (!editor) return null;

  const toolbar = (
    <EditorToolbar
      editor={editor}
      layout={toolbarPlacement}
      uploading={uploading}
      uploadError={uploadError}
      fileInputRef={fileInputRef}
      onImageSelect={handleImageSelect}
      addElementOpen={addElementOpen}
      setAddElementOpen={setAddElementOpen}
      addElementRef={addElementRef}
      onAddElement={handleAddElement}
    />
  );

  const collapseToggle = toolbarCollapsed ? (
    <button
      type="button"
      onClick={() => setToolbarCollapsed(false)}
      title="Show tools"
      className="w-6 shrink-0 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[var(--theme-accent)] h-8"
    >
      <i className="fa-solid fa-chevron-left text-xs" />
    </button>
  ) : (
    <div className="relative">
      {toolbar}
      <button
        type="button"
        onClick={() => setToolbarCollapsed(true)}
        title="Hide tools"
        className="absolute -left-3 top-1 w-5 h-5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[var(--theme-accent)] shadow-sm"
      >
        <i className="fa-solid fa-chevron-right text-[9px]" />
      </button>
    </div>
  );

  if (toolbarPlacement === 'right') {
    if (toolbarContainer) {
      return (
        <>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <EditorContent editor={editor} />
          </div>
          {toolbarContainer.current && createPortal(collapseToggle, toolbarContainer.current)}
        </>
      );
    }

    return (
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 border border-slate-200 rounded-lg overflow-hidden">
          <EditorContent editor={editor} />
        </div>
        {collapseToggle}
      </div>
    );
  }

  // 'top' layout with an external container: portal the horizontal icon bar
  // out as page-level chrome (e.g. a full-width bar above a document canvas)
  // instead of nesting it inside the content's own bordered box.
  if (toolbarContainer) {
    return (
      <>
        <div className="overflow-hidden">
          <EditorContent editor={editor} />
        </div>
        {toolbarContainer.current && createPortal(toolbar, toolbarContainer.current)}
      </>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {toolbar}
      <EditorContent editor={editor} />
    </div>
  );
});

export default RichTextEditor;
