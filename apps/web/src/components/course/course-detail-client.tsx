"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowIcon } from "@/components/arrow-icon";
import { CourseCover } from "@/components/library/course-cover";
import { BlockRenderer } from "./block-renderer";
import type { LessonConceptView } from "@/lib/courses/lesson-concepts";
import type { CourseAISelectedTextContext } from "./course-ai-assistant-panel";
import { useLessonGenerationJobs } from "@/hooks/use-lesson-generation-jobs";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import type { Course, CourseBlock, Lesson } from "@/lib/courses/types";
import { currentCourseLesson, currentLessonBlocks } from "@/lib/courses/types";
import type { LessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { lessonGenerationStageLabel, isLessonGenerationActive } from "@/lib/courses/lesson-generation-labels";
import { useLearningProgressRecommendation } from "@/hooks/use-learning-progress-recommendation";
import { learningDecisionAcceptLabel, learningDecisionHeadline } from "@/lib/courses/learning-progress-labels";
import { formatMessage } from "@/lib/i18n/format";
import { useT, msg } from "@/lib/i18n/client";
import { isMaterialGraphId } from "@/lib/materials/types";

const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 620;
const DEFAULT_SIDEBAR_WIDTH = 340;
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
  course,
  lesson,
  job,
}: {
  course: Course;
  lesson: Lesson | null;
  job?: LessonGenerationJobSummary;
}) {
  const t = useT().course;
  const detail = job ? lessonGenerationStageLabel(job) : t.preparingThisLesson;
  return (
    <div className="lesson-pending">
      <figure className="lesson-pending-art" aria-hidden="true">
        <CourseCover title={course.title} topic={course.topic} fromMaterials={isMaterialGraphId(course.graphId)} sizes="560px" />
      </figure>
      <span className="lesson-pending-kicker">
        {!lesson ? t.preparingLesson : lesson.status === "generating" ? t.generatingLesson : t.plannedLesson}
      </span>
      <h2>{lesson ? lesson.title : t.notReadyTitle}</h2>
      <p>{lesson ? lesson.description || t.preparingLessonCopy : t.notReadyCopy}</p>
      {lesson ? (
        <>
          <div className="lesson-pending-progress" aria-label={detail}>
            <i />
          </div>
          <small>{detail}</small>
        </>
      ) : (
        <Link href={`/course/${course.id}/outline`} className="lesson-pending-link">
          {t.viewOutlineLink}
          <ArrowIcon size={14} />
        </Link>
      )}
    </div>
  );
}

// Post-lesson recommendation popup (docs/product/feature_specification.md §28–30). After a
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
  const { pending, resolving, resolveError, resolve } = useLearningProgressRecommendation(courseId);
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
    if (!result) return;
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
    const result = await resolve(jobId, "dismiss");
    if (!result) return;
    if (decision!.kind === "remediation" && decision!.nextLessonTitle) {
      await onResolved();
      router.push(`/course/${courseId}`);
    } else goHome();
  }

  // Closing the popup == declining remediation; reveal the preloaded next lesson.
  async function closePopup() {
    if (!jobId) return;
    const result = await resolve(jobId, "dismiss");
    if (!result) return;
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
        className="lesson-dialog-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label={t.generatingRemediation}
      >
        <div className="lesson-dialog">
          <div className="lesson-dialog-body">
            <span className="lesson-dialog-kicker">{t.learningRecommendation}</span>
            <h2>{t.generatingRemediation}</h2>
            <p>{t.generatingRemediationCopy}</p>
            <div className="lesson-pending-progress" aria-hidden="true">
              <i />
            </div>
          </div>
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
      className="lesson-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={t.learningRecommendation}
      onClick={(e) => {
        if (e.target === e.currentTarget) void closePopup();
      }}
    >
      <div className="lesson-dialog">
        {isRemediation ? null : (
          <figure className="lesson-dialog-art" aria-hidden="true">
            <Image src="/course/finish-path.svg" alt="" fill sizes="460px" unoptimized />
          </figure>
        )}
        <div className="lesson-dialog-body">
          <span className="lesson-dialog-kicker">{t.learningRecommendation}</span>
          <h2>{learningDecisionHeadline(decision, t)}</h2>
          <p>{decision.reason}</p>
          {resolveError ? <p role="alert" className="lesson-dialog-error">{t.recommendationFailed}</p> : null}
          <div className="lesson-dialog-actions">
            {secondaryLabel && (
              <button type="button" className="lesson-button plain" onClick={() => void declineSecondary()} disabled={resolving}>
                {secondaryLabel}
              </button>
            )}
            <button
              type="button"
              ref={popupPrimaryRef}
              className="lesson-button primary"
              onClick={() => void acceptPrimary()}
              disabled={resolving}
            >
              {resolving ? t.processing : isRemediation ? t.yes : learningDecisionAcceptLabel(decision, t)}
              <ArrowIcon size={15} />
            </button>
          </div>
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

const TUTOR_PANEL_OPEN_QUERY = "(min-width: 1280px)";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return true;
  return Boolean(target.closest("[role='slider'], [data-course-interactive='true'], [role='dialog'], .course-ai-sidebar"));
}

