export type TutorToolModal =
  | { kind: 'mindmap'; payload: { title: string; nodes: Array<{ id: string; label: string }> } }
  | { kind: 'report'; payload: { title: string; body: string } }
  | {
      kind: 'quiz';
      payload: { courseId: string; courseTitle: string; questionCount: number; sourceDocumentIds: string[] };
    }
  | { kind: 'presentation'; payload: { title: string; slides: Array<{ title: string; bullet: string }> } };
