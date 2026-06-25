"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLessonGenerationJobs } from "@/hooks/use-lesson-generation-jobs";
import type { LessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { isLessonGenerationActive, lessonGenerationStageLabel } from "@/lib/courses/lesson-generation-labels";
import type { Course, Lesson } from "@/lib/courses/types";

type CourseOutlineViewProps = {
  course: Course;
  initialJobs?: LessonGenerationJobSummary[];
  variant?: "page" | "embedded";
  visibleLessons?: "all" | "upcoming";
  onCourseUpdated?: (course: Course) => void;
};

export function CourseOutlineView({
  course,
  initialJobs = [],
  variant = "page",
  visibleLessons = "all",
  onCourseUpdated,
}: CourseOutlineViewProps) {
  const [displayCourse, setDisplayCourse] = useState(course);
  const { jobsByLessonId, setJobs, refresh } = useLessonGenerationJobs(displayCourse.id, initialJobs);
  const [enqueueError, setEnqueueError] = useState<Record<string, string>>({});
  const refreshedRef = useRef<Set<string>>(new Set());

  const lessons = useMemo(
    () => [...displayCourse.lessons].sort((a, b) => a.sortKey - b.sortKey),
    [displayCourse.lessons],
  );
  const renderedLessons = useMemo(
    () => selectVisibleLessons(lessons, visibleLessons),
    [lessons, visibleLessons],
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
    for (const job of justCompleted) refreshedRef.current.add(job.lessonId);
    (async () => {
      try {
        const res = await fetch(`/api/courses/${displayCourse.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { course?: Course };
        if (!data.course) return;
        setDisplayCourse(data.course);
        onCourseUpdated?.(data.course);
      } catch {
        // Ignore — the next refresh or a manual reload still shows published content.
      }
    })();
  }, [jobsByLessonId, displayCourse.id, onCourseUpdated]);

  async function generate(lesson: Lesson) {
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
    } catch (error) {
      setEnqueueError((prev) => ({
        ...prev,
        [lesson.id]: error instanceof Error ? error.message : "Lesson generation failed",
      }));
    }
  }

  if (visibleLessons === "upcoming" && renderedLessons.length === 0) return null;

  return (
    <div className={`course-outline-view course-outline-view-${variant}`}>
      {variant === "page" ? (
        <header className="course-outline-summary">
          <Link href="/library" className="course-outline-back">
            <ArrowLeftIcon />
            <span>Library</span>
          </Link>
          <div className="course-outline-summary-head">
            <div>
              <h1>{displayCourse.title}</h1>
              <div className="course-outline-summary-meta" aria-label="Course outline summary">
                <span><LessonsIcon />{lessons.length} lessons</span>
                <span className="ready"><ReadyIcon />{generatedCount} ready</span>
                <span className="locked"><LockIcon />{lockedCount} locked</span>
                {buildingCount > 0 ? <span className="building"><BuildIcon />{buildingCount} building</span> : null}
              </div>
            </div>
            <span className="course-outline-ready-count">{generatedCount}/{lessons.length} ready</span>
          </div>
          <div
            className="course-outline-progress"
            role="progressbar"
            aria-label="Course readiness"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={readyPercent}
          >
            <span style={{ width: `${readyPercent}%` }} />
          </div>
        </header>
      ) : null}

      <section className="course-outline-timeline" aria-label={visibleLessons === "upcoming" ? "Upcoming lessons" : "All course lessons"}>
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
              />
            ))}
          </ol>
        ) : (
          <div className="course-outline-empty">
            <p>No lessons have been added to this course yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function selectVisibleLessons(lessons: Lesson[], visibleLessons: "all" | "upcoming") {
  if (visibleLessons !== "upcoming") return lessons;
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
}: {
  courseId: string;
  lesson: Lesson;
  index: number;
  visibleIndex: number;
  job?: LessonGenerationJobSummary;
  enqueueError: string | null;
  isLast: boolean;
  onGenerate: () => void;
}) {
  const state = lessonState(lesson, job, index, enqueueError);
  const isRemediation = lesson.role === "remediation";
  const canGenerate = state.canGenerate;

  return (
    <li className={`course-outline-row course-outline-${state.tone}${isRemediation ? " course-outline-remediation" : ""}${isLast ? " last" : ""}`}>
      <div className="course-outline-node-wrap" aria-hidden="true">
        <div className="course-outline-node">
          {state.tone === "locked" ? <LockIcon /> : String(index || visibleIndex).padStart(2, "0")}
        </div>
      </div>
      <div className="course-outline-main">
        <h3>{lesson.title}</h3>
        {state.detail ? <p className="course-outline-state-note">{state.detail}</p> : null}
        {isRemediation ? <span className="course-outline-insert-marker">Inserted remediation</span> : null}
        <div className="course-outline-meta" aria-label={`${lesson.title} metadata`}>
          <span><ClockIcon />{lesson.estimatedMinutes ? `~${lesson.estimatedMinutes} min` : "Time pending"}</span>
        </div>
      </div>
      <div className="course-outline-row-action">
        {lesson.status === "generated" ? (
          <Link href={`/course/${courseId}`} aria-label={`Open ${lesson.title}`}>Open</Link>
        ) : (
          <button
            type="button"
            disabled={!canGenerate}
            onClick={canGenerate ? onGenerate : undefined}
            aria-label={`${state.actionLabel}: ${lesson.title}`}
          >
            {state.actionLabel}
          </button>
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
): {
  tone: "ready" | "locked" | "building" | "failed";
  actionLabel: string;
  detail: string | null;
  canGenerate: boolean;
} {
  if (job && isLessonGenerationActive(job)) {
    return {
      tone: "building",
      actionLabel: "Building",
      detail: lessonGenerationStageLabel(job),
      canGenerate: false,
    };
  }
  if (lesson.status === "generating") {
    return {
      tone: "building",
      actionLabel: "Building",
      detail: "Lesson content is being prepared.",
      canGenerate: false,
    };
  }
  if (lesson.status === "generated") {
    return {
      tone: "ready",
      actionLabel: "Open",
      detail: null,
      canGenerate: false,
    };
  }
  const failure = enqueueError ?? (job?.status === "failed" ? job.lastError ?? "Generation failed" : null);
  if (failure) {
    return {
      tone: "failed",
      actionLabel: "Retry",
      detail: failure,
      canGenerate: true,
    };
  }
  if (index <= 1) {
    return {
      tone: "locked",
      actionLabel: "Generate",
      detail: "This lesson is not ready yet.",
      canGenerate: true,
    };
  }
  return {
    tone: "locked",
    actionLabel: "Locked",
    detail: "Complete the previous lesson to prepare this one.",
    canGenerate: false,
  };
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
