"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAgent, useCopilotKit, useFrontendTool, UseAgentUpdate } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { BlockRenderer } from "./block-renderer";
import { PrimoriaCopilotChatSurface } from "@/components/tutor/copilot-chat-surface";
import { usePrimoriaGenerativeUI } from "@/hooks/use-primoria-copilot";
import type { Course, CourseBlock } from "@/lib/courses/types";

const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 620;
const DEFAULT_SIDEBAR_WIDTH = 410;
const SIDEBAR_WIDTH_KEY = "primoria:course-ai-sidebar-width";
const COURSE_COPILOT_PROMPT_EVENT = "primoria:course-copilot-prompt";

function blockToContext(block: CourseBlock) {
  const title = block.title ?? block.type;
  if (block.type === "text") {
    return { id: block.id, type: block.type, title, markdown: block.markdown };
  }
  if (block.type === "analogy") {
    return {
      id: block.id,
      type: block.type,
      title,
      source: block.source,
      target: block.target,
      mapping: block.mapping,
    };
  }
  if (block.type === "transfer") {
    return {
      id: block.id,
      type: block.type,
      title,
      fromDomain: block.fromDomain,
      toDomain: block.toDomain,
      explanation: block.explanation,
      example: block.example,
    };
  }
  if (block.type === "visual") {
    return {
      id: block.id,
      type: block.type,
      title,
      description: block.description,
      htmlSummary: block.html.slice(0, 900),
    };
  }
  return {
    id: block.id,
    type: block.type,
    title,
    language: block.language,
    explanation: block.explanation,
    code: block.code,
  };
}

function buildCourseContext(course: Course, selectedBlock: CourseBlock | null) {
  return {
    course: {
      id: course.id,
      title: course.title,
      topic: course.topic,
      summary: course.summary,
      estimatedMinutes: course.estimatedMinutes,
      blocks: course.blocks.map((block, index) => ({
        index: index + 1,
        id: block.id,
        type: block.type,
        title: block.title ?? block.type,
      })),
    },
    selectedBlock: selectedBlock ? blockToContext(selectedBlock) : null,
  };
}

function clampSidebarWidth(width: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

function CourseRevisionAction({
  course,
  selectedBlock,
  onCourseUpdated,
}: {
  course: Course;
  selectedBlock: CourseBlock | null;
  onCourseUpdated: (course: Course) => void;
}) {
  useFrontendTool(
    {
      name: "revise_selected_course_block",
      description:
        "Revise the currently selected block in the open Primoria course. Use this only when the learner explicitly asks to change/improve/rewrite/simplify/expand/fix the selected block.",
      parameters: z.object({
        instruction: z.string().describe("The learner's concrete revision request for the selected block."),
      }),
      handler: async ({ instruction }) => {
        if (!selectedBlock) {
          return { ok: false, error: "No block is selected. Ask the learner to click a course block first." };
        }

        const response = await fetch(`/api/courses/${course.id}/edit`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            blockId: selectedBlock.id,
            comment: String(instruction ?? ""),
            settings: readSettings(),
          }),
        });
        const data = (await response.json()) as { course?: Course; block?: CourseBlock; error?: string };
        if (!response.ok || !data.course) {
          return { ok: false, error: data.error ?? "Edit failed" };
        }
        onCourseUpdated(data.course);
        return {
          ok: true,
          courseId: data.course.id,
          blockId: selectedBlock.id,
          blockTitle: data.block?.title ?? selectedBlock.title ?? selectedBlock.type,
          message: "Selected course block was revised and the page has been updated.",
        };
      },
      render: ({ status, result }) => {
        const parsedResult = result as { ok?: boolean; error?: string; message?: string } | undefined;
        return (
          <div className="course-ai-action-status">
            <span className={status === "complete" && parsedResult?.ok === false ? "error" : "ok"} />
            <strong>revise_selected_course_block</strong>
            <p>
              {status === "complete"
                ? parsedResult?.ok === false
                  ? parsedResult.error ?? "Revision failed."
                  : parsedResult?.message ?? "Course block updated."
                : "Updating the selected course block…"}
            </p>
          </div>
        );
      },
    },
    [course.id, selectedBlock?.id, onCourseUpdated],
  );

  return null;
}
function sendCoursePrompt(threadId: string, prompt: string) {
  window.dispatchEvent(new CustomEvent(COURSE_COPILOT_PROMPT_EVENT, { detail: { threadId, prompt } }));
}

