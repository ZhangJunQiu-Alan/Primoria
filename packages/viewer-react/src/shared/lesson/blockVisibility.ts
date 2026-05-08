import type { BlockType, VisibilityRule } from '@primoria/schema';
import type { LessonBlock } from '@/shared/lesson/types';

export function getDefaultVisibilityRule(order: number): VisibilityRule {
  void order;
  return 'always';
}

export function getBlockVisibilityRule(
  block: Pick<LessonBlock, 'position' | 'visibilityRule'>,
): VisibilityRule {
  return block.visibilityRule ?? getDefaultVisibilityRule(block.position.order);
}

export function isBlockVisibleInPublishedCourse(
  block: Pick<LessonBlock, 'position' | 'visibilityRule'>,
) {
  return getBlockVisibilityRule(block) !== 'hidden';
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
  void correctState;
  void checked;
  return blocks.map((block) => isBlockVisibleInPublishedCourse(block));
}
