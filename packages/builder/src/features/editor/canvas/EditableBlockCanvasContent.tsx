import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { updateBlock } from '@/store/editorSlice';
import { useAppDispatch, useAppSelector } from '@/store';
import { runCode } from '../codeRunner';
import { CODE_LANGUAGES, getSafeCodeLanguage } from '../codeLanguages';
import {
  createEmptyRichTextValue,
  isRichTextEmpty,
  richTextToHtml,
  serializeRichTextValue,
  tipTapDocToRichTextValue,
} from '../richText';
import { uploadBlockImage } from '@/services/blockImageUpload';
import { BlockRenderer, getBlockStyleFrame } from '../preview/BlockRenderer';
import { cn } from '@/lib/utils';
import type { Block } from '@primoria/schema';

interface EditableBlockCanvasContentProps {
  block: Block;
  lessonId: string;
  pageId: string;
  isSelected: boolean;
  isEditing: boolean;
}

type RunState = {
  hasRun: boolean;
  isRunning: boolean;
  output: string;
  tone: 'neutral' | 'success' | 'danger';
};

const INITIAL_RUN_STATE: RunState = {
  hasRun: false,
  isRunning: false,
  output: '',
  tone: 'neutral',
};

export function EditableBlockCanvasContent({
  block,
  lessonId,
  pageId,
  isSelected,
  isEditing,
}: EditableBlockCanvasContentProps) {
  const frame = getBlockStyleFrame(block.style);
  let content: ReactNode;

  switch (block.type) {
    case 'text':
      content = (
        <CanvasTextBlock
          block={block}
          lessonId={lessonId}
          pageId={pageId}
          isEditing={isEditing}
        />
      );
      break;
    case 'image':
      content = <CanvasImageBlock block={block} lessonId={lessonId} pageId={pageId} />;
      break;
    case 'code-block':
      content = (
        <CanvasCodeBlock
          block={block}
          lessonId={lessonId}
          pageId={pageId}
          isEditing={isEditing}
        />
      );
      break;
    case 'code-playground':
      content = (
        <CanvasCodePlayground
          block={block}
          lessonId={lessonId}
          pageId={pageId}
          isEditing={isEditing}
          isSelected={isSelected}
        />
      );
      break;
    default:
      return <BlockRenderer block={block} />;
  }

  return (
    <div className={frame.className} style={frame.style}>
      {content}
    </div>
  );
}

function CanvasTextBlock({
  block,
  lessonId,
  pageId,
  isEditing,
}: {
  block: Block;
  lessonId: string;
  pageId: string;
  isEditing: boolean;
}) {
  const dispatch = useAppDispatch();
  const content = block.content as { format?: string; value?: unknown };
  const incomingValue = useMemo(
    () => serializeRichTextValue(content.value ?? createEmptyRichTextValue()),
    [content.value],
  );
  const incomingHtml = useMemo(() => richTextToHtml(content.value), [content.value]);
  const lastSavedRef = useRef(incomingValue);

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: 'Start typing…' }),
      ],
      content: incomingHtml,
      editable: isEditing,
      onUpdate({ editor: instance }) {
        const nextValue = tipTapDocToRichTextValue(instance.getJSON());
        lastSavedRef.current = nextValue;
        dispatch(
          updateBlock({
            lessonId,
            pageId,
            block: {
              ...block,
              content: {
                ...content,
                format: 'richtext',
                value: nextValue,
              },
            },
          }),
        );
      },
    },
    [block.id],
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(isEditing);
  }, [editor, isEditing]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (incomingValue !== lastSavedRef.current) {
      editor.commands.setContent(incomingHtml, false);
      lastSavedRef.current = incomingValue;
    }
  }, [editor, incomingHtml, incomingValue]);

  if (!isEditing) {
    if (isRichTextEmpty(content.value)) {
      return (
        <div className="editor-inline-text-placeholder">
          Double-click to add rich text content.
        </div>
      );
    }

    return (
      <div
        className="editor-inline-richtext prose prose-sm max-w-none text-foreground"
        dangerouslySetInnerHTML={{ __html: incomingHtml }}
      />
    );
  }

  return (
    <div className="editor-inline-text-editor" onClick={(event) => event.stopPropagation()}>
      {editor ? <TextToolbar editor={editor} /> : null}
      <EditorContent
        editor={editor}
        className="editor-inline-text-editor__surface prose prose-sm max-w-none min-h-[150px] text-sm [&_.tiptap]:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none"
      />
    </div>
  );
}

