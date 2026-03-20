import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer, {
  openDraft,
  addLesson,
  removeLesson,
  updateLessonTitle,
  reorderLessons,
  addPage,
  removePage,
  updateMetadata,
} from '../src/store/editorSlice';
import { FIXTURE_MINIMAL_COURSE } from '@primoria/schema';

function makeStore() {
  const store = configureStore({ reducer: { editor: editorReducer } });
  store.dispatch(openDraft(FIXTURE_MINIMAL_COURSE));
  return store;
}

describe('lesson management', () => {
  it('addLesson appends a new lesson with one empty page', () => {
    const store = makeStore();
    store.dispatch(addLesson({ lessonId: 'l2', pageId: 'p2-0' }));
    const lessons = store.getState().editor.draft!.lessons;
    expect(lessons).toHaveLength(2);
    expect(lessons[1].lesson_id).toBe('l2');
    expect(lessons[1].pages).toHaveLength(1);
    expect(lessons[1].pages[0].page_id).toBe('p2-0');
  });

  it('addLesson uses custom title when provided', () => {
    const store = makeStore();
    store.dispatch(addLesson({ lessonId: 'l2', pageId: 'p2-0', title: 'Custom Title' }));
    expect(store.getState().editor.draft!.lessons[1].title).toBe('Custom Title');
  });

  it('removeLesson removes the correct lesson', () => {
    const store = makeStore();
    store.dispatch(addLesson({ lessonId: 'l2', pageId: 'p2-0' }));
    store.dispatch(removeLesson('lesson-1'));
    const lessons = store.getState().editor.draft!.lessons;
    expect(lessons).toHaveLength(1);
    expect(lessons[0].lesson_id).toBe('l2');
  });

  it('updateLessonTitle changes title and marks dirty', () => {
    const store = makeStore();
    store.dispatch(updateLessonTitle({ lessonId: 'lesson-1', title: 'Renamed' }));
    expect(store.getState().editor.draft!.lessons[0].title).toBe('Renamed');
    expect(store.getState().editor.isDirty).toBe(true);
  });

  it('reorderLessons reorders correctly', () => {
    const store = makeStore();
    store.dispatch(addLesson({ lessonId: 'l2', pageId: 'p2-0' }));
    store.dispatch(addLesson({ lessonId: 'l3', pageId: 'p3-0' }));
    store.dispatch(reorderLessons(['l3', 'lesson-1', 'l2']));
    const ids = store.getState().editor.draft!.lessons.map((l) => l.lesson_id);
    expect(ids).toEqual(['l3', 'lesson-1', 'l2']);
  });
});

describe('page management', () => {
  it('addPage appends a new empty page to the lesson', () => {
    const store = makeStore();
    store.dispatch(addPage({ lessonId: 'lesson-1', pageId: 'new-page' }));
    const pages = store.getState().editor.draft!.lessons[0].pages;
    expect(pages).toHaveLength(2);
    expect(pages[1].page_id).toBe('new-page');
    expect(pages[1].blocks).toHaveLength(0);
  });

  it('removePage removes a page but not the last one', () => {
    const store = makeStore();
    store.dispatch(addPage({ lessonId: 'lesson-1', pageId: 'pg2' }));
    store.dispatch(removePage({ lessonId: 'lesson-1', pageId: 'page-1-0' }));
    const pages = store.getState().editor.draft!.lessons[0].pages;
    expect(pages).toHaveLength(1);
    expect(pages[0].page_id).toBe('pg2');
  });

  it('removePage keeps the last page intact', () => {
    const store = makeStore();
    store.dispatch(removePage({ lessonId: 'lesson-1', pageId: 'page-1-0' }));
    // only one page — should not be removed
    expect(store.getState().editor.draft!.lessons[0].pages).toHaveLength(1);
  });

  it('removePage re-indexes page order', () => {
    const store = makeStore();
    store.dispatch(addPage({ lessonId: 'lesson-1', pageId: 'pg2' }));
    store.dispatch(addPage({ lessonId: 'lesson-1', pageId: 'pg3' }));
    store.dispatch(removePage({ lessonId: 'lesson-1', pageId: 'page-1-0' }));
    const pages = store.getState().editor.draft!.lessons[0].pages;
    expect(pages.map((p) => p.order)).toEqual([0, 1]);
  });
});

describe('course metadata', () => {
  it('updateMetadata merges partial fields', () => {
    const store = makeStore();
    store.dispatch(updateMetadata({ title: 'New Title', difficulty_level: 'advanced' }));
    const meta = store.getState().editor.draft!.metadata;
    expect(meta.title).toBe('New Title');
    expect(meta.difficulty_level).toBe('advanced');
  });

  it('updateMetadata marks draft dirty', () => {
    const store = makeStore();
    store.dispatch(updateMetadata({ title: 'x' }));
    expect(store.getState().editor.isDirty).toBe(true);
  });

  it('updateMetadata preserves untouched fields', () => {
    const store = makeStore();
    store.dispatch(updateMetadata({ description: 'Hello' }));
    const meta = store.getState().editor.draft!.metadata;
    // title from FIXTURE_MINIMAL_COURSE should be preserved
    expect(meta.title).toBe('Minimal Course');
    expect(meta.description).toBe('Hello');
  });
});