function CourseSuggestionBridge({ threadId }: { threadId: string }) {
  const { agent } = useAgent({ agentId: "primoria_tutor", threadId, updates: [UseAgentUpdate.OnMessagesChanged] });
  const { copilotkit } = useCopilotKit();

  useEffect(() => {
    function onPrompt(event: Event) {
      const detail = (event as CustomEvent<{ threadId?: string; prompt?: string }>).detail;
      const prompt = detail?.prompt?.trim();
      if (detail?.threadId !== threadId || !prompt || agent.isRunning) return;

      agent.addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
      });
      void copilotkit.runAgent({ agent });
    }

    window.addEventListener(COURSE_COPILOT_PROMPT_EVENT, onPrompt);
    return () => window.removeEventListener(COURSE_COPILOT_PROMPT_EVENT, onPrompt);
  }, [agent, copilotkit, threadId]);

  return null;
}

function CourseAIAssistantPanel({
  course,
  selectedBlock,
  onSelectBlock,
  collapsed,
  width,
  onCollapsedChange,
  onWidthChange,
  onCourseUpdated,
  copilotEnabled,
}: {
  course: Course;
  selectedBlock: CourseBlock | null;
  onSelectBlock: (blockId: string | null) => void;
  collapsed: boolean;
  width: number;
  onCollapsedChange: (collapsed: boolean) => void;
  onWidthChange: (width: number) => void;
  onCourseUpdated: (course: Course) => void;
  copilotEnabled: boolean;
}) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);
  // Use a v5 namespace so old LangGraph/CopilotKit dev checkpoints and
  // context-injected course-chat history cannot leak into Course Copilot.
  const courseThreadId = `course-v5-${course.id}`;
  const courseContext = useMemo(
    () => buildCourseContext(course, selectedBlock),
    [course, selectedBlock],
  );

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      if (!draggingRef.current) return;
      const delta = startXRef.current - event.clientX;
      onWidthChange(clampSidebarWidth(startWidthRef.current + delta));
    }

    function onPointerUp() {
      draggingRef.current = false;
      document.body.classList.remove("course-sidebar-resizing");
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      document.body.classList.remove("course-sidebar-resizing");
    };
  }, [onWidthChange]);

  function beginResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    draggingRef.current = true;
    startXRef.current = event.clientX;
    startWidthRef.current = width;
    document.body.classList.add("course-sidebar-resizing");
  }

  const suggestedPrompts = [
    selectedBlock ? `解释一下当前选中的「${selectedBlock.title ?? selectedBlock.type}」这一节` : `帮我总结《${course.title}》的学习路径`,
    selectedBlock ? `围绕当前 block 出 3 道练习题` : `基于这门课生成 3 个课后练习`,
    `继续创建一门和「${course.topic}」相关的进阶课程`,
  ];

  return (
    <aside
      className={`course-ai-sidebar${collapsed ? " collapsed" : ""}`}
      style={{ width: collapsed ? 56 : width }}
      aria-label="Course AI assistant"
    >
      <button
        type="button"
        className="course-sidebar-resize-handle"
        aria-label="Resize AI sidebar"
        onPointerDown={beginResize}
      />
      {copilotEnabled ? (
        <>
          <CourseRevisionAction course={course} selectedBlock={selectedBlock} onCourseUpdated={onCourseUpdated} />
          <CourseSuggestionBridge threadId={courseThreadId} />
        </>
      ) : null}
      <div className="course-ai-sidebar-header">
        <button
          type="button"
          className="course-ai-collapse"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Expand AI sidebar" : "Collapse AI sidebar"}
        >
          {collapsed ? "AI" : "→"}
        </button>
        {!collapsed ? (
          <div className="course-ai-titleblock">
            <strong>Course Copilot</strong>
            <span>{selectedBlock ? `Context: ${selectedBlock.title ?? selectedBlock.type}` : "Context: whole course"}</span>
          </div>
        ) : null}
      </div>
      {!collapsed ? (
        <>
          <div className="course-ai-context-strip">
            <span>Context</span>
            <strong>{selectedBlock ? selectedBlock.title ?? selectedBlock.type : "Whole course"}</strong>
            <div className="course-ai-block-chips">
              <button
                type="button"
                className={!selectedBlock ? "active" : ""}
                onClick={() => onSelectBlock(null)}
              >
                Whole course
              </button>
              {course.blocks.slice(0, 5).map((block, index) => (
                <button
                  key={block.id}
                  type="button"
                  className={selectedBlock?.id === block.id ? "active" : ""}
                  onClick={() => onSelectBlock(block.id)}
                  title={block.title ?? block.type}
                >
                  {index + 1}. {block.type}
                </button>
              ))}
            </div>
          </div>
          {copilotEnabled ? (
            <>
              <div className="course-ai-suggestions" aria-label="Suggested prompts">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendCoursePrompt(courseThreadId, prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="course-ai-chat">
                <PrimoriaCopilotChatSurface
                  key={courseThreadId}
                  threadId={courseThreadId}
                  title={`Course: ${course.title}`}
                  placeholder="Ask about this course, selected block, or upload a file…"
                  className="course-copilot-surface"
                  context={{
                    description: "Primoria course detail mode",
                    value: JSON.stringify(courseContext),
                  }}
                />
              </div>
            </>
          ) : (
            <div className="course-ai-chat auth-required">Sign in to use Course Copilot.</div>
          )}
        </>
      ) : null}
    </aside>
  );
}

