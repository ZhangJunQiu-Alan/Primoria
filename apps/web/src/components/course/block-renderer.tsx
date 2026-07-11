"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import type {
  AnalogyBlock,
  CodeBlock,
  CourseBlock,
  FillBlankItem,
  ImageBlock,
  MindMapBlock,
  MultiQuestion,
  ProblemItem,
  QuizBlock,
  QuizQuestion,
  ShortAnswerItem,
  SingleQuestion,
  Slide,
  SlideBlock,
  TextBlock,
  TransferBlock,
  TrueFalseQuestion,
  VisualBlock,
  WorksheetBlock,
  WorksheetItem,
} from "@/lib/courses/types";
import { CourseInlineMarkdown, CourseMarkdown } from "@/components/course/course-markdown";
import type {
  AlgorithmVisualizationArtifact,
  EChartsArtifact,
  MathExplorerArtifact,
  MermaidArtifact,
  PhysicsSceneArtifact,
} from "@/lib/agent-os";

type RendererVariant = "tool" | "course";
type CodeBlockRunnerProps = {
  block: CodeBlock;
  courseId?: string;
  onSaved?: (block: CodeBlock) => void;
};
type MindMapBlockRendererProps = {
  block: MindMapBlock;
  courseId?: string;
};
type WidgetRendererProps = {
  title: string;
  description: string;
  html: string;
  dependencies?: { url: string; global?: string; kind?: "script" | "module" | "style" }[];
  onSendPrompt?: (prompt: string) => void;
  variant?: RendererVariant;
};

const MindMapBlockRenderer = dynamic<MindMapBlockRendererProps>(
  () => import("@/components/course/mind-map-block-renderer").then((mod) => mod.MindMapBlockRenderer),
  {
    ssr: false,
    loading: () => <CourseLazyBlockLoading label="Loading mind map..." />,
  },
);

const CodeBlockRunner = dynamic<CodeBlockRunnerProps>(
  () => import("@/components/course/code-block-view").then((mod) => mod.CodeBlockView),
  {
    ssr: false,
    loading: () => <CourseLazyBlockLoading label="Loading code editor..." />,
  },
);

const WidgetRenderer = dynamic<WidgetRendererProps>(
  () => import("@/components/generative-ui/widget-renderer").then((mod) => mod.WidgetRenderer),
  {
    ssr: false,
    loading: () => <CourseLazyBlockLoading label="Loading visualization..." />,
  },
);

const EChartsRenderer = dynamic<{ artifact: EChartsArtifact; variant?: RendererVariant }>(
  () => import("@/components/generative-ui/echarts-renderer").then((mod) => mod.EChartsRenderer),
  {
    ssr: false,
    loading: () => <CourseLazyBlockLoading label="Loading chart..." />,
  },
);

const MermaidRenderer = dynamic<{ artifact: MermaidArtifact; variant?: RendererVariant }>(
  () => import("@/components/generative-ui/mermaid-renderer").then((mod) => mod.MermaidRenderer),
  {
    ssr: false,
    loading: () => <CourseLazyBlockLoading label="Loading diagram..." />,
  },
);

const PhysicsSceneRenderer = dynamic<{ artifact: PhysicsSceneArtifact; variant?: RendererVariant }>(
  () => import("@/components/generative-ui/physics-scene-renderer").then((mod) => mod.PhysicsSceneRenderer),
  {
    ssr: false,
    loading: () => <CourseLazyBlockLoading label="Loading simulation..." />,
  },
);

const AlgorithmVisualizer = dynamic<{ artifact: AlgorithmVisualizationArtifact; variant?: RendererVariant }>(
  () => import("@/components/generative-ui/algorithm-visualizer").then((mod) => mod.AlgorithmVisualizer),
  {
    ssr: false,
    loading: () => <CourseLazyBlockLoading label="Loading visualizer..." />,
  },
);

const MathExplorerRenderer = dynamic<{ artifact: MathExplorerArtifact; variant?: RendererVariant }>(
  () => import("@/components/generative-ui/math-explorer-renderer").then((mod) => mod.MathExplorerRenderer),
  {
    ssr: false,
    loading: () => <CourseLazyBlockLoading label="Loading explorer..." />,
  },
);

