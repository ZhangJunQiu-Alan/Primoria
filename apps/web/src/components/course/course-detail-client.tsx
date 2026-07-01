"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAgent, useCopilotKit, useFrontendTool, UseAgentUpdate } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { BlockRenderer } from "./block-renderer";
import { CourseOutlineView } from "./course-outline-view";
import { PrimoriaCopilotChatSurface } from "@/components/tutor/copilot-chat-surface";
import { useLessonGenerationJobs } from "@/hooks/use-lesson-generation-jobs";
import { usePrimoriaGenerativeUI } from "@/hooks/use-primoria-copilot";
import type { Course, CourseBlock, Lesson } from "@/lib/courses/types";
import { currentCourseLesson, currentLessonBlocks } from "@/lib/courses/types";
import type { LessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { lessonGenerationStageLabel } from "@/lib/courses/lesson-generation-labels";
import { useLearningProgressRecommendation } from "@/hooks/use-learning-progress-recommendation";
import { learningDecisionAcceptLabel, learningDecisionHeadline } from "@/lib/courses/learning-progress-labels";
import { useT, msg } from "@/lib/i18n/client";
import type { I18nDictionary } from "@/lib/i18n/dictionaries";

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
  selectedText: SelectedTextContext | null,
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

function isCourseBlockInteractiveTarget(target: EventTarget | null, blockElement: HTMLElement) {
  if (!(target instanceof Element)) return false;
  const interactive = target.closest<HTMLElement>(
    [
      "button",
      "a",
      "input",
      "textarea",
      "select",
      "summary",
      "[role='button']",
      "[role='slider']",
      "[contenteditable='true']",
      "[data-course-interactive='true']",
    ].join(","),
  );
  return Boolean(interactive && blockElement.contains(interactive));
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
          : "Updating the course…"}
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
        const res = await postEdit({ action: "add", targetType, instruction, afterBlockId, settings: readSettings() });
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
        const res = await postEdit({ action: "transform", blockId: selectedBlock.id, targetType, instruction, settings: readSettings() });
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

function blockActionPrompt(
  block: CourseBlock,
  action: "explain" | "example" | "practice" | "check",
  t: I18nDictionary["course"],
) {
  const title = blockDisplayTitle(block);
  if (action === "explain") return msg(t.explainSelected, { title });
  if (action === "example") return msg(t.exampleSelected, { title });
  if (action === "practice") return msg(t.practiceSelected, { title });
  return msg(t.checkSelected, { title });
}

function stopBlockActionEvent(event: React.SyntheticEvent) {
  event.stopPropagation();
}

function CourseBlockActionTray({
  block,
  expanded,
  onAction,
}: {
  block: CourseBlock;
  expanded: boolean;
  onAction: (block: CourseBlock, action: "explain" | "example" | "practice" | "check") => void;
}) {
  const t = useT().course;
  const controlsId = `course-block-actions-${block.id}`;
  const title = blockDisplayTitle(block);
  const actions = [
    { key: "explain" as const, label: t.actionExplain },
    { key: "example" as const, label: t.actionExample },
    { key: "practice" as const, label: t.actionPractice },
    { key: "check" as const, label: t.actionCheck },
  ];

  if (!expanded) return null;

  return (
    <div
      className="course-block-learning-actions expanded"
      onClick={stopBlockActionEvent}
      onMouseUp={stopBlockActionEvent}
      onKeyDown={stopBlockActionEvent}
      onKeyUp={stopBlockActionEvent}
    >
      <div id={controlsId} className="course-block-action-panel" role="group" aria-label={msg(t.learningActions, { title })}>
        <div className="course-block-action-panel-copy">
          <strong>{title}</strong>
        </div>
        <div className="course-block-action-tray">
          {actions.map((action) => (
            <button key={action.key} type="button" onClick={() => onAction(block, action.key)}>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
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

function CourseLessonPendingState({
  lesson,
  job,
}: {
  lesson: Lesson | null;
  job?: LessonGenerationJobSummary;
}) {
  const t = useT().course;
  if (!lesson) {
    return (
      <div className="course-lesson-pending-card">
        <span>{t.preparingLesson}</span>
        <h2>{t.notReadyTitle}</h2>
        <p>{t.notReadyCopy}</p>
      </div>
    );
  }
  const detail = job ? lessonGenerationStageLabel(job) : t.preparingThisLesson;
  return (
    <div className="course-lesson-pending-card">
      <span>{lesson.status === "generating" ? t.generatingLesson : t.plannedLesson}</span>
      <h2>{lesson.title}</h2>
      <p>{lesson.description || t.preparingLessonCopy}</p>
      <div className="course-lesson-pending-progress" aria-label={detail}>
        <i />
      </div>
      <small>{detail}</small>
    </div>
  );
}

function CourseAIAssistantPanel({
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
}: {
  course: Course;
  visibleBlocks: CourseBlock[];
  selectedBlock: CourseBlock | null;
  collapsed: boolean;
  width: number;
  onCollapsedChange: (collapsed: boolean) => void;
  onWidthChange: (width: number) => void;
  onCourseUpdated: (course: Course) => void;
  copilotEnabled: boolean;
  selectedTextContext: SelectedTextContext | null;
  currentLessonId: string | null;
}) {
  const t = useT().course;
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);

  // Use a v5 namespace so old LangGraph/CopilotKit dev checkpoints and
  // context-injected course-chat history cannot leak into Course Tutor.
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

  function beginResize(event: React.PointerEvent<HTMLButtonElement>) {
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
      style={{ width: collapsed ? 56 : width }}
      aria-label={t.tutorAria}
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
          {collapsed ? "AI" : "→"}
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
              <div className={`course-ai-context-strip${selectedBlock ? "" : " empty"}`}>
                <span>{t.currentContext}</span>
                <strong>{selectedBlock ? selectedBlockTitle : t.noSelectedBlock}</strong>
              </div>
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

const POPUP_OVERLAY_STYLE: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(28, 22, 14, 0.32)",
  padding: 16,
};
const POPUP_CARD_STYLE: React.CSSProperties = {
  width: "min(440px, 100%)",
  background: "#fffefb",
  borderRadius: 16,
  border: "1px solid rgba(200, 136, 26, 0.22)",
  boxShadow: "0 18px 48px rgba(57, 42, 25, 0.22)",
  padding: 24,
};
const POPUP_SECONDARY_BTN: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 999,
  border: "1px solid rgba(90, 71, 39, 0.2)",
  background: "transparent",
  color: "#5a4727",
  fontWeight: 700,
  cursor: "pointer",
};
const POPUP_PRIMARY_BTN: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: 999,
  border: "none",
  background: "#c8881a",
  color: "#fffaf2",
  fontWeight: 800,
  cursor: "pointer",
};

// Post-lesson recommendation popup (feature_specification.md §28–30). After a
// lesson is completed, the learning-progress worker records a next-step decision.
// The popup has three shapes by decision kind:
//   • remediation — offer to generate a remediation lesson ("是", stays open and
//     shows generation progress) or skip to the next lesson / home ("不需要").
//   • next — "Good Job"; start the (preloaded) next lesson, or go home.
//   • course_complete — congratulate and return home.
// Closing the popup counts as declining remediation (dismiss). Every resolution
// refreshes the course so the next/remediation lesson surfaces in the outline.
function LearningProgressPopup({ courseId, onResolved }: { courseId: string; onResolved: () => Promise<void> | void }) {
  const router = useRouter();
  const t = useT().course;
  const { pending, resolving, resolve } = useLearningProgressRecommendation(courseId);
  const [generatingLessonId, setGeneratingLessonId] = useState<string | null>(null);

  // While a remediation lesson generates, keep the popup open and poll the course
  // until that lesson materializes, then refresh so its blocks appear and close.
  useEffect(() => {
    if (!generatingLessonId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { course?: { lessons?: { id: string; status: string }[] } };
        const lesson = data.course?.lessons?.find((l) => l.id === generatingLessonId);
        if (lesson?.status === "generated" && !cancelled) {
          const generatedLessonId = generatingLessonId;
          setGeneratingLessonId(null);
          await onResolved();
          router.push(`/course/${courseId}?lessonId=${encodeURIComponent(generatedLessonId)}`);
        }
      } catch {
        // Best-effort polling; a manual reload still surfaces the lesson.
      }
    };
    const interval = window.setInterval(() => void tick(), 2500);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [generatingLessonId, courseId, onResolved, router]);

  if (generatingLessonId) {
    return (
      <div className="learning-progress-popup-overlay" role="dialog" aria-modal="true" aria-label={t.generatingRemediation} style={POPUP_OVERLAY_STYLE}>
        <div className="learning-progress-popup-card" style={POPUP_CARD_STYLE}>
          <strong style={{ display: "block", fontSize: 17, color: "#3a2a14", marginBottom: 8 }}>{t.generatingRemediation}</strong>
          <p style={{ margin: 0, color: "#5a4727", fontSize: 14, lineHeight: 1.6 }}>{t.generatingRemediationCopy}</p>
        </div>
      </div>
    );
  }

  const decision = pending?.decision ?? null;
  if (!pending || !decision) return null;
  const jobId = pending.id;
  const goHome = () => router.push("/");

  async function acceptPrimary() {
    const result = await resolve(jobId, "accept");
    if (decision!.kind === "remediation" && result?.lessonId) {
      setGeneratingLessonId(result.lessonId);
      return;
    }
    if (decision!.kind === "course_complete") {
      goHome();
      return;
    }
    // next — the lesson is preloaded (or now enqueued); surface it in place.
    await onResolved();
    if (result?.lessonId) {
      router.push(`/course/${courseId}?lessonId=${encodeURIComponent(result.lessonId)}`);
    }
  }

  // Secondary action by kind:
  //   • remediation + has next → decline remediation and advance to the next lesson
  //   • remediation, last lesson → decline and go home
  //   • next ("Good Job") → "否", go home
  async function declineSecondary() {
    await resolve(jobId, "dismiss");
    if (decision!.kind === "remediation" && decision!.nextLessonTitle) {
      await onResolved();
      router.push(`/course/${courseId}`);
    } else goHome();
  }

  // Closing the popup == declining remediation; reveal the preloaded next lesson.
  async function closePopup() {
    await resolve(jobId, "dismiss");
    await onResolved();
    router.push(`/course/${courseId}`);
  }

  const isRemediation = decision.kind === "remediation";
  const isComplete = decision.kind === "course_complete";
  const secondaryLabel = isComplete
    ? null
    : decision.kind === "next"
      ? t.no
      : decision.nextLessonTitle
        ? msg(t.noNeedNext, { title: decision.nextLessonTitle })
        : t.noNeed;

  return (
    <div
      className="learning-progress-popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t.learningRecommendation}
      style={POPUP_OVERLAY_STYLE}
      onClick={(e) => {
        if (e.target === e.currentTarget) void closePopup();
      }}
    >
      <div className="learning-progress-popup-card" style={POPUP_CARD_STYLE}>
        <strong style={{ display: "block", fontSize: 17, color: "#3a2a14", marginBottom: 8 }}>
          {learningDecisionHeadline(decision, t)}
        </strong>
        <p style={{ margin: 0, color: "#5a4727", fontSize: 14, lineHeight: 1.6 }}>{decision.reason}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
          {secondaryLabel && (
            <button
              type="button"
              onClick={() => void declineSecondary()}
              disabled={resolving}
              style={{ ...POPUP_SECONDARY_BTN, cursor: resolving ? "default" : "pointer" }}
            >
              {secondaryLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => void acceptPrimary()}
            disabled={resolving}
            style={{ ...POPUP_PRIMARY_BTN, cursor: resolving ? "default" : "pointer" }}
          >
            {resolving ? t.processing : isRemediation ? t.yes : learningDecisionAcceptLabel(decision, t)}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CourseDetailClient({
  initialCourse,
  initialLessonId = null,
  initialLessonJobs = [],
  copilotEnabled,
}: {
  initialCourse: Course;
  initialLessonId?: string | null;
  initialLessonJobs?: LessonGenerationJobSummary[];
  copilotEnabled: boolean;
}) {
  const t = useT().course;
  const [course, setCourse] = useState<Course>(initialCourse);
  const { jobs: lessonJobs, jobsByLessonId, setJobs: setLessonJobs } = useLessonGenerationJobs(course.id, initialLessonJobs);
  const [outlineKey, setOutlineKey] = useState(0);
  const currentLesson = useMemo(() => currentCourseLesson(course, initialLessonId), [course, initialLessonId]);
  const currentLessonId = currentLesson?.id ?? null;
  const blocks = useMemo(() => currentLessonBlocks(course, currentLessonId), [course, currentLessonId]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedTextContext, setSelectedTextContext] = useState<SelectedTextContext | null>(null);
  const [expandedActionsBlockId, setExpandedActionsBlockId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const courseThreadId = courseThreadIdFor(course.id);

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
    workspace.style.setProperty("--course-content-margin-end", sidebarCollapsed ? "auto" : "var(--course-content-gutter)");
  }, [sidebarCollapsed, sidebarWidth]);

  useEffect(() => {
    setSelectedBlockId((current) => (current && blocks.some((block) => block.id === current) ? current : null));
    setSelectedTextContext((current) => (current && blocks.some((block) => block.id === current.blockId) ? current : null));
    setExpandedActionsBlockId((current) => (current && blocks.some((block) => block.id === current) ? current : null));
  }, [blocks]);

  // Preload only the immediately-next outline lesson while this lesson is open
  // (feature_specification.md §28). Preloading must not make the next lesson's
  // blocks visible on the current lesson page.
  const prewarmedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const active = currentLesson;
    if (!active || prewarmedRef.current.has(active.id)) return;
    prewarmedRef.current.add(active.id);
    void fetch(`/api/courses/${course.id}/lessons/${active.id}/prewarm-next`, { method: "POST" }).catch(() => {});
  }, [course.id, currentLesson]);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;
  const currentLessonJob = currentLessonId ? jobsByLessonId.get(currentLessonId) : undefined;

  useEffect(() => {
    if (!currentLessonId || currentLessonJob?.status !== "completed") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/courses/${course.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { course?: Course };
        if (!cancelled && data.course) setCourse(data.course);
      } catch {
        // Best-effort; the next navigation or reload shows the published lesson.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [course.id, currentLessonId, currentLessonJob?.status]);

  // After a recommendation is accepted (a lesson job was enqueued), refetch the
  // course (the new/next lesson now exists) and its lesson jobs, then remount the
  // outline so it re-seeds with the active job and starts polling.
  async function refreshAfterRecommendation() {
    try {
      const [courseRes, jobsRes] = await Promise.all([
        fetch(`/api/courses/${course.id}`, { cache: "no-store" }),
        fetch(`/api/courses/${course.id}/lesson-generation-jobs`, { cache: "no-store" }),
      ]);
      if (courseRes.ok) {
        const data = (await courseRes.json()) as { course?: Course };
        if (data.course) setCourse(data.course);
      }
      if (jobsRes.ok) {
        const data = (await jobsRes.json()) as { jobs?: LessonGenerationJobSummary[] };
        if (Array.isArray(data.jobs)) setLessonJobs(data.jobs);
      }
      setOutlineKey((key) => key + 1);
    } catch {
      // Best-effort — a manual reload still surfaces the new lesson.
    }
  }

  function selectBlock(block: CourseBlock) {
    setSelectedBlockId(block.id);
    setSelectedTextContext(null);
  }

  // Lift an in-place block edit (e.g. saved code) into the course state so the
  // Copilot context and any remount read the new version, not the stale one.
  function updateBlockInCourse(next: CourseBlock) {
    setCourse((prev) => ({
      ...prev,
      lessons: prev.lessons.map((lesson) =>
        lesson.blocks
          ? { ...lesson, blocks: lesson.blocks.map((b) => (b.id === next.id ? next : b)) }
          : lesson,
      ),
    }));
  }

  function openBlockActions(block: CourseBlock) {
    setSelectedBlockId(block.id);
    setSelectedTextContext(null);
    setExpandedActionsBlockId(block.id);
  }

  function runBlockLearningAction(block: CourseBlock, action: "explain" | "example" | "practice" | "check") {
    setSelectedBlockId(block.id);
    setSelectedTextContext(null);
    setSidebarCollapsed(false);
    setExpandedActionsBlockId(block.id);
    sendCoursePrompt(courseThreadId, blockActionPrompt(block, action, t));
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
        const block = blocks.find((candidate) => candidate.id === blockId);
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
  }, [blocks]);

  return (
    <div
      className={`course-detail-layout${sidebarCollapsed ? " sidebar-collapsed" : ""}`}
      style={{ ["--course-sidebar-width" as string]: `${sidebarCollapsed ? 56 : sidebarWidth}px` }}
    >
      <div className="course-detail-main">
        <div className="course-blocks-column">
          {blocks.length > 0 ? blocks.map((block) => (
            <div
              key={block.id}
              role="group"
              tabIndex={0}
              data-block-id={block.id}
              data-actions-expanded={expandedActionsBlockId === block.id ? "true" : "false"}
              aria-controls={`course-block-actions-${block.id}`}
              aria-label={`Course block: ${blockDisplayTitle(block)}`}
              className={`course-block-wrapper${selectedBlockId === block.id ? " selected" : ""}`}
              onClick={(event) => {
                if (isCourseBlockInteractiveTarget(event.target, event.currentTarget)) return;
                if (selectionTextInside(event.currentTarget)) return;
                openBlockActions(block);
              }}
              onMouseUp={(event) => {
                if (isCourseBlockInteractiveTarget(event.target, event.currentTarget)) return;
                updateSelectedText(block, event.currentTarget);
              }}
              onKeyUp={(event) => {
                if (event.key === "Shift" || event.key.startsWith("Arrow")) {
                  updateSelectedText(block, event.currentTarget);
                }
              }}
              onKeyDown={(event) => {
                if (isCourseBlockInteractiveTarget(event.target, event.currentTarget)) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openBlockActions(block);
                }
              }}
            >
              <BlockRenderer block={block} courseId={course.id} onBlockUpdated={updateBlockInCourse} />
              <CourseBlockActionTray
                block={block}
                expanded={expandedActionsBlockId === block.id}
                onAction={runBlockLearningAction}
              />
            </div>
          )) : <CourseLessonPendingState lesson={currentLesson} job={currentLessonJob} />}
          <CourseOutlineView
            key={outlineKey}
            course={course}
            initialJobs={lessonJobs}
            variant="embedded"
            visibleLessons="upcoming"
            currentLessonId={currentLessonId}
            onCourseUpdated={setCourse}
          />
        </div>
      </div>
      <LearningProgressPopup courseId={course.id} onResolved={refreshAfterRecommendation} />
      <CourseAIAssistantPanel
        course={course}
        visibleBlocks={blocks}
        selectedBlock={selectedBlock}
        collapsed={sidebarCollapsed}
        width={sidebarWidth}
        onCollapsedChange={setSidebarCollapsed}
        onWidthChange={setSidebarWidth}
        copilotEnabled={copilotEnabled}
        selectedTextContext={selectedTextContext}
        currentLessonId={currentLessonId}
        onCourseUpdated={(nextCourse) => {
          setCourse(nextCourse);
          const nextBlocks = currentLessonBlocks(nextCourse, currentLessonId);
          if (selectedBlockId && !nextBlocks.some((block) => block.id === selectedBlockId)) {
            setSelectedBlockId(null);
            setSelectedTextContext(null);
          }
          if (selectedTextContext && !nextBlocks.some((block) => block.id === selectedTextContext.blockId)) {
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
