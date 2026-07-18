import type { AlgorithmStep, MathExplorerArtifact, PhysicsScene } from "@/lib/agent-os";
import type { ImageBrief } from "@/lib/ai/media/image-brief";

export type BlockType = "text" | "analogy" | "transfer" | "visual" | "image" | "code" | "quiz" | "mind_map" | "slide" | "worksheet";

/** Teaching role a block plays within a lesson's pedagogical arc (doc §4.3).
 * Optional on persisted blocks: historical blocks predate this metadata. */
export type PedagogicalRole =
  | "hook"
  | "roadmap"
  | "explanation"
  | "example"
  | "deepening"
  | "misconception"
  | "transfer"
  | "assessment"
  | "summary";

type BlockBase = {
  id: string;
  type: BlockType;
  title?: string;
  /** KG concept ids this block teaches. Many-to-many: one block may cover
   * several concepts and one concept may span several blocks. Absent on
   * historical blocks generated before IR/compiler. */
  conceptIds?: string[];
  /** Stage in the lesson's teaching arc. Absent on historical blocks. */
  pedagogicalRole?: PedagogicalRole;
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
  engine?: "html" | "echarts" | "mermaid" | "physics" | "algorithm" | "math_explorer";
  html?: string;
  echartsOption?: Record<string, unknown>;
  echartsHeight?: number;
  mermaidDefinition?: string;
  physicsScene?: PhysicsScene;
  algorithmViz?: { algorithm: string; steps: AlgorithmStep[] };
  mathExplorer?: Omit<MathExplorerArtifact, "type" | "title" | "description">;
};

/** Static teaching image (AI-generated): a cognitive anchor — a concrete
 * object, structure, scene, or analogy the learner recognizes at a glance.
 * Distinct from `visual` (interactive mechanism models). The block references a
 * stable media-asset URL; image bytes never live in the block JSONB. */
export type ImageBlock = BlockBase & {
  type: "image";
  /** Media-asset row id; "" until the asset is generated, or on error. */
  assetId: string;
  /** `/api/media/assets/[assetId]`; "" until generated, or on error. */
  imageUrl: string;
  alt: string;
  caption: string;
  imageKind:
    | "educational_illustration"
    | "structure_diagram"
    | "realistic_scene"
    | "analogy_illustration";
  prompt?: string;
  model?: string;
  aspectRatio?: "16:9";
  /** Absent/"ready" renders the image; "error" renders an inline error state
   * so generation instability is visible. The lesson still publishes. */
  status?: "ready" | "error";
  errorMessage?: string;
  /** Transient: set only while the block is pending in the generation pipeline
   * (the imaging stage consumes it and strips it). Never present on a published
   * block — the validator rejects any image block that still carries one. */
  brief?: ImageBrief;
};

export type CodeBlock = BlockBase & {
  type: "code";
  language: string;
  code: string;
  explanation: string;
  /** AI-generated original code, retained when the user edits `code` so the
   * editor can offer "restore original". Backfilled on first save. */
  originalCode?: string;
};

export type SingleQuestion = {
  kind: "single";
  id: string;
  question: string;
  choices: { id: string; text: string }[];
  correctId: string;
  explanation?: string;
  // Concept this question checks (∈ the lesson topic's concepts). Drives
  // concept-level mastery attribution. Optional at the persisted-data boundary;
  // the current Block Writer/compiler requires it for every generated question.
  conceptId?: string;
};

export type MultiQuestion = {
  kind: "multi";
  id: string;
  question: string;
  choices: { id: string; text: string }[];
  correctIds: string[];
  explanation?: string;
  conceptId?: string;
};