function TextToolbar({
  editor,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>;
}) {
  const controls = [
    {
      label: 'B',
      title: 'Bold',
      active: editor.isActive('bold'),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'I',
      title: 'Italic',
      active: editor.isActive('italic'),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'S',
      title: 'Strike',
      active: editor.isActive('strike'),
      onClick: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: 'H1',
      title: 'Heading 1',
      active: editor.isActive('heading', { level: 1 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: 'H2',
      title: 'Heading 2',
      active: editor.isActive('heading', { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: '•',
      title: 'Bullet list',
      active: editor.isActive('bulletList'),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: '1.',
      title: 'Ordered list',
      active: editor.isActive('orderedList'),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: '</>',
      title: 'Code block',
      active: editor.isActive('codeBlock'),
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
    },
  ];

  return (
    <div className="editor-inline-toolbar">
      {controls.map((control) => (
        <button
          key={control.title}
          type="button"
          title={control.title}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            control.onClick();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className={cn(
            'editor-inline-toolbar__button',
            control.active && 'editor-inline-toolbar__button--active',
          )}
        >
          {control.label}
        </button>
      ))}
    </div>
  );
}

function CanvasImageBlock({
  block,
  lessonId,
  pageId,
}: {
  block: Block;
  lessonId: string;
  pageId: string;
}) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.auth.user?.id ?? null);
  const courseId = useAppSelector((state) => state.editor.draft?.course_id ?? null);
  const content = block.content as {
    url?: string;
    width?: number;
    height?: number;
    alt?: string;
    altText?: string;
    caption?: string;
  };
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileSelected(file: File) {
    if (!userId || !courseId) {
      setUploadError('Please sign in before uploading images.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const publicUrl = await uploadBlockImage({
        file,
        userId,
        courseId,
        lessonId,
        pageId,
        blockId: block.id,
      });

      const {
        alt: _legacyAlt,
        altText: _legacyAltText,
        caption: _legacyCaption,
        ...rest
      } = content;

      dispatch(
        updateBlock({
          lessonId,
          pageId,
          block: {
            ...block,
            content: {
              ...rest,
              url: publicUrl,
            },
          },
        }),
      );
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Image upload failed.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  return (
    <div className="editor-inline-image" onClick={(event) => event.stopPropagation()}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFileSelected(file);
          }
        }}
      />

      {content.url ? (
        <div className="editor-inline-image__frame">
          <img src={content.url} alt="Block asset" className="editor-inline-image__asset" />
        </div>
      ) : (
        <button
          type="button"
          className="editor-inline-image__placeholder"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading image…' : 'Upload an image'}
        </button>
      )}

      <div className="editor-inline-image__actions">
        <button
          type="button"
          className="editor-inline-secondary-button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {content.url ? 'Replace image' : 'Choose image'}
        </button>
        {content.url ? (
          <span className="text-xs text-muted-foreground truncate">
            {content.url}
          </span>
        ) : null}
      </div>

      {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
    </div>
  );
}

function CanvasCodeBlock({
  block,
  lessonId,
  pageId,
  isEditing,
}: {
  block: Block;
  lessonId: string;
  pageId: string;
  isEditing: boolean;
}) {
  const dispatch = useAppDispatch();
  const content = block.content as {
    language?: string;
    code?: string;
    showLineNumbers?: boolean;
  };
  const language = getSafeCodeLanguage(content.language);
  const code = typeof content.code === 'string' ? content.code : '';

  function updateContent(patch: Partial<typeof content>) {
    dispatch(
      updateBlock({
        lessonId,
        pageId,
        block: {
          ...block,
          content: {
            ...content,
            ...patch,
          },
        },
      }),
    );
  }

  return (
    <div className="editor-inline-code" onClick={(event) => event.stopPropagation()}>
      <div className="editor-inline-code__header">
        {isEditing ? (
          <select
            aria-label="Code language"
            value={language}
            onChange={(event) => updateContent({ language: event.target.value })}
            className="editor-inline-code__language"
          >
            {CODE_LANGUAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="editor-inline-code__badge">{language}</span>
        )}
      </div>

      {isEditing ? (
        <textarea
          aria-label="Code block editor"
          value={code}
          onChange={(event) => updateContent({ code: event.target.value })}
          className="editor-inline-code__editor"
          spellCheck={false}
          placeholder="# Enter code here"
        />
      ) : (
        <pre className="editor-inline-code__viewer">
          <code>{code || '# Double-click to edit this block'}</code>
        </pre>
      )}
    </div>
  );
}

function CanvasCodePlayground({
  block,
  lessonId,
  pageId,
  isEditing,
  isSelected,
}: {
  block: Block;
  lessonId: string;
  pageId: string;
  isEditing: boolean;
  isSelected: boolean;
}) {
  const dispatch = useAppDispatch();
  const content = block.content as {
    language?: string;
    starterCode?: string;
    initialCode?: string;
    expectedOutput?: string;
    testCases?: Array<{ expectedOutput?: string }>;
  };
  const language = getSafeCodeLanguage(content.language);
  const code = getPlaygroundCode(content);
  const expectedOutput = getExpectedOutput(content);
  const [runState, setRunState] = useState<RunState>(INITIAL_RUN_STATE);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  function updateContent(patch: Partial<typeof content>) {
    dispatch(
      updateBlock({
        lessonId,
        pageId,
        block: {
          ...block,
          content: {
            ...content,
            ...patch,
          },
        },
      }),
    );
  }

  async function handleRun() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setRunState({
      hasRun: false,
      isRunning: true,
      output: '',
      tone: 'neutral',
    });

    try {
      const result = await runCode(code, {
        language,
        signal: controller.signal,
      });

      if (!result.success) {
        setRunState({
          hasRun: true,
          isRunning: false,
          output: result.error,
          tone: 'danger',
        });
        return;
      }

      const isCorrect =
        expectedOutput.trim().length > 0 &&
        normalizeOutput(result.output) === normalizeOutput(expectedOutput);

      setRunState({
        hasRun: true,
        isRunning: false,
        output: result.output,
        tone: expectedOutput.trim().length > 0 ? (isCorrect ? 'success' : 'danger') : 'neutral',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setRunState({
          hasRun: true,
          isRunning: false,
          output: 'Run stopped.',
          tone: 'neutral',
        });
        return;
      }

      setRunState({
        hasRun: true,
        isRunning: false,
        output: error instanceof Error ? error.message : 'Run failed.',
        tone: 'danger',
      });
    }
  }

  function handleStop() {
    controllerRef.current?.abort();
  }

  return (
    <div className="editor-inline-code" onClick={(event) => event.stopPropagation()}>
      <div className="editor-inline-code__header">
        {isEditing ? (
          <select
            aria-label="Playground language"
            value={language}
            onChange={(event) => updateContent({ language: event.target.value })}
            className="editor-inline-code__language"
          >
            {CODE_LANGUAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="editor-inline-code__badge">{language}</span>
        )}
        {expectedOutput ? (
          <span className="editor-inline-code__hint">Expected: {expectedOutput}</span>
        ) : null}
      </div>

      {isEditing ? (
        <textarea
          aria-label="Code playground editor"
          value={code}
          onChange={(event) =>
            updateContent({
              starterCode: event.target.value,
              initialCode: event.target.value,
            })
          }
          className="editor-inline-code__editor"
          spellCheck={false}
          placeholder="# Enter code here"
        />
      ) : (
        <pre className="editor-inline-code__viewer">
          <code>{code || '# Double-click to edit this playground'}</code>
        </pre>
      )}

      <div className="editor-inline-code__footer">
        <button
          type="button"
          className="editor-inline-primary-button"
          onClick={() => void handleRun()}
          disabled={runState.isRunning}
        >
          {runState.isRunning ? 'Running…' : 'Run'}
        </button>
        <button
          type="button"
          className="editor-inline-secondary-button"
          onClick={handleStop}
          disabled={!runState.isRunning}
        >
          Stop
        </button>
        {!isEditing && isSelected ? (
          <span className="editor-inline-code__hint">Double-click to edit this playground.</span>
        ) : null}
      </div>

      {runState.hasRun ? (
        <div
          className={cn(
            'editor-inline-code__output',
            runState.tone === 'success' && 'editor-inline-code__output--success',
            runState.tone === 'danger' && 'editor-inline-code__output--danger',
          )}
        >
          <div className="editor-inline-code__output-label">Output</div>
          <pre className="editor-inline-code__output-body">{runState.output}</pre>
        </div>
      ) : null}
    </div>
  );
}

function getPlaygroundCode(content: {
  starterCode?: string;
  initialCode?: string;
}) {
  if (typeof content.starterCode === 'string') {
    return content.starterCode;
  }

  if (typeof content.initialCode === 'string') {
    return content.initialCode;
  }

  return '';
}

function getExpectedOutput(content: {
  expectedOutput?: string;
  testCases?: Array<{ expectedOutput?: string }>;
}) {
  if (typeof content.expectedOutput === 'string') {
    return content.expectedOutput;
  }

  const firstExpected = content.testCases?.[0]?.expectedOutput;
  return typeof firstExpected === 'string' ? firstExpected : '';
}

function normalizeOutput(value: string) {
  return value
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll(/\s+/g, '')
    .trim();
}
