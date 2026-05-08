import type { Block, BlockType, VisibilityRule } from '@primoria/schema';

export function getDefaultVisibilityRule(order: number): VisibilityRule {
  void order;
  return 'always';
}

export function getBlockVisibilityRule(
  block: Pick<Block, 'position' | 'visibilityRule'>,
): VisibilityRule {
  return block.visibilityRule ?? getDefaultVisibilityRule(block.position.order);
}

export function isBlockVisibleInPublishedCourse(
  block: Pick<Block, 'position' | 'visibilityRule'>,
) {
  return getBlockVisibilityRule(block) !== 'hidden';
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
  void correctState;
  void checked;
  return blocks.map((block) => isBlockVisibleInPublishedCourse(block));
}
