import { ChangeEvent, ReactNode, RefObject } from 'react';
import { Editor } from '@tiptap/react';
import AddElementPanel, { AddElementType } from './AddElementPanel';

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px'];

function ToolbarButton({
  onClick,
  active,
  title,
  children,
  layout,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: ReactNode;
  layout: 'top' | 'right';
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`${layout === 'right' ? 'flex items-center justify-center py-2 rounded-md' : 'px-2 py-1 rounded'} text-xs ${
        active ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

interface Props {
  editor: Editor;
  layout: 'top' | 'right';
  uploading: boolean;
  uploadError: string | null;
  fileInputRef: RefObject<HTMLInputElement>;
  onImageSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  addElementOpen: boolean;
  setAddElementOpen: (open: boolean) => void;
  addElementRef: RefObject<HTMLDivElement>;
  onAddElement: (type: AddElementType) => void;
}

export default function EditorToolbar({
  editor,
  layout,
  uploading,
  uploadError,
  fileInputRef,
  onImageSelect,
  addElementOpen,
  setAddElementOpen,
  addElementRef,
  onAddElement,
}: Props) {
  const currentFontSize = editor.getAttributes('textStyle').fontSize || '';

  const isImageActive = editor.isActive('image');
  const isTableActive = editor.isActive('table');
  function setAlign(align: 'left' | 'center' | 'right' | 'justify') {
    if (isImageActive && align !== 'justify') {
      editor.chain().focus().updateAttributes('image', { align }).run();
    } else if (isTableActive && align !== 'justify') {
      editor.chain().focus().updateAttributes('table', { align }).run();
    } else {
      editor.chain().focus().setTextAlign(align).run();
    }
  }
  function isAlignActive(align: 'left' | 'center' | 'right' | 'justify') {
    if (isImageActive) return (editor.getAttributes('image').align || 'left') === align;
    if (isTableActive) return (editor.getAttributes('table').align || 'left') === align;
    return editor.isActive({ textAlign: align });
  }

  if (layout === 'top') {
    const divider = <div className="w-px h-4 bg-slate-200 mx-1" />;
    return (
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1">
        <div className="relative" ref={addElementRef}>
          <ToolbarButton layout={layout} title="Add an element" onClick={() => setAddElementOpen(!addElementOpen)}>
            <i className="fa-solid fa-plus" />
          </ToolbarButton>
          {addElementOpen && <AddElementPanel layout={layout} onSelect={onAddElement} onClose={() => setAddElementOpen(false)} />}
        </div>
        {divider}

        <ToolbarButton layout={layout} title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <i className="fa-solid fa-bold" />
        </ToolbarButton>
        <ToolbarButton layout={layout} title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <i className="fa-solid fa-italic" />
        </ToolbarButton>
        <ToolbarButton
          layout={layout}
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <i className="fa-solid fa-underline" />
        </ToolbarButton>
        <ToolbarButton
          layout={layout}
          title="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <i className="fa-solid fa-strikethrough" />
        </ToolbarButton>
        {divider}

        <select
          value={currentFontSize}
          onChange={(e) => {
            const v = e.target.value;
            if (v) editor.chain().focus().setFontSize(v).run();
            else editor.chain().focus().unsetFontSize().run();
          }}
          title="Font size"
          className="text-[11px] border border-slate-200 rounded bg-white text-slate-600 focus:outline-none px-1 py-1"
        >
          <option value="">Size</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s.replace('px', '')}
            </option>
          ))}
        </select>
        <input
          type="color"
          title="Text color"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="w-6 h-6 border-0 bg-transparent cursor-pointer"
        />
        {divider}

        <ToolbarButton
          layout={layout}
          title="Heading"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          layout={layout}
          title="Subheading"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          layout={layout}
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <i className="fa-solid fa-list-ul" />
        </ToolbarButton>
        <ToolbarButton
          layout={layout}
          title="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <i className="fa-solid fa-list-ol" />
        </ToolbarButton>
        {divider}

        <ToolbarButton layout={layout} title="Align left" active={isAlignActive('left')} onClick={() => setAlign('left')}>
          <i className="fa-solid fa-align-left" />
        </ToolbarButton>
        <ToolbarButton layout={layout} title="Align center" active={isAlignActive('center')} onClick={() => setAlign('center')}>
          <i className="fa-solid fa-align-center" />
        </ToolbarButton>
        <ToolbarButton layout={layout} title="Align right" active={isAlignActive('right')} onClick={() => setAlign('right')}>
          <i className="fa-solid fa-align-right" />
        </ToolbarButton>
        <ToolbarButton layout={layout} title="Justify" active={isAlignActive('justify')} onClick={() => setAlign('justify')}>
          <i className="fa-solid fa-align-justify" />
        </ToolbarButton>
        {divider}

        <ToolbarButton layout={layout} title="Decrease indent (Shift+Tab)" onClick={() => editor.chain().focus().decreaseIndent().run()}>
          <i className="fa-solid fa-outdent" />
        </ToolbarButton>
        <ToolbarButton layout={layout} title="Increase indent (Tab)" onClick={() => editor.chain().focus().increaseIndent().run()}>
          <i className="fa-solid fa-indent" />
        </ToolbarButton>
        {divider}

        <ToolbarButton layout={layout} title="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <i className="fa-solid fa-table" />
        </ToolbarButton>
        <ToolbarButton layout={layout} title="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>
          <i className="fa-solid fa-table-columns" />
        </ToolbarButton>
        <ToolbarButton layout={layout} title="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>
          <i className="fa-solid fa-square-minus" />
        </ToolbarButton>
        <ToolbarButton layout={layout} title="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>
          <i className="fa-solid fa-table-cells-large" />
        </ToolbarButton>
        <ToolbarButton layout={layout} title="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>
          <i className="fa-solid fa-square-minus" />
        </ToolbarButton>
        <ToolbarButton layout={layout} title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
          <i className="fa-solid fa-trash" />
        </ToolbarButton>
        {divider}

        <ToolbarButton layout={layout} title="Insert image" onClick={() => fileInputRef.current?.click()}>
          <i className={`fa-solid ${uploading ? 'fa-spinner fa-spin' : 'fa-image'}`} />
        </ToolbarButton>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onImageSelect} className="hidden" />
        {divider}

        <ToolbarButton layout={layout} title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <i className="fa-solid fa-rotate-left" />
        </ToolbarButton>
        <ToolbarButton layout={layout} title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <i className="fa-solid fa-rotate-right" />
        </ToolbarButton>

        {uploadError && <p className="text-[10px] text-rose-600 px-2">{uploadError}</p>}
      </div>
    );
  }

  // Right-docked layout: a bounded card with tools grouped into rows (grid),
  // instead of one long vertical strip that runs off the bottom of the screen.
  const rowDivider = <div className="col-span-3 h-px bg-slate-200 my-1" />;

  return (
    <div className="w-44 shrink-0">
      <div className="grid grid-cols-3 gap-1">
          <div className="relative col-span-3" ref={addElementRef}>
            <ToolbarButton layout={layout} title="Add an element" onClick={() => setAddElementOpen(!addElementOpen)}>
              <i className="fa-solid fa-plus mr-1.5" />
              <span className="text-[11px] font-medium">Add Element</span>
            </ToolbarButton>
            {addElementOpen && <AddElementPanel layout={layout} onSelect={onAddElement} onClose={() => setAddElementOpen(false)} />}
          </div>
          {rowDivider}

          <ToolbarButton layout={layout} title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <i className="fa-solid fa-bold" />
          </ToolbarButton>
          <ToolbarButton layout={layout} title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <i className="fa-solid fa-italic" />
          </ToolbarButton>
          <ToolbarButton
            layout={layout}
            title="Underline"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <i className="fa-solid fa-underline" />
          </ToolbarButton>
          <ToolbarButton
            layout={layout}
            title="Strikethrough"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <i className="fa-solid fa-strikethrough" />
          </ToolbarButton>
          <ToolbarButton
            layout={layout}
            title="Heading"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            layout={layout}
            title="Subheading"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            H3
          </ToolbarButton>
          {rowDivider}

          <ToolbarButton layout={layout} title="Align left" active={isAlignActive('left')} onClick={() => setAlign('left')}>
            <i className="fa-solid fa-align-left" />
          </ToolbarButton>
          <ToolbarButton layout={layout} title="Align center" active={isAlignActive('center')} onClick={() => setAlign('center')}>
            <i className="fa-solid fa-align-center" />
          </ToolbarButton>
          <ToolbarButton layout={layout} title="Align right" active={isAlignActive('right')} onClick={() => setAlign('right')}>
            <i className="fa-solid fa-align-right" />
          </ToolbarButton>
          <ToolbarButton layout={layout} title="Justify" active={isAlignActive('justify')} onClick={() => setAlign('justify')}>
            <i className="fa-solid fa-align-justify" />
          </ToolbarButton>
          <ToolbarButton layout={layout} title="Decrease indent (Shift+Tab)" onClick={() => editor.chain().focus().decreaseIndent().run()}>
            <i className="fa-solid fa-outdent" />
          </ToolbarButton>
          <ToolbarButton layout={layout} title="Increase indent (Tab)" onClick={() => editor.chain().focus().increaseIndent().run()}>
            <i className="fa-solid fa-indent" />
          </ToolbarButton>
          {rowDivider}

          <select
            value={currentFontSize}
            onChange={(e) => {
              const v = e.target.value;
              if (v) editor.chain().focus().setFontSize(v).run();
              else editor.chain().focus().unsetFontSize().run();
            }}
            title="Font size"
            className="col-span-2 text-[11px] border border-slate-200 rounded bg-white text-slate-600 focus:outline-none px-1 py-1"
          >
            <option value="">Size</option>
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s.replace('px', '')}
              </option>
            ))}
          </select>
          <input
            type="color"
            title="Text color"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="w-full h-7 border-0 bg-transparent cursor-pointer"
          />
          {rowDivider}

          <ToolbarButton
            layout={layout}
            title="Bullet list"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <i className="fa-solid fa-list-ul" />
          </ToolbarButton>
          <ToolbarButton
            layout={layout}
            title="Numbered list"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <i className="fa-solid fa-list-ol" />
          </ToolbarButton>
          <ToolbarButton layout={layout} title="Insert image" onClick={() => fileInputRef.current?.click()}>
            <i className={`fa-solid ${uploading ? 'fa-spinner fa-spin' : 'fa-image'}`} />
          </ToolbarButton>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onImageSelect} className="hidden" />
          {rowDivider}

          <ToolbarButton layout={layout} title="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <i className="fa-solid fa-table" />
          </ToolbarButton>
          <ToolbarButton layout={layout} title="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>
            <i className="fa-solid fa-table-columns" />
          </ToolbarButton>
          <ToolbarButton layout={layout} title="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>
            <i className="fa-solid fa-square-minus" />
          </ToolbarButton>
          <ToolbarButton layout={layout} title="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>
            <i className="fa-solid fa-table-cells-large" />
          </ToolbarButton>
          <ToolbarButton layout={layout} title="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>
            <i className="fa-solid fa-square-minus" />
          </ToolbarButton>
          <ToolbarButton layout={layout} title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
            <i className="fa-solid fa-trash" />
          </ToolbarButton>
          {rowDivider}

          <ToolbarButton layout={layout} title="Undo" onClick={() => editor.chain().focus().undo().run()}>
            <i className="fa-solid fa-rotate-left" />
          </ToolbarButton>
          <ToolbarButton layout={layout} title="Redo" onClick={() => editor.chain().focus().redo().run()}>
            <i className="fa-solid fa-rotate-right" />
          </ToolbarButton>
      </div>

      {uploadError && <p className="text-[10px] text-rose-600 text-center mt-1">{uploadError}</p>}
    </div>
  );
}
