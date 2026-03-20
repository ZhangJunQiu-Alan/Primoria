import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer, {
  openDraft,
  closeDraft,
  selectBlock,
  addBlock,
  removeBlock,
  updateBlock,
  reorderBlocks,
} from '../src/store/editorSlice';
import { FIXTURE_MINIMAL_COURSE } from '@primoria/schema';

function makeStore() {
  return configureStore({ reducer: { editor: editorReducer } });
}

describe('editorSlice', () => {
  it('starts with null draft', () => {
    const store = makeStore();
    expect(store.getState().editor.draft).toBeNull();
  });

  it('openDraft sets draft and clears dirty', () => {
    const store = makeStore();
    store.dispatch(openDraft(FIXTURE_MINIMAL_COURSE));
    expect(store.getState().editor.draft?.course_id).toBe('fixture-minimal');
    expect(store.getState().editor.isDirty).toBe(false);
  });

  it('closeDraft clears everything', () => {
    const store = makeStore();
    store.dispatch(openDraft(FIXTURE_MINIMAL_COURSE));
    store.dispatch(closeDraft());
    expect(store.getState().editor.draft).toBeNull();
    expect(store.getState().editor.selectedBlockId).toBeNull();
  });

  it('selectBlock sets selectedBlockId', () => {
    const store = makeStore();
    store.dispatch(selectBlock('b-123'));
    expect(store.getState().editor.selectedBlockId).toBe('b-123');
  });

  it('addBlock appends block and marks dirty', () => {
    const store = makeStore();
    store.dispatch(openDraft(FIXTURE_MINIMAL_COURSE));
    store.dispatch(
      addBlock({
        lessonId: 'lesson-1',
        pageId: 'page-1-0',
        block: {
          id: 'new-block',
          type: 'text',
          position: { order: 0 },
          content: { format: 'richtext', value: { ops: [] } },
        },
      }),
    );
    const page = store.getState().editor.draft!.lessons[0].pages[0];
    expect(page.blocks).toHaveLength(1);
    expect(page.blocks[0].id).toBe('new-block');
    expect(store.getState().editor.isDirty).toBe(true);
  });

  it('removeBlock removes block by id and marks dirty', () => {
    const store = makeStore();
    store.dispatch(openDraft(FIXTURE_MINIMAL_COURSE));
    store.dispatch(
      addBlock({
        lessonId: 'lesson-1',
        pageId: 'page-1-0',
        block: { id: 'b-rm', type: 'text', position: { order: 0 }, content: { format: 'richtext', value: { ops: [] } } },
      }),
    );
    store.dispatch(removeBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', blockId: 'b-rm' }));
    const page = store.getState().editor.draft!.lessons[0].pages[0];
    expect(page.blocks).toHaveLength(0);
  });

  it('removeBlock clears selectedBlockId if removed block was selected', () => {
    const store = makeStore();
    store.dispatch(openDraft(FIXTURE_MINIMAL_COURSE));
    store.dispatch(
      addBlock({
        lessonId: 'lesson-1',
        pageId: 'page-1-0',
        block: { id: 'sel', type: 'text', position: { order: 0 }, content: { format: 'richtext', value: { ops: [] } } },
      }),
    );
    store.dispatch(selectBlock('sel'));
    store.dispatch(removeBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', blockId: 'sel' }));
    expect(store.getState().editor.selectedBlockId).toBeNull();
  });

  it('updateBlock replaces block content', () => {
    const store = makeStore();
    store.dispatch(openDraft(FIXTURE_MINIMAL_COURSE));
    store.dispatch(
      addBlock({
        lessonId: 'lesson-1',
        pageId: 'page-1-0',
        block: { id: 'upd', type: 'text', position: { order: 0 }, content: { format: 'richtext', value: { ops: [] } } },
      }),
    );
    store.dispatch(
      updateBlock({
        lessonId: 'lesson-1',
        pageId: 'page-1-0',
        block: { id: 'upd', type: 'text', position: { order: 0 }, content: { format: 'richtext', value: { ops: [{ insert: 'Hi\n' }] } } },
      }),
    );
    const block = store.getState().editor.draft!.lessons[0].pages[0].blocks[0];
    const content = block.content as { value: { ops: unknown[] } };
    expect(content.value.ops).toHaveLength(1);
  });

  it('reorderBlocks reorders and updates position.order', () => {
    const store = makeStore();
    store.dispatch(openDraft(FIXTURE_MINIMAL_COURSE));
    for (const id of ['b0', 'b1', 'b2']) {
      store.dispatch(
        addBlock({
          lessonId: 'lesson-1',
          pageId: 'page-1-0',
          block: { id, type: 'text', position: { order: 0 }, content: { format: 'richtext', value: { ops: [] } } },
        }),
      );
    }
    store.dispatch(reorderBlocks({ lessonId: 'lesson-1', pageId: 'page-1-0', orderedIds: ['b2', 'b0', 'b1'] }));
    const blocks = store.getState().editor.draft!.lessons[0].pages[0].blocks;
    expect(blocks.map((b) => b.id)).toEqual(['b2', 'b0', 'b1']);
    expect(blocks.map((b) => b.position.order)).toEqual([0, 1, 2]);
  });
});
