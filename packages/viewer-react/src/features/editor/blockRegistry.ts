import type { BlockType } from '@primoria/schema';
import { createEmptyRichTextValue } from './richText';

export interface BlockMeta {
  label: string;
  icon: string; // emoji fallback — swap for Radix icon later
  category: 'content' | 'interactive' | 'quiz';
  defaultContent: Record<string, unknown>;
}

export const BLOCK_META: Record<BlockType, BlockMeta> = {
  text: {
    label: 'Text',
    icon: '📝',
    category: 'content',
    defaultContent: { format: 'richtext', value: createEmptyRichTextValue() },
  },
  image: {
    label: 'Image',
    icon: '🖼️',
    category: 'content',
    defaultContent: {},
  },
  'code-block': {
    label: 'Code Block',
    icon: '💻',
    category: 'content',
    defaultContent: { language: 'python', code: '' },
  },
  'code-playground': {
    label: 'Code Playground',
    icon: '🧑‍💻',
    category: 'interactive',
    defaultContent: {
      language: 'python',
      starterCode: '# Write your code here\n',
      initialCode: '# Write your code here\n',
    },
  },
  'code-execution': {
    label: 'Code Execution',
    icon: '▶️',
    category: 'interactive',
    defaultContent: { language: 'python', code: '' },
  },
  'function-flow': {
    label: 'Function Flow',
    icon: '🔀',
    category: 'interactive',
    defaultContent: { nodes: [], edges: [] },
  },
  'multiple-choice': {
    label: 'Multiple Choice',
    icon: '☑️',
    category: 'quiz',
    defaultContent: {
      question: '',
      options: [
        { id: 'opt-a', text: '', isCorrect: false },
        { id: 'opt-b', text: '', isCorrect: false },
      ],
    },
  },
  'fill-blank': {
    label: 'Fill in the Blank',
    icon: '✏️',
    category: 'quiz',
    defaultContent: { template: '', blanks: [] },
  },
  'true-false': {
    label: 'True / False',
    icon: '✅',
    category: 'quiz',
    defaultContent: { statement: '', isTrue: true },
  },
  matching: {
    label: 'Matching',
    icon: '🔗',
    category: 'quiz',
    defaultContent: { pairs: [] },
  },
  'interactive-visual': {
    label: 'Interactive Visual',
    icon: '🔭',
    category: 'interactive',
    defaultContent: {
      engine: 'html-iframe',
      template: 'generic',
      title: '',
      description: '',
      aiPrompt: '',
      generatedHtml: '',
    },
  },
  video: {
    label: 'Video',
    icon: '📹',
    category: 'content',
    defaultContent: {},
  },
};

export const BLOCK_CATEGORIES: Array<{ id: BlockMeta['category']; label: string }> = [
  { id: 'content', label: 'Content' },
  { id: 'interactive', label: 'Interactive' },
  { id: 'quiz', label: 'Quiz' },
];
