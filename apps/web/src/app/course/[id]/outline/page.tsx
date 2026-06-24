import Link from "next/link";
import { notFound } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { getCurrentUser } from "@/lib/auth/session";
import { getCourse } from "@/lib/courses/store";
import type { Lesson } from "@/lib/courses/types";
import type { LessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { listLessonGenerationJobsByCourse } from "@/lib/courses/lesson-generation-jobs";
import { isLessonGenerationActive } from "@/lib/courses/lesson-generation-labels";

export const dynamic = "force-dynamic";

export default async function CourseOutlinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const course = await getCourse(id, user?.id ?? null);
  if (!course) notFound();
  const jobs = await listLessonGenerationJobsByCourse(id, user?.id ?? null);
  const jobsByLessonId = new Map(jobs.map((job) => [job.lessonId, job]));
  const lessons = [...course.lessons].sort((a, b) => a.sortKey - b.sortKey);
  const generatedCount = lessons.filter((lesson) => lesson.status === "generated").length;
  const lockedCount = lessons.filter((lesson) => lesson.status === "planned").length;
  const buildingCount = lessons.filter((lesson) => {
    const job = jobsByLessonId.get(lesson.id);
    return lesson.status === "generating" || (job ? isLessonGenerationActive(job) : false);
  }).length;
  const readyPercent = lessons.length > 0 ? Math.round((generatedCount / lessons.length) * 100) : 0;

  return (
    <main className="app-shell">
      <TutorNavRail />
      <section className="workspace course-outline-workspace">
        <header className="course-outline-summary">
          <Link href="/library" className="course-outline-back">
            <ArrowLeftIcon />
            <span>Library</span>
          </Link>
          <div className="course-outline-summary-head">
            <div>
              <h1>{course.title}</h1>
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

        <section className="course-outline-timeline" aria-label="All course lessons">
          {lessons.length > 0 ? (
            <ol className="course-outline-list">
              {lessons.map((lesson, index) => (
                <LessonOutlineRow
                  key={lesson.id}
                  courseId={course.id}
                  lesson={lesson}
                  index={index + 1}
                  job={jobsByLessonId.get(lesson.id)}
                  isLast={index === lessons.length - 1}
                />
              ))}
            </ol>
          ) : (
            <div className="course-outline-empty">
              <p>No lessons have been added to this course yet.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function LessonOutlineRow({
  courseId,
  lesson,
  index,
  job,
  isLast,
}: {
  courseId: string;
  lesson: Lesson;
  index: number;
  job?: LessonGenerationJobSummary;
  isLast: boolean;
}) {
  const state = lessonState(lesson, job, index);
  const isRemediation = lesson.role === "remediation";
  return (
    <li className={`course-outline-row course-outline-${state.tone}${isRemediation ? " course-outline-remediation" : ""}${isLast ? " last" : ""}`}>
      <div className="course-outline-node-wrap" aria-hidden="true">
        <div className="course-outline-node">
          {state.tone === "locked" ? <LockIcon /> : String(index).padStart(2, "0")}
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
          <button type="button" disabled aria-label={`${state.actionLabel}: ${lesson.title}`}>
            {state.actionLabel}
          </button>
        )}
      </div>
    </li>
  );
}

function lessonState(lesson: Lesson, job: LessonGenerationJobSummary | undefined, index: number): {
  tone: "ready" | "locked" | "building";
  actionLabel: string;
  detail: string | null;
} {
  if (job && isLessonGenerationActive(job)) {
    return {
      tone: "building",
      actionLabel: "Building",
      detail: "Lesson content is being prepared.",
    };
  }
  if (lesson.status === "generating") {
    return {
      tone: "building",
      actionLabel: "Building",
      detail: "Lesson content is being prepared.",
    };
  }
  if (lesson.status === "generated") {
    return {
      tone: "ready",
      actionLabel: "Open",
      detail: null,
    };
  }
  return {
    tone: "locked",
    actionLabel: "Locked",
    detail: index > 1 ? "Complete the previous lesson to prepare this one." : "This lesson is not ready yet.",
  };
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
