"use client";

import { z } from "zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useComponent, useDefaultRenderTool, useRenderTool } from "@copilotkit/react-core/v2";
import { WidgetRenderer } from "@/components/generative-ui/widget-renderer";
import { StemRenderer, StemRendererProps } from "@/components/generative-ui/stem-renderer";
import { PlanCard } from "@/components/generative-ui/plan-card";
import { ToolCard } from "@/components/generative-ui/tool-card";
import { PlanProgressCard } from "@/components/tutor/plan-progress-card";
import { normalizeWidgetHtml } from "@/lib/ai/widget-html";
import { setTodos } from "@/lib/todos-store";
import type { CourseCardArtifact, TutorArtifact } from "@/lib/agent-os";
import type { LessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import type { CourseSummary } from "@/lib/courses/types";
import { isLessonGenerationActive, lessonGenerationStageLabel } from "@/lib/courses/lesson-generation-labels";
import { detectKgLanguage } from "@/lib/knowledge-graph/display-name";
import { useLessonGenerationJobs } from "@/hooks/use-lesson-generation-jobs";

const WriteTodosParams = z.object({
  todos: z.array(
    z.object({
      content: z.string().optional(),
      title: z.string().optional(),
      status: z.enum(["pending", "in_progress", "completed"]).optional(),
    }),
  ),
});

const PlanVisualizationParams = z.object({
  title: z.string().optional(),
  approach: z.string(),
  technology: z.string(),
  key_elements: z.union([z.array(z.string()), z.string()]),
});

const RenderWidgetParams = z.object({
  title: z.string().optional(),
  description: z.string().optional().default(""),
  html: z.string().optional().default(""),
  dependencies: z.array(z.object({
    url: z.string(),
    global: z.string().optional(),
    kind: z.enum(["script", "module", "style"]).optional(),
  })).optional(),
});

const ChatQuizChoiceParams = z.object({
  id: z.string(),
  text: z.string(),
});

const ChatQuizQuestionParams = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("single"),
    id: z.string(),
    question: z.string(),
    choices: z.array(ChatQuizChoiceParams).min(2).max(6),
    correctId: z.string(),
    explanation: z.string().optional(),
  }),
  z.object({
    kind: z.literal("multi"),
    id: z.string(),
    question: z.string(),
    choices: z.array(ChatQuizChoiceParams).min(2).max(6),
    correctIds: z.array(z.string()).min(1),
    explanation: z.string().optional(),
  }),
  z.object({
    kind: z.literal("truefalse"),
    id: z.string(),
    question: z.string(),
    correct: z.boolean(),
    explanation: z.string().optional(),
  }),
]);

const ChatQuizParams = z.object({
  title: z.string().optional(),
  description: z.string().optional().default(""),
  questions: z.array(ChatQuizQuestionParams).min(1).max(6),
});

const GenerateCourseParams = z.object({
  topic: z.string(),
  context_hint: z.string().optional(),
});

const GetCourseCardParams = z.object({
  course_id: z.string(),
});

const CourseBlockTypeResult = z.enum(["text", "analogy", "transfer", "visual", "code", "quiz", "mind_map", "slide", "worksheet"]);

const CourseCardResult = z.object({
  type: z.literal("course_card"),
  courseId: z.string(),
  title: z.string(),
  topic: z.string(),
  summary: z.string(),
  estimatedMinutes: z.number(),
  outline: z.array(
    z.object({
      type: CourseBlockTypeResult,
      title: z.string(),
    }),
  ),
  status: z.enum(["generating", "ready"]),
});

const PositionLearningGoalParams = z.object({
  query: z.string(),
  graph_id: z.string().optional(),
});

const COURSE_CARD_PREFIX = "PRIMORIA_COURSE_CARD:";

function WriteTodosSink({ todos }: { todos: z.infer<typeof WriteTodosParams>["todos"] }) {
  useEffect(() => {
    setTodos(todos ?? []);
  }, [todos]);

  if (!todos?.length) return null;

  return (
    <div className="primoria-copilot-tool primoria-copilot-progress-tool">
      <PlanProgressCard />
    </div>
  );
}