function CourseLazyBlockLoading({ label }: { label: string }) {
  return (
    <div className="course-lazy-block-loading" role="status">
      {label}
    </div>
  );
}

export function BlockRenderer({
  block,
  courseId,
  onBlockUpdated,
  contentLanguage,
}: {
  block: CourseBlock;
  courseId?: string;
  onBlockUpdated?: (block: CourseBlock) => void;
  contentLanguage?: string | null;
}) {
  if (block.type === "text") return <TextBlockView block={block} />;
  if (block.type === "analogy") return <AnalogyBlockView block={block} />;
  if (block.type === "transfer") return <TransferBlockView block={block} />;
  if (block.type === "visual") return <VisualBlockView block={block} />;
  if (block.type === "image") return <ImageBlockView block={block} />;
  if (block.type === "code") return <CodeBlockView block={block} courseId={courseId} onBlockUpdated={onBlockUpdated} />;
  if (block.type === "quiz") return <QuizBlockView block={block} courseId={courseId} contentLanguage={contentLanguage} />;
  if (block.type === "mind_map") return <MindMapBlockView block={block} courseId={courseId} />;
  if (block.type === "slide") return <SlideBlockView block={block} />;
  if (block.type === "worksheet") return <WorksheetBlockView block={block} />;
  return <UnknownBlockView block={block} />;
}

function UnknownBlockView({ block }: { block: CourseBlock }) {
  const unknown = block as { type: string; title?: string };
  return (
    <BlockShell kind="unknown" title={unknown.title}>
      <p className="course-block-fallback-note">
        此内容类型(<code>{unknown.type}</code>)暂不支持显示，请更新到最新版本后再查看。
      </p>
    </BlockShell>
  );
}

function BlockShell({
  kind,
  title,
  children,
}: {
  kind: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`course-block course-block-${kind}`}>
      {title ? (
        <div className="course-block-meta">
          <strong>{title}</strong>
        </div>
      ) : null}
      <div className="course-block-body">{children}</div>
    </div>
  );
}

function TextBlockView({ block }: { block: TextBlock }) {
  return (
    <BlockShell kind="text" title={block.title}>
      <CourseMarkdown markdown={block.markdown} />
    </BlockShell>
  );
}

function AnalogyBlockView({ block }: { block: AnalogyBlock }) {
  return (
    <BlockShell kind="analogy" title={block.title}>
      <div className="course-block-analogy">
        <div className="course-analogy-pair">
          <span className="course-analogy-side">
            <em>Familiar</em>
            <CourseInlineMarkdown markdown={block.source} className="course-analogy-value" />
          </span>
          <span className="course-analogy-arrow">≈</span>
          <span className="course-analogy-side">
            <em>Target</em>
            <CourseInlineMarkdown markdown={block.target} className="course-analogy-value" />
          </span>
        </div>
        <CourseMarkdown markdown={block.mapping} className="course-analogy-mapping" />
      </div>
    </BlockShell>
  );
}

function TransferBlockView({ block }: { block: TransferBlock }) {
  return (
    <BlockShell kind="transfer" title={block.title}>
      <div className="course-block-transfer">
        <div className="course-transfer-path" aria-label="迁移路径">
          <span className="course-transfer-node">
            <em>来源</em>
            <CourseInlineMarkdown markdown={block.fromDomain} className="course-transfer-domain" />
          </span>
          <span className="course-transfer-arrow" aria-hidden="true">→</span>
          <span className="course-transfer-node">
            <em>迁移到</em>
            <CourseInlineMarkdown markdown={block.toDomain} className="course-transfer-domain" />
          </span>
        </div>
        <CourseMarkdown markdown={block.explanation} className="course-transfer-explanation" />
        <div className="course-transfer-example">
          <span className="course-transfer-example-label">示例</span>
          <CourseMarkdown markdown={block.example} className="course-transfer-example-body" />
        </div>
      </div>
    </BlockShell>
  );
}

