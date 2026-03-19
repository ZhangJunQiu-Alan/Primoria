import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import type { Block } from '@primoria/schema';

// ─── Richtext ↔ JSON ──────────────────────────────────────────────────────────

type RichtextOp = { insert: string; attributes?: Record<string, unknown> };

/** Convert Quill-style ops to plain text (lossy — preserves line breaks only). */
function opsToText(ops: RichtextOp[]): string {
  return ops.map((o) => o.insert).join('');
}

/** Wrap plain text back in ops format. */
function textToOps(text: string): RichtextOp[] {
  if (!text) return [{ insert: '\n' }];
  return text.split('\n').flatMap((line, i, arr) =>
    i < arr.length - 1 ? [{ insert: line }, { insert: '\n' }] : [{ insert: line }],
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TextPanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function TextPanel({ block, lessonId, pageId }: TextPanelProps) {
  const dispatch = useAppDispatch();
  const c = block.content as { value?: { ops?: RichtextOp[] } };
  const initialText = opsToText(c.value?.ops ?? [{ insert: '\n' }]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start typing…' }),
    ],
    content: initialText,
    onUpdate({ editor: e }) {
      const text = e.getText();
      dispatch(
        updateBlock({
          lessonId,
          pageId,
          block: {
            ...block,
            content: {
              format: 'richtext',
              value: { ops: textToOps(text) },
            },
          },
        }),
      );
    },
  });

  // Reinitialise when a different block is selected
  useEffect(() => {
    if (!editor) return;
    const fresh = opsToText(c.value?.ops ?? [{ insert: '\n' }]);
    if (editor.getText() !== fresh) {
      editor.commands.setContent(fresh);
    }
  }, [block.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      {/* Formatting toolbar */}
      {editor && (
        <div className="flex flex-wrap gap-1 border-b pb-2">
          {[
            { label: 'B', title: 'Bold', cmd: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
            { label: 'I', title: 'Italic', cmd: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
            { label: 'S', title: 'Strike', cmd: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike') },
            { label: 'H1', title: 'Heading 1', cmd: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
            { label: 'H2', title: 'Heading 2', cmd: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
            { label: '•', title: 'Bullet list', cmd: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
            { label: '1.', title: 'Ordered list', cmd: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
            { label: '—', title: 'Code block', cmd: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock') },
          ].map(({ label, title, cmd, active }) => (
            <button
              key={title}
              type="button"
              title={title}
              onClick={cmd}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'border hover:bg-accent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-[120px] rounded-md border p-3 text-sm focus-within:ring-2 focus-within:ring-ring [&_.tiptap]:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none"
      />
    </div>
  );
}
