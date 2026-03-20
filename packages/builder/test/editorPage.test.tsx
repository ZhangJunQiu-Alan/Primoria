import { describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import authReducer, { setSession } from '../src/store/authSlice';
import editorReducer from '../src/store/editorSlice';
import { SCHEMA_URL, SCHEMA_VERSION, type Course } from '@primoria/schema';

const queryMocks = vi.hoisted(() => ({
  useCourseForEditor: vi.fn(),
}));

vi.mock('@/queries/editor', () => queryMocks);

import { EditorPage } from '../src/pages/editor/EditorPage';

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

describe('EditorPage', () => {
  it('does not fall back to the loading shell when the auth session refreshes', async () => {
    queryMocks.useCourseForEditor.mockReturnValue({
      data: courseFixture,
      isLoading: false,
      error: null,
    });

    const store = makeStore();

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/editor/course-1']}>
          <Routes>
            <Route path="/editor/:courseId" element={<EditorPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(await screen.findByLabelText(/block library/i)).toBeInTheDocument();

    act(() => {
      store.dispatch(
        setSession({
          user: {
            id: 'author-1',
            email: 'author@primoria.dev',
          } as never,
          session: null,
        }),
      );
    });

    expect(await screen.findByLabelText(/block library/i)).toBeInTheDocument();
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
      ],
    },
  ],
};