function VisualBlockView({ block }: { block: VisualBlock }) {
  if (block.engine === "echarts" && block.echartsOption) {
    return (
      <BlockShell kind="visual" title={block.title}>
        <CourseMarkdown markdown={block.description} className="course-block-text course-visual-caption" />
        <CourseVisualFrame>
          <EChartsRenderer variant="course" artifact={{ type: "echarts_widget", title: block.title ?? "Chart", description: block.description, option: block.echartsOption, height: block.echartsHeight }} />
        </CourseVisualFrame>
      </BlockShell>
    );
  }
  if (block.engine === "mermaid" && block.mermaidDefinition) {
    return (
      <BlockShell kind="visual" title={block.title}>
        <CourseMarkdown markdown={block.description} className="course-block-text course-visual-caption" />
        <CourseVisualFrame>
          <MermaidRenderer variant="course" artifact={{ type: "mermaid_diagram", title: block.title ?? "Diagram", definition: block.mermaidDefinition }} />
        </CourseVisualFrame>
      </BlockShell>
    );
  }
  if (block.engine === "physics" && block.physicsScene) {
    return (
      <BlockShell kind="visual" title={block.title}>
        <CourseMarkdown markdown={block.description} className="course-block-text course-visual-caption" />
        <CourseVisualFrame>
          <PhysicsSceneRenderer variant="course" artifact={{ type: "physics_scene", title: block.title ?? "Simulation", description: block.description, scene: block.physicsScene }} />
        </CourseVisualFrame>
      </BlockShell>
    );
  }
  if (block.engine === "algorithm" && block.algorithmViz) {
    return (
      <BlockShell kind="visual" title={block.title}>
        <CourseMarkdown markdown={block.description} className="course-block-text course-visual-caption" />
        <CourseVisualFrame>
          <AlgorithmVisualizer variant="course" artifact={{ type: "algorithm_visualization", title: block.title ?? "Algorithm", description: block.description, algorithm: block.algorithmViz.algorithm, steps: block.algorithmViz.steps }} />
        </CourseVisualFrame>
      </BlockShell>
    );
  }
  if (block.engine === "math_explorer" && block.mathExplorer) {
    return (
      <BlockShell kind="visual" title={block.title}>
        <CourseMarkdown markdown={block.description} className="course-block-text course-visual-caption" />
        <CourseVisualFrame>
          <MathExplorerRenderer variant="course" artifact={{ type: "math_explorer", title: block.title ?? "Explorer", description: block.description, ...block.mathExplorer }} />
        </CourseVisualFrame>
      </BlockShell>
    );
  }
  return (
    <BlockShell kind="visual" title={block.title}>
      <CourseMarkdown markdown={block.description} className="course-block-text course-visual-caption" />
      <CourseVisualFrame>
        <WidgetRenderer variant="course" title={block.title ?? "Visual"} description={block.description} html={block.html ?? ""} />
      </CourseVisualFrame>
    </BlockShell>
  );
}

function CourseVisualFrame({ children }: { children: React.ReactNode }) {
  return <div className="course-visual-frame" data-course-interactive="true">{children}</div>;
}

function ImageBlockView({ block }: { block: ImageBlock }) {
  const failed = block.status === "error" || !block.imageUrl;
  return (
    <BlockShell kind="image" title={block.title}>
      <figure className="course-image-block">
        {failed ? (
          <div className="course-image-error" role="img" aria-label={block.alt || "图片生成失败"}>
            <span className="course-image-error-icon" aria-hidden="true">⚠</span>
            <span className="course-image-error-text">
              图片生成失败{block.errorMessage ? `：${block.errorMessage}` : ""}
            </span>
          </div>
        ) : (
          <img
            className="course-image"
            src={block.imageUrl}
            alt={block.alt}
            loading="lazy"
            decoding="async"
          />
        )}
        {block.caption ? <figcaption className="course-image-caption">{block.caption}</figcaption> : null}
      </figure>
    </BlockShell>
  );
}

