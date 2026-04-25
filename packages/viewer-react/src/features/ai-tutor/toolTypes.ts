import type { LegacyMindMapNode } from '@/shared/api/viewer/types';

export type TutorToolModal =
  | {
      kind: 'mindmap';
      payload: {
        title: string;
        root: LegacyMindMapNode;
        sourceDocumentIds: string[];
        userPrompt: string;
      };
    }
  | {
      kind: 'quiz';
      payload: { courseId: string; courseTitle: string; questionCount: number; sourceDocumentIds: string[] };
    };