export type TrueFalseQuestion = {
  kind: "truefalse";
  id: string;
  question: string;
  correct: boolean;
  explanation?: string;
  conceptId?: string;
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

export type CourseBlock = TextBlock | AnalogyBlock | TransferBlock | VisualBlock | ImageBlock | CodeBlock | QuizBlock | MindMapBlock | SlideBlock | WorksheetBlock;

export type LessonRole = "new" | "review" | "remediation";
export type LessonProgress = "not_started" | "in_progress" | "completed";
/** Materialization axis (orthogonal to role/progress). A planned node is an
 * outline placeholder with no blocks yet; generated means blocks are present. */
export type LessonStatus = "planned" | "generating" | "generated";

export type Lesson = {
  id: string;
  title: string;
  description: string;
  role: LessonRole;
  progress: LessonProgress;
  status: LessonStatus;
  sortKey: number;
  topicId?: string | null;
  /** Concept subset this lesson teaches, in teaching order (concept-frontier
   * outline). Empty on historical/freeform lessons — consumers fall back to the
   * whole authored topic. */
  conceptIds?: string[];
  triggeredFrom?: string | null;
  /** Null while the lesson is a planned outline node (LazyGeneration). */
  blocks: CourseBlock[] | null;
  estimatedMinutes: number | null;
  version: number;
  createdAt: number;
  updatedAt: number;
};

export type Course = {
  id: string;
  title: string;
  topic: string;
  summary: string;
  estimatedMinutes: number;
  anchorConceptId?: string | null;
  graphId?: string | null;
  scopeKey?: string | null;
  language?: string | null;
  lessons: Lesson[];
  archivedAt?: number | null;
  version: number;
  createdAt: number;
  updatedAt: number;
};

export function sortedCourseLessons(course: Course): Lesson[] {
  return [...course.lessons].sort((a, b) => a.sortKey - b.sortKey);
}

export function currentCourseLesson(course: Course, preferredLessonId?: string | null): Lesson | null {
  const sortedLessons = sortedCourseLessons(course);
  const preferred = preferredLessonId
    ? sortedLessons.find((lesson) => lesson.id === preferredLessonId && lesson.status === "generated" && Array.isArray(lesson.blocks))
      ?? sortedLessons.find((lesson) => lesson.id === preferredLessonId && lesson.status === "generating")
    : null;
  if (preferred) return preferred;
  const activeGeneratedLesson = sortedLessons.find(
    (lesson) => lesson.status === "generated" && lesson.progress !== "completed" && Array.isArray(lesson.blocks),
  );
  if (activeGeneratedLesson) return activeGeneratedLesson;
  const hasUnfinishedFutureLesson = sortedLessons.some((lesson) => lesson.progress !== "completed" && lesson.status !== "generated");
  if (hasUnfinishedFutureLesson) return null;
  return [...sortedLessons].reverse().find((lesson) => lesson.status === "generated" && Array.isArray(lesson.blocks)) ?? null;
}

export function currentLessonBlocks(course: Course, preferredLessonId?: string | null): CourseBlock[] {
  return currentCourseLesson(course, preferredLessonId)?.blocks ?? [];
}

/** Flatten every materialized lesson's blocks into one ordered list (by sortKey).
 * Planned (ungenerated) lessons contribute nothing. */
export function courseBlocks(course: Course): CourseBlock[] {
  return sortedCourseLessons(course)
    .flatMap((lesson) => lesson.blocks ?? []);
}

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
  lessons: CourseSummaryLesson[];
  lessonCount: number;
  generatedLessonCount: number;
  plannedLessonCount: number;
  completedLessonCount: number;
  currentLesson: CourseSummaryLesson | null;
  archivedAt?: number | null;
  version: number;
  createdAt: number;
  updatedAt: number;
};

export type CourseSummaryLesson = {
  id: string;
  title: string;
  description: string;
  role: LessonRole;
  progress: LessonProgress;
  status: LessonStatus;
  sortKey: number;
  topicId?: string | null;
  estimatedMinutes: number | null;
  updatedAt: number;
};

export function summarizeCourse(course: Course): CourseSummary {
  const sortedLessons = sortedCourseLessons(course);
  const lessons = sortedLessons.map((lesson): CourseSummaryLesson => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    role: lesson.role,
    progress: lesson.progress,
    status: lesson.status,
    sortKey: lesson.sortKey,
    topicId: lesson.topicId ?? null,
    estimatedMinutes: lesson.estimatedMinutes,
    updatedAt: lesson.updatedAt,
  }));
  const generatedLessonCount = lessons.filter((lesson) => lesson.status === "generated").length;
  const plannedLessonCount = lessons.filter((lesson) => lesson.status === "planned").length;
  const completedLessonCount = lessons.filter((lesson) => lesson.progress === "completed").length;
  const currentLesson =
    lessons.find((lesson) => lesson.progress === "in_progress")
    ?? lessons.find((lesson) => lesson.progress !== "completed")
    ?? lessons[lessons.length - 1]
    ?? null;
  const generatedMinutes = sortedLessons.reduce((total, lesson) => total + (lesson.estimatedMinutes ?? 0), 0);

  return {
    id: course.id,
    title: course.title,
    topic: course.topic,
    summary: course.summary,
    estimatedMinutes: generatedMinutes || course.estimatedMinutes,
    outline: courseBlocks(course).map((block) => ({
      type: block.type,
      title: block.title ?? defaultTitleFor(block),
    })),
    lessons,
    lessonCount: lessons.length,
    generatedLessonCount,
    plannedLessonCount,
    completedLessonCount,
    currentLesson,
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
    case "image":
      return "Illustration";
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