function CodeBlockView({
  block,
  courseId,
  onBlockUpdated,
}: {
  block: CodeBlock;
  courseId?: string;
  onBlockUpdated?: (block: CourseBlock) => void;
}) {
  return (
    <BlockShell kind="code" title={block.title}>
      <CodeBlockRunner block={block} courseId={courseId} onSaved={onBlockUpdated} />
    </BlockShell>
  );
}

function MindMapBlockView({ block, courseId }: { block: MindMapBlock; courseId?: string }) {
  return (
    <BlockShell kind="mind_map" title={block.title}>
      <MindMapBlockRenderer block={block} courseId={courseId} />
    </BlockShell>
  );
}

function SlideContent({ slide }: { slide: Slide }) {
  if (slide.layout === "title") {
    return (
      <div className="course-slide course-slide-layout-title">
        <h2 className="course-slide-title">{slide.title}</h2>
        {slide.markdown && <CourseMarkdown markdown={slide.markdown} className="course-slide-body" />}
      </div>
    );
  }
  if (slide.layout === "quote") {
    return (
      <div className="course-slide course-slide-layout-quote">
        <blockquote className="course-slide-quote">
          {slide.markdown ?? slide.title}
        </blockquote>
        {slide.markdown && <p className="course-slide-quote-label">{slide.title}</p>}
      </div>
    );
  }
  if (slide.layout === "bullets") {
    return (
      <div className="course-slide course-slide-layout-bullets">
        <h3 className="course-slide-heading">{slide.title}</h3>
        {slide.bullets && slide.bullets.length > 0 ? (
          <ul className="course-slide-bullets">
            {slide.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        ) : (
          slide.markdown && <CourseMarkdown markdown={slide.markdown} className="course-slide-body" />
        )}
      </div>
    );
  }
  // image-text (no actual image — title + markdown)
  return (
    <div className="course-slide course-slide-layout-image-text">
      <h3 className="course-slide-heading">{slide.title}</h3>
      {slide.markdown && <CourseMarkdown markdown={slide.markdown} className="course-slide-body" />}
      {slide.bullets && slide.bullets.length > 0 && (
        <ul className="course-slide-bullets">
          {slide.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      )}
    </div>
  );
}

function SlideBlockView({ block }: { block: SlideBlock }) {
  const [current, setCurrent] = useState(0);
  const total = block.slides.length;
  const slide = block.slides[Math.min(current, total - 1)];

  return (
    <BlockShell kind="slide" title={block.title}>
      <div className="course-slide-deck">
        <SlideContent slide={slide} />
        {slide.note && (
          <div className="course-slide-note">{slide.note}</div>
        )}
        <div className="course-slide-nav">
          <button
            className="course-slide-nav-btn"
            disabled={current === 0}
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            aria-label="Previous slide"
          >
            ←
          </button>
          <span className="course-slide-counter">{current + 1} / {total}</span>
          <button
            className="course-slide-nav-btn"
            disabled={current === total - 1}
            onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
            aria-label="Next slide"
          >
            →
          </button>
        </div>
      </div>
    </BlockShell>
  );
}

type QuizState =
  | { phase: "answering"; selections: Record<string, string | string[] | boolean> }
  | { phase: "submitted"; selections: Record<string, string | string[] | boolean>; score: number };

function isCorrect(q: QuizQuestion, sel: string | string[] | boolean | undefined): boolean {
  if (sel === undefined) return false;
  if (q.kind === "single") return sel === q.correctId;
  if (q.kind === "multi") {
    const selected = Array.isArray(sel) ? [...sel].sort() : [];
    return JSON.stringify(selected) === JSON.stringify([...q.correctIds].sort());
  }
  return sel === q.correct;
}

const QUIZ_COPY = {
  en: {
    single: "Single choice",
    multi: "Multiple choice",
    truefalse: "True or false",
    correct: "Correct",
    incorrect: "Incorrect",
    score: "Score",
    allCorrect: "All correct!",
    true: "True",
    false: "False",
  },
  zh: {
    single: "单选",
    multi: "多选",
    truefalse: "判断",
    correct: "正确",
    incorrect: "错误",
    score: "得分",
    allCorrect: "全部正确！",
    true: "正确",
    false: "错误",
  },
} as const;

function quizCopyFor(language?: string | null) {
  return language?.toLowerCase().startsWith("zh") ? QUIZ_COPY.zh : QUIZ_COPY.en;
}

function QuizBlockView({ block, courseId, contentLanguage }: { block: QuizBlock; courseId?: string; contentLanguage?: string | null }) {
  const copy = quizCopyFor(contentLanguage);
  const [state, setState] = useState<QuizState>({
    phase: "answering",
    selections: {},
  });

  const setSelection = useCallback((qId: string, value: string | string[] | boolean) => {
    setState((prev) => {
      if (prev.phase !== "answering") return prev;
      return { ...prev, selections: { ...prev.selections, [qId]: value } };
    });
  }, []);

  const allAnswered = block.questions.every((q) => state.selections[q.id] !== undefined);

  const handleSubmit = useCallback(async () => {
    if (state.phase !== "answering") return;
    // Local score is optimistic UI only; the server regrades authoritatively.
    const score = block.questions.filter((q) => isCorrect(q, state.selections[q.id])).length;
    setState({ phase: "submitted", selections: state.selections, score });

    if (courseId) {
      const answers = block.questions.map((q) => {
        const sel = state.selections[q.id];
        if (q.kind === "single") return { kind: "single" as const, questionId: q.id, selectedId: String(sel ?? "") };
        if (q.kind === "multi") return { kind: "multi" as const, questionId: q.id, selectedIds: Array.isArray(sel) ? sel : [] };
        return { kind: "truefalse" as const, questionId: q.id, selected: sel === true };
      });
      try {
        await fetch(`/api/courses/${courseId}/quiz`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockId: block.id, answers }),
        });
      } catch {
        // non-blocking
      }
    }
  }, [block, courseId, state]);

  return (
    <BlockShell kind="quiz" title={block.title}>
      <div className="course-quiz">
        {block.questions.map((q, idx) => (
          <QuestionView
            key={q.id}
            index={idx}
            question={q}
            selection={state.selections[q.id]}
            submitted={state.phase === "submitted"}
            onSelect={setSelection}
            copy={copy}
          />
        ))}
        {state.phase === "answering" ? (
          <button
            className="course-quiz-submit"
            type="button"
            disabled={!allAnswered}
            onClick={handleSubmit}
            tabIndex={-1}
            aria-hidden="true"
          >
            Check
          </button>
        ) : (
          <div className="course-quiz-score">
            {copy.score}: {state.score} / {block.questions.length}
            {state.score === block.questions.length ? ` ${copy.allCorrect}` : ""}
          </div>
        )}
      </div>
    </BlockShell>
  );
}

