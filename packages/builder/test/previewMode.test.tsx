import { describe, expect, it } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SCHEMA_URL, SCHEMA_VERSION, type Course } from '@primoria/schema';
import editorReducer, { openDraft } from '../src/store/editorSlice';
import { PreviewMode } from '../src/features/editor/preview/PreviewMode';

function renderPreview(
  course: Course,
  options: { pageId?: string; onSelectPage?: (pageId: string) => void } = {},
) {
  const user = userEvent.setup();
  const store = configureStore({
    reducer: { editor: editorReducer },
  });

  store.dispatch(openDraft(course));

  render(
    <Provider store={store}>
      <PreviewMode
        lessonId="lesson-1"
        pageId={options.pageId ?? 'page-1'}
        onSelectPage={options.onSelectPage}
      />
    </Provider>,
  );

  return { user, store };
}

describe('PreviewMode visibility gating', () => {
  it('reveals gated blocks after the previous question is answered correctly', async () => {
    const { user } = renderPreview(courseFixture);

    expect(screen.getByText('The earth is round.')).toBeInTheDocument();
    expect(screen.queryByText('Unlocked block')).not.toBeInTheDocument();
    expect(screen.queryByText('Trailing block')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('True'));
    await user.click(screen.getByRole('button', { name: /check/i }));

    expect(await screen.findByText('Unlocked block')).toBeInTheDocument();
    expect(screen.getByText('Trailing block')).toBeInTheDocument();
  });

  it('navigates between lesson pages inside the learner preview stage', async () => {
    const visitedPages: string[] = [];
    const { user } = renderPreview(courseFixture, {
      onSelectPage: (nextPageId) => visitedPages.push(nextPageId),
    });

    expect(screen.getByText('The earth is round.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^next$/i }));

    expect(await screen.findByText('Second page content')).toBeInTheDocument();
    expect(visitedPages).toContain('page-2');
    expect(screen.getByRole('button', { name: /^prev$/i })).toBeEnabled();
  });
});

const courseFixture: Course = {
  $schema: SCHEMA_URL,
  schema_version: SCHEMA_VERSION,
  course_id: 'course-preview',
  metadata: {
    title: 'Preview visibility test',
    description: 'Ensures gated blocks unlock in learner preview.',
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
              id: 'q1',
              type: 'true-false',
              position: { order: 0 },
              visibilityRule: 'always',
              content: {
                statement: 'The earth is round.',
                isTrue: true,
              },
            },
            {
              id: 'b2',
              type: 'text',
              position: { order: 1 },
              visibilityRule: 'afterPreviousCorrect',
              content: {
                format: 'richtext',
                value: {
                  ops: [{ insert: 'Unlocked block' }],
                },
              },
            },
            {
              id: 'b3',
              type: 'text',
              position: { order: 2 },
              visibilityRule: 'afterPreviousCorrect',
              content: {
                format: 'richtext',
                value: {
                  ops: [{ insert: 'Trailing block' }],
                },
              },
            },
          ],
        },
        {
          page_id: 'page-2',
          order: 1,
          blocks: [
            {
              id: 'page-two-text',
              type: 'text',
              position: { order: 0 },
              visibilityRule: 'always',
              content: {
                format: 'richtext',
                value: {
                  ops: [{ insert: 'Second page content' }],
                },
              },
            },
          ],
        },
      ],
    },
  ],
};
