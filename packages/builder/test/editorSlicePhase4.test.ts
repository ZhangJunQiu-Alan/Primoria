import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer, {
  openDraft,
  addBlock,
  removeBlock,
  duplicateBlock,
  updateBlock,
  updateBlockSettings,
  undo,
  redo,
  updateMetadata,
} from '../src/store/editorSlice';
import { FIXTURE_MINIMAL_COURSE } from '@primoria/schema';

const TEXT_BLOCK = {
  id: 'b1',
  type: 'text' as const,
  position: { order: 0 },
  content: { format: 'richtext', value: { ops: [{ insert: 'Hello\n' }] } },
};

function makeStore() {
  const store = configureStore({ reducer: { editor: editorReducer } });
  store.dispatch(openDraft(FIXTURE_MINIMAL_COURSE));
  return store;
}

// ─── Undo / Redo ──────────────────────────────────────────────────────────────

describe('undo / redo', () => {
  it('undo restores previous draft after addBlock', () => {
    const store = makeStore();
    store.dispatch(addBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', block: TEXT_BLOCK }));
    expect(store.getState().editor.draft!.lessons[0].pages[0].blocks).toHaveLength(1);
    store.dispatch(undo());
    expect(store.getState().editor.draft!.lessons[0].pages[0].blocks).toHaveLength(0);
  });

  it('redo re-applies the undone action', () => {
    const store = makeStore();
    store.dispatch(addBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', block: TEXT_BLOCK }));
    store.dispatch(undo());
    store.dispatch(redo());
    expect(store.getState().editor.draft!.lessons[0].pages[0].blocks).toHaveLength(1);
  });

  it('undo is no-op when past is empty', () => {
    const store = makeStore();
    const before = store.getState().editor.draft;
    store.dispatch(undo());
    expect(store.getState().editor.draft).toBe(before);
  });

  it('redo is no-op when future is empty', () => {
    const store = makeStore();
    store.dispatch(addBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', block: TEXT_BLOCK }));
    const afterAdd = store.getState().editor.draft;
    store.dispatch(redo()); // nothing in future yet
    expect(store.getState().editor.draft).toBe(afterAdd);
  });

  it('new action after undo clears the redo stack', () => {
    const store = makeStore();
    store.dispatch(addBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', block: TEXT_BLOCK }));
    store.dispatch(undo()); // push to future
    expect(store.getState().editor.future).toHaveLength(1);
    store.dispatch(updateMetadata({ title: 'New title' })); // clears future
    expect(store.getState().editor.future).toHaveLength(0);
  });

  it('openDraft resets history', () => {
    const store = makeStore();
    store.dispatch(addBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', block: TEXT_BLOCK }));
    store.dispatch(openDraft(FIXTURE_MINIMAL_COURSE));
    expect(store.getState().editor.past).toHaveLength(0);
    expect(store.getState().editor.future).toHaveLength(0);
  });

  it('updateBlock does NOT push history (high-frequency)', () => {
    const store = makeStore();
    store.dispatch(addBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', block: TEXT_BLOCK }));
    const pastLenBefore = store.getState().editor.past.length;
    store.dispatch(
      updateBlock({
        lessonId: 'lesson-1',
        pageId: 'page-1-0',
        block: { ...TEXT_BLOCK, content: { format: 'richtext', value: { ops: [{ insert: 'Changed\n' }] } } },
      }),
    );
    // past should not grow (updateBlock is high-frequency — no history push)
    expect(store.getState().editor.past.length).toBe(pastLenBefore);
  });
});

// ─── Duplicate ────────────────────────────────────────────────────────────────

describe('duplicateBlock', () => {
  it('inserts a clone right after the original', () => {
    const store = makeStore();
    store.dispatch(addBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', block: TEXT_BLOCK }));
    store.dispatch(
      duplicateBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', blockId: 'b1', newId: 'b1-copy' }),
    );
    const blocks = store.getState().editor.draft!.lessons[0].pages[0].blocks;
    expect(blocks).toHaveLength(2);
    expect(blocks[1].id).toBe('b1-copy');
  });

  it('re-indexes order after duplication', () => {
    const store = makeStore();
    store.dispatch(addBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', block: TEXT_BLOCK }));
    store.dispatch(
      duplicateBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', blockId: 'b1', newId: 'b1-copy' }),
    );
    const blocks = store.getState().editor.draft!.lessons[0].pages[0].blocks;
    expect(blocks.map((b) => b.position.order)).toEqual([0, 1]);
  });

  it('selects the duplicate after creation', () => {
    const store = makeStore();
    store.dispatch(addBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', block: TEXT_BLOCK }));
    store.dispatch(
      duplicateBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', blockId: 'b1', newId: 'clone' }),
    );
    expect(store.getState().editor.selectedBlockId).toBe('clone');
  });
});

// ─── Block settings ───────────────────────────────────────────────────────────

describe('updateBlockSettings', () => {
  it('defaults the first added block to always visible', () => {
    const store = makeStore();
    store.dispatch(addBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', block: TEXT_BLOCK }));
    const block = store.getState().editor.draft!.lessons[0].pages[0].blocks[0];
    expect(block.visibilityRule).toBe('always');
  });

  it('defaults later blocks to afterPreviousCorrect', () => {
    const store = makeStore();
    store.dispatch(addBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', block: TEXT_BLOCK }));
    store.dispatch(
      addBlock({
        lessonId: 'lesson-1',
        pageId: 'page-1-0',
        block: {
          ...TEXT_BLOCK,
          id: 'b2',
          position: { order: 1 },
        },
      }),
    );
    const block = store.getState().editor.draft!.lessons[0].pages[0].blocks[1];
    expect(block.visibilityRule).toBe('afterPreviousCorrect');
  });

  it('sets visibilityRule', () => {
    const store = makeStore();
    store.dispatch(addBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', block: TEXT_BLOCK }));
    store.dispatch(
      updateBlockSettings({
        lessonId: 'lesson-1',
        pageId: 'page-1-0',
        blockId: 'b1',
        visibilityRule: 'afterPreviousCorrect',
      }),
    );
    const block = store.getState().editor.draft!.lessons[0].pages[0].blocks[0];
    expect(block.visibilityRule).toBe('afterPreviousCorrect');
  });

});

// ─── removeBlock ─────────────────────────────────────────────────────────────

describe('removeBlock pushes history', () => {
  it('can undo a block deletion', () => {
    const store = makeStore();
    store.dispatch(addBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', block: TEXT_BLOCK }));
    store.dispatch(removeBlock({ lessonId: 'lesson-1', pageId: 'page-1-0', blockId: 'b1' }));
    expect(store.getState().editor.draft!.lessons[0].pages[0].blocks).toHaveLength(0);
    store.dispatch(undo()); // undo remove
    expect(store.getState().editor.draft!.lessons[0].pages[0].blocks).toHaveLength(1);
  });
});