function QuestionView({
  index,
  question,
  selection,
  submitted,
  onSelect,
  copy,
}: {
  index: number;
  question: QuizQuestion;
  selection: string | string[] | boolean | undefined;
  submitted: boolean;
  onSelect: (id: string, value: string | string[] | boolean) => void;
  copy: (typeof QUIZ_COPY)[keyof typeof QUIZ_COPY];
}) {
  const correct = submitted ? isCorrect(question, selection) : null;

  return (
    <div className={`course-quiz-question ${submitted ? (correct ? "is-correct" : "is-wrong") : ""}`}>
      <div className="course-quiz-q-header">
        <span className="course-quiz-q-index">{index + 1}</span>
        <span className="course-quiz-q-kind">
          {question.kind === "single" ? copy.single : question.kind === "multi" ? copy.multi : copy.truefalse}
        </span>
        {submitted && (
          <span className={`course-quiz-q-result ${correct ? "correct" : "wrong"}`}>
            {correct ? `✓ ${copy.correct}` : `✗ ${copy.incorrect}`}
          </span>
        )}
      </div>
      <p className="course-quiz-q-text">{question.question}</p>

      {question.kind === "single" && (
        <SingleChoiceView
          question={question}
          selected={typeof selection === "string" ? selection : undefined}
          submitted={submitted}
          onSelect={(id) => onSelect(question.id, id)}
        />
      )}
      {question.kind === "multi" && (
        <MultiChoiceView
          question={question}
          selected={Array.isArray(selection) ? selection : []}
          submitted={submitted}
          onSelect={(ids) => onSelect(question.id, ids)}
        />
      )}
      {question.kind === "truefalse" && (
        <TrueFalseView
          question={question}
          selected={typeof selection === "boolean" ? selection : undefined}
          submitted={submitted}
          onSelect={(val) => onSelect(question.id, val)}
          trueLabel={copy.true}
          falseLabel={copy.false}
        />
      )}

      {submitted && question.explanation && (
        <div className="course-quiz-explanation">{question.explanation}</div>
      )}
    </div>
  );
}

