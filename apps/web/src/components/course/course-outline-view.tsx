"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ArrowIcon } from "@/components/arrow-icon";
import { CourseCover } from "@/components/library/course-cover";
import { useLessonGenerationJobs } from "@/hooks/use-lesson-generation-jobs";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import type { LessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { isLessonGenerationActive, lessonGenerationStageLabel } from "@/lib/courses/lesson-generation-labels";
import type { Course, Lesson } from "@/lib/courses/types";
import { isMaterialGraphId } from "@/lib/materials/types";
import { useT, msg } from "@/lib/i18n/client";
import type { I18nDictionary } from "@/lib/i18n/dictionaries";

type OutlineCopy = I18nDictionary["outline"];

type CourseOutlineViewProps = {
  course: Course;
  coverUrl?: string | null;
  initialJobs?: LessonGenerationJobSummary[];
  variant?: "page" | "embedded";
  visibleLessons?: "all" | "upcoming";
  currentLessonId?: string | null;
  onCourseUpdated?: (course: Course) => void;
};

/** done / the current lesson / ready but not current / being written /
 * failed to write / not written yet. */
type StepState = "done" | "now" | "ready" | "writing" | "failed" | "locked";

export function CourseOutlineView({
  course,
  coverUrl = null,
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
  const currentLesson = lessons.find((lesson) => lesson.status === "generated" && lesson.progress !== "completed") ?? null;
  const stateOf = (lesson: Lesson): StepState => stepState(lesson, jobsByLessonId.get(lesson.id), enqueueError[lesson.id] ?? null, lesson.id === currentLesson?.id);
  const states = new Map(lessons.map((lesson) => [lesson.id, stateOf(lesson)]));
  // Fresh course: nothing is open yet, but the first unfinished lesson is being written.
  const firstOpen = lessons.find((lesson) => lesson.progress !== "completed") ?? null;
  const featured = currentLesson ?? (firstOpen && states.get(firstOpen.id) === "writing" ? firstOpen : null);
  const featuredJob = featured ? jobsByLessonId.get(featured.id) : undefined;
  const completedCount = lessons.filter((lesson) => lesson.progress === "completed").length;
  const readyCount = lessons.filter((lesson) => lesson.status === "generated").length;
  const writingCount = [...states.values()].filter((state) => state === "writing").length;
  const todoCount = [...states.values()].filter((state) => state === "locked" || state === "failed").length;
  const remainingMinutes = lessons
    .filter((lesson) => lesson.progress !== "completed")
    .reduce((total, lesson) => total + (lesson.estimatedMinutes ?? 0), 0);
  const allDone = lessons.length > 0 && completedCount === lessons.length;
  const nextToPrepare = !featured && firstOpen && states.get(firstOpen.id) === "locked" ? firstOpen : null;

  useEffect(() => {
    const justCompleted = [...jobsByLessonId.values()].filter(
      (job) => job.status === "completed" && !refreshedRef.current.has(job.lessonId),
    );
    if (justCompleted.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/courses/${displayCourse.id}`, { cache: "no-store" });
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as { course?: Course };
        if (cancelled || !data.course) return;
        // Mark only after a successful refresh so a failed fetch is retried
        // on the next jobs poll instead of pinning stale outline data.
        for (const job of justCompleted) refreshedRef.current.add(job.lessonId);
        setDisplayCourse(data.course);
        onCourseUpdated?.(data.course);
      } catch {
        // Ignore — the next refresh or a manual reload still shows published content.
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const lessonHref = (lesson: Lesson) => `/course/${displayCourse.id}?lessonId=${encodeURIComponent(lesson.id)}`;
  const numberOf = (lesson: Lesson) => lessons.findIndex((candidate) => candidate.id === lesson.id) + 1;
  const topic = isMaterialGraphId(displayCourse.graphId)
    ? null
    : displayCourse.topic && displayCourse.topic !== displayCourse.title ? displayCourse.topic : null;
  const legend = (["done", "now", "ready", "writing", "failed", "locked"] as const).filter((state) =>
    [...states.values()].includes(state),
  );

  return (
    <div className={variant === "page" ? "course-path course-path-page" : "course-path"}>
      {variant === "page" ? (
        <aside className="course-path-summary">
          <Link href="/library" className="course-path-back">
            <ChevronLeftIcon />
            {t.backLibrary}
          </Link>
          <figure className="course-path-cover">
            <CourseCover
              title={displayCourse.title}
              topic={displayCourse.topic}
              fromMaterials={isMaterialGraphId(displayCourse.graphId)}
              coverUrl={coverUrl}
              sizes="(max-width: 900px) 100vw, 340px"
            />
          </figure>
          <span className="course-path-kicker">
            {[topic, msg(t.lessonsCount, { count: lessons.length })].filter(Boolean).join(" · ")}
          </span>
          <h1>{displayCourse.title}</h1>
          {displayCourse.summary ? <p className="course-path-blurb">{displayCourse.summary}</p> : null}

          <div className="course-path-ledger">
            <div className="course-path-figures">
              <b>
                {completedCount}
                <small> / {lessons.length}</small>
                <em>{t.completeLabel}</em>
              </b>
              <span>
                {allDone
                  ? t.courseFinished
                  : remainingMinutes > 0
                    ? msg(t.minutesLeft, { count: remainingMinutes })
                    : msg(t.lessonsLeft, { count: lessons.length - completedCount })}
              </span>
            </div>
            <div
              className="course-path-track"
              role="progressbar"
              aria-label={t.ariaProgress}
              aria-valuemin={0}
              aria-valuemax={lessons.length}
              aria-valuenow={completedCount}
              style={{ "--course-path-count": Math.max(lessons.length, 1) } as CSSProperties}
            >
              {lessons.map((lesson) => (
                <i key={lesson.id} data-state={states.get(lesson.id)} />
              ))}
            </div>
            {legend.length > 0 ? (
              <div className="course-path-legend">
                {legend.map((state) => (
                  <span key={state} data-state={state}>
                    <i aria-hidden="true" />
                    {t.legend[state]}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {currentLesson ? (
            <Link href={lessonHref(currentLesson)} className="course-path-cta">
              <span>
                <strong>
                  {msg(currentLesson.progress === "in_progress" ? t.continueLesson : t.startLesson, { number: numberOf(currentLesson) })}
                </strong>
                <small>{currentLesson.title}</small>
              </span>
              <ArrowIcon size={16} />
            </Link>
          ) : featured ? (
            <div className="course-path-status" role="status">
              <strong>{msg(t.writingLesson, { number: numberOf(featured) })}</strong>
              <span>{t.writingLessonCopy}</span>
              <JobBar job={featuredJob} />
            </div>
          ) : allDone ? (
            <Link href={lessonHref(lessons[0])} className="course-path-cta quiet">
              <span>
                <strong>{t.reviewCourse}</strong>
                <small>{t.reviewCourseCopy}</small>
              </span>
              <ArrowIcon size={16} />
            </Link>
          ) : nextToPrepare ? (
            <button type="button" className="course-path-cta" onClick={() => void generate(nextToPrepare)}>
              <span>
                <strong>{msg(t.prepareLesson, { number: numberOf(nextToPrepare) })}</strong>
                <small>{t.prepareLessonCopy}</small>
              </span>
              <ArrowIcon size={16} />
            </button>
          ) : null}
        </aside>
      ) : null}

      <section className="course-path-lessons" aria-label={visibleLessons === "upcoming" ? t.timelineUpcoming : t.timelineAll}>
        {variant === "page" ? (
          <div className="course-path-head">
            <h2>{t.lessonsHeading}</h2>
            <span>
              {[
                readyCount ? msg(t.pathCounts.ready, { count: readyCount }) : null,
                writingCount ? msg(t.pathCounts.writing, { count: writingCount }) : null,
                todoCount ? msg(t.pathCounts.todo, { count: todoCount }) : null,
              ].filter(Boolean).join(" · ")}
            </span>
          </div>
        ) : null}
        {renderedLessons.length > 0 ? (
          <ol className="course-path-list">
            {renderedLessons.map((lesson, index) => {
              const showLater = featured && lesson.id !== featured.id && numberOf(lesson) === numberOf(featured) + 1 && index > 0;
              return (
                <LessonStep
                  key={lesson.id}
                  lesson={lesson}
                  number={numberOf(lesson) || index + 1}
                  state={states.get(lesson.id) ?? "locked"}
                  featured={lesson.id === featured?.id}
                  laterLabel={showLater ? t.later : null}
                  job={jobsByLessonId.get(lesson.id)}
                  error={enqueueError[lesson.id] ?? null}
                  href={lessonHref(lesson)}
                  summary={lessonSummary(lesson, displayCourse.language)}
                  onRetry={() => void generate(lesson)}
                  onJumpAhead={() => {
                    setJumpError(null);
                    setJumpTarget(lesson);
                  }}
                  t={t}
                />
              );
            })}
          </ol>
        ) : (
          <p className="course-path-empty">{t.empty}</p>
        )}

        {variant === "page" && allDone ? (
          <div className="course-path-finish">
            <figure>
              <Image src="/course/finish-path.svg" alt="" fill sizes="200px" unoptimized />
            </figure>
            <div>
              <h3>{t.finishTitle}</h3>
              <p>{msg(t.finishBody, { count: lessons.length })}</p>
              <Link href="/">
                {t.finishCta}
                <ArrowIcon size={15} />
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      {jumpTarget ? (
        <div
          className="course-path-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeJumpDialog();
          }}
        >
          <section
            ref={jumpDialogRef}
            tabIndex={-1}
            className="course-path-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-path-jump-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="course-path-dialog-close" aria-label={t.closeJump} onClick={closeJumpDialog}>
              <CloseIcon />
            </button>
            <span className="course-path-dialog-kicker">
              {t.jumpKicker} · {msg(t.lessonNumber, { number: numberOf(jumpTarget) })}
            </span>
            <h2 id="course-path-jump-title">{jumpTarget.title}</h2>
            <p>{lessonSummary(jumpTarget, displayCourse.language)}</p>
            <div className="course-path-skip">
              <span aria-hidden="true">
                {lessons.slice(0, numberOf(jumpTarget)).map((lesson) => (
                  <i
                    key={lesson.id}
                    data-state={lesson.id === jumpTarget.id ? "target" : lesson.progress === "completed" ? "done" : "skipped"}
                  />
                ))}
              </span>
              {t.jumpNote}
            </div>
            {jumpError ? <p className="course-path-dialog-error" role="alert">{jumpError}</p> : null}
            <div className="course-path-dialog-actions">
              <button type="button" className="course-path-button plain" onClick={closeJumpDialog}>
                {t.jumpCancel}
              </button>
              <button
                type="button"
                ref={jumpPrimaryRef}
                className="course-path-button primary"
                disabled={jumpingLessonId === jumpTarget.id}
                onClick={() => void confirmJumpAhead()}
              >
                {jumpingLessonId === jumpTarget.id ? t.generating : t.generateAndJump}
                <ArrowIcon size={15} />
              </button>
            </div>
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

function stepState(lesson: Lesson, job: LessonGenerationJobSummary | undefined, enqueueError: string | null, isCurrent: boolean): StepState {
  if (lesson.progress === "completed") return "done";
  if ((job && isLessonGenerationActive(job)) || lesson.status === "generating") return "writing";
  if (lesson.status === "generated") return isCurrent ? "now" : "ready";
  if (enqueueError || job?.status === "failed") return "failed";
  return "locked";
}

function LessonStep({
  lesson,
  number,
  state,
  featured,
  laterLabel,
  job,
  error,
  href,
  summary,
  onRetry,
  onJumpAhead,
  t,
}: {
  lesson: Lesson;
  number: number;
  state: StepState;
  featured: boolean;
  laterLabel: string | null;
  job?: LessonGenerationJobSummary;
  error: string | null;
  href: string;
  summary: string;
  onRetry: () => void;
  onJumpAhead: () => void;
  t: OutlineCopy;
}) {
  const label = String(number).padStart(2, "0");
  const repair = lesson.role === "remediation" ? <span className="course-path-tag">{t.repairLesson}</span> : null;
  const later = laterLabel ? <li className="course-path-later" aria-hidden="true">{laterLabel}</li> : null;
  const node = (
    <div className="course-path-node" aria-hidden="true">
      <i>{state === "done" ? <CheckIcon /> : <b>{label}</b>}</i>
    </div>
  );

  if (state === "done") {
    return (
      <>
        {later}
        <li className="course-path-step" data-state="done">
          {node}
          <div className="course-path-body">
            <span className="course-path-num">{label}</span>
            <h3>{lesson.title}</h3>
            {repair}
          </div>
          <div className="course-path-action">
            <Link href={href} className="course-path-link quiet" aria-label={msg(t.openLesson, { title: lesson.title })}>
              {t.review}
            </Link>
          </div>
        </li>
      </>
    );
  }

  const stateLabel = state === "now"
    ? lesson.progress === "in_progress" ? t.stateInProgress : t.stateNow
    : t.states[state];
  const meta = (
    <div className="course-path-meta">
      <span>{msg(t.lessonNumber, { number })}</span>
      {lesson.estimatedMinutes ? <span>{msg(t.minutes, { count: lesson.estimatedMinutes })}</span> : null}
      <span className="course-path-state">{stateLabel}</span>
      {repair}
    </div>
  );
  const failure = error ?? (job?.status === "failed" ? job.lastError ?? t.generationFailed : null);
  const note = state === "writing" ? (
    <span className="course-path-note">
      <JobBar job={job} />
      {job && isLessonGenerationActive(job) ? lessonGenerationStageLabel(job) : t.generatingDetail}
    </span>
  ) : state === "failed" && failure ? (
    <span className="course-path-note danger">{failure}</span>
  ) : null;

  if (featured) {
    return (
      <>
        {later}
        <li className="course-path-step" data-state={state} data-featured="true">
          {node}
          <div className="course-path-body">
            {meta}
            <h3>{state === "now" ? <Link href={href}>{lesson.title}</Link> : lesson.title}</h3>
            <p>{summary}</p>
            {state === "now" ? (
              <span className="course-path-open">
                {lesson.progress === "in_progress" ? t.continueThisLesson : t.startThisLesson}
                <ArrowIcon size={15} />
              </span>
            ) : note}
          </div>
        </li>
      </>
    );
  }

  const hintId = `course-path-hint-${lesson.id}`;
  let action: ReactNode = null;
  if (state === "ready") {
    action = (
      <Link href={href} className="course-path-link" aria-label={msg(t.openLesson, { title: lesson.title })}>
        {t.open}
      </Link>
    );
  } else if (state === "failed") {
    action = (
      <button type="button" className="course-path-link danger" onClick={onRetry} aria-label={`${t.retry}: ${lesson.title}`}>
        <RetryIcon />
        {t.retry}
      </button>
    );
  } else if (state === "locked") {
    action = (
      <span className="course-path-tip">
        <button type="button" className="course-path-link quiet" onClick={onJumpAhead} aria-label={`${t.jumpAhead}: ${lesson.title}`} aria-describedby={hintId}>
          <SkipIcon />
          {t.jumpAhead}
        </button>
        <span id={hintId} role="tooltip">{t.lockedDetail}</span>
      </span>
    );
  }

  return (
    <>
      {later}
      <li className="course-path-step" data-state={state}>
        {node}
        <div className="course-path-body">
          {meta}
          <h3>{lesson.title}</h3>
          <p>{summary}</p>
          {note}
        </div>
        <div className="course-path-action">{action}</div>
      </li>
    </>
  );
}

function JobBar({ job }: { job?: LessonGenerationJobSummary }) {
  const fraction = job && job.progressTotal > 0 ? Math.min(1, job.progressCompleted / job.progressTotal) : 0;
  return (
    <span className="course-path-bar" aria-hidden="true">
      <i style={{ width: `${Math.max(8, Math.round(fraction * 100))}%` }} />
    </span>
  );
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

function Icon({ size = 15, strokeWidth = 1.8, children }: { size?: number; strokeWidth?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function CheckIcon() {
  return <Icon size={12} strokeWidth={2.6}><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>;
}

function ChevronLeftIcon() {
  return <Icon strokeWidth={1.9}><path d="m15 18-6-6 6-6" /></Icon>;
}

function RetryIcon() {
  return <Icon strokeWidth={1.7}><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" /></Icon>;
}

function SkipIcon() {
  return <Icon size={14} strokeWidth={1.7}><path d="M5 6l7 6-7 6M13 6l7 6-7 6" /></Icon>;
}

function CloseIcon() {
  return <Icon size={16} strokeWidth={1.7}><path d="M6 6l12 12M18 6L6 18" /></Icon>;
}
