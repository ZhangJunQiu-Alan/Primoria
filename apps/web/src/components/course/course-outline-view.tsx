"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLessonGenerationJobs } from "@/hooks/use-lesson-generation-jobs";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import type { LessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { isLessonGenerationActive, lessonGenerationStageLabel } from "@/lib/courses/lesson-generation-labels";
import type { Course, Lesson } from "@/lib/courses/types";
import { useT, msg } from "@/lib/i18n/client";
import { formatMessage, type I18nDictionary } from "@/lib/i18n/dictionaries";

type CourseOutlineViewProps = {
  course: Course;
  initialJobs?: LessonGenerationJobSummary[];
  variant?: "page" | "embedded";
  visibleLessons?: "all" | "upcoming";
  currentLessonId?: string | null;
  onCourseUpdated?: (course: Course) => void;
};

export function CourseOutlineView({
  course,
  initialJobs = [],
  variant = "page",
  visibleLessons = "all",
  currentLessonId = null,
  onCourseUpdated,
}: CourseOutlineViewProps) {
  const router = useRouter();
  const t = useT().outline;
  const [displayCourse, setDisplayCourse] = useState(course);
  const { jobsByLessonId, setJobs, refresh } = useLessonGenerationJobs(displayCourse.id, initialJobs);
  const [enqueueError, setEnqueueError] = useState<Record<string, string>>({});
  const [jumpTarget, setJumpTarget] = useState<Lesson | null>(null);
  const [jumpingLessonId, setJumpingLessonId] = useState<string | null>(null);
  const [jumpError, setJumpError] = useState<string | null>(null);
  const refreshedRef = useRef<Set<string>>(new Set());
  const jumpDialogRef = useRef<HTMLElement | null>(null);
  const jumpPrimaryRef = useRef<HTMLButtonElement | null>(null);

  const lessons = useMemo(
    () => [...displayCourse.lessons].sort((a, b) => a.sortKey - b.sortKey),
    [displayCourse.lessons],
  );
  const renderedLessons = useMemo(
    () => selectVisibleLessons(lessons, visibleLessons, currentLessonId),
    [lessons, visibleLessons, currentLessonId],
  );
  const generatedCount = lessons.filter((lesson) => lesson.status === "generated").length;
  const lockedCount = lessons.filter((lesson) => lesson.status === "planned").length;
  const buildingCount = lessons.filter((lesson) => {
    const job = jobsByLessonId.get(lesson.id);
    return lesson.status === "generating" || (job ? isLessonGenerationActive(job) : false);
  }).length;
  const readyPercent = lessons.length > 0 ? Math.round((generatedCount / lessons.length) * 100) : 0;

  useEffect(() => {
    const justCompleted = [...jobsByLessonId.values()].filter(
      (job) => job.status === "completed" && !refreshedRef.current.has(job.lessonId),
    );
    if (justCompleted.length === 0) return;
    (async () => {
      try {
        const res = await fetch(`/api/courses/${displayCourse.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { course?: Course };
        if (!data.course) return;
        // Mark only after a successful refresh so a failed fetch is retried
        // on the next jobs poll instead of pinning stale outline data.
        for (const job of justCompleted) refreshedRef.current.add(job.lessonId);
        setDisplayCourse(data.course);
        onCourseUpdated?.(data.course);
      } catch {
        // Ignore — the next refresh or a manual reload still shows published content.
      }
    })();
  }, [jobsByLessonId, displayCourse.id, onCourseUpdated]);

  function closeJumpDialog() {
    setJumpTarget(null);
  }

  useDialogFocus({
    active: Boolean(jumpTarget),
    dialogRef: jumpDialogRef,
    initialFocusRef: jumpPrimaryRef,
    onEscape: closeJumpDialog,
  });

  async function generate(lesson: Lesson): Promise<{ ok: true } | { ok: false; error: string }> {
    setEnqueueError((prev) => {
      const next = { ...prev };
      delete next[lesson.id];
      return next;
    });
    try {
      const response = await fetch(`/api/courses/${displayCourse.id}/lessons/${lesson.id}/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const data = (await response.json()) as { job?: LessonGenerationJobSummary; status?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Lesson generation failed");
      if (data.job) setJobs((prev) => upsertJob(prev, data.job!));
      else void refresh();
      setDisplayCourse((prev) => {
        const next = {
          ...prev,
          lessons: prev.lessons.map((candidate) =>
            candidate.id === lesson.id && candidate.status !== "generated"
              ? { ...candidate, status: "generating" as const, updatedAt: Date.now() }
              : candidate,
          ),
        };
        onCourseUpdated?.(next);
        return next;
      });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lesson generation failed";
      setEnqueueError((prev) => ({
        ...prev,
        [lesson.id]: message,
      }));
      return { ok: false, error: message };
    }
  }

  async function confirmJumpAhead() {
    if (!jumpTarget || jumpingLessonId) return;
    setJumpError(null);
    setJumpingLessonId(jumpTarget.id);
    const result = await generate(jumpTarget);
    setJumpingLessonId(null);
    if (!result.ok) {
      setJumpError(result.error);
      return;
    }
    const lessonId = jumpTarget.id;
    setJumpTarget(null);
    router.push(`/course/${displayCourse.id}?lessonId=${encodeURIComponent(lessonId)}`);
  }

  if (visibleLessons === "upcoming" && renderedLessons.length === 0) return null;

  return (
    <div className={`course-outline-view course-outline-view-${variant}`}>
      {variant === "page" ? (
        <header className="course-outline-summary">
          <Link href="/library" className="course-outline-back">
            <ArrowLeftIcon />
            <span>{t.backLibrary}</span>
          </Link>
          <div className="course-outline-summary-head">
            <div>
              <h1>{displayCourse.title}</h1>
              <div className="course-outline-summary-meta" aria-label={t.ariaSummary}>
                <span><LessonsIcon />{formatMessage(t.lessonsCount, { count: lessons.length })}</span>
                <span className="ready"><ReadyIcon />{formatMessage(t.readyCount, { count: generatedCount })}</span>
                <span className="locked"><LockIcon />{formatMessage(t.lockedCount, { count: lockedCount })}</span>
                {buildingCount > 0 ? <span className="building"><BuildIcon />{formatMessage(t.buildingCount, { count: buildingCount })}</span> : null}
              </div>
            </div>
            <span className="course-outline-ready-count">{formatMessage(t.readyCount, { count: `${generatedCount}/${lessons.length}` })}</span>
          </div>
          <div
            className="course-outline-progress"
            role="progressbar"
            aria-label={t.readiness}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={readyPercent}
          >
            <span style={{ width: `${readyPercent}%` }} />
          </div>
        </header>
      ) : null}

      <section className="course-outline-timeline" aria-label={visibleLessons === "upcoming" ? t.timelineUpcoming : t.timelineAll}>
        {renderedLessons.length > 0 ? (
          <ol className="course-outline-list">
            {renderedLessons.map((lesson, index) => (
              <LessonOutlineRow
                key={lesson.id}
                courseId={displayCourse.id}
                lesson={lesson}
                index={lessons.findIndex((candidate) => candidate.id === lesson.id) + 1}
                visibleIndex={index + 1}
                job={jobsByLessonId.get(lesson.id)}
                enqueueError={enqueueError[lesson.id] ?? null}
                isLast={index === renderedLessons.length - 1}
                onGenerate={() => void generate(lesson)}
                onJumpAhead={() => {
                  setJumpError(null);
                  setJumpTarget(lesson);
                }}
                summary={lessonSummary(lesson, displayCourse.language)}
                t={t}
              />
            ))}
          </ol>
        ) : (
          <div className="course-outline-empty">
            <p>{t.empty}</p>
          </div>
        )}
      </section>

      {jumpTarget ? (
        <div
          className="course-outline-jump-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeJumpDialog();
          }}
        >
          <section
            ref={jumpDialogRef}
            tabIndex={-1}
            className="course-outline-jump-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-outline-jump-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="course-outline-jump-close"
              aria-label={t.closeJump}
              onClick={closeJumpDialog}
            >
              ×
            </button>
            <div className="course-outline-jump-kicker">{t.jumpKicker}</div>
            <h2 id="course-outline-jump-title">{jumpTarget.title}</h2>
            <p>{lessonSummary(jumpTarget, displayCourse.language)}</p>
            <div className="course-outline-jump-note">
              {t.jumpNote}
            </div>
            {jumpError ? <p className="course-outline-jump-error">{jumpError}</p> : null}
            <button
              type="button"
              ref={jumpPrimaryRef}
              className="course-outline-jump-primary"
              disabled={jumpingLessonId === jumpTarget.id}
              onClick={() => void confirmJumpAhead()}
            >
              {jumpingLessonId === jumpTarget.id ? t.generating : t.generateAndJump}
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function selectVisibleLessons(lessons: Lesson[], visibleLessons: "all" | "upcoming", currentLessonId?: string | null) {
  if (visibleLessons !== "upcoming") return lessons;
  const currentIndex = currentLessonId
    ? lessons.findIndex((lesson) => lesson.id === currentLessonId)
    : lessons.findIndex((lesson) => lesson.status === "generated" && lesson.progress !== "completed");
  if (currentIndex >= 0) {
    const nextLesson = lessons[currentIndex + 1] ?? null;
    return nextLesson ? [nextLesson] : [];
  }
  const nextLesson = lessons.find((lesson) => lesson.status !== "generated");
  return nextLesson ? [nextLesson] : [];
}

function LessonOutlineRow({
  courseId,
  lesson,
  index,
  visibleIndex,
  job,
  enqueueError,
  isLast,
  onGenerate,
  onJumpAhead,
  summary,
  t,
}: {
  courseId: string;
  lesson: Lesson;
  index: number;
  visibleIndex: number;
  job?: LessonGenerationJobSummary;
  enqueueError: string | null;
  isLast: boolean;
  onGenerate: () => void;
  onJumpAhead: () => void;
  summary: string;
  t: I18nDictionary["outline"];
}) {
  const state = lessonState(lesson, job, index, enqueueError, t);
  const isRemediation = lesson.role === "remediation";
  const canGenerate = state.canGenerate;
  const actionHandler = state.actionKind === "jump" ? onJumpAhead : onGenerate;
  const estimatedTime = lesson.estimatedMinutes ? `~${lesson.estimatedMinutes} min` : state.tone === "locked" ? null : t.timePending;
  const actionHintId = state.actionHint ? `lesson-action-hint-${lesson.id}` : undefined;

  return (
    <li className={`course-outline-row course-outline-${state.tone}${isRemediation ? " course-outline-remediation" : ""}${isLast ? " last" : ""}`}>
      <div className="course-outline-node-wrap" aria-hidden="true">
        <div className="course-outline-node">
          {state.tone === "locked" ? <LockIcon /> : String(index || visibleIndex).padStart(2, "0")}
        </div>
      </div>
      <div className="course-outline-main">
        <h3>{lesson.title}</h3>
        <p className="course-outline-description">{summary}</p>
        {state.detail ? <p className="course-outline-state-note">{state.detail}</p> : null}
        {isRemediation ? <span className="course-outline-insert-marker">{t.insertedRemediation}</span> : null}
        {estimatedTime ? (
          <div className="course-outline-meta" aria-label={lesson.title}>
            <span><ClockIcon />{estimatedTime}</span>
          </div>
        ) : null}
      </div>
      <div className="course-outline-row-action">
        {lesson.status === "generated" ? (
          <Link href={`/course/${courseId}?lessonId=${encodeURIComponent(lesson.id)}`} aria-label={msg(t.openLesson, { title: lesson.title })}>{t.open}</Link>
        ) : (
          <span className="course-outline-action-wrap">
            <button
              type="button"
              disabled={!canGenerate}
              onClick={canGenerate ? actionHandler : undefined}
              aria-label={`${state.actionLabel}: ${lesson.title}`}
              aria-describedby={actionHintId}
            >
              {state.actionLabel}
            </button>
            {state.actionHint ? (
              <span id={actionHintId} className="course-outline-action-tooltip" role="tooltip">
                {state.actionHint}
              </span>
            ) : null}
          </span>
        )}
      </div>
    </li>
  );
}

function lessonState(
  lesson: Lesson,
  job: LessonGenerationJobSummary | undefined,
  index: number,
  enqueueError: string | null,
  t: I18nDictionary["outline"],
): {
  tone: "ready" | "locked" | "building" | "failed";
  actionLabel: string;
  actionKind: "open" | "generate" | "jump";
  detail: string | null;
  actionHint: string | null;
  canGenerate: boolean;
} {
  if (job && isLessonGenerationActive(job)) {
    return {
      tone: "building",
      actionLabel: t.building,
      actionKind: "generate",
      detail: lessonGenerationStageLabel(job),
      actionHint: null,
      canGenerate: false,
    };
  }
  if (lesson.status === "generating") {
    return {
      tone: "building",
      actionLabel: t.building,
      actionKind: "generate",
      detail: t.generatingDetail,
      actionHint: null,
      canGenerate: false,
    };
  }
  if (lesson.status === "generated") {
    return {
      tone: "ready",
      actionLabel: t.open,
      actionKind: "open",
      detail: null,
      actionHint: null,
      canGenerate: false,
    };
  }
  const failure = enqueueError ?? (job?.status === "failed" ? job.lastError ?? t.generationFailed : null);
  if (failure) {
    return {
      tone: "failed",
      actionLabel: t.retry,
      actionKind: "generate",
      detail: failure,
      actionHint: null,
      canGenerate: true,
    };
  }
  return {
    tone: "locked",
    actionLabel: t.jumpAhead,
    actionKind: "jump",
    detail: null,
    actionHint: t.lockedDetail,
    canGenerate: true,
  };
}

function lessonSummary(lesson: Lesson, language?: string | null): string {
  if (lesson.description.trim()) return lesson.description.trim();
  const zh = language?.toLowerCase().startsWith("zh") ?? false;
  const title = lesson.title.trim();
  const blocks = lesson.blocks ?? [];
  const firstText = blocks.find((block) => block.type === "text" && block.markdown.trim());
  if (firstText?.type === "text") return sentenceSnippet(firstText.markdown, zh);
  const visual = blocks.find((block) => block.type === "visual" && block.description.trim());
  if (visual?.type === "visual") return sentenceSnippet(visual.description, zh);
  if (lesson.role === "remediation") {
    return zh
      ? `针对前面练习暴露的问题，补强「${title}」相关概念。`
      : `A focused repair lesson for the gaps that appeared before ${title}.`;
  }
  if (lesson.status === "generating") {
    return zh
      ? `正在生成围绕「${title}」的讲解、例子和练习。`
      : `Generating explanations, examples, and practice around ${title}.`;
  }
  if (lesson.status === "generated") {
    return zh
      ? `通过讲解、例子和练习巩固「${title}」。`
      : `Introduces the core ideas, examples, and checks for ${title}.`;
  }
  return zh
    ? `围绕「${title}」生成核心讲解、例子和练习。`
    : `A planned lesson covering the core ideas, examples, and practice for ${title}.`;
}

function sentenceSnippet(text: string, zh: boolean): string {
  const compact = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!compact) return zh ? "这一节会围绕核心概念展开讲解和练习。" : "This lesson explains the core ideas with examples and practice.";
  const end = compact.search(/[。！？.!?]/);
  const firstSentence = end >= 24 ? compact.slice(0, end + 1) : compact;
  const limit = zh ? 86 : 132;
  return Array.from(firstSentence).length > limit
    ? `${Array.from(firstSentence).slice(0, limit - 1).join("")}…`
    : firstSentence;
}

function upsertJob(jobs: LessonGenerationJobSummary[], job: LessonGenerationJobSummary): LessonGenerationJobSummary[] {
  const next = jobs.filter((entry) => entry.lessonId !== job.lessonId);
  next.push(job);
  return next;
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function LessonsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4h9a2 2 0 0 1 2 2v13H8a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" />
      <path d="M8 4v15" />
      <path d="M11 8h5" />
    </svg>
  );
}

function ReadyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.4 2.9 8.4 7 10 4.1-1.6 7-5.6 7-10V6l-7-3Z" />
      <path d="m8.8 12 2.1 2.1 4.3-4.5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function BuildIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="m4.9 4.9 2.8 2.8" />
      <path d="m16.3 16.3 2.8 2.8" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="m4.9 19.1 2.8-2.8" />
      <path d="m16.3 7.7 2.8-2.8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}