function SingleChoiceView({
  question,
  selected,
  submitted,
  onSelect,
}: {
  question: SingleQuestion;
  selected: string | undefined;
  submitted: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="course-quiz-choices">
      {question.choices.map((c) => {
        const isSelected = selected === c.id;
        const isCorrectChoice = submitted && c.id === question.correctId;
        const isWrongSelection = submitted && isSelected && c.id !== question.correctId;
        return (
          <button
            key={c.id}
            disabled={submitted}
            className={`course-quiz-choice ${isSelected ? "selected" : ""} ${isCorrectChoice ? "correct" : ""} ${isWrongSelection ? "wrong" : ""}`}
            onClick={() => onSelect(c.id)}
          >
            {c.text}
          </button>
        );
      })}
    </div>
  );
}

function MultiChoiceView({
  question,
  selected,
  submitted,
  onSelect,
}: {
  question: MultiQuestion;
  selected: string[];
  submitted: boolean;
  onSelect: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    onSelect(next);
  };

  return (
    <div className="course-quiz-choices">
      {question.choices.map((c) => {
        const isSelected = selected.includes(c.id);
        const isCorrectChoice = submitted && question.correctIds.includes(c.id);
        const isWrongSelection = submitted && isSelected && !question.correctIds.includes(c.id);
        return (
          <button
            key={c.id}
            disabled={submitted}
            className={`course-quiz-choice ${isSelected ? "selected" : ""} ${isCorrectChoice ? "correct" : ""} ${isWrongSelection ? "wrong" : ""}`}
            onClick={() => toggle(c.id)}
          >
            <span className="course-quiz-choice-check">{isSelected ? "☑" : "☐"}</span>
            {c.text}
          </button>
        );
      })}
    </div>
  );
}

function TrueFalseView({
  question,
  selected,
  submitted,
  onSelect,
  trueLabel,
  falseLabel,
}: {
  question: TrueFalseQuestion;
  selected: boolean | undefined;
  submitted: boolean;
  onSelect: (val: boolean) => void;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <div className="course-quiz-choices course-quiz-truefalse">
      {([true, false] as const).map((val) => {
        const isSelected = selected === val;
        const isCorrectChoice = submitted && val === question.correct;
        const isWrongSelection = submitted && isSelected && val !== question.correct;
        return (
          <button
            key={String(val)}
            disabled={submitted}
            className={`course-quiz-choice ${isSelected ? "selected" : ""} ${isCorrectChoice ? "correct" : ""} ${isWrongSelection ? "wrong" : ""}`}
            onClick={() => onSelect(val)}
          >
            {val ? `${trueLabel} ✓` : `${falseLabel} ✗`}
          </button>
        );
      })}
    </div>
  );
}

// ── worksheet block ────────────────────────────────────────────────

function FillBlankView({
  item,
  values,
  revealed,
  onChange,
}: {
  item: FillBlankItem;
  values: string[];
  revealed: boolean;
  onChange: (idx: number, val: string) => void;
}) {
  const parts = item.prompt.split("___");
  return (
    <div className="worksheet-item-body">
      <p className="worksheet-fill-text">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="worksheet-blank-wrap">
                <input
                  className={`worksheet-blank-input ${revealed ? "revealed" : ""}`}
                  value={revealed ? (item.blanks[i] ?? "") : (values[i] ?? "")}
                  readOnly={revealed}
                  onChange={(e) => onChange(i, e.target.value)}
                  size={Math.max(6, (item.blanks[i] ?? "").length + 2)}
                />
                {revealed && (
                  <span className="worksheet-blank-answer">{item.blanks[i]}</span>
                )}
              </span>
            )}
          </span>
        ))}
      </p>
    </div>
  );
}

