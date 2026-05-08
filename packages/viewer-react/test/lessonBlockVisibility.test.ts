import type { Block } from '@primoria/schema';
import { computeBlockVisibility } from '@/shared/lesson/blockVisibility';

describe('computeBlockVisibility', () => {
  it('hides only blocks marked hidden', () => {
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
        visibilityRule: 'hidden',
        content: {
          format: 'richtext',
          value: { ops: [{ insert: 'Hidden block\n' }] },
        },
      },
      {
        id: 'text-2',
        type: 'text',
        position: { order: 2 },
        visibilityRule: 'always',
        content: {
          format: 'richtext',
          value: { ops: [{ insert: 'Visible block\n' }] },
        },
      },
    ];

    expect(computeBlockVisibility(blocks, {}, true)).toEqual([true, false, true]);
  });
});
