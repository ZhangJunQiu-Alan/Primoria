import type { Block, VisibilityRule } from '@primoria/schema';

export type SortingBlock = {
  id: string;
  type: 'sorting';
  position: { order: number };
  visibilityRule?: VisibilityRule;
  content: {
    prompt: string;
    items: string[];
    correctOrder: string[];
    successMsg?: string;
    failMsg?: string;
  };
};

export type LessonBlock = Block | SortingBlock;

export type LessonPage = {
  page_id: string;
  order: number;
  title?: string;
  blocks: LessonBlock[];
};

export type LessonRuntimeData = {
  lessonId: string;
  courseId?: string;
  title: string;
  pages: LessonPage[];
  xpReward: number;
  durationSeconds: number;
};

