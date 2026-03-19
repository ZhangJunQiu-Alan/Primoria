import { z } from 'zod';

// ─── Canonical block types ────────────────────────────────────────────────────

export const BLOCK_TYPES = [
  'text',
  'image',
  'code-block',
  'code-playground',
  'code-execution',
  'function-flow',
  'multiple-choice',
  'fill-blank',
  'true-false',
  'matching',
  'animation',
  'interactive-visual',
  'video',
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

// ─── Visibility ───────────────────────────────────────────────────────────────

export const VisibilityRuleSchema = z.enum(['always', 'afterPreviousCorrect']);
export type VisibilityRule = z.infer<typeof VisibilityRuleSchema>;

// ─── Block style ─────────────────────────────────────────────────────────────

export const BlockStyleSchema = z.object({
  spacing: z.enum(['none', 'sm', 'md', 'lg']).optional(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});
export type BlockStyle = z.infer<typeof BlockStyleSchema>;

// ─── Content schemas per block type ──────────────────────────────────────────

const RichtextValueSchema = z.object({
  ops: z.array(z.record(z.unknown())),
});

export const TextContentSchema = z.object({
  format: z.literal('richtext'),
  value: RichtextValueSchema,
});

export const ImageContentSchema = z.object({
  url: z.string().url().optional(),
  altText: z.string().optional(),
  caption: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const CodeBlockContentSchema = z.object({
  language: z.string(),
  code: z.string(),
  highlightLines: z.array(z.number()).optional(),
  showLineNumbers: z.boolean().optional(),
});

export const CodePlaygroundContentSchema = z.object({
  language: z.string(),
  starterCode: z.string(),
  solution: z.string().optional(),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
      }),
    )
    .optional(),
});

export const CodeExecutionContentSchema = z.object({
  language: z.string(),
  code: z.string(),
});

export const FunctionFlowContentSchema = z.object({
  nodes: z.array(z.record(z.unknown())),
  edges: z.array(z.record(z.unknown())),
});

export const MultipleChoiceContentSchema = z.object({
  question: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      isCorrect: z.boolean(),
    }),
  ),
  allowMultiple: z.boolean().optional(),
  explanation: z.string().optional(),
});

export const FillBlankContentSchema = z.object({
  template: z.string(),
  blanks: z.array(
    z.object({
      id: z.string(),
      answer: z.string(),
      alternatives: z.array(z.string()).optional(),
    }),
  ),
});

export const TrueFalseContentSchema = z.object({
  statement: z.string(),
  isTrue: z.boolean(),
  explanation: z.string().optional(),
});

export const MatchingContentSchema = z.object({
  pairs: z.array(
    z.object({
      id: z.string(),
      left: z.string(),
      right: z.string(),
    }),
  ),
  mode: z.enum(['list', 'graph']).optional(),
});

export const AnimationContentSchema = z.object({
  preset: z.string().optional(),
  customHtml: z.string().optional(),
  aiPrompt: z.string().optional(),
});

export const InteractiveVisualContentSchema = z.object({
  version: z.string().optional(),
  engine: z.string().optional(),
  template: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  initialState: z.record(z.unknown()).optional(),
  controls: z.array(z.record(z.unknown())).optional(),
  formulas: z.array(z.record(z.unknown())).optional(),
  scene: z.record(z.unknown()).optional(),
  runtime: z.record(z.unknown()).optional(),
  themeTone: z.string().optional(),
  aiPrompt: z.string().optional(),
});

export const VideoContentSchema = z.object({
  url: z.string().url().optional(),
  provider: z.enum(['youtube', 'vimeo', 'custom']).optional(),
  autoplay: z.boolean().optional(),
  caption: z.string().optional(),
});

// ─── Block content discriminated union ───────────────────────────────────────

export const BlockContentSchema = z.union([
  TextContentSchema,
  ImageContentSchema,
  CodeBlockContentSchema,
  CodePlaygroundContentSchema,
  CodeExecutionContentSchema,
  FunctionFlowContentSchema,
  MultipleChoiceContentSchema,
  FillBlankContentSchema,
  TrueFalseContentSchema,
  MatchingContentSchema,
  AnimationContentSchema,
  InteractiveVisualContentSchema,
  VideoContentSchema,
]);

export type BlockContent = z.infer<typeof BlockContentSchema>;

// ─── Block ────────────────────────────────────────────────────────────────────

export const BlockSchema = z.object({
  id: z.string(),
  type: z.enum(BLOCK_TYPES),
  position: z.object({ order: z.number() }),
  style: BlockStyleSchema.optional(),
  visibilityRule: VisibilityRuleSchema.optional(),
  requiredForProgress: z.boolean().optional(),
  content: z.record(z.unknown()),
});

export type Block = z.infer<typeof BlockSchema>;
