import { createSlice, current, type PayloadAction } from '@reduxjs/toolkit';
import { type Course, type Block, type CourseMetadata, type BlockStyle } from '@primoria/schema';
import { getDefaultVisibilityRule } from '@/features/editor/blockVisibility';

const MAX_HISTORY = 50;

interface EditorState {
  /**
   * The unsaved course draft being edited. Lives ONLY here — never in TanStack Query cache.
   * Null means no course is open.
   */
  draft: Course | null;

  /** Undo stack — past draft snapshots, most recent last. */
  past: Course[];

  /** Redo stack — future draft snapshots, most recent first. */
  future: Course[];

  /** ID of the currently focused block, or null. */
  selectedBlockId: string | null;

  /** True while an explicit save/publish persistence request is in flight. */
  isSaving: boolean;

  /** True if the draft has unsaved local changes. */
  isDirty: boolean;

  /** True when the editor is in learner-preview mode. */
  previewMode: boolean;
}

const initialState: EditorState = {
  draft: null,
  past: [],
  future: [],
  selectedBlockId: null,
  isSaving: false,
  isDirty: false,
  previewMode: false,
};

// ─── History helpers ──────────────────────────────────────────────────────────

/**
 * Push a plain-object snapshot of the current draft onto the undo stack.
 * Must use `current()` from Immer to capture the value before the mutation.
 */
