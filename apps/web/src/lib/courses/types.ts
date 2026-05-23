export type BlockType = "text" | "analogy" | "transfer" | "visual" | "code";

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
  html: string;
};

export type CodeBlock = BlockBase & {
  type: "code";
  language: string;
  code: string;
  explanation: string;
};

export type CourseBlock = TextBlock | AnalogyBlock | TransferBlock | VisualBlock | CodeBlock;

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
  }
}
