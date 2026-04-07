import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { LessonRuntimePlayer, type LessonCompletionSummary } from '@/shared/lesson/LessonRuntimePlayer';
import type { CommunityNote } from '@/shared/api/viewer/types';
import type { LessonRuntimeData } from '@/shared/lesson/types';
import { createAppStore } from '@/shared/state/store';

const generateTutorReplyStreamMock = vi.fn();

vi.mock('@/shared/api/geminiClient', () => ({
  generateTutorReplyStream: (...args: unknown[]) => generateTutorReplyStreamMock(...args),
}));

function createRuntimeFixture(): LessonRuntimeData {
  return {
    lessonId: 'lesson-runtime-fixture',
    courseId: 'course-runtime-fixture',
    title: 'Focused Runtime Lesson',
    xpReward: 80,
    durationSeconds: 600,
    pages: [
      {
        page_id: 'page-1',
        order: 0,
        title: 'Page 1',
        blocks: [
          {
            id: 'mc-1',
            type: 'multiple-choice',
            position: { order: 0 },
            content: {
              question: 'Question 1',
              explanation: 'Question 1 explanation.',
              options: [
                { id: 'mc-1-a', text: 'Correct option', isCorrect: true },
                { id: 'mc-1-b', text: 'Wrong option', isCorrect: false },
              ],
            },
          },
          {
            id: 'tf-1',
            type: 'true-false',
            position: { order: 1 },
            content: {
              statement: 'Question 2',
              isTrue: true,
              explanation: 'Question 2 explanation.',
            },
          },
        ],
      },
      {
        page_id: 'page-2',
        order: 1,
        title: 'Page 2',
        blocks: [
          {
            id: 'match-1',
            type: 'matching',
            position: { order: 0 },
            content: {
              pairs: [
                { id: 'pair-1', left: 'A', right: 'Alpha' },
                { id: 'pair-2', left: 'B', right: 'Beta' },
              ],
            },
          },
        ],
      },
    ],
  };
}

function renderRuntime(
  options: {
    initialNote?: CommunityNote | null;
    onComplete?: (summary: LessonCompletionSummary) => void;
    onSaveNote?: (body: string) => void;
  } = {},
) {
  const store = createAppStore();
  const data = createRuntimeFixture();

  function Harness() {
    const [note, setNote] = useState<CommunityNote | null>(options.initialNote ?? null);

    return (
      <LessonRuntimePlayer
        data={data}
        onExit={() => {}}
        onComplete={options.onComplete ?? (() => {})}
        lessonNote={note}
        onSaveNote={(body) => {
          options.onSaveNote?.(body);
          setNote({
            id: note?.id ?? 'lesson-note-1',
            title: note?.title ?? data.title,
            body,
            room_id: null,
            lesson_id: data.lessonId,
            updated_at: new Date().toISOString(),
          });
        }}
      />
    );
  }

  return render(
    <Provider store={store}>
      <Harness />
    </Provider>,
  );
}

