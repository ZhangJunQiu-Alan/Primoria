import { beforeEach, describe, expect, it } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import authReducer, { setSession } from '../src/store/authSlice';
import editorReducer, { closeDraft } from '../src/store/editorSlice';
import { EditorLayout } from '../src/features/editor/EditorLayout';
import { SCHEMA_URL, SCHEMA_VERSION, type Course } from '@primoria/schema';

function makeStore() {
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

  return store;
}

function renderEditor() {
  const user = userEvent.setup();
  const store = makeStore();

  render(
    <Provider store={store}>
      <MemoryRouter>
        <EditorLayout remoteCourse={courseFixture} />
      </MemoryRouter>
    </Provider>,
  );

  return { user, store };
}

beforeEach(() => {
  window.localStorage?.removeItem?.('primoria_draft_course-1');
});

describe('EditorLayout', () => {
  it('renders the botanical studio shell with library, canvas, and inspector', async () => {
    renderEditor();

    expect(await screen.findByLabelText(/block library/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open page 1/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^properties$/i)).toBeInTheDocument();
  });

  it('switches pages and inserts a block from the module library', async () => {
    const { user } = renderEditor();

    await screen.findByLabelText(/block library/i);

    await user.click(screen.getByRole('button', { name: /open page 2/i }));

    expect(screen.getByText(/this page is empty\. add the first block from the library\./i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add text/i }));

    expect(screen.queryByText(/this page is empty\. add the first block from the library\./i)).not.toBeInTheDocument();
    expect(screen.queryByText(/select a block to edit its properties/i)).not.toBeInTheDocument();
  });

  it('rehydrates the editor if the draft is cleared unexpectedly', async () => {
    const { store } = renderEditor();

    await screen.findByLabelText(/block library/i);

    act(() => {
      store.dispatch(closeDraft());
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/block library/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/loading editor/i)).not.toBeInTheDocument();
  });
});

const courseFixture: Course = {
  $schema: SCHEMA_URL,
  schema_version: SCHEMA_VERSION,
  course_id: 'course-1',
  metadata: {
    title: 'Introduction to Computer Science and Programming in Python',
    description: 'A botanical authoring workspace fixture.',
  },
  lessons: [
    {
      lesson_id: 'lesson-1',
      title: 'What is Computation and Python Basics',
      pages: [
        {
          page_id: 'page-1',
          order: 0,
          blocks: [
            {
              id: 'block-1',
              type: 'text',
              position: { order: 0 },
              content: {
                format: 'richtext',
                value: {
                  ops: [{ insert: 'Types of Knowledge\nDeclarative and imperative knowledge.' }],
                },
              },
            },
          ],
        },
        {
          page_id: 'page-2',
          order: 1,
          blocks: [],
        },
      ],
    },
    {
      lesson_id: 'lesson-2',
      title: 'Aspects of Programming Languages',
      pages: [
        {
          page_id: 'page-3',
          order: 0,
          blocks: [],
        },
      ],
    },
  ],
};
