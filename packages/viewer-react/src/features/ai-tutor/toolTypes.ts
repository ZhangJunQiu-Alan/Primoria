export type TutorToolModal =
  | { kind: 'mindmap'; payload: { title: string; nodes: Array<{ id: string; label: string }> } }
  | {
      kind: 'quiz';
      payload: { title: string; questions: Array<{ prompt: string; options: string[]; answerIndex: number }> };
    }
  | { kind: 'presentation'; payload: { title: string; slides: Array<{ title: string; bullet: string }> } };
