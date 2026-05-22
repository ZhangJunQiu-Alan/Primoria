"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CopilotChat,
  CopilotChatAssistantMessage,
  CopilotChatMessageView,
  CopilotChatReasoningMessage,
  type CopilotChatAssistantMessageProps,
  type CopilotChatMessageViewProps,
  type CopilotChatReasoningMessageProps,
} from "@copilotkit/react-core/v2";
import { useCopilotAction, useCopilotAdditionalInstructions, useCopilotReadable } from "@copilotkit/react-core";
import { BlockRenderer } from "./block-renderer";
import { usePrimoriaGenerativeUI, sanitizeCopilotAssistantText } from "@/hooks/use-primoria-copilot";
import type { Course, CourseBlock } from "@/lib/courses/types";

const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 620;
const DEFAULT_SIDEBAR_WIDTH = 410;
const SIDEBAR_WIDTH_KEY = "primoria:course-ai-sidebar-width";

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

function uuidFromString(input: string) {
  let hash1 = 0x811c9dc5;
  let hash2 = 0x01000193;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    hash1 ^= code;
    hash1 = Math.imul(hash1, 0x01000193);
    hash2 ^= code + index;
    hash2 = Math.imul(hash2, 0x811c9dc5);
  }
  const hex = `${hash1 >>> 0}`.padStart(8, "0") + `${hash2 >>> 0}`.padStart(8, "0");
  const expanded = (hex + hex.split("").reverse().join("")).slice(0, 32);
  return `${expanded.slice(0, 8)}-${expanded.slice(8, 12)}-4${expanded.slice(13, 16)}-a${expanded.slice(17, 20)}-${expanded.slice(20, 32)}`;
}

const CourseAssistantMessage = Object.assign(
  function CourseAssistantMessage(props: CopilotChatAssistantMessageProps) {
    const safeContent = sanitizeCopilotAssistantText(props.message.content);
    const message = { ...props.message, content: safeContent };
    return <CopilotChatAssistantMessage {...props} message={message} />;
  },
  CopilotChatAssistantMessage,
);

const CourseReasoningMessage = Object.assign(
  function CourseReasoningMessage(_props: CopilotChatReasoningMessageProps) {
    return null;
  },
  CopilotChatReasoningMessage,
);

const CourseMessageView = Object.assign(
  function CourseMessageView(props: CopilotChatMessageViewProps) {
    return (
      <CopilotChatMessageView
        {...props}
        assistantMessage={CourseAssistantMessage}
        reasoningMessage={CourseReasoningMessage}
      />
    );
  },
  CopilotChatMessageView,
);

