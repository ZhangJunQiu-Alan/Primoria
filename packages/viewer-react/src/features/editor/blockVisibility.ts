import type { Block, BlockType, VisibilityRule } from '@primoria/schema';

export const VISIBILITY_LABELS: Record<VisibilityRule, string> = {
  always: 'Always visible',
  afterPreviousCorrect: 'After previous correct',
};

export function getDefaultVisibilityRule(order: number): VisibilityRule {
  return order <= 0 ? 'always' : 'afterPreviousCorrect';
}

export function getBlockVisibilityRule(
  block: Pick<Block, 'position' | 'visibilityRule'>,
): VisibilityRule {
  return block.visibilityRule ?? getDefaultVisibilityRule(block.position.order);
}

export function isQuestionBlockType(type: BlockType): boolean {
  return (
    type === 'multiple-choice' ||
    type === 'true-false' ||
    type === 'fill-blank' ||
    type === 'matching'
  );
}

export function isQuestionBlock(block: Pick<Block, 'type'>): boolean {
  return isQuestionBlockType(block.type);
}

export function seedCorrectState(blocks: Block[]): Record<string, boolean> {
  return blocks.reduce<Record<string, boolean>>((state, block) => {
    if (!isQuestionBlock(block)) {
      state[block.id] = true;
    }
    return state;
  }, {});
}

export function computeBlockVisibility(
  blocks: Block[],
  correctState: Record<string, boolean>,
  checked: boolean,
): boolean[] {
  const visibility = Array.from({ length: blocks.length }, () => true);

  for (let index = 0; index < blocks.length; index += 1) {
    const previousVisible = index === 0 ? true : visibility[index - 1] ?? false;
    if (!previousVisible) {
      visibility[index] = false;
      continue;
    }

    const block = blocks[index]!;
    if (getBlockVisibilityRule(block) !== 'afterPreviousCorrect') {
      visibility[index] = true;
      continue;
    }

    if (!checked) {
      visibility[index] = false;
      continue;
    }

    if (index === 0) {
      visibility[index] = true;
      continue;
    }

    const previousBlock = blocks[index - 1]!;
    visibility[index] = correctState[previousBlock.id] === true;
  }

  return visibility;
}
