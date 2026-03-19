import { describe, it, expect } from 'vitest';
import { BlockSchema, BLOCK_TYPES } from '../src/course/blocks';
import { FIXTURE_ALL_BLOCKS_COURSE } from '../src/fixtures/index';

describe('BLOCK_TYPES', () => {
  it('contains all 13 canonical types', () => {
    expect(BLOCK_TYPES).toHaveLength(13);
  });

  it('includes interactive-visual', () => {
    expect(BLOCK_TYPES).toContain('interactive-visual');
  });
});

describe('BlockSchema', () => {
  it('validates a minimal text block', () => {
    const result = BlockSchema.safeParse({
      id: 'b1',
      type: 'text',
      position: { order: 0 },
      content: { format: 'richtext', value: { ops: [] } },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown block type', () => {
    const result = BlockSchema.safeParse({
      id: 'b1',
      type: 'unknown-type',
      position: { order: 0 },
      content: {},
    });
    expect(result.success).toBe(false);
  });

  it('validates all blocks in FIXTURE_ALL_BLOCKS_COURSE', () => {
    const blocks = FIXTURE_ALL_BLOCKS_COURSE.lessons[0].pages[0].blocks;
    for (const block of blocks) {
      const result = BlockSchema.safeParse(block);
      expect(result.success, `block type ${block.type} failed`).toBe(true);
    }
  });
});