function CourseAIContextBridge({
  course,
  selectedBlock,
  onCourseUpdated,
}: {
  course: Course;
  selectedBlock: CourseBlock | null;
  onCourseUpdated: (course: Course) => void;
}) {
  const context = useMemo(() => buildCourseContext(course, selectedBlock), [course, selectedBlock]);

  useCopilotReadable(
    {
      description: "Current Primoria course detail page and selected lesson block. Use this before answering course questions.",
      value: context,
    },
    [context],
  );

  useCopilotAdditionalInstructions(
    {
      instructions:
        "You are inside a Primoria course detail page. Use the readable course context and selectedBlock when answering. If the learner asks to modify, rewrite, simplify, expand, fix, improve, localize, add examples to, or otherwise change the selected lesson block, call revise_selected_course_block with their requested change. If no block is selected, ask them to select a block first. If the learner asks to create another course, use generate_course and keep the result as a course card. Answer in the user's language.",
    },
    [],
  );

  useCopilotAction(
    {
      name: "revise_selected_course_block",
      description:
        "Revise the currently selected block in the open Primoria course. Use this whenever the learner asks to change/improve/rewrite/simplify/expand/fix the selected block. Requires a selected block.",
      parameters: [
        {
          name: "instruction",
          type: "string",
          description: "The learner's concrete revision request for the selected block.",
          required: true,
        },
      ],
      handler: async ({ instruction }: { instruction: string }) => {
        if (!selectedBlock) {
          return { ok: false, error: "No block is selected. Ask the learner to click a course block first." };
        }

        const response = await fetch(`/api/courses/${course.id}/edit`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            blockId: selectedBlock.id,
            comment: instruction,
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

function CourseAIAssistantPanel({
  course,
  selectedBlock,
  onSelectBlock,
  collapsed,
  width,
  onCollapsedChange,
  onWidthChange,
  onCourseUpdated,
}: {
  course: Course;
  selectedBlock: CourseBlock | null;
  onSelectBlock: (blockId: string | null) => void;
  collapsed: boolean;
  width: number;
  onCollapsedChange: (collapsed: boolean) => void;
  onWidthChange: (width: number) => void;
  onCourseUpdated: (course: Course) => void;
}) {
  usePrimoriaGenerativeUI();

  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);
  const threadId = useMemo(() => uuidFromString(`course:${course.id}`), [course.id]);
  const [directRevisionStatus, setDirectRevisionStatus] = useState<
    { status: "idle" | "executing" | "complete" | "error"; message: string }
  >({ status: "idle", message: "" });

  const reviseSelectedBlockDirectly = useCallback(
    async (instruction: string) => {
      if (!selectedBlock) {
        setDirectRevisionStatus({ status: "error", message: "请先点击左侧选择一个要修改的课程 block。" });
        return false;
      }

      setDirectRevisionStatus({ status: "executing", message: "正在根据你的反馈修改当前 block…" });
      try {
        const response = await fetch(`/api/courses/${course.id}/edit`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            blockId: selectedBlock.id,
            comment: instruction,
            settings: readSettings(),
          }),
        });
        const data = (await response.json()) as { course?: Course; block?: CourseBlock; error?: string };
        if (!response.ok || !data.course) throw new Error(data.error ?? "Edit failed");
        onCourseUpdated(data.course);
        setDirectRevisionStatus({
          status: "complete",
          message: `已修改：${data.block?.title ?? selectedBlock.title ?? selectedBlock.type}`,
        });
        return true;
      } catch (error) {
        setDirectRevisionStatus({
          status: "error",
          message: error instanceof Error ? error.message : "修改失败",
        });
        return false;
      }
    },
    [course.id, onCourseUpdated, selectedBlock],
  );

  const interceptCourseRevision = useCallback(
    (value: string) => {
      const normalized = value.trim();
      if (!normalized) return false;
      if (!selectedBlock) return false;
      const looksLikeRevision =
        /(改|修改|优化|重写|换成|更口语|更简单|扩展|补充|增加|删掉|修复|调整|rewrite|revise|improve|simplify|expand|fix|change)/i.test(
          normalized,
        ) && /(当前|这节|这一节|这个|这段|block|选中|selected)/i.test(normalized);
      if (!looksLikeRevision) return false;
      void reviseSelectedBlockDirectly(normalized);
      return true;
    },
    [reviseSelectedBlockDirectly, selectedBlock],
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
      <CourseAIContextBridge course={course} selectedBlock={selectedBlock} onCourseUpdated={onCourseUpdated} />
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
          <div className="course-ai-context-card">
            <span className="course-ai-context-eyebrow">Auto context</span>
            <strong>{course.title}</strong>
            <p>{selectedBlock ? `正在读取：${selectedBlock.title ?? selectedBlock.type}` : "未选中 block，默认读取整门课程。"}</p>
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
          <div className="course-ai-suggestions" aria-label="Suggested prompts">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  const textarea = document.querySelector<HTMLTextAreaElement>(
                    ".course-ai-chat [data-testid='copilot-chat-textarea']",
                  );
                  if (!textarea) return;
                  textarea.focus();
                  textarea.value = prompt;
                  textarea.dispatchEvent(new Event("input", { bubbles: true }));
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
          {directRevisionStatus.status !== "idle" ? (
            <div className={`course-ai-direct-status ${directRevisionStatus.status}`}>
              <span />
              <p>{directRevisionStatus.message}</p>
            </div>
          ) : null}
          <div className="course-ai-chat">
            <CopilotChat
              threadId={threadId}
              messageView={CourseMessageView}
              welcomeScreen={false}
              input={{
                onSubmitMessage: (value: string) => {
                  if (interceptCourseRevision(value)) return;
                },
              }}
              labels={{
                chatInputPlaceholder: "Ask about this course, or create the next one…",
              }}
            />
          </div>
        </>
      ) : null}
    </aside>
  );
}