function pushHistory(state: EditorState) {
  if (!state.draft) return;
  // `current()` returns a deep plain-object copy of the Immer proxy — safe to store.
  const snapshot = current(state.draft) as Course;
  state.past = [...state.past.slice(-(MAX_HISTORY - 1)), snapshot];
  state.future = [];
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    // ── Draft lifecycle ────────────────────────────────────────────────────────
    openDraft(state, action: PayloadAction<Course>) {
      state.draft = action.payload;
      state.past = [];
      state.future = [];
      state.selectedBlockId = null;
      state.isDirty = false;
      state.previewMode = false;
    },
    closeDraft(state) {
      state.draft = null;
      state.past = [];
      state.future = [];
      state.selectedBlockId = null;
      state.isDirty = false;
      state.previewMode = false;
    },
    togglePreview(state) {
      state.previewMode = !state.previewMode;
      state.selectedBlockId = null;
    },
    selectBlock(state, action: PayloadAction<string | null>) {
      state.selectedBlockId = action.payload;
    },
    markDirty(state) {
      state.isDirty = true;
    },
    markClean(state) {
      state.isDirty = false;
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.isSaving = action.payload;
    },

    // ── Undo / Redo ────────────────────────────────────────────────────────────
    undo(state) {
      if (state.past.length === 0 || !state.draft) return;
      state.future = [state.draft, ...state.future.slice(0, MAX_HISTORY - 1)];
      state.draft = state.past[state.past.length - 1]!;
      state.past = state.past.slice(0, -1);
      state.isDirty = true;
    },
    redo(state) {
      if (state.future.length === 0 || !state.draft) return;
      state.past = [...state.past.slice(-(MAX_HISTORY - 1)), state.draft];
      state.draft = state.future[0]!;
      state.future = state.future.slice(1);
      state.isDirty = true;
    },

    // ── Course settings ────────────────────────────────────────────────────────
    updateSettings(
      state,
      action: PayloadAction<{ theme?: 'light' | 'dark'; primaryColor?: string; fontFamily?: string }>,
    ) {
      if (!state.draft) return;
      pushHistory(state);
      state.draft.settings = { ...(state.draft.settings ?? {}), ...action.payload };
      state.isDirty = true;
    },

    // ── Course metadata ────────────────────────────────────────────────────────
    updateMetadata(state, action: PayloadAction<Partial<CourseMetadata>>) {
      if (!state.draft) return;
      pushHistory(state);
      state.draft.metadata = { ...state.draft.metadata, ...action.payload };
      state.isDirty = true;
    },

    // ── Lesson management ──────────────────────────────────────────────────────
    addLesson(
      state,
      action: PayloadAction<{ lessonId: string; pageId: string; title?: string }>,
    ) {
      if (!state.draft) return;
      pushHistory(state);
      const { lessonId, pageId, title } = action.payload;
      state.draft.lessons.push({
        lesson_id: lessonId,
        title: title ?? `Lesson ${state.draft.lessons.length + 1}`,
        pages: [{ page_id: pageId, order: 0, blocks: [] }],
      });
      state.isDirty = true;
    },
    removeLesson(state, action: PayloadAction<string>) {
      if (!state.draft) return;
      pushHistory(state);
      state.draft.lessons = state.draft.lessons.filter(
        (l) => l.lesson_id !== action.payload,
      );
      state.isDirty = true;
    },
    updateLessonTitle(state, action: PayloadAction<{ lessonId: string; title: string }>) {
      if (!state.draft) return;
      pushHistory(state);
      const lesson = state.draft.lessons.find(
        (l) => l.lesson_id === action.payload.lessonId,
      );
      if (lesson) {
        lesson.title = action.payload.title;
        state.isDirty = true;
      }
    },
    reorderLessons(state, action: PayloadAction<string[]>) {
      if (!state.draft) return;
      pushHistory(state);
      const map = new Map(state.draft.lessons.map((l) => [l.lesson_id, l]));
      state.draft.lessons = action.payload
        .map((id) => map.get(id))
        .filter((l): l is Course['lessons'][number] => l !== undefined);
      state.isDirty = true;
    },

    // ── Page management ────────────────────────────────────────────────────────
    addPage(state, action: PayloadAction<{ lessonId: string; pageId: string }>) {
      if (!state.draft) return;
      pushHistory(state);
      const lesson = state.draft.lessons.find(
        (l) => l.lesson_id === action.payload.lessonId,
      );
      if (!lesson) return;
      lesson.pages.push({
        page_id: action.payload.pageId,
        order: lesson.pages.length,
        blocks: [],
      });
      state.isDirty = true;
    },
    removePage(state, action: PayloadAction<{ lessonId: string; pageId: string }>) {
      if (!state.draft) return;
      const lesson = state.draft.lessons.find(
        (l) => l.lesson_id === action.payload.lessonId,
      );
      if (!lesson || lesson.pages.length <= 1) return;
      pushHistory(state);
      lesson.pages = lesson.pages
        .filter((p) => p.page_id !== action.payload.pageId)
        .map((p, i) => ({ ...p, order: i }));
      state.isDirty = true;
    },

    // ── Block management ───────────────────────────────────────────────────────
    updateBlock(
      state,
      action: PayloadAction<{ lessonId: string; pageId: string; block: Block }>,
    ) {
      if (!state.draft) return;
      const { lessonId, pageId, block } = action.payload;
      const lesson = state.draft.lessons.find((l) => l.lesson_id === lessonId);
      if (!lesson) return;
      const page = lesson.pages.find((p) => p.page_id === pageId);
      if (!page) return;
      const idx = page.blocks.findIndex((b) => b.id === block.id);
      if (idx !== -1) {
        page.blocks[idx] = block;
        state.isDirty = true;
        // Note: updateBlock is called on every keystroke; history is NOT pushed here.
        // Auto-save debounce + explicit Save/Undo provide the checkpoints.
      }
    },
    addBlock(
      state,
      action: PayloadAction<{ lessonId: string; pageId: string; block: Block }>,
    ) {
      if (!state.draft) return;
      pushHistory(state);
      const { lessonId, pageId, block } = action.payload;
      const lesson = state.draft.lessons.find((l) => l.lesson_id === lessonId);
      if (!lesson) return;
      const page = lesson.pages.find((p) => p.page_id === pageId);
      if (!page) return;
      page.blocks.push({
        ...block,
        visibilityRule:
          block.visibilityRule ?? getDefaultVisibilityRule(block.position.order),
      });
      state.isDirty = true;
    },
    removeBlock(
      state,
      action: PayloadAction<{ lessonId: string; pageId: string; blockId: string }>,
    ) {
      if (!state.draft) return;
      pushHistory(state);
      const { lessonId, pageId, blockId } = action.payload;
      const lesson = state.draft.lessons.find((l) => l.lesson_id === lessonId);
      if (!lesson) return;
      const page = lesson.pages.find((p) => p.page_id === pageId);
      if (!page) return;
      page.blocks = page.blocks.filter((b) => b.id !== blockId);
      if (state.selectedBlockId === blockId) state.selectedBlockId = null;
      state.isDirty = true;
    },
    duplicateBlock(
      state,
      action: PayloadAction<{ lessonId: string; pageId: string; blockId: string; newId: string }>,
    ) {
      if (!state.draft) return;
      pushHistory(state);
      const { lessonId, pageId, blockId, newId } = action.payload;
      const lesson = state.draft.lessons.find((l) => l.lesson_id === lessonId);
      if (!lesson) return;
      const page = lesson.pages.find((p) => p.page_id === pageId);
      if (!page) return;
      const idx = page.blocks.findIndex((b) => b.id === blockId);
      if (idx === -1) return;
      const original = page.blocks[idx]!;
      const clone: Block = {
        ...original,
        id: newId,
        position: { order: original.position.order + 0.5 },
      };
      page.blocks.splice(idx + 1, 0, clone);
      // Re-index order
      page.blocks = page.blocks.map((b, i) => ({ ...b, position: { order: i } }));
      state.selectedBlockId = newId;
      state.isDirty = true;
    },
    updateBlockStyle(
      state,
      action: PayloadAction<{ lessonId: string; pageId: string; blockId: string; style: Partial<BlockStyle> }>,
    ) {
      if (!state.draft) return;
      const { lessonId, pageId, blockId, style } = action.payload;
      const lesson = state.draft.lessons.find((l) => l.lesson_id === lessonId);
      if (!lesson) return;
      const page = lesson.pages.find((p) => p.page_id === pageId);
      if (!page) return;
      const block = page.blocks.find((b) => b.id === blockId);
      if (!block) return;
      block.style = { ...(block.style ?? {}), ...style };
      state.isDirty = true;
    },
    updateBlockSettings(
      state,
      action: PayloadAction<{
        lessonId: string;
        pageId: string;
        blockId: string;
        visibilityRule?: 'always' | 'hidden';
      }>,
    ) {
      if (!state.draft) return;
      const { lessonId, pageId, blockId, visibilityRule } = action.payload;
      const lesson = state.draft.lessons.find((l) => l.lesson_id === lessonId);
      if (!lesson) return;
      const page = lesson.pages.find((p) => p.page_id === pageId);
      if (!page) return;
      const block = page.blocks.find((b) => b.id === blockId);
      if (!block) return;
      if (visibilityRule !== undefined) block.visibilityRule = visibilityRule;
      state.isDirty = true;
    },
    reorderBlocks(
      state,
      action: PayloadAction<{ lessonId: string; pageId: string; orderedIds: string[] }>,
    ) {
      if (!state.draft) return;
      pushHistory(state);
      const { lessonId, pageId, orderedIds } = action.payload;
      const lesson = state.draft.lessons.find((l) => l.lesson_id === lessonId);
      if (!lesson) return;
      const page = lesson.pages.find((p) => p.page_id === pageId);
      if (!page) return;
      const blockMap = new Map(page.blocks.map((b) => [b.id, b]));
      page.blocks = orderedIds
        .map((id) => blockMap.get(id))
        .filter((b): b is Block => b !== undefined)
        .map((b, i) => ({ ...b, position: { order: i } }));
      state.isDirty = true;
    },
  },
});

export const {
  openDraft,
  closeDraft,
  selectBlock,
  markDirty,
  markClean,
  setSaving,
  togglePreview,
  undo,
  redo,
  updateMetadata,
  updateSettings,
  addLesson,
  removeLesson,
  updateLessonTitle,
  reorderLessons,
  addPage,
  removePage,
  updateBlock,
  addBlock,
  removeBlock,
  duplicateBlock,
  updateBlockStyle,
  updateBlockSettings,
  reorderBlocks,
} = editorSlice.actions;
export default editorSlice.reducer;
