import type { Block } from '@primoria/schema';
import { computeBlockVisibility, seedCorrectState } from '@/shared/lesson/blockVisibility';

describe('computeBlockVisibility', () => {
  it('keeps later gated blocks hidden when an earlier gated block is still hidden', () => {
    const blocks: Block[] = [
      {
        id: 'question-1',
        type: 'multiple-choice',
        position: { order: 0 },
        content: {
          question: 'Question 1',
          options: [{ id: 'option-1', text: 'A', isCorrect: true }],
        },
      },
      {
        id: 'text-1',
        type: 'text',
        position: { order: 1 },
        visibilityRule: 'afterPreviousCorrect',
        content: {
          format: 'richtext',
          value: { ops: [{ insert: 'Gated block 1\n' }] },
        },
      },
      {
        id: 'text-2',
        type: 'text',
        position: { order: 2 },
        visibilityRule: 'afterPreviousCorrect',
        content: {
          format: 'richtext',
          value: { ops: [{ insert: 'Gated block 2\n' }] },
        },
      },
    ];

    const correctState = {
      ...seedCorrectState(blocks),
      'question-1': false,
    };

    expect(computeBlockVisibility(blocks, correctState, true)).toEqual([true, false, false]);
  });
});