export function CourseDetailClient({ initialCourse }: { initialCourse: Course }) {
  const [course, setCourse] = useState<Course>(initialCourse);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);

  useEffect(() => {
    const saved = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (!saved) return;
    const parsed = Number(saved);
    if (Number.isFinite(parsed)) setSidebarWidth(clampSidebarWidth(parsed));
  }, []);

  useEffect(() => {
    if (sidebarCollapsed) return;
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarCollapsed, sidebarWidth]);

  const selectedBlock = course.blocks.find((b) => b.id === selectedBlockId) ?? null;

  async function submitComment() {
    if (!selectedBlock || !comment.trim() || isEditing) return;
    setIsEditing(true);
    setEditError(null);
    try {
      const response = await fetch(`/api/courses/${course.id}/edit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          blockId: selectedBlock.id,
          comment: comment.trim(),
          settings: readSettings(),
        }),
      });
      const data = (await response.json()) as { course?: Course; block?: CourseBlock; error?: string };
      if (!response.ok || !data.course) {
        throw new Error(data.error ?? "Edit failed");
      }
      setCourse(data.course);
      setComment("");
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Edit failed");
    } finally {
      setIsEditing(false);
    }
  }

  return (
    <div
      className={`course-detail-layout${sidebarCollapsed ? " sidebar-collapsed" : ""}`}
      style={{ ["--course-sidebar-width" as string]: `${sidebarCollapsed ? 56 : sidebarWidth}px` }}
    >
      <div className="course-detail-main">
        <div className="course-blocks-column">
          {course.blocks.map((block) => (
            <button
              key={block.id}
              type="button"
              className={`course-block-wrapper${selectedBlockId === block.id ? " selected" : ""}`}
              onClick={() => setSelectedBlockId(block.id)}
            >
              <BlockRenderer block={block} />
            </button>
          ))}
        </div>
        <section className="course-editor-panel inline-editor-panel">
          <div className="course-editor-header">
            <strong>Edit selected block</strong>
            <p>Click a block above, then tell the AI what to revise in place.</p>
          </div>
          <div className="course-editor-selection">
            {selectedBlock ? (
              <>
                <span className="course-editor-tag">{selectedBlock.type}</span>
                <strong>{selectedBlock.title ?? selectedBlock.type}</strong>
              </>
            ) : (
              <span className="course-editor-empty">No block selected.</span>
            )}
          </div>
          <textarea
            className="course-editor-textarea"
            placeholder="e.g. 这个 analogy 不够直观，能换成日常生活的例子吗？"
            value={comment}
            disabled={!selectedBlock || isEditing}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
          />
          <div className="course-editor-actions">
            <button
              type="button"
              className="primary-btn"
              disabled={!selectedBlock || !comment.trim() || isEditing}
              onClick={() => void submitComment()}
            >
              {isEditing ? "Revising…" : "Revise block"}
            </button>
          </div>
          {editError ? <p className="course-editor-error">{editError}</p> : null}
        </section>
      </div>
      <CourseAIAssistantPanel
        course={course}
        selectedBlock={selectedBlock}
        onSelectBlock={setSelectedBlockId}
        collapsed={sidebarCollapsed}
        width={sidebarWidth}
        onCollapsedChange={setSidebarCollapsed}
        onWidthChange={setSidebarWidth}
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

function readSettings() {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as { provider?: "openai-compatible" | "anthropic-compatible"; baseUrl?: string; apiKey?: string; model?: string };
  } catch {
    return undefined;
  }
}