function LessonConceptsMenu({ course, concepts }: { course: Course; concepts: LessonConceptView[] }) {
  const t = useT().course;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const completed = course.lessons.filter((lesson) => lesson.progress === "completed").length;
  const total = course.lessons.length;

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="lesson-concepts" ref={rootRef}>
      <button
        type="button"
        className="lesson-tool"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {concepts.length > 0 ? (
          <span className="lesson-concept-dots" aria-hidden="true">
            {concepts.slice(0, 5).map((concept) => (
              <i key={concept.conceptId} data-status={concept.status} />
            ))}
          </span>
        ) : null}
        <span className="lesson-tool-label">{t.conceptsButton}</span>
      </button>
      {open ? (
        <div className="lesson-concepts-pop" role="dialog" aria-label={t.lessonConcepts}>
          {concepts.length > 0 ? (
            <>
              <span className="lesson-pop-label">{t.lessonConcepts}</span>
              <ol>
                {concepts.map((concept) => (
                  <li key={concept.conceptId} data-status={concept.status}>
                    <i aria-hidden="true" />
                    <span>
                      <strong>{concept.name}</strong>
                      {concept.sources?.map((source) => (
                        <small key={source.materialId}>
                          {formatMessage(t.conceptSource, {
                            title: source.title,
                            locator: source.locator ? ` · ${source.locator}` : "",
                          })}
                        </small>
                      ))}
                    </span>
                    <em>{t.conceptStatus[concept.status]}</em>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
          <div className="lesson-pop-course">
            <div>
              <span>{course.title}</span>
              <span>{msg(t.courseProgress, { done: completed, total })}</span>
            </div>
            <span className="lesson-pop-bar" aria-hidden="true">
              <i style={{ width: `${total > 0 ? Math.round((completed / total) * 100) : 0}%` }} />
            </span>
            <Link href={`/course/${course.id}/outline`}>
              {t.viewOutlineLink}
              <ArrowIcon size={14} />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function stepLabel(block: CourseBlock, t: ReturnType<typeof useT>["course"]) {
  if (block.type === "image" || block.type === "visual") return t.stepTypes[block.type];
  const role = block.pedagogicalRole;
  return role ? t.stepRoles[role] : t.stepTypes[block.type] ?? block.type;
}

export function CourseDetailClient({
  initialCourse,
  initialLessonId = null,
  initialLessonJobs = [],
  copilotEnabled,
  lessonConcepts = {},
}: {
  initialCourse: Course;
  initialLessonId?: string | null;
  initialLessonJobs?: LessonGenerationJobSummary[];
  copilotEnabled: boolean;
  lessonConcepts?: Record<string, LessonConceptView[]>;
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
  const stageRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // The tutor panel is part of the desktop lesson layout; narrow screens keep
    // the collapsed rail so the reader card stays usable.
    if (!window.matchMedia(TUTOR_PANEL_OPEN_QUERY).matches) return;
    const frame = window.requestAnimationFrame(() => {
      setAiPanelLoaded(true);
      setSidebarCollapsed(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

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
    if (sidebarCollapsed) workspace.style.removeProperty("--course-sidebar-width");
    else workspace.style.setProperty("--course-sidebar-width", `${sidebarWidth}px`);
  }, [sidebarCollapsed, sidebarWidth]);

  const maxStepIndex = Math.max(blocks.length - 1, 0);
  const currentStepIndex = readerStep.lessonId === currentLessonId ? Math.min(readerStep.index, maxStepIndex) : 0;
  const currentBlock = blocks[currentStepIndex] ?? null;
  const totalSteps = blocks.length;

  // Preload only the immediately-next outline lesson while this lesson is open
  // (docs/product/feature_specification.md §28). Preloading must not make the next lesson's
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
  const currentLessonJobActive = currentLessonJob ? isLessonGenerationActive(currentLessonJob) : false;

  // Progressive rendering: while the open lesson is still generating, the worker
  // publishes a growing in-order prefix of blocks into the (still "generating")
  // lesson. Poll the course so those early blocks surface as they land instead of
  // waiting for the whole lesson. Keyed on the stable active flag (not `course`),
  // so setCourse below doesn't restart the interval.
  useEffect(() => {
    if (!currentLessonId || !currentLessonJobActive) return;
    let cancelled = false;
    const controller = new AbortController();
    const tick = async () => {
      try {
        const res = await fetch(`/api/courses/${course.id}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { course?: Course };
        if (!cancelled && data.course) setCourse(data.course);
      } catch {
        // Best-effort streaming; the next tick or the completion refetch recovers.
      }
    };
    const interval = window.setInterval(() => void tick(), 2_500);
    void tick();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [course.id, currentLessonId, currentLessonJobActive]);

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

  // Each step starts at its top.
  const currentBlockId = currentBlock?.id ?? null;
  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0 });
  }, [currentBlockId]);

  // ← / → step through the lesson unless the learner is typing or working an interactive.
  useEffect(() => {
    function stepWithArrows(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (isTypingTarget(event.target) || isTypingTarget(document.activeElement)) return;
      event.preventDefault();
      setReaderStep((current) => {
        const index = current.lessonId === currentLessonId ? current.index : 0;
        const next = Math.min(Math.max(index + (event.key === "ArrowRight" ? 1 : -1), 0), Math.max(totalSteps - 1, 0));
        return { lessonId: currentLessonId, index: next };
      });
    }
    window.addEventListener("keydown", stepWithArrows);
    return () => window.removeEventListener("keydown", stepWithArrows);
  }, [currentLessonId, totalSteps]);

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
  const currentLessonNumber = currentLesson
    ? [...course.lessons].sort((a, b) => a.sortKey - b.sortKey).findIndex((lesson) => lesson.id === currentLesson.id) + 1
    : 0;
  const tutorOpen = !sidebarCollapsed;

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
        <div className="lesson-reader">
          <header className="lesson-topbar">
            <Link href={`/course/${course.id}/outline`} className="lesson-icon-button" aria-label={t.readerClose} title={t.readerClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </Link>
            <div className="lesson-crumbs">
              <Link href={`/course/${course.id}/outline`}>{course.title}</Link>
              <span aria-hidden="true">/</span>
              {currentLessonNumber > 0 ? (
                <span className="lesson-crumbs-number">{msg(t.lessonOf, { number: currentLessonNumber, total: course.lessons.length })}</span>
              ) : null}
              <h1>{lessonTitle}</h1>
              {currentLessonJobActive && totalSteps > 0 ? (
                <em className="lesson-streaming" aria-live="polite">{t.generatingLesson}</em>
              ) : null}
            </div>
            <div className="lesson-tools">
              <LessonConceptsMenu course={course} concepts={currentLessonId ? lessonConcepts[currentLessonId] ?? [] : []} />
              <button
                type="button"
                className="lesson-tool"
                aria-pressed={tutorOpen}
                onClick={() => (tutorOpen ? setSidebarCollapsed(true) : openAIPanel())}
                onMouseEnter={preloadCourseAIPanel}
                onFocus={preloadCourseAIPanel}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 5h16v11H9l-5 4z" />
                </svg>
                <span className="lesson-tool-label">{t.tutorButton}</span>
              </button>
            </div>
          </header>

          {totalSteps > 0 ? (
            <nav className="lesson-steps" aria-label={t.lessonStatus} style={{ "--lesson-steps": totalSteps } as CSSProperties}>
              {blocks.map((block, index) => (
                <button
                  key={block.id}
                  type="button"
                  data-state={index < currentStepIndex ? "done" : index === currentStepIndex ? "now" : undefined}
                  aria-current={index === currentStepIndex ? "step" : undefined}
                  aria-label={`${stepLabel(block, t)} · ${index + 1}/${totalSteps}`}
                  title={stepLabel(block, t)}
                  onClick={() => goToStep(index)}
                >
                  <i />
                </button>
              ))}
            </nav>
          ) : null}

          <main className="lesson-stage" ref={stageRef} aria-live="polite">
            <div className="lesson-page" key={currentBlockId ?? "pending"}>
              {currentBlock ? (
                <div
                  ref={activeBlockRef}
                  data-block-id={currentBlock.id}
                  className={`course-block-wrapper lesson-block${selectedBlockId === currentBlock.id ? " selected" : ""}`}
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
                  <BlockRenderer
                    block={currentBlock}
                    courseId={course.id}
                    contentLanguage={course.language}
                    onBlockUpdated={updateBlockInCourse}
                  />
                </div>
              ) : (
                <CourseLessonPendingState course={course} lesson={currentLesson} job={currentLessonJob} />
              )}
            </div>
          </main>

          {currentBlock ? (
            <footer className="lesson-controls" aria-label={t.lessonStatus}>
              <div className="lesson-controls-inner">
                <button type="button" className="lesson-back" onClick={() => goToStep(currentStepIndex - 1)} disabled={currentStepIndex === 0} aria-label={t.readerPrevious}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 18 9 12l6-6" />
                  </svg>
                  <span>{t.readerBack}</span>
                </button>
                <span className="lesson-keys" aria-hidden="true">
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                  {t.readerKeys}
                </span>
                <button type="button" className="lesson-next" onClick={runPrimaryAction}>
                  {primaryActionLabel}
                  <ArrowIcon size={16} />
                </button>
              </div>
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
      ) : null}
    </div>
  );
}