function ShortAnswerView({
  item,
  value,
  revealed,
  onChange,
}: {
  item: ShortAnswerItem | ProblemItem;
  value: string;
  revealed: boolean;
  onChange: (val: string) => void;
}) {
  return (
    <div className="worksheet-item-body">
      <CourseMarkdown markdown={item.prompt} className="worksheet-prompt" />
      <textarea
        className="worksheet-textarea"
        placeholder="在这里写下你的答案…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={item.kind === "problem" ? 5 : 3}
      />
      {revealed && item.sampleAnswer && (
        <div className="worksheet-sample-answer">
          <span className="worksheet-sample-label">参考答案</span>
          <CourseMarkdown markdown={item.sampleAnswer} className="worksheet-sample-body" />
        </div>
      )}
    </div>
  );
}

function WorksheetItemView({
  item,
  index,
  fillValues,
  openValue,
  revealed,
  onFillChange,
  onOpenChange,
  onReveal,
}: {
  item: WorksheetItem;
  index: number;
  fillValues: string[];
  openValue: string;
  revealed: boolean;
  onFillChange: (idx: number, val: string) => void;
  onOpenChange: (val: string) => void;
  onReveal: () => void;
}) {
  const kindLabel = item.kind === "short_answer" ? "简答" : item.kind === "fill_blank" ? "填空" : "解题";
  const hasAnswer = item.kind === "fill_blank"
    ? item.blanks.length > 0
    : !!item.sampleAnswer;

  return (
    <div className={`worksheet-item ${revealed ? "is-revealed" : ""}`}>
      <div className="worksheet-item-header">
        <span className="worksheet-item-index">{index + 1}</span>
        <span className="worksheet-item-kind">{kindLabel}</span>
      </div>

      {item.kind === "fill_blank" ? (
        <FillBlankView
          item={item}
          values={fillValues}
          revealed={revealed}
          onChange={onFillChange}
        />
      ) : (
        <ShortAnswerView
          item={item}
          value={openValue}
          revealed={revealed}
          onChange={onOpenChange}
        />
      )}

      {item.hint && !revealed && (
        <p className="worksheet-hint">提示：{item.hint}</p>
      )}

      {hasAnswer && !revealed && (
        <button className="worksheet-reveal-btn" onClick={onReveal}>
          查看参考答案
        </button>
      )}
    </div>
  );
}

function WorksheetBlockView({ block }: { block: WorksheetBlock }) {
  const [fillAnswers, setFillAnswers] = useState<Record<string, string[]>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const handleFillChange = useCallback((itemId: string, idx: number, val: string) => {
    setFillAnswers((prev) => {
      const arr = [...(prev[itemId] ?? [])];
      arr[idx] = val;
      return { ...prev, [itemId]: arr };
    });
  }, []);

  const handleReveal = useCallback((itemId: string) => {
    setRevealed((prev) => new Set([...prev, itemId]));
  }, []);

  return (
    <BlockShell kind="worksheet" title={block.title}>
      <div className="course-worksheet">
        {block.items.map((item, idx) => (
          <WorksheetItemView
            key={item.id}
            item={item}
            index={idx}
            fillValues={fillAnswers[item.id] ?? []}
            openValue={openAnswers[item.id] ?? ""}
            revealed={revealed.has(item.id)}
            onFillChange={(i, val) => handleFillChange(item.id, i, val)}
            onOpenChange={(val) => setOpenAnswers((prev) => ({ ...prev, [item.id]: val }))}
            onReveal={() => handleReveal(item.id)}
          />
        ))}
      </div>
    </BlockShell>
  );
}
