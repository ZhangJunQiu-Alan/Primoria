import type { BlockType, VisibilityRule } from '@primoria/schema';
import type { LessonBlock } from '@/shared/lesson/types';

export function getDefaultVisibilityRule(order: number): VisibilityRule {
  return order <= 0 ? 'always' : 'afterPreviousCorrect';
}

export function getBlockVisibilityRule(
  block: Pick<LessonBlock, 'position' | 'visibilityRule'>,
): VisibilityRule {
  return block.visibilityRule ?? getDefaultVisibilityRule(block.position.order);
}

function isCanonicalQuestionBlockType(type: BlockType) {
  return type === 'multiple-choice' || type === 'true-false' || type === 'fill-blank' || type === 'matching';
}

export function isQuestionBlockType(type: LessonBlock['type']) {
  if (type === 'sorting') {
    return true;
  }
  return isCanonicalQuestionBlockType(type);
}

export function isQuestionBlock(block: Pick<LessonBlock, 'type'>) {
  return isQuestionBlockType(block.type);
}

export function seedCorrectState(blocks: LessonBlock[]) {
  return blocks.reduce<Record<string, boolean>>((state, block) => {
    if (!isQuestionBlock(block)) {
      state[block.id] = true;
    }
    return state;
  }, {});
}

export function computeBlockVisibility(
  blocks: LessonBlock[],
  correctState: Record<string, boolean>,
  checked: boolean,
) {
  const visibility = Array.from({ length: blocks.length }, () => true);

  for (let index = 0; index < blocks.length; index += 1) {
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
