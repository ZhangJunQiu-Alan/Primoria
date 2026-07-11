"use client";

import { useEffect, useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useAgent, useCopilotKit, useFrontendTool, UseAgentUpdate } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { CopilotKitProvider } from "@/components/copilot-provider";
import { PrimoriaCopilotChatSurface } from "@/components/tutor/copilot-chat-surface";
import { usePrimoriaGenerativeUI } from "@/hooks/use-primoria-copilot";
import type { Course, CourseBlock } from "@/lib/courses/types";
import { msg, useT } from "@/lib/i18n/client";

const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 620;
const DEFAULT_SIDEBAR_WIDTH = 410;
const COURSE_COPILOT_PROMPT_EVENT = "primoria:course-copilot-prompt";

export type CourseAISelectedTextContext = {
  blockId: string;
  blockTitle: string;
  blockType: CourseBlock["type"];
  text: string;
};

type CourseAIAssistantPanelProps = {
  course: Course;
  visibleBlocks: CourseBlock[];
  selectedBlock: CourseBlock | null;
  collapsed: boolean;
  width: number;
  onCollapsedChange: (collapsed: boolean) => void;
  onWidthChange: (width: number) => void;
  onCourseUpdated: (course: Course) => void;
  copilotEnabled: boolean;
  selectedTextContext: CourseAISelectedTextContext | null;
  currentLessonId: string | null;
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
      htmlSummary: (block.html ?? "").slice(0, 900),
    };
  }
  if (block.type === "image") {
    return {
      id: block.id,
      type: block.type,
      title,
      imageKind: block.imageKind,
      alt: block.alt,
      caption: block.caption,
    };
  }
  if (block.type !== "code") return { id: block.id, type: block.type, title };
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
  visibleBlocks: CourseBlock[],
  selectedBlock: CourseBlock | null,
  selectedText: CourseAISelectedTextContext | null,
) {
  return {
    course: {
      id: course.id,
      title: course.title,
      topic: course.topic,
      summary: course.summary,
      estimatedMinutes: course.estimatedMinutes,
      blocks: visibleBlocks.map((block, index) => ({
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

function CourseRevisionAction({
  course,
  selectedBlock,
  selectedTextContext,
  onCourseUpdated,
}: {
  course: Course;
  selectedBlock: CourseBlock | null;
  selectedTextContext: CourseAISelectedTextContext | null;
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
                : "Updating the selected course block..."}
            </p>
          </div>
        );
      },
    },
    [course.id, selectedBlock?.id, selectedTextContext?.blockId, selectedTextContext?.text, onCourseUpdated],
  );

  return null;
}

const BLOCK_TYPE_ENUM = z.enum([
  "text",
  "analogy",
  "transfer",
  "visual",
  "image",
  "code",
  "quiz",
]);

function ActionStatus({ name, status, result }: { name: string; status: string; result: unknown }) {
  const parsed = result as { ok?: boolean; error?: string; message?: string } | undefined;
  return (
    <div className="course-ai-action-status">
      <span className={status === "complete" && parsed?.ok === false ? "error" : "ok"} />
      <strong>{name}</strong>
      <p>
        {status === "complete"
          ? parsed?.ok === false
            ? parsed.error ?? "Action failed."
            : parsed?.message ?? "Course updated."
          : "Updating the course..."}
      </p>
    </div>
  );
}

function CourseStructureActions({
  course,
  selectedBlock,
  onCourseUpdated,
}: {
  course: Course;
  selectedBlock: CourseBlock | null;
  onCourseUpdated: (course: Course) => void;
}) {
  async function postEdit(body: Record<string, unknown>) {
    const response = await fetch(`/api/courses/${course.id}/edit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { course?: Course; block?: CourseBlock; error?: string };
    if (!response.ok || !data.course) {
      return { ok: false as const, error: data.error ?? "Action failed" };
    }
    onCourseUpdated(data.course);
    return { ok: true as const, course: data.course, block: data.block };
  }

  useFrontendTool(
    {
      name: "add_course_block",
      description:
        "Add a NEW block to the open Primoria course. Use when the learner asks to add an explanation, example, analogy, transfer, interactive visual, illustration/image, code sample, or quiz. Use \"image\" for a static illustration/picture/diagram the learner wants to SEE (an object, structure, scene, or analogy); use \"visual\" for an interactive widget. Pick the block type that best fits the request.",
      parameters: z.object({
        targetType: BLOCK_TYPE_ENUM.describe("The block type to create."),
        instruction: z.string().describe("What the new block should cover, in the learner's terms."),
        afterBlockId: z
          .string()
          .optional()
          .describe("Insert the new block right after this existing block id. Omit to append at the end."),
      }),
      handler: async ({ targetType, instruction, afterBlockId }) => {
        const res = await postEdit({ action: "add", targetType, instruction, afterBlockId });
        if (!res.ok) return res;
        return { ok: true, blockId: res.block?.id, message: `Added a new ${targetType} block.` };
      },
      render: ({ status, result }) => <ActionStatus name="add_course_block" status={status} result={result} />,
    },
    [course.id, onCourseUpdated],
  );

  useFrontendTool(
    {
      name: "transform_selected_course_block",
      description:
        "Convert the currently selected course block into a DIFFERENT supported block type (for example, turn a text block into a visual or quiz). Use only when a block is selected and the learner asks to change its format.",
      parameters: z.object({
        targetType: BLOCK_TYPE_ENUM.describe("The block type to convert into."),
        instruction: z.string().describe("Any guidance for the conversion."),
      }),
      handler: async ({ targetType, instruction }) => {
        if (!selectedBlock) return { ok: false, error: "No block is selected. Ask the learner to click a block first." };
        const res = await postEdit({ action: "transform", blockId: selectedBlock.id, targetType, instruction });
        if (!res.ok) return res;
        return { ok: true, blockId: res.block?.id, message: `Converted the block into a ${targetType} block.` };
      },
      render: ({ status, result }) => <ActionStatus name="transform_selected_course_block" status={status} result={result} />,
    },
    [course.id, selectedBlock?.id, onCourseUpdated],
  );

  useFrontendTool(
    {
      name: "remove_selected_course_block",
      description:
        "Delete the currently selected block from the open course. Use only when the learner explicitly asks to remove/delete the selected block.",
      parameters: z.object({
        reason: z.string().optional().describe("Optional reason for removing the block."),
      }),
      handler: async ({ reason }) => {
        if (!selectedBlock) return { ok: false, error: "No block is selected. Ask the learner to click a block first." };
        const res = await postEdit({ action: "remove", blockId: selectedBlock.id, instruction: reason });
        if (!res.ok) return res;
        return { ok: true, message: "Removed the selected block." };
      },
      render: ({ status, result }) => <ActionStatus name="remove_selected_course_block" status={status} result={result} />,
    },
    [course.id, selectedBlock?.id, onCourseUpdated],
  );

  useFrontendTool(
    {
      name: "move_selected_course_block",
      description:
        "Reorder the currently selected block to a new position in the course. toIndex is 0-based (0 = first). Use when the learner asks to move the selected block earlier or later.",
      parameters: z.object({
        toIndex: z.number().int().min(0).describe("0-based destination position in the course."),
      }),
      handler: async ({ toIndex }) => {
        if (!selectedBlock) return { ok: false, error: "No block is selected. Ask the learner to click a block first." };
        const res = await postEdit({ action: "move", blockId: selectedBlock.id, toIndex });
        if (!res.ok) return res;
        return { ok: true, message: `Moved the block to position ${toIndex + 1}.` };
      },
      render: ({ status, result }) => <ActionStatus name="move_selected_course_block" status={status} result={result} />,
    },
    [course.id, selectedBlock?.id, onCourseUpdated],
  );

  return null;
}

function sendCoursePrompt(threadId: string, prompt: string) {
  window.dispatchEvent(new CustomEvent(COURSE_COPILOT_PROMPT_EVENT, { detail: { threadId, prompt } }));
}

function courseThreadIdFor(courseId: string) {
  return `course-v5-${courseId}`;
}

function blockDisplayTitle(block: CourseBlock) {
  return block.title ?? block.type;
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

function CourseAIAssistantPanelInner({
  course,
  visibleBlocks,
  selectedBlock,
  collapsed,
  width,
  onCollapsedChange,
  onWidthChange,
  onCourseUpdated,
  copilotEnabled,
  selectedTextContext,
  currentLessonId,
}: CourseAIAssistantPanelProps) {
  const t = useT().course;
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);

  const courseThreadId = courseThreadIdFor(course.id);
  const courseContext = useMemo(
    () => buildCourseContext(course, visibleBlocks, selectedBlock, selectedTextContext),
    [course, visibleBlocks, selectedBlock, selectedTextContext],
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

  function beginResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    draggingRef.current = true;
    startXRef.current = event.clientX;
    startWidthRef.current = width;
    document.body.classList.add("course-sidebar-resizing");
  }

  const selectedBlockTitle = selectedBlock ? blockDisplayTitle(selectedBlock) : "";
  const suggestedPrompts = selectedBlock
    ? [
        msg(t.explainSelected, { title: selectedBlockTitle }),
        msg(t.exampleSelected, { title: selectedBlockTitle }),
        t.practiceSelected,
      ]
    : [
        msg(t.summarizePath, { title: course.title }),
        t.generatePractice,
        t.firstBlock,
      ];
  const selectedTextPreview = selectedTextContext
    ? `${Array.from(selectedTextContext.text).slice(0, 5).join("")}${Array.from(selectedTextContext.text).length > 5 ? "..." : ""}`
    : "";
  const composerContext = selectedTextContext ? (
    <div
      className="course-ai-composer-context"
      aria-label={t.currentContext}
      style={{
        boxSizing: "border-box",
        paddingLeft: 8,
      }}
    >
      <div
        className="course-ai-selection-pill"
        title={selectedTextContext.text}
        aria-label={t.selectedTextAttached}
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
      style={collapsed ? undefined : { ["--course-sidebar-width" as string]: `${width}px` }}
      aria-label={t.tutorAria}
      onClick={() => {
        if (collapsed) onCollapsedChange(false);
      }}
    >
      <button
        type="button"
        className="course-sidebar-resize-handle"
        aria-label={t.resizeSidebar}
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
          <CourseStructureActions
            course={course}
            selectedBlock={selectedBlock}
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
          aria-label={collapsed ? t.expandSidebar : t.collapseSidebar}
        >
          {collapsed ? "AI" : "->"}
        </button>
        {!collapsed ? (
          <div className="course-ai-titleblock">
            <strong>{t.tutorTitle}</strong>
          </div>
        ) : null}
      </div>
      {!collapsed ? (
        <>
          {copilotEnabled ? (
            <>
              <div className="course-ai-suggestions" aria-label={t.suggestionsAria}>
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
                  title={`${t.tutorTitle}: ${course.title}`}
                  placeholder={t.composerPlaceholder}
                  className="course-copilot-surface"
                  context={{
                    description: "Primoria course detail mode",
                    value: JSON.stringify(courseContext),
                  }}
                  courseId={course.id}
                  lessonId={currentLessonId}
                  composerContext={composerContext}
                />
              </div>
            </>
          ) : (
            <div className="course-ai-chat auth-required">{t.signInTutor}</div>
          )}
        </>
      ) : null}
    </aside>
  );
}

export function CourseAIAssistantPanel(props: CourseAIAssistantPanelProps) {
  if (!props.copilotEnabled) return <CourseAIAssistantPanelInner {...props} />;
  return (
    <CopilotKitProvider>
      <CourseAIAssistantPanelInner {...props} />
    </CopilotKitProvider>
  );
}

