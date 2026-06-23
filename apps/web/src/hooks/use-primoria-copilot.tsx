"use client";

import { z } from "zod";
import { useEffect, useRef, useState } from "react";
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
import { isLessonGenerationActive, lessonGenerationStageLabel } from "@/lib/courses/lesson-generation-labels";
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

function courseArtifactFromSummary(summary: unknown): CourseCardArtifact | null {
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
    status: "ready",
  });
  return parsed.success ? parsed.data : null;
}

type MenuItem = { topicId: string; name: string };
type LearningPhase = "positioning" | "building" | "ready" | "broad" | "fallback" | "error";

// Web-as-brain course card. The agent tool only surfaces the learner's goal; this
// browser component runs KG positioning (/api/knowledge-graph/position) and, for a
// specific match, the synchronous build (/api/learning/course). Both fetches carry
// the user's session natively, so the course persists to app_courses under the
// signed-in owner. specific -> course card, broad -> menu, fallback -> message.
function LearningGoalCard({ query, graphId }: { query?: string; graphId?: string }) {
  const [activeQuery, setActiveQuery] = useState<string | undefined>(query);
  const [prevQuery, setPrevQuery] = useState<string | undefined>(query);
  const [phase, setPhase] = useState<LearningPhase>("positioning");
  const [artifact, setArtifact] = useState<CourseCardArtifact | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [message, setMessage] = useState<string>("");
  const [builtCourseId, setBuiltCourseId] = useState<string | null>(null);
  const [firstJob, setFirstJob] = useState<LessonGenerationJobSummary | null>(null);
  const requestSeqRef = useRef(0);

  // Poll the first lesson's job after the course is created so the card can show
  // its generation stage and flip to Ready when published (engineering doc §13.3).
  const { jobsByLessonId } = useLessonGenerationJobs(builtCourseId, firstJob ? [firstJob] : []);
  const liveFirstJob = firstJob ? jobsByLessonId.get(firstJob.lessonId) ?? firstJob : null;

  if (query !== prevQuery) {
    setPrevQuery(query);
    setActiveQuery(query);
    setPhase("positioning");
    setArtifact(null);
    setMenu([]);
    setMessage("");
    setBuiltCourseId(null);
    setFirstJob(null);
  }

  useEffect(() => {
    if (!activeQuery) return;
    const requestSeq = ++requestSeqRef.current;
    const isCurrentRequest = () => requestSeqRef.current === requestSeq;

    (async () => {
      try {
        const posRes = await fetch("/api/knowledge-graph/position", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: activeQuery, graphId }),
        });
        const posData = await posRes.json();
        if (!posRes.ok) throw new Error(posData?.error || "positioning failed");
        if (!isCurrentRequest()) return;

        const plan = posData?.plan;
        if (plan?.branch === "broad") {
          setMenu((plan.menu ?? []).map((m: { topicId: string; name: string }) => ({ topicId: m.topicId, name: m.name })));
          setPhase("broad");
          return;
        }
        if (plan?.branch === "fallback" || plan?.branch !== "specific" || !plan.courseContext) {
          setMessage(plan?.message || "无法定位这个学习目标，请重新输入更具体的内容。");
          setPhase("fallback");
          return;
        }

        setPhase("building");
        const buildRes = await fetch("/api/learning/course", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ courseContext: plan.courseContext }),
        });
        const buildData = await buildRes.json();
        if (!buildRes.ok) throw new Error(buildData?.error || "build failed");
        if (!isCurrentRequest()) return;

        const built = courseArtifactFromSummary(buildData.summary);
        if (!built) throw new Error("course summary was unusable");
        setBuiltCourseId(typeof buildData.courseId === "string" ? buildData.courseId : null);
        setFirstJob((buildData.job as LessonGenerationJobSummary | null | undefined) ?? null);
        setArtifact(built);
        setPhase("ready");
      } catch (error) {
        if (!isCurrentRequest()) return;
        setMessage(error instanceof Error ? error.message : "Something went wrong.");
        setPhase("error");
      }
    })();

    return () => {
      if (requestSeqRef.current === requestSeq) requestSeqRef.current += 1;
    };
  }, [activeQuery, graphId]);

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

  if (phase === "broad") {
    return (
      <div className="message-row tool">
        <div className="tool-card status-card">
          <div className="tool-title">
            <span className="tool-dot" />
            <span>可能的学习入口</span>
          </div>
          <div className="visualizer">
            <ul className="kg-menu-list" style={{ listStyleType: "none", padding: 0, margin: "8px 0" }}>
              {menu.map((item) => (
                <li
                  key={item.topicId}
                  onClick={() => setActiveQuery(item.name)}
                  style={{
                    cursor: "pointer",
                    padding: "8px 12px",
                    margin: "4px 0",
                    background: "var(--background-secondary, #f4f4f5)",
                    borderRadius: "6px",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background-hover, #e4e4e7)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--background-secondary, #f4f4f5)")}
                >
                  {item.name}
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

export function sanitizeCopilotAssistantText(content?: string) {
  const text = (content ?? "").trim();
  if (!text) return "";
  if (text.startsWith(COURSE_CARD_PREFIX)) return "";

  const withoutPrefixedCards = text.replace(/PRIMORIA_COURSE_CARD:\s*\{[\s\S]*?\}\s*/g, "").trim();
  if (!withoutPrefixedCards) return "";

  try {
    const parsed = JSON.parse(withoutPrefixedCards);
    if (parsed?.type === "course_card" || parsed?.course?.blocks || parsed?.blocks) return "";
  } catch {
    // keep ordinary prose
  }

  if (/^\{[\s\S]*"blocks"\s*:\s*\[[\s\S]*\}\s*\*?$/.test(withoutPrefixedCards)) return "";
  return withoutPrefixedCards;
}