export function CourseDetailClient({ initialCourse, copilotEnabled }: { initialCourse: Course; copilotEnabled: boolean }) {
  usePrimoriaGenerativeUI();
  const [course, setCourse] = useState<Course>(initialCourse);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);

  useEffect(() => {
    const saved = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (!saved) return;
    const parsed = Number(saved);
    if (!Number.isFinite(parsed)) return;
    const frame = window.requestAnimationFrame(() => setSidebarWidth(clampSidebarWidth(parsed)));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (sidebarCollapsed) return;
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarCollapsed, sidebarWidth]);

  const selectedBlock = course.blocks.find((b) => b.id === selectedBlockId) ?? null;

  return (
    <div
      className={`course-detail-layout${sidebarCollapsed ? " sidebar-collapsed" : ""}`}
      style={{ ["--course-sidebar-width" as string]: `${sidebarCollapsed ? 56 : sidebarWidth}px` }}
    >
      <div className="course-detail-main">
        <div className="course-blocks-column">
          {course.blocks.map((block) => (
            <div
              key={block.id}
              role="button"
              tabIndex={0}
              className={`course-block-wrapper${selectedBlockId === block.id ? " selected" : ""}`}
              onClick={() => setSelectedBlockId(block.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedBlockId(block.id);
                }
              }}
            >
              <BlockRenderer block={block} />
            </div>
          ))}
        </div>
      </div>
      <CourseAIAssistantPanel
        course={course}
        selectedBlock={selectedBlock}
        onSelectBlock={setSelectedBlockId}
        collapsed={sidebarCollapsed}
        width={sidebarWidth}
        onCollapsedChange={setSidebarCollapsed}
        onWidthChange={setSidebarWidth}
        copilotEnabled={copilotEnabled}
        onCourseUpdated={(nextCourse) => {
          setCourse(nextCourse);
          if (selectedBlockId && !nextCourse.blocks.some((block) => block.id === selectedBlockId)) {
            setSelectedBlockId(null);
          }
        }}
      />
    </div>
  );
}

const SETTINGS_KEY = "primoria:tutor-provider-settings";
let providerSettingsCache: { provider?: "openai-compatible" | "anthropic-compatible"; baseUrl?: string; apiKey?: string; model?: string } | undefined;

async function refreshProviderSettingsCache() {
  try {
    const response = await fetch("/api/settings/provider", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { authEnabled?: boolean; settings?: typeof providerSettingsCache };
    if (data.authEnabled && data.settings) {
      providerSettingsCache = data.settings;
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
    }
  } catch {
    // Keep local fallback.
  }
}

function readSettings() {
  if (typeof window === "undefined") return undefined;
  if (providerSettingsCache) return providerSettingsCache;
  void refreshProviderSettingsCache();
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as { provider?: "openai-compatible" | "anthropic-compatible"; baseUrl?: string; apiKey?: string; model?: string };
  } catch {
    return undefined;
  }
}
