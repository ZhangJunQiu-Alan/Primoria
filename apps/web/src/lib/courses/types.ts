import type { PhysicsScene } from "@/lib/agent-os";

export type BlockType = "text" | "analogy" | "transfer" | "visual" | "code" | "quiz" | "mind_map" | "slide" | "worksheet";

type BlockBase = {
  id: string;
  type: BlockType;
  title?: string;
};

export type TextBlock = BlockBase & {
  type: "text";
  markdown: string;
};

export type AnalogyBlock = BlockBase & {
  type: "analogy";
  source: string;
  target: string;
  mapping: string;
};

export type TransferBlock = BlockBase & {
  type: "transfer";
  fromDomain: string;
  toDomain: string;
  explanation: string;
  example: string;
};

export type VisualBlock = BlockBase & {
  type: "visual";
  description: string;
  engine?: "html" | "echarts" | "mermaid" | "physics";
  html?: string;
  echartsOption?: Record<string, unknown>;
  echartsHeight?: number;
  mermaidDefinition?: string;
  physicsScene?: PhysicsScene;
};

export type CodeBlock = BlockBase & {
  type: "code";
  language: string;
  code: string;
  explanation: string;
};

export type SingleQuestion = {
  kind: "single";
  id: string;
  question: string;
  choices: { id: string; text: string }[];
  correctId: string;
  explanation?: string;
};

export type MultiQuestion = {
  kind: "multi";
  id: string;
  question: string;
  choices: { id: string; text: string }[];
  correctIds: string[];
  explanation?: string;
};

export type TrueFalseQuestion = {
  kind: "truefalse";
  id: string;
  question: string;
  correct: boolean;
  explanation?: string;
};

export type QuizQuestion = SingleQuestion | MultiQuestion | TrueFalseQuestion;

export type QuizBlock = BlockBase & {
  type: "quiz";
  questions: QuizQuestion[];
};

export type QuizAnswer =
  | { kind: "single"; questionId: string; selectedId: string }
  | { kind: "multi"; questionId: string; selectedIds: string[] }
  | { kind: "truefalse"; questionId: string; selected: boolean };

export type MindMapNode = {
  id: string;
  topic: string;
  children?: MindMapNode[];
};

export type MindMapBlock = BlockBase & {
  type: "mind_map";
  root: MindMapNode;
};

export type Slide = {
  id: string;
  title: string;
  layout: "title" | "bullets" | "quote" | "image-text";
  bullets?: string[];
  markdown?: string;
  note?: string;
};

export type SlideBlock = BlockBase & {
  type: "slide";
  slides: Slide[];
};

export type ShortAnswerItem = {
  kind: "short_answer";
  id: string;
  prompt: string;
  hint?: string;
  sampleAnswer?: string;
};

export type FillBlankItem = {
  kind: "fill_blank";
  id: string;
  prompt: string;   // contains ___ for each blank
  hint?: string;
  blanks: string[]; // answers in order, one per ___
};

export type ProblemItem = {
  kind: "problem";
  id: string;
  prompt: string;
  hint?: string;
  sampleAnswer?: string;
};

export type WorksheetItem = ShortAnswerItem | FillBlankItem | ProblemItem;

export type WorksheetBlock = BlockBase & {
  type: "worksheet";
  items: WorksheetItem[];
};

export type CourseBlock = TextBlock | AnalogyBlock | TransferBlock | VisualBlock | CodeBlock | QuizBlock | MindMapBlock | SlideBlock | WorksheetBlock;

export type Course = {
  id: string;
  title: string;
  topic: string;
  summary: string;
  estimatedMinutes: number;
  blocks: CourseBlock[];
  archivedAt?: number | null;
  version: number;
  createdAt: number;
  updatedAt: number;
};

export type CourseOutlineItem = {
  type: BlockType;
  title: string;
};

export type CourseSummary = {
  id: string;
  title: string;
  topic: string;
  summary: string;
  estimatedMinutes: number;
  outline: CourseOutlineItem[];
  archivedAt?: number | null;
  version: number;
  createdAt: number;
  updatedAt: number;
};

export function summarizeCourse(course: Course): CourseSummary {
  return {
    id: course.id,
    title: course.title,
    topic: course.topic,
    summary: course.summary,
    estimatedMinutes: course.estimatedMinutes,
    outline: course.blocks.map((block) => ({
      type: block.type,
      title: block.title ?? defaultTitleFor(block),
    })),
    archivedAt: course.archivedAt ?? null,
    version: course.version ?? 1,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

function defaultTitleFor(block: CourseBlock): string {
  switch (block.type) {
    case "text":
      return "Concept";
    case "analogy":
      return `Analogy: ${block.source} → ${block.target}`;
    case "transfer":
      return `Transfer: ${block.fromDomain} → ${block.toDomain}`;
    case "visual":
      return "Interactive visual";
    case "code":
      return `Code (${block.language})`;
    case "quiz":
      return `Quiz (${block.questions.length} questions)`;
    case "mind_map":
      return `Mind map: ${block.root.topic}`;
    case "slide":
      return `Slides (${block.slides.length})`;
    case "worksheet":
      return `Worksheet (${block.items.length} items)`;
  }
}
