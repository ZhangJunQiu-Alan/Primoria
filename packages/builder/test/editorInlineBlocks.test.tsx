import { describe, expect, it, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import authReducer, { setSession } from '../src/store/authSlice';
import editorReducer, { openDraft, selectBlock } from '../src/store/editorSlice';
import { BlockPreview } from '../src/features/editor/canvas/BlockPreview';
import { PropertyPanel } from '../src/features/editor/properties/PropertyPanel';
import { useAppSelector } from '../src/store';
import { richTextToPlainText } from '../src/features/editor/richText';
import { tipTapDocToRichTextValue } from '../src/features/editor/richText';
import { SCHEMA_URL, SCHEMA_VERSION, type Course } from '@primoria/schema';

const storageFns = vi.hoisted(() => ({
  from: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: storageFns.from,
    },
  },
}));

function makeStore(course: Course) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      editor: editorReducer,
    },
  });

  store.dispatch(
    setSession({
      user: {
        id: 'author-1',
        email: 'author@primoria.dev',
      } as never,
      session: null,
    }),
  );
  store.dispatch(openDraft(course));

  return store;
}

function BlockPreviewHarness({ blockId }: { blockId: string }) {
  const block = useAppSelector((state) =>
    state.editor.draft?.lessons[0]?.pages[0]?.blocks.find((entry) => entry.id === blockId),
  );

  if (!block) {
    return null;
  }

  return (
    <BlockPreview
      block={block}
      lessonId="lesson-1"
      pageId="page-1"
      isSelected
      onClick={() => undefined}
    />
  );
}

function InspectorPreviewHarness({ blockId }: { blockId: string }) {
  return (
    <>
      <BlockPreviewHarness blockId={blockId} />
      <PropertyPanel lessonId="lesson-1" pageId="page-1" />
    </>
  );
}

beforeEach(() => {
  storageFns.upload.mockReset();
  storageFns.getPublicUrl.mockReset();
  storageFns.from.mockReset();

  storageFns.upload.mockResolvedValue({ error: null });
  storageFns.getPublicUrl.mockReturnValue({
    data: { publicUrl: 'https://cdn.primoria.dev/block-image.png' },
  });
  storageFns.from.mockReturnValue({
    upload: storageFns.upload,
    getPublicUrl: storageFns.getPublicUrl,
  });
});

describe('Editor inline block workflows', () => {
  it('shows shared visibility controls for non-first blocks in properties', () => {
    const store = makeStore(courseFixture);
    store.dispatch(selectBlock('image-1'));

    render(
      <Provider store={store}>
        <PropertyPanel lessonId="lesson-1" pageId="page-1" />
      </Provider>,
    );

    expect(screen.getByText('Visibility')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('afterPreviousCorrect');
  });

  it('applies appearance changes to inline text blocks immediately', async () => {
    const user = userEvent.setup();
    const store = makeStore(courseFixture);
    store.dispatch(selectBlock('text-1'));
    const view = render(
      <Provider store={store}>
        <InspectorPreviewHarness blockId="text-1" />
      </Provider>,
    );

    await user.click(screen.getByRole('button', { name: '➡' }));

    const frame = view.container.querySelector('.editor-block-card__body > .text-right');
    expect(frame).not.toBeNull();
  });

  it('opens inline text editing on double click', async () => {
    const user = userEvent.setup();
    const store = makeStore(courseFixture);
    const view = render(
      <Provider store={store}>
        <BlockPreviewHarness blockId="text-1" />
      </Provider>,
    );

    await user.dblClick(screen.getByRole('button'));

    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    const editor = view.container.querySelector('.ProseMirror');
    expect(editor?.getAttribute('contenteditable')).toBe('true');
  });

  it('runs and stops the code playground inline', async () => {
    const user = userEvent.setup();
    render(
      <Provider store={makeStore(courseFixture)}>
        <BlockPreviewHarness blockId="playground-1" />
      </Provider>,
    );

    await user.click(screen.getByRole('button', { name: 'Run' }));
    await user.click(screen.getByRole('button', { name: 'Stop' }));

    expect(await screen.findByText('Run stopped.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Run' }));
    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('uploads image assets to supabase storage and updates the block', async () => {
    const store = makeStore(courseFixture);
    const view = render(
      <Provider store={store}>
        <BlockPreviewHarness blockId="image-1" />
      </Provider>,
    );

    const input = view.container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();

    fireEvent.change(input!, {
      target: {
        files: [new File(['image-bytes'], 'diagram.png', { type: 'image/png' })],
      },
    });

    await waitFor(() => {
      expect(storageFns.upload).toHaveBeenCalledTimes(1);
    });

    const imageBlock = store
      .getState()
      .editor.draft?.lessons[0]?.pages[0]?.blocks.find((block) => block.id === 'image-1');

    expect((imageBlock?.content as { url?: string }).url).toBe(
      'https://cdn.primoria.dev/block-image.png',
    );
    expect(storageFns.from).toHaveBeenCalledWith('course-block-images');
  });

  it('keeps the inspector scroll position stable when the selected block changes', () => {
    const store = makeStore(courseFixture);
    store.dispatch(selectBlock('text-1'));
    const view = render(
      <Provider store={store}>
        <PropertyPanel lessonId="lesson-1" pageId="page-1" />
      </Provider>,
    );

    const scrollContainer = view.container.querySelector('.editor-property-panel > div') as HTMLDivElement | null;
    expect(scrollContainer).not.toBeNull();
    if (!scrollContainer) {
      return;
    }

    scrollContainer.scrollTop = 240;
    act(() => {
      store.dispatch(selectBlock('image-1'));
    });

    expect(scrollContainer.scrollTop).toBe(240);
  });

  it('serializes tiptap content to a flutter-compatible delta string', () => {
    const value = tipTapDocToRichTextValue({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Title' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            {
              type: 'text',
              text: 'world',
              marks: [{ type: 'bold' }],
            },
          ],
        },
      ],
    });

    expect(typeof value).toBe('string');
    expect(richTextToPlainText(value)).toContain('Title');
    expect(richTextToPlainText(value)).toContain('Hello world');
  });
});

const courseFixture: Course = {
  $schema: SCHEMA_URL,
  schema_version: SCHEMA_VERSION,
  course_id: 'course-inline',
  metadata: {
    title: 'Inline editor fixture',
    description: 'Covers inline block editing flows.',
  },
  lessons: [
    {
      lesson_id: 'lesson-1',
      title: 'Lesson 1',
      pages: [
        {
          page_id: 'page-1',
          order: 0,
          blocks: [
            {
              id: 'text-1',
              type: 'text',
              position: { order: 0 },
              visibilityRule: 'always',
              content: {
                format: 'richtext',
                value: { ops: [{ insert: 'Editable text block\n' }] },
              },
            },
            {
              id: 'image-1',
              type: 'image',
              position: { order: 1 },
              visibilityRule: 'afterPreviousCorrect',
              content: {},
            },
            {
              id: 'playground-1',
              type: 'code-playground',
              position: { order: 2 },
              visibilityRule: 'afterPreviousCorrect',
              content: {
                language: 'python',
                starterCode: 'print(1 + 2)',
                initialCode: 'print(1 + 2)',
              },
            },
          ],
        },
      ],
    },
  ],
};