describe('LessonRuntimePlayer', () => {
  beforeEach(() => {
    generateTutorReplyStreamMock.mockReset();
    generateTutorReplyStreamMock.mockImplementation(async (_history, handlers) => {
      handlers?.onToken?.('Grounded answer');
      const payload = { threadId: 'lesson-ai-thread', reply: 'Grounded answer', usedTools: [] };
      handlers?.onFinal?.(payload);
      return payload;
    });
  });

  it('renders the three-button footer, checks one question at a time, and advances pages through the single next-step action', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn<(summary: LessonCompletionSummary) => void>();
    renderRuntime({ onComplete });

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ask AI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();

    const initialDots = screen.getAllByTestId('lesson-progress-dot');
    expect(initialDots).toHaveLength(2);
    expect(initialDots[0]).toHaveAttribute('data-state', 'active');
    expect(initialDots[1]).toHaveAttribute('data-state', 'inactive');

    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.queryByText('Question 2')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Correct option' }));
    await user.click(screen.getByRole('button', { name: 'Next step' }));

    expect(await screen.findByText('Question 1 explanation.')).toBeInTheDocument();
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.queryByText('Question 2')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next step' }));
    expect(await screen.findByText('Question 2')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'True' }));
    await user.click(screen.getByRole('button', { name: 'Next step' }));
    expect(await screen.findByText('Question 2 explanation.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next step' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Next step' }));
    expect(await screen.findByText('A')).toBeInTheDocument();

    const updatedDots = screen.getAllByTestId('lesson-progress-dot');
    expect(updatedDots[0]).toHaveAttribute('data-state', 'inactive');
    expect(updatedDots[1]).toHaveAttribute('data-state', 'active');

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, 'Alpha');
    await user.selectOptions(selects[1]!, 'Alpha');
    await user.click(screen.getByRole('button', { name: 'Next step' }));

    expect(screen.getByText('Not correct yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Complete' }));

    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({
        correctCount: 2,
        totalCount: 3,
        pageCount: 2,
      }),
    );
  });

  it('opens the ask-ai sheet, keeps lesson-scoped chat history, and closes the note sheet when ask-ai opens', async () => {
    const user = userEvent.setup();
    renderRuntime();

    await user.click(screen.getByRole('button', { name: /Add note|添加笔记/i }));
    expect(await screen.findByRole('dialog', { name: /Notes|笔记/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ask AI' }));
    expect(screen.queryByRole('dialog', { name: /Notes|笔记/i })).not.toBeInTheDocument();

    const aiDialog = await screen.findByRole('dialog', { name: 'Ask AI' });
    expect(within(aiDialog).getByTestId('lesson-ai-input')).toBeInTheDocument();
    expect(within(aiDialog).getByRole('button', { name: /Reset Ask AI|重置问AI/i })).toBeInTheDocument();

    await user.type(within(aiDialog).getByTestId('lesson-ai-input'), 'Explain this page');
    await user.click(within(aiDialog).getByTestId('lesson-ai-send'));

    expect(await within(aiDialog).findByText('Grounded answer')).toBeInTheDocument();
    expect(generateTutorReplyStreamMock).toHaveBeenCalledWith(
      [{ role: 'user', text: 'Explain this page' }],
      expect.any(Object),
      expect.objectContaining({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        allowModelFallback: false,
        context: expect.objectContaining({
          surface: 'lesson-runtime',
          lessonTitle: 'Focused Runtime Lesson',
          pageIndex: 1,
          pageCount: 2,
        }),
      }),
    );

    await user.click(screen.getByTestId('lesson-ai-backdrop'));
    expect(screen.queryByRole('dialog', { name: 'Ask AI' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ask AI' }));
    expect(await screen.findByText('Grounded answer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reset Ask AI|重置问AI/i }));
    expect(screen.queryByText('Grounded answer')).not.toBeInTheDocument();
  });

  it('opens the note sheet, saves the lesson note on close, and reloads the saved body on reopen', async () => {
    const user = userEvent.setup();
    const onSaveNote = vi.fn<(body: string) => void>();
    renderRuntime({ onSaveNote });

    await user.click(screen.getByRole('button', { name: /Add note|添加笔记/i }));
    expect(await screen.findByRole('dialog', { name: /Notes|笔记/i })).toBeInTheDocument();

    const textarea = screen.getByTestId('lesson-note-textarea');
    await user.type(textarea, 'Saved lesson note');
    await user.click(screen.getByTestId('lesson-note-backdrop'));

    await waitFor(() => expect(onSaveNote).toHaveBeenCalledWith('Saved lesson note'));

    await user.click(screen.getByRole('button', { name: /Add note|添加笔记/i }));
    expect(await screen.findByDisplayValue('Saved lesson note')).toBeInTheDocument();
  });

  it('does not persist an empty lesson note', async () => {
    const user = userEvent.setup();
    const onSaveNote = vi.fn<(body: string) => void>();
    renderRuntime({ onSaveNote });

    await user.click(screen.getByRole('button', { name: /Add note|添加笔记/i }));
    await user.click(screen.getByRole('button', { name: /Close notes|关闭笔记/i }));

    await waitFor(() => expect(onSaveNote).not.toHaveBeenCalled());
  });
});
