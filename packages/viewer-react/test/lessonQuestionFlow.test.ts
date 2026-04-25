import type { LessonBlock } from '@/shared/lesson/types';
import {
  buildWrongReviewItems,
  createLessonPageSession,
  deriveLessonPageState,
  ensureLessonPageSession,
  evaluateQuestionBlock,
  stepLessonPageSession,
  updateQuestionResponse,
} from '@/shared/lesson/questionFlow';

function buildBlocks(): LessonBlock[] {
  return [
    {
      id: 'mc-1',
      type: 'multiple-choice',
      position: { order: 0 },
      content: {
        question: 'Question 1',
        explanation: 'Question 1 explanation.',
        options: [
          { id: 'a', text: 'A', isCorrect: true },
          { id: 'b', text: 'B', isCorrect: false },
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
  ];
}

describe('questionFlow', () => {
  it('lets an incorrect reviewed question advance to the next question on the second check', () => {
    const blocks = buildBlocks();
    let session = createLessonPageSession(blocks);

    session = updateQuestionResponse(blocks, session, 'mc-1', ['b']);
    expect(deriveLessonPageState(blocks, session).primaryAction).toBe('evaluate-question');

    session = stepLessonPageSession(blocks, session);
    expect(session.phase).toBe('review');
    expect(session.evaluations['mc-1']).toMatchObject({
      isCorrect: false,
      explanation: 'Question 1 explanation.',
    });
    expect(deriveLessonPageState(blocks, session).primaryAction).toBe('next-question');

    session = stepLessonPageSession(blocks, session);
    expect(session.phase).toBe('answering');
    expect(session.currentQuestionIndex).toBe(1);
    expect(deriveLessonPageState(blocks, session).primaryAction).toBe('disabled');
  });

  it('keeps explanations for the same lesson session and drops stale state when the lesson changes', () => {
    const blocks = buildBlocks();
    let session = createLessonPageSession(blocks);

    session = updateQuestionResponse(blocks, session, 'mc-1', ['a']);
    session = stepLessonPageSession(blocks, session);

    const sameLessonSession = ensureLessonPageSession(blocks, session);
    expect(sameLessonSession.evaluations['mc-1']?.explanation).toBe('Question 1 explanation.');

    const otherLessonBlocks: LessonBlock[] = [
      {
        id: 'mc-2',
        type: 'multiple-choice',
        position: { order: 0 },
        content: {
          question: 'New lesson question',
          options: [{ id: 'new-a', text: 'A', isCorrect: true }],
        },
      },
    ];

    const resetSession = ensureLessonPageSession(otherLessonBlocks, session);
    expect(resetSession.responses).toEqual({});
    expect(resetSession.evaluations).toEqual({});
    expect(resetSession.currentQuestionIndex).toBe(0);
    expect(resetSession.phase).toBe('answering');
    expect(resetSession.pageCompleted).toBe(false);
  });

  it('does not fabricate explanations for matching questions', () => {
    const matchingBlock: LessonBlock = {
      id: 'match-1',
      type: 'matching',
      position: { order: 0 },
      content: {
        pairs: [
          { id: 'pair-1', left: 'A', right: 'Alpha' },
          { id: 'pair-2', left: 'B', right: 'Beta' },
        ],
      },
    };

    expect(
      evaluateQuestionBlock(matchingBlock, {
        'pair-1': 'Alpha',
        'pair-2': 'Beta',
      }),
    ).toEqual(
      expect.objectContaining({
        isCorrect: true,
        review: {
          kind: 'matching',
          prompt: '',
          explanation: undefined,
          selectedAnswer: 'A -> Alpha | B -> Beta',
          correctAnswer: 'A -> Alpha | B -> Beta',
          rows: [
            { id: 'pair-1', left: 'A', selectedRight: 'Alpha', correctRight: 'Alpha', isCorrect: true },
            { id: 'pair-2', left: 'B', selectedRight: 'Beta', correctRight: 'Beta', isCorrect: true },
          ],
        },
      }),
    );
  });

  it('builds wrong-review items only for incorrect answers and includes matching row feedback', () => {
    const matchingBlock: LessonBlock = {
      id: 'match-1',
      type: 'matching',
      position: { order: 0 },
      content: {
        pairs: [
          { id: 'pair-1', left: 'A', right: 'Alpha' },
          { id: 'pair-2', left: 'B', right: 'Beta' },
        ],
      },
    };

    let session = createLessonPageSession([matchingBlock]);
    session = updateQuestionResponse([matchingBlock], session, 'match-1', {
      'pair-1': 'Alpha',
      'pair-2': 'Alpha',
    });
    session = stepLessonPageSession([matchingBlock], session);

    expect(
      buildWrongReviewItems(
        [{ page_id: 'page-1', blocks: [matchingBlock] }],
        { 'page-1': session },
      ),
    ).toEqual([
      {
        blockId: 'match-1',
        review: {
          kind: 'matching',
          prompt: '',
          explanation: undefined,
          selectedAnswer: 'A -> Alpha | B -> Alpha',
          correctAnswer: 'A -> Alpha | B -> Beta',
          rows: [
            { id: 'pair-1', left: 'A', selectedRight: 'Alpha', correctRight: 'Alpha', isCorrect: true },
            { id: 'pair-2', left: 'B', selectedRight: 'Alpha', correctRight: 'Beta', isCorrect: false },
          ],
        },
      },
    ]);
  });

  it('surfaces next-page and complete-lesson as primary actions only after the page is fully completed', () => {
    const blocks = buildBlocks();
    let session = createLessonPageSession(blocks);

    session = updateQuestionResponse(blocks, session, 'mc-1', ['a']);
    session = stepLessonPageSession(blocks, session);
    session = stepLessonPageSession(blocks, session);
    session = updateQuestionResponse(blocks, session, 'tf-1', true);

    expect(deriveLessonPageState(blocks, session, { isLastPage: false }).primaryAction).toBe('evaluate-question');

    session = stepLessonPageSession(blocks, session);

    expect(session.pageCompleted).toBe(true);
    expect(deriveLessonPageState(blocks, session, { isLastPage: false }).primaryAction).toBe('next-page');
    expect(deriveLessonPageState(blocks, session, { isLastPage: true }).primaryAction).toBe('complete-lesson');
  });

  it('lets empty pages advance immediately', () => {
    const session = createLessonPageSession([]);

    expect(deriveLessonPageState([], session, { isLastPage: false }).primaryAction).toBe('next-page');
    expect(deriveLessonPageState([], session, { isLastPage: true }).primaryAction).toBe('complete-lesson');
  });
});