function normalizePlanKeyElements(value: z.infer<typeof PlanVisualizationParams>["key_elements"]) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value ?? "")
    .split(/[\n,，、;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function WidgetCard({ title, description, html, dependencies }: z.infer<typeof RenderWidgetParams>) {
  const safeHtml = typeof html === "string" ? normalizeWidgetHtml(html) : "";
  return (
    <div className="primoria-copilot-tool primoria-copilot-widget-tool">
      <WidgetRenderer
        title={title || "Interactive learning widget"}
        description={description || ""}
        html={safeHtml}
        dependencies={dependencies}
      />
    </div>
  );
}

type ChatQuizQuestion = z.infer<typeof ChatQuizQuestionParams>;
type ChatQuizSelection = string | string[] | boolean;
type ChatQuizState =
  | { phase: "answering"; selections: Record<string, ChatQuizSelection> }
  | { phase: "submitted"; selections: Record<string, ChatQuizSelection>; score: number };

function isChatQuizCorrect(question: ChatQuizQuestion, selection: ChatQuizSelection | undefined) {
  if (selection === undefined) return false;
  if (question.kind === "single") return selection === question.correctId;
  if (question.kind === "multi") {
    const selected = Array.isArray(selection) ? [...selection].sort() : [];
    return JSON.stringify(selected) === JSON.stringify([...question.correctIds].sort());
  }
  return selection === question.correct;
}

function isChatQuizAnswered(question: ChatQuizQuestion, selection: ChatQuizSelection | undefined) {
  if (question.kind === "multi") return Array.isArray(selection) && selection.length > 0;
  if (question.kind === "truefalse") return typeof selection === "boolean";
  return typeof selection === "string" && selection.length > 0;
}

function ChatQuizCard({
  title,
  description,
  questions,
}: z.infer<typeof ChatQuizParams>) {
  const [state, setState] = useState<ChatQuizState>({ phase: "answering", selections: {} });

  const setSelection = useCallback((questionId: string, value: ChatQuizSelection) => {
    setState((previous) => {
      if (previous.phase !== "answering") return previous;
      return { ...previous, selections: { ...previous.selections, [questionId]: value } };
    });
  }, []);

  const allAnswered = questions.every((question) => isChatQuizAnswered(question, state.selections[question.id]));

  const submit = useCallback(() => {
    setState((previous) => {
      if (previous.phase !== "answering") return previous;
      const score = questions.filter((question) => isChatQuizCorrect(question, previous.selections[question.id])).length;
      return { phase: "submitted", selections: previous.selections, score };
    });
  }, [questions]);

  return (
    <div className="primoria-copilot-tool">
      <section className="course-chat-quiz" aria-label={title || "自测"}>
        {description ? <p className="course-chat-quiz-intro">{description}</p> : null}
        <div className="course-chat-quiz-list course-quiz">
          {questions.map((question, index) => (
            <ChatQuizQuestionView
              key={question.id}
              index={index}
              question={question}
              selection={state.selections[question.id]}
              submitted={state.phase === "submitted"}
              onSelect={setSelection}
            />
          ))}
          {state.phase === "answering" ? (
            <button type="button" className="course-quiz-submit" disabled={!allAnswered} onClick={submit}>
              提交答案
            </button>
          ) : (
            <div className="course-quiz-score">
              得分：{state.score} / {questions.length}
              {state.score === questions.length ? " 全部正确" : ""}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ChatQuizQuestionView({
  index,
  question,
  selection,
  submitted,
  onSelect,
}: {
  index: number;
  question: ChatQuizQuestion;
  selection: ChatQuizSelection | undefined;
  submitted: boolean;
  onSelect: (questionId: string, value: ChatQuizSelection) => void;
}) {
  const correct = submitted ? isChatQuizCorrect(question, selection) : null;

  return (
    <div className={`course-quiz-question ${submitted ? (correct ? "is-correct" : "is-wrong") : ""}`}>
      <div className="course-quiz-q-header">
        <span className="course-quiz-q-index">{index + 1}</span>
        <span className="course-quiz-q-kind">
          {question.kind === "single" ? "单选" : question.kind === "multi" ? "多选" : "判断"}
        </span>
        {submitted ? (
          <span className={`course-quiz-q-result ${correct ? "correct" : "wrong"}`}>
            {correct ? "✓ 正确" : "✗ 错误"}
          </span>
        ) : null}
      </div>
      <p className="course-quiz-q-text">{question.question}</p>
      {question.kind === "single" ? (
        <div className="course-quiz-choices">
          {question.choices.map((choice) => {
            const isSelected = selection === choice.id;
            const isCorrectChoice = submitted && choice.id === question.correctId;
            const isWrongSelection = submitted && isSelected && choice.id !== question.correctId;
            return (
              <button
                key={choice.id}
                type="button"
                disabled={submitted}
                className={`course-quiz-choice ${isSelected ? "selected" : ""} ${isCorrectChoice ? "correct" : ""} ${isWrongSelection ? "wrong" : ""}`}
                onClick={() => onSelect(question.id, choice.id)}
              >
                {choice.text}
              </button>
            );
          })}
        </div>
      ) : null}
      {question.kind === "multi" ? (
        <div className="course-quiz-choices">
          {question.choices.map((choice) => {
            const selected = Array.isArray(selection) ? selection : [];
            const isSelected = selected.includes(choice.id);
            const isCorrectChoice = submitted && question.correctIds.includes(choice.id);
            const isWrongSelection = submitted && isSelected && !question.correctIds.includes(choice.id);
            const next = isSelected ? selected.filter((id) => id !== choice.id) : [...selected, choice.id];
            return (
              <button
                key={choice.id}
                type="button"
                disabled={submitted}
                className={`course-quiz-choice ${isSelected ? "selected" : ""} ${isCorrectChoice ? "correct" : ""} ${isWrongSelection ? "wrong" : ""}`}
                onClick={() => onSelect(question.id, next)}
              >
                <span className="course-quiz-choice-check">{isSelected ? "☑" : "☐"}</span>
                {choice.text}
              </button>
            );
          })}
        </div>
      ) : null}
      {question.kind === "truefalse" ? (
        <div className="course-quiz-choices course-quiz-truefalse">
          {([true, false] as const).map((value) => {
            const isSelected = selection === value;
            const isCorrectChoice = submitted && value === question.correct;
            const isWrongSelection = submitted && isSelected && value !== question.correct;
            return (
              <button
                key={String(value)}
                type="button"
                disabled={submitted}
                className={`course-quiz-choice ${isSelected ? "selected" : ""} ${isCorrectChoice ? "correct" : ""} ${isWrongSelection ? "wrong" : ""}`}
                onClick={() => onSelect(question.id, value)}
              >
                {value ? "正确 ✓" : "错误 ✗"}
              </button>
            );
          })}
        </div>
      ) : null}
      {submitted && question.explanation ? (
        <div className="course-quiz-explanation">{question.explanation}</div>
      ) : null}
    </div>
  );
}

function ChatQuizTool({ status, parameters }: { status: string; parameters?: Partial<z.infer<typeof ChatQuizParams>> }) {
  const parsed = ChatQuizParams.safeParse(parameters);
  if (!parsed.success) {
    return (
      <div className="primoria-copilot-tool">
        <div className="tool-card status-card">
          <div className="tool-title">
            <span className={status === "complete" ? "tool-dot" : "tool-spinner"} />
            <span>{status === "complete" ? "Quiz ready" : "Preparing quiz"}</span>
          </div>
        </div>
      </div>
    );
  }
  return <ChatQuizCard {...parsed.data} />;
}

function VisualizationPlanTool({
  status,
  approach,
  technology,
  keyElements,
}: {
  status: "inProgress" | "executing" | "complete";
  approach?: string;
  technology?: string;
  keyElements?: string[];
}) {
  const isRunning = status === "executing" || status === "inProgress";
  return (
    <details className="primoria-copilot-tool primoria-copilot-plan-tool" open={isRunning || undefined}>
      <summary>
        <span className={isRunning ? "tool-spinner" : "inline-plan-check"} aria-hidden="true">
          {isRunning ? null : "✓"}
        </span>
        <span>{isRunning ? "Planning visualization…" : `Plan: ${technology || "visualization"}`}</span>
        <span className="inline-plan-chevron" aria-hidden="true">▾</span>
      </summary>
      {approach ? (
        <div className="primoria-copilot-plan-body">
          {technology ? <span>{technology}</span> : null}
          <p>{approach}</p>
          {keyElements && keyElements.length > 0 ? (
            <ul>
              {keyElements.map((element) => (
                <li key={element}>{element}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </details>
  );
}

function stripCourseCardPrefix(result: string) {
  return result.startsWith(COURSE_CARD_PREFIX) ? result.slice(COURSE_CARD_PREFIX.length) : result;
}

function parseCourseCardResult(result?: string): CourseCardArtifact | null {
  if (!result) return null;
  try {
    const parsed = CourseCardResult.safeParse(JSON.parse(stripCourseCardPrefix(result)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function CourseCardTool({
  status,
  result,
  parameters,
}: {
  status: "inProgress" | "executing" | "complete";
  result?: string;
  parameters?: Partial<z.infer<typeof GenerateCourseParams>>;
}) {
  const artifact = parseCourseCardResult(result);
  if (artifact) return <div className="primoria-copilot-tool"><ToolCard artifact={artifact} /></div>;

  return (
    <div className="primoria-copilot-tool">
      <div className="tool-card status-card">
        <div className="tool-title">
          <span className={status === "complete" ? "tool-dot" : "tool-spinner"} />
          <span>generate_course · {status === "complete" ? "complete" : "executing"}</span>
        </div>
        <div className="visualizer">
          <span className="tool-note">
            {parameters?.topic ? `Course agent is composing: ${parameters.topic}` : "Course agent is composing the lesson."}
          </span>
        </div>
      </div>
    </div>
  );
}

function GetCourseCardTool({
  status,
  result,
}: {
  status: "inProgress" | "executing" | "complete";
  result?: string;
  parameters?: Partial<z.infer<typeof GetCourseCardParams>>;
}) {
  const artifact = parseCourseCardResult(result);
  if (artifact) return <div className="primoria-copilot-tool"><ToolCard artifact={artifact} /></div>;
  return (
    <div className="primoria-copilot-tool">
      <div className="tool-card status-card">
        <div className="tool-title">
          <span className={status === "complete" ? "tool-dot" : "tool-spinner"} />
          <span>get_course_card · {status === "complete" ? "complete" : "executing"}</span>
        </div>
      </div>
    </div>
  );
}

function courseArtifactFromSummary(summary: unknown, status: "generating" | "ready" = "ready"): CourseCardArtifact | null {
  if (!summary || typeof summary !== "object") return null;
  const s = summary as Record<string, unknown>;
  const parsed = CourseCardResult.safeParse({
    type: "course_card",
    courseId: s.id,
    title: s.title,
    topic: s.topic,
    summary: s.summary,
    estimatedMinutes: s.estimatedMinutes,
    outline: s.outline ?? [],
    status,
  });
  return parsed.success ? parsed.data : null;
}

type MenuItem = { graphId: string; subject: string; startTopicId: string };
type CourseTopicAnchor = {
  graphId: string;
  startTopicId: string;
  targetConceptId: string | null;
  // Set when the build came from a subject-clarification chip click.
  clarifySourceQuery?: string;
};
type LearningPhase = "positioning" | "building" | "ready" | "clarify_subject" | "fallback" | "error";
type LearningGoalSnapshot = {
  phase: LearningPhase;
  artifact: CourseCardArtifact | null;
  menu: MenuItem[];
  message: string;
  builtCourseId: string | null;
  firstJob: LessonGenerationJobSummary | null;
};

const learningGoalTasks = new Map<string, LearningGoalTask>();

function emptyLearningGoalSnapshot(): LearningGoalSnapshot {
  return {
    phase: "positioning",
    artifact: null,
    menu: [],
    message: "",
    builtCourseId: null,
    firstJob: null,
  };
}

function learningGoalTaskKey(query: string, graphId?: string) {
  return `${graphId ?? ""}::${query.trim().toLowerCase()}`;
}

class LearningGoalTask {
  private listeners = new Set<(snapshot: LearningGoalSnapshot) => void>();
  private snapshot = emptyLearningGoalSnapshot();
  private started = false;
  private buildAnchorKey = "";

  constructor(
    readonly key: string,
    private readonly query: string,
    private readonly graphId?: string,
  ) {}

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: LearningGoalSnapshot) => void) {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  start() {
    if (this.started) return;
    this.started = true;
    void this.positionLearningGoal();
  }

  startCourseBuild(anchor: CourseTopicAnchor) {
    const anchorKey = `${anchor.graphId}:${anchor.startTopicId}:${anchor.targetConceptId ?? ""}`;
    if (this.buildAnchorKey === anchorKey && (this.snapshot.phase === "building" || this.snapshot.phase === "ready")) return;
    this.buildAnchorKey = anchorKey;
    void this.buildCourse(anchor);
  }

  private update(patch: Partial<LearningGoalSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  private async positionLearningGoal() {
    try {
      const posRes = await fetch("/api/knowledge-graph/position", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: this.query, graphId: this.graphId, language: detectKgLanguage(this.query) }),
      });
      const posData = await posRes.json();
      if (!posRes.ok) throw new Error(posData?.error || "positioning failed");

      const plan = posData?.plan;
      if (plan?.branch === "clarify_subject") {
        this.update({
          menu: (plan.candidates ?? [])
            .filter((c: { graphId?: unknown; startTopicId?: unknown }) =>
              typeof c.graphId === "string" && typeof c.startTopicId === "string",
            )
            .map((c: { graphId: string; subject?: string; startTopicId: string }) => ({
              graphId: c.graphId,
              subject: typeof c.subject === "string" ? c.subject : c.graphId,
              startTopicId: c.startTopicId,
            })),
          message: typeof plan.message === "string" ? plan.message : "",
          phase: "clarify_subject",
        });
        return;
      }
      if (plan?.branch === "fallback" || plan?.branch !== "positioned" || !plan.courseContext) {
        this.update({
          message: plan?.message || "无法定位这个学习目标，请重新输入更具体的内容。",
          phase: "fallback",
        });
        return;
      }

      const courseContext = plan.courseContext as {
        graphId?: unknown;
        startTopic?: { topicId?: unknown };
        targetConceptId?: unknown;
      };
      if (typeof courseContext.graphId !== "string" || typeof courseContext.startTopic?.topicId !== "string") {
        throw new Error("positioning result did not include a valid topic anchor");
      }
      this.startCourseBuild({
        graphId: courseContext.graphId,
        startTopicId: courseContext.startTopic.topicId,
        targetConceptId: typeof courseContext.targetConceptId === "string" ? courseContext.targetConceptId : null,
      });
    } catch (error) {
      this.update({
        message: error instanceof Error ? error.message : "Something went wrong.",
        phase: "error",
      });
    }
  }

  private async buildCourse(anchor: CourseTopicAnchor) {
    this.update({ phase: "building", menu: [], message: "" });

    try {
      const buildRes = await fetch("/api/learning/course", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          graphId: anchor.graphId,
          startTopicId: anchor.startTopicId,
          targetConceptId: anchor.targetConceptId,
          language: detectKgLanguage(this.query),
          ...(anchor.clarifySourceQuery ? { clarifySourceQuery: anchor.clarifySourceQuery } : {}),
        }),
      });
      const buildData = await buildRes.json();
      if (!buildRes.ok) throw new Error(buildData?.error || "build failed");

      const built = courseArtifactFromSummary(buildData.summary);
      if (!built) throw new Error("course summary was unusable");
      this.update({
        builtCourseId: typeof buildData.courseId === "string" ? buildData.courseId : null,
        firstJob: (buildData.job as LessonGenerationJobSummary | null | undefined) ?? null,
        artifact: built,
        phase: "ready",
      });
    } catch (error) {
      this.update({
        message: error instanceof Error ? error.message : "Something went wrong.",
        phase: "error",
      });
    }
  }
}

function getLearningGoalTask(query: string, graphId?: string) {
  const key = learningGoalTaskKey(query, graphId);
  const existing = learningGoalTasks.get(key);
  if (existing) return existing;
  const task = new LearningGoalTask(key, query, graphId);
  learningGoalTasks.set(key, task);
  return task;
}

function isJobRepresentedByLearningGoalTask(jobId: string) {
  for (const task of learningGoalTasks.values()) {
    if (task.getSnapshot().firstJob?.id === jobId) return true;
  }
  return false;
}

function selectRestorableLessonJobs(jobs: LessonGenerationJobSummary[]) {
  const byCourse = new Map<string, LessonGenerationJobSummary>();
  for (const job of jobs) {
    const existing = byCourse.get(job.courseId);
    if (!existing) {
      byCourse.set(job.courseId, job);
      continue;
    }
    const jobIsActive = isLessonGenerationActive(job);
    const existingIsActive = isLessonGenerationActive(existing);
    if (
      (jobIsActive && !existingIsActive)
      || (jobIsActive === existingIsActive && job.updatedAt > existing.updatedAt)
    ) {
      byCourse.set(job.courseId, job);
    }
  }
  return [...byCourse.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function RestoredLessonGenerationCards() {
  const [jobs, setJobs] = useState<LessonGenerationJobSummary[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function restoreActiveJobs() {
      try {
        const [jobsResponse, coursesResponse] = await Promise.all([
          fetch("/api/lesson-generation-jobs", { cache: "no-store", signal: controller.signal }),
          fetch("/api/courses", { cache: "no-store", signal: controller.signal }),
        ]);
        if (cancelled) return;

        if (jobsResponse.ok) {
          const data = (await jobsResponse.json()) as { jobs?: LessonGenerationJobSummary[] };
          const restorableJobs = selectRestorableLessonJobs(Array.isArray(data.jobs) ? data.jobs : [])
            .filter((job) => !isJobRepresentedByLearningGoalTask(job.id));
          setJobs(restorableJobs);
        }

        if (coursesResponse.ok) {
          const data = (await coursesResponse.json()) as { courses?: CourseSummary[] };
          setCourses(Array.isArray(data.courses) ? data.courses : []);
        }
      } catch {
        // Keep the homepage quiet; Library still shows the server-backed state.
      }
    }

    void restoreActiveJobs();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const courseById = useMemo(() => {
    const map = new Map<string, CourseSummary>();
    for (const course of courses) map.set(course.id, course);
    return map;
  }, [courses]);

  if (jobs.length === 0) return null;

  return (
    <div className="restored-course-jobs" aria-live="polite">
      {jobs.map((job) => (
        <RestoredLessonGenerationCard key={job.id} initialJob={job} course={courseById.get(job.courseId) ?? null} />
      ))}
    </div>
  );
}

function RestoredLessonGenerationCard({
  initialJob,
  course,
}: {
  initialJob: LessonGenerationJobSummary;
  course: CourseSummary | null;
}) {
  const { jobsByLessonId } = useLessonGenerationJobs(initialJob.courseId, [initialJob]);
  const liveJob = jobsByLessonId.get(initialJob.lessonId) ?? initialJob;
  const active = isLessonGenerationActive(liveJob);
  const artifact = course && liveJob.status !== "failed"
    ? courseArtifactFromSummary(course, active ? "generating" : "ready")
    : null;
  const title = course?.title || "Course build";
  const statusText = liveJob.status === "failed"
    ? "第一节课生成失败，可在课程页重试。"
    : active
      ? `第一节课 · ${lessonGenerationStageLabel(liveJob)}`
      : "第一节课 · Ready";
  const courseHref = `/course/${encodeURIComponent(initialJob.courseId)}/outline`;

  return (
    <div className="restored-course-job">
      {artifact ? <ToolCard artifact={artifact} /> : null}
      <div className="message-row tool restored-course-job-status">
        <div className="tool-card status-card">
          <div className="tool-title">
            <span className={active ? "tool-spinner" : "tool-dot"} />
            <span>{statusText}</span>
          </div>
          <div className="visualizer">
            <span className="tool-note">{title}</span>
            <div className="tool-actions">
              <a className="ghost-btn" href={courseHref}>Open course</a>
              <a className="soft-btn" href="/library">Open Library</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Web-as-brain course card. The agent tool only surfaces the learner's goal; this
// browser component runs KG positioning (/api/knowledge-graph/position) and, for a
// specific match, the asynchronous build (/api/learning/course). Both fetches carry
// the user's session natively, so the course persists to app_courses under the
// signed-in owner. positioned -> course card, clarify_subject -> subject chips,
// fallback -> message.
function LearningGoalCard({ query, graphId }: { query?: string; graphId?: string }) {
  const task = query?.trim() ? getLearningGoalTask(query, graphId) : null;
  const [snapshot, setSnapshot] = useState<LearningGoalSnapshot>(() => task?.getSnapshot() ?? emptyLearningGoalSnapshot());
  const renderSnapshot = task ? snapshot : emptyLearningGoalSnapshot();
  const { phase, artifact, menu, message, builtCourseId, firstJob } = renderSnapshot;

  // Poll the first lesson's job after the course is created so the card can show
  // its generation stage and flip to Ready when published (engineering doc §13.3).
  const { jobsByLessonId } = useLessonGenerationJobs(builtCourseId, firstJob ? [firstJob] : []);
  const liveFirstJob = firstJob ? jobsByLessonId.get(firstJob.lessonId) ?? firstJob : null;

  useEffect(() => {
    if (!task) return;
    task.start();
    return task.subscribe(setSnapshot);
  }, [task]);

  if (phase === "ready" && artifact) {
    const firstLessonStatus = liveFirstJob
      ? liveFirstJob.status === "failed"
        ? "第一节课生成失败，可在课程页重试。"
        : isLessonGenerationActive(liveFirstJob)
          ? `第一节课 · ${lessonGenerationStageLabel(liveFirstJob)}`
          : null
      : null;
    return (
      <>
        <ToolCard artifact={artifact} />
        {firstLessonStatus ? (
          <div className="message-row tool">
            <div className="tool-card status-card">
              <div className="tool-title">
                {liveFirstJob && isLessonGenerationActive(liveFirstJob) ? <span className="tool-spinner" /> : null}
                <span>{firstLessonStatus}</span>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  if (phase === "clarify_subject") {
    return (
      <div className="message-row tool">
        <div className="tool-card status-card">
          <div className="tool-title">
            <span className="tool-dot" />
            <span>选择一个学科开始</span>
          </div>
          <div className="visualizer">
            {message ? <span className="tool-note kg-clarify-message">{message}</span> : null}
            <ul className="kg-menu-list">
              {menu.map((item) => (
                <li key={item.graphId}>
                  <button
                    type="button"
                    className="kg-menu-item"
                    aria-label={item.subject}
                    onClick={() => task?.startCourseBuild({
                      graphId: item.graphId,
                      startTopicId: item.startTopicId,
                      targetConceptId: null,
                      clarifySourceQuery: query,
                    })}
                  >
                    <span className="kg-menu-title">{item.subject}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "fallback" || phase === "error") {
    return (
      <div className="message-row tool">
        <div className="tool-card status-card">
          <div className="visualizer">
            <span className="tool-note">{message}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-row tool">
      <div className="tool-card status-card">
        <div className="tool-title">
          <span className="tool-spinner" />
          <span>{phase === "building" ? "generating course" : "locating in knowledge graph"}</span>
        </div>
        <div className="visualizer">
          <span className="tool-note">
            {phase === "building" ? "正在根据你的知识图谱位置生成课程…" : "正在知识图谱中定位你的学习目标…"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function usePrimoriaGenerativeUI() {
  useComponent({
    name: "widgetRenderer",
    description: "Renders interactive HTML/CSS/JS visualizations in a sandboxed iframe.",
    parameters: RenderWidgetParams,
    render: WidgetCard,
  });

  // Backward-compatible alias for older local runs/messages.
  useComponent({
    name: "render_interactive_widget",
    description: "Renders interactive HTML/CSS/JS visualizations in a sandboxed iframe.",
    parameters: RenderWidgetParams,
    render: WidgetCard,
  });

  useRenderTool({
    name: "plan_visualization",
    parameters: PlanVisualizationParams,
    render: ({ status, parameters }) => (
      <VisualizationPlanTool
        status={status}
        approach={parameters?.approach ?? "Planning the visualization."}
        technology={parameters?.technology ?? "HTML + JavaScript"}
        keyElements={normalizePlanKeyElements(parameters?.key_elements ?? [])}
      />
    ),
  });

  useRenderTool({
    name: "render_chat_quiz",
    parameters: ChatQuizParams,
    render: ({ status, parameters }) => (
      <ChatQuizTool status={status} parameters={parameters} />
    ),
  });

  useRenderTool({
    name: "stemRenderer",
    parameters: StemRendererProps,
    render: ({ status, parameters }) => {
      const { subject, scene, title, description, code } = parameters;
      if (!subject || !scene || !title || !description || !code) return <></>;
      return (
        <div className="message-row tool widget-renderer-row">
          <StemRenderer
            subject={subject} scene={scene}
            title={title} description={description}
            code={code} status={status}
          />
        </div>
      );
    },
  });

  useRenderTool({
    name: "write_todos",
    parameters: WriteTodosParams,
    render: ({ parameters }) => <WriteTodosSink todos={parameters?.todos ?? []} />,
  });

  useRenderTool({
    name: "position_learning_goal",
    parameters: PositionLearningGoalParams,
    render: ({ parameters }) => <LearningGoalCard query={parameters?.query} graphId={parameters?.graph_id} />,
  });

  // Backward-compatible: older local runs/messages may still carry generate_course.
  useRenderTool({
    name: "generate_course",
    parameters: GenerateCourseParams,
    render: ({ status, result, parameters }) => (
      <CourseCardTool status={status} result={result} parameters={parameters} />
    ),
  });

  useRenderTool({
    name: "get_course_card",
    parameters: GetCourseCardParams,
    render: ({ status, result, parameters }) => (
      <GetCourseCardTool status={status} result={result} parameters={parameters} />
    ),
  });

  useRenderTool({ name: "render_chart", parameters: z.any(), render: ({ status, result }) => <VisualizerToolRender name="render_chart" status={status} result={result} /> });
  useRenderTool({ name: "render_diagram", parameters: z.any(), render: ({ status, result }) => <VisualizerToolRender name="render_diagram" status={status} result={result} /> });
  useRenderTool({ name: "render_physics_scene", parameters: z.any(), render: ({ status, result }) => <VisualizerToolRender name="render_physics_scene" status={status} result={result} /> });
  useRenderTool({ name: "render_algorithm", parameters: z.any(), render: ({ status, result }) => <VisualizerToolRender name="render_algorithm" status={status} result={result} /> });
  useRenderTool({ name: "render_math_explorer", parameters: z.any(), render: ({ status, result }) => <VisualizerToolRender name="render_math_explorer" status={status} result={result} /> });
  useRenderTool({ name: "render_wave", parameters: z.any(), render: ({ status, result }) => <VisualizerToolRender name="render_wave" status={status} result={result} /> });
  useRenderTool({ name: "render_graph", parameters: z.any(), render: ({ status, result }) => <VisualizerToolRender name="render_graph" status={status} result={result} /> });
  useRenderTool({ name: "render_molecule", parameters: z.any(), render: ({ status, result }) => <VisualizerToolRender name="render_molecule" status={status} result={result} /> });
  useRenderTool({ name: "render_3d_scene", parameters: z.any(), render: ({ status, result }) => <VisualizerToolRender name="render_3d_scene" status={status} result={result} /> });

  useDefaultRenderTool({
    render: () => <></>,
  });
}

function VisualizerToolRender({ name, status, result }: { name: string; status: string; result?: string }) {
  let artifact: unknown = null;
  if (result) {
    try {
      artifact = JSON.parse(result);
    } catch {}
  }
  if (isTutorArtifact(artifact)) {
    return <div className="primoria-copilot-tool"><ToolCard artifact={artifact} /></div>;
  }
  return (
    <div className="primoria-copilot-tool">
      <div className="tool-card status-card">
        <div className="tool-title">
          <span className={status === "complete" ? "tool-dot" : "tool-spinner"} />
          <span>{name} · {status === "complete" ? "complete" : "executing"}</span>
        </div>
      </div>
    </div>
  );
}

function isTutorArtifact(value: unknown): value is TutorArtifact {
  return value !== null && typeof value === "object" && "type" in value && typeof (value as { type: unknown }).type === "string";
}

function copilotContentToString(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String((part as { text?: unknown }).text ?? "");
        return "";
      })
      .join("\n");
  }
  return String(content ?? "");
}

export function stripCopilotThinkTags(content: unknown) {
  const text = copilotContentToString(content);
  return text
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "")
    .replace(/<think\b[^>]*>[\s\S]*$/i, "")
    .replace(/<\/?think\b[^>]*>/gi, "")
    .trim();
}

export function sanitizeCopilotAssistantText(content?: unknown) {
  const text = stripCopilotThinkTags(content);
  if (!text) return "";
  if (text.startsWith(COURSE_CARD_PREFIX)) return "";

  const withoutPrefixedCards = text.replace(/PRIMORIA_COURSE_CARD:\s*\{[\s\S]*?\}\s*/g, "").trim();
  if (!withoutPrefixedCards) return "";

  try {
    const parsed = JSON.parse(withoutPrefixedCards);
    if (
      parsed?.type === "course_card" ||
      parsed?.type === "chat_quiz" ||
      parsed?.type === "html_widget" ||
      parsed?.type === "stem_renderer" ||
      parsed?.course?.blocks ||
      parsed?.blocks
    ) return "";
  } catch {
    // keep ordinary prose
  }

  if (/^\{[\s\S]*"blocks"\s*:\s*\[[\s\S]*\}\s*\*?$/.test(withoutPrefixedCards)) return "";
  return withoutPrefixedCards;
}
