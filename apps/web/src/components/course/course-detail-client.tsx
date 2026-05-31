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

type SelectedTextContext = {
  blockId: string;
  blockTitle: string;
  blockType: CourseBlock["type"];
  text: string;
};

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

function buildCourseContext(
  course: Course,
  selectedBlock: CourseBlock | null,
  selectedText: SelectedTextContext | null,
) {
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
    selectedText,
  };
}

function clampSidebarWidth(width: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

function selectionTextInside(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return "";
  if (!selection.anchorNode || !selection.focusNode) return "";
  if (!element.contains(selection.anchorNode) || !element.contains(selection.focusNode)) return "";
  return selection.toString().replace(/\s+/g, " ").trim();
}

function nodeElement(node: Node | null) {
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

function CourseRevisionAction({
  course,
  selectedBlock,
  selectedTextContext,
  onCourseUpdated,
}: {
  course: Course;
  selectedBlock: CourseBlock | null;
  selectedTextContext: SelectedTextContext | null;
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
            selectedText: selectedTextContext?.blockId === selectedBlock.id ? selectedTextContext.text : undefined,
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
          message: selectedTextContext?.blockId === selectedBlock.id
            ? "Selected text was revised and the page has been updated."
            : "Selected course block was revised and the page has been updated.",
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
    [course.id, selectedBlock?.id, selectedTextContext?.blockId, selectedTextContext?.text, onCourseUpdated],
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

function CourseGenerativeUI() {
  usePrimoriaGenerativeUI();
  return null;
}

function CourseAIAssistantPanel({
  course,
  selectedBlock,
  collapsed,
  width,
  onCollapsedChange,
  onWidthChange,
  onCourseUpdated,
  copilotEnabled,
  selectedTextContext,
}: {
  course: Course;
  selectedBlock: CourseBlock | null;
  collapsed: boolean;
  width: number;
  onCollapsedChange: (collapsed: boolean) => void;
  onWidthChange: (width: number) => void;
  onCourseUpdated: (course: Course) => void;
  copilotEnabled: boolean;
  selectedTextContext: SelectedTextContext | null;
}) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);
  // Use a v5 namespace so old LangGraph/CopilotKit dev checkpoints and
  // context-injected course-chat history cannot leak into Course Copilot.
  const courseThreadId = `course-v5-${course.id}`;
  const courseContext = useMemo(
    () => buildCourseContext(course, selectedBlock, selectedTextContext),
    [course, selectedBlock, selectedTextContext],
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
  const selectedTextPreview = selectedTextContext
    ? `${Array.from(selectedTextContext.text).slice(0, 5).join("")}${Array.from(selectedTextContext.text).length > 5 ? "..." : ""}`
    : "";
  const composerContext = selectedTextContext ? (
    <div
      className="course-ai-composer-context"
      aria-label="Current course context"
      style={{
        boxSizing: "border-box",
        paddingLeft: 8,
      }}
    >
      <div
        className="course-ai-selection-pill"
        title={selectedTextContext.text}
        aria-label="Selected text is attached to this request."
        style={{
          width: "fit-content",
          maxWidth: "100%",
          minHeight: 26,
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "5px 10px 5px 8px",
          borderRadius: 999,
          background: "#fffaf2",
          border: "1px solid rgba(200, 136, 26, 0.24)",
          boxShadow: "0 4px 14px rgba(57, 42, 25, 0.08)",
          color: "#7c4f10",
          fontSize: 11,
          fontWeight: 800,
          lineHeight: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            flex: "0 0 auto",
            display: "block",
            borderRadius: "50%",
            background: "#c8881a",
            boxShadow: "0 0 0 3px rgba(200, 136, 26, 0.12)",
          }}
        />
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          &quot;{selectedTextPreview}&quot;
        </span>
      </div>
    </div>
  ) : null;

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
          <CourseGenerativeUI />
          <CourseRevisionAction
            course={course}
            selectedBlock={selectedBlock}
            selectedTextContext={selectedTextContext}
            onCourseUpdated={onCourseUpdated}
          />
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
            <span>Ask about this course</span>
          </div>
        ) : null}
      </div>
      {!collapsed ? (
        <>
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
                  composerContext={composerContext}
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
  const [course, setCourse] = useState<Course>(initialCourse);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedTextContext, setSelectedTextContext] = useState<SelectedTextContext | null>(null);
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

  useEffect(() => {
    const workspace = document.querySelector<HTMLElement>(".course-workspace");
    if (!workspace) return;
    workspace.style.setProperty("--course-sidebar-width", `${sidebarCollapsed ? 56 : sidebarWidth}px`);
  }, [sidebarCollapsed, sidebarWidth]);

  const selectedBlock = course.blocks.find((b) => b.id === selectedBlockId) ?? null;

  function selectBlock(block: CourseBlock) {
    setSelectedBlockId(block.id);
    setSelectedTextContext(null);
  }

  function updateSelectedText(block: CourseBlock, element: HTMLElement) {
    const text = selectionTextInside(element);
    if (!text) return;
    setSelectedBlockId(block.id);
    setSelectedTextContext({
      blockId: block.id,
      blockTitle: block.title ?? block.type,
      blockType: block.type,
      text,
    });
  }

  useEffect(() => {
    let frame = 0;

    function syncSelectionContext() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

        const text = selection.toString().replace(/\s+/g, " ").trim();
        if (!text) return;

        const anchorBlock = nodeElement(selection.anchorNode)?.closest<HTMLElement>(".course-block-wrapper");
        const focusBlock = nodeElement(selection.focusNode)?.closest<HTMLElement>(".course-block-wrapper");
        if (!anchorBlock || !focusBlock || anchorBlock !== focusBlock) return;

        const blockId = anchorBlock.dataset.blockId;
        const block = course.blocks.find((candidate) => candidate.id === blockId);
        if (!block) return;

        setSelectedBlockId(block.id);
        setSelectedTextContext((current) => {
          if (current?.blockId === block.id && current.text === text) return current;
          return {
            blockId: block.id,
            blockTitle: block.title ?? block.type,
            blockType: block.type,
            text,
          };
        });
      });
    }

    document.addEventListener("selectionchange", syncSelectionContext);
    window.addEventListener("mouseup", syncSelectionContext);
    window.addEventListener("keyup", syncSelectionContext);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", syncSelectionContext);
      window.removeEventListener("mouseup", syncSelectionContext);
      window.removeEventListener("keyup", syncSelectionContext);
    };
  }, [course.blocks]);

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
              data-block-id={block.id}
              className={`course-block-wrapper${selectedBlockId === block.id ? " selected" : ""}`}
              onClick={(event) => {
                if (selectionTextInside(event.currentTarget)) return;
                selectBlock(block);
              }}
              onMouseUp={(event) => updateSelectedText(block, event.currentTarget)}
              onKeyUp={(event) => {
                if (event.key === "Shift" || event.key.startsWith("Arrow")) {
                  updateSelectedText(block, event.currentTarget);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectBlock(block);
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
        collapsed={sidebarCollapsed}
        width={sidebarWidth}
        onCollapsedChange={setSidebarCollapsed}
        onWidthChange={setSidebarWidth}
        copilotEnabled={copilotEnabled}
        selectedTextContext={selectedTextContext}
        onCourseUpdated={(nextCourse) => {
          setCourse(nextCourse);
          if (selectedBlockId && !nextCourse.blocks.some((block) => block.id === selectedBlockId)) {
            setSelectedBlockId(null);
            setSelectedTextContext(null);
          }
          if (selectedTextContext && !nextCourse.blocks.some((block) => block.id === selectedTextContext.blockId)) {
            setSelectedTextContext(null);
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
