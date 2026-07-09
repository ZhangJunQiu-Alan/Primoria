"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BlockRenderer } from "./block-renderer";
import type { CourseAISelectedTextContext } from "./course-ai-assistant-panel";
import { useLessonGenerationJobs } from "@/hooks/use-lesson-generation-jobs";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import type { Course, CourseBlock, Lesson } from "@/lib/courses/types";
import { currentCourseLesson, currentLessonBlocks } from "@/lib/courses/types";
import type { LessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { lessonGenerationStageLabel } from "@/lib/courses/lesson-generation-labels";
import { useLearningProgressRecommendation } from "@/hooks/use-learning-progress-recommendation";
import { learningDecisionAcceptLabel, learningDecisionHeadline } from "@/lib/courses/learning-progress-labels";
import { useT, msg } from "@/lib/i18n/client";

const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 620;
const DEFAULT_SIDEBAR_WIDTH = 410;
const SIDEBAR_WIDTH_KEY = "primoria:course-ai-sidebar-width";

const CourseAIAssistantPanel = dynamic(
  () => import("./course-ai-assistant-panel").then((mod) => mod.CourseAIAssistantPanel),
  {
    ssr: false,
    loading: () => <CourseAIPanelLoading />,
  },
);

type SelectedTextContext = CourseAISelectedTextContext;

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

function isPracticeBlock(block: CourseBlock) {
  return block.type === "quiz" || block.type === "worksheet";
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
  const popupDialogRef = useRef<HTMLDivElement | null>(null);
  const popupPrimaryRef = useRef<HTMLButtonElement | null>(null);
  const decision = pending?.decision ?? null;
  const jobId = pending?.id ?? null;

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

  const goHome = () => router.push("/");

  async function acceptPrimary() {
    if (!jobId) return;
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
    if (!jobId) return;
    await resolve(jobId, "dismiss");
    if (decision!.kind === "remediation" && decision!.nextLessonTitle) {
      await onResolved();
      router.push(`/course/${courseId}`);
    } else goHome();
  }

  // Closing the popup == declining remediation; reveal the preloaded next lesson.
  async function closePopup() {
    if (!jobId) return;
    await resolve(jobId, "dismiss");
    await onResolved();
    router.push(`/course/${courseId}`);
  }

  useDialogFocus({
    active: Boolean(generatingLessonId || (pending && decision)),
    dialogRef: popupDialogRef,
    initialFocusRef: generatingLessonId ? undefined : popupPrimaryRef,
    onEscape: generatingLessonId ? undefined : () => void closePopup(),
  });

  if (generatingLessonId) {
    return (
      <div
        ref={popupDialogRef}
        tabIndex={-1}
        className="learning-progress-popup-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={t.generatingRemediation}
        style={POPUP_OVERLAY_STYLE}
      >
        <div className="learning-progress-popup-card" style={POPUP_CARD_STYLE}>
          <strong style={{ display: "block", fontSize: 17, color: "#3a2a14", marginBottom: 8 }}>{t.generatingRemediation}</strong>
          <p style={{ margin: 0, color: "#5a4727", fontSize: 14, lineHeight: 1.6 }}>{t.generatingRemediationCopy}</p>
        </div>
      </div>
    );
  }

  if (!pending || !decision || !jobId) return null;

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
      ref={popupDialogRef}
      tabIndex={-1}
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
            ref={popupPrimaryRef}
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

function preloadCourseAIPanel() {
  void import("./course-ai-assistant-panel");
}

function CourseAIPanelLoading() {
  const t = useT().course;
  return (
    <aside className="course-ai-sidebar course-ai-sidebar-loading" aria-label={t.tutorAria}>
      <div className="course-ai-sidebar-header">
        <button type="button" className="course-ai-collapse" aria-label={t.collapseSidebar} disabled>
          AI
        </button>
        <div className="course-ai-titleblock">
          <strong>{t.tutorTitle}</strong>
        </div>
      </div>
      <div className="course-ai-chat auth-required" role="status">
        {t.preparingLesson}
      </div>
    </aside>
  );
}

function CourseAICollapsedRail({
  onOpen,
  onPreload,
}: {
  onOpen: () => void;
  onPreload: () => void;
}) {
  const t = useT().course;
  return (
    <aside
      className="course-ai-sidebar collapsed"
      aria-label={t.tutorAria}
      onClick={onOpen}
      onMouseEnter={onPreload}
    >
      <div className="course-ai-sidebar-header">
        <button
          type="button"
          className="course-ai-collapse"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          onFocus={onPreload}
          aria-label={t.expandSidebar}
        >
          AI
        </button>
      </div>
    </aside>
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
  const router = useRouter();
  const [course, setCourse] = useState<Course>(initialCourse);
  const { jobsByLessonId, setJobs: setLessonJobs } = useLessonGenerationJobs(course.id, initialLessonJobs);
  const currentLesson = useMemo(() => currentCourseLesson(course, initialLessonId), [course, initialLessonId]);
  const currentLessonId = currentLesson?.id ?? null;
  const blocks = useMemo(() => currentLessonBlocks(course, currentLessonId), [course, currentLessonId]);
  const [readerStep, setReaderStep] = useState<{ lessonId: string | null; index: number }>({ lessonId: null, index: 0 });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedTextContext, setSelectedTextContext] = useState<SelectedTextContext | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [aiPanelLoaded, setAiPanelLoaded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const activeBlockRef = useRef<HTMLDivElement | null>(null);

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
    if (sidebarCollapsed) {
      workspace.style.removeProperty("--course-sidebar-width");
      workspace.style.setProperty("--course-content-margin-end", "auto");
      return;
    }
    workspace.style.setProperty("--course-sidebar-width", `${sidebarWidth}px`);
    workspace.style.setProperty("--course-content-margin-end", "var(--course-content-gutter)");
  }, [sidebarCollapsed, sidebarWidth]);

  const maxStepIndex = Math.max(blocks.length - 1, 0);
  const currentStepIndex = readerStep.lessonId === currentLessonId ? Math.min(readerStep.index, maxStepIndex) : 0;
  const currentBlock = blocks[currentStepIndex] ?? null;
  const totalSteps = blocks.length;
  const currentStep = currentBlock ? currentStepIndex + 1 : 0;
  const readerProgress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

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

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? currentBlock;
  const activeSelectedTextContext =
    selectedTextContext && blocks.some((block) => block.id === selectedTextContext.blockId)
      ? selectedTextContext
      : null;
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
    } catch {
      // Best-effort — a manual reload still surfaces the new lesson.
    }
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

  function goToStep(index: number) {
    const next = Math.min(Math.max(index, 0), Math.max(totalSteps - 1, 0));
    setReaderStep({ lessonId: currentLessonId, index: next });
    setSelectedBlockId(null);
    setSelectedTextContext(null);
  }

  function runPracticeCheck() {
    const root = activeBlockRef.current;
    if (!root) return;
    const submit = root.querySelector<HTMLButtonElement>(".course-quiz-submit:not(:disabled)");
    if (submit) {
      submit.click();
      return;
    }
    const reveal = root.querySelector<HTMLButtonElement>(".worksheet-reveal-btn");
    if (reveal) {
      reveal.click();
      return;
    }
    root.querySelector<HTMLElement>("button:not(:disabled), input:not(:disabled), textarea:not(:disabled)")?.focus();
  }

  function runPrimaryAction() {
    if (!currentBlock) return;
    if (isPracticeBlock(currentBlock)) {
      runPracticeCheck();
      return;
    }
    if (currentStepIndex < totalSteps - 1) {
      goToStep(currentStepIndex + 1);
      return;
    }
    router.push(`/course/${course.id}/outline`);
  }

  const primaryActionLabel = currentBlock
    ? isPracticeBlock(currentBlock)
      ? t.readerCheck
      : currentStepIndex >= totalSteps - 1
        ? t.readerDone
        : t.continueLabel
    : t.continueLabel;
  const lessonTitle = currentLesson?.title ?? course.title;

  function openAIPanel() {
    preloadCourseAIPanel();
    setAiPanelLoaded(true);
    setSidebarCollapsed(false);
  }

  function handleAIPanelCollapsedChange(collapsed: boolean) {
    if (!collapsed) setAiPanelLoaded(true);
    setSidebarCollapsed(collapsed);
  }

  return (
    <div
      className={`course-detail-layout${sidebarCollapsed ? " sidebar-collapsed" : ""}`}
      style={sidebarCollapsed ? undefined : { ["--course-sidebar-width" as string]: `${sidebarWidth}px` }}
    >
      <div className="course-detail-main">
        <div className="course-reader">
          <header className="course-reader-topbar">
            <Link href={`/course/${course.id}/outline`} className="course-reader-close" aria-label={t.readerClose}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M5 5l14 14" />
                <path d="M19 5L5 19" />
              </svg>
            </Link>
            <h1>{lessonTitle}</h1>
            <div className="course-reader-progress" aria-label={t.lessonStatus}>
              <span><i style={{ width: `${readerProgress}%` }} /></span>
              <strong>{currentStep}/{totalSteps}</strong>
            </div>
          </header>

          <main className="course-reader-stage" aria-live="polite">
            {currentBlock ? (
              <div className="course-reader-card" key={currentBlock.id}>
                <div
                  ref={activeBlockRef}
                  data-block-id={currentBlock.id}
                  className={`course-block-wrapper course-reader-block-wrapper${selectedBlockId === currentBlock.id ? " selected" : ""}`}
                  onClick={(event) => {
                    if (isCourseBlockInteractiveTarget(event.target, event.currentTarget)) return;
                    if (selectionTextInside(event.currentTarget)) return;
                    selectBlock(currentBlock);
                  }}
                  onMouseUp={(event) => {
                    if (isCourseBlockInteractiveTarget(event.target, event.currentTarget)) return;
                    updateSelectedText(currentBlock, event.currentTarget);
                  }}
                >
                  <BlockRenderer block={currentBlock} courseId={course.id} onBlockUpdated={updateBlockInCourse} />
                </div>
              </div>
            ) : (
              <div className="course-reader-card pending">
                <CourseLessonPendingState lesson={currentLesson} job={currentLessonJob} />
              </div>
            )}
          </main>

          {currentBlock ? (
            <footer className="course-reader-controls" aria-label={t.lessonStatus}>
              <button type="button" className="course-reader-arrow" onClick={() => goToStep(currentStepIndex - 1)} disabled={currentStepIndex === 0} aria-label={t.readerPrevious}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 18 9 12l6-6" />
                </svg>
              </button>
              <button type="button" className="course-reader-primary" onClick={runPrimaryAction}>
                {primaryActionLabel}
              </button>
              <button type="button" className="course-reader-arrow" onClick={() => goToStep(currentStepIndex + 1)} disabled={currentStepIndex >= totalSteps - 1} aria-label={t.readerNext}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </footer>
          ) : null}
        </div>
      </div>
      <LearningProgressPopup courseId={course.id} onResolved={refreshAfterRecommendation} />
      {aiPanelLoaded || !sidebarCollapsed ? (
        <CourseAIAssistantPanel
          course={course}
          visibleBlocks={blocks}
          selectedBlock={selectedBlock}
          collapsed={sidebarCollapsed}
          width={sidebarWidth}
          onCollapsedChange={handleAIPanelCollapsedChange}
          onWidthChange={setSidebarWidth}
          copilotEnabled={copilotEnabled}
          selectedTextContext={activeSelectedTextContext}
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
      ) : (
        <CourseAICollapsedRail onOpen={openAIPanel} onPreload={preloadCourseAIPanel} />
      )}
    </div>
  );
}
