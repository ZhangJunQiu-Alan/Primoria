import Link from "next/link";
import { notFound } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { getCurrentUser } from "@/lib/auth/session";
import { getCourse } from "@/lib/courses/store";
import type { Lesson } from "@/lib/courses/types";
import type { LessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { listLessonGenerationJobsByCourse } from "@/lib/courses/lesson-generation-jobs";
import { isLessonGenerationActive, lessonGenerationStageLabel } from "@/lib/courses/lesson-generation-labels";

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
  const remediationCount = lessons.filter((lesson) => lesson.role === "remediation").length;

  return (
    <main className="app-shell">
      <TutorNavRail />
      <section className="workspace course-outline-workspace">
        <header className="course-outline-hero">
          <div>
            <Link href="/library" className="course-back">Library</Link>
            <span className="course-block-tag">Course outline</span>
            <h1>{course.title}</h1>
            <p>{lessons.length} lessons in this course path.</p>
          </div>
          <Link href={`/course/${course.id}`} className="course-outline-primary-action">
            Open course
          </Link>
        </header>

        <div className="course-outline-stats" aria-label="Course outline summary">
          <StatCard label="Total lessons" value={lessons.length} />
          <StatCard label="Generated" value={generatedCount} />
          <StatCard label="Locked" value={lockedCount} />
          <StatCard label="Remediation" value={remediationCount} />
        </div>

        <section className="course-outline-board" aria-label="All course lessons">
          <div className="course-outline-board-head">
            <h2>All lessons</h2>
            <span>{generatedCount}/{lessons.length} ready</span>
          </div>
          {lessons.length > 0 ? (
            <ol className="course-outline-list">
              {lessons.map((lesson, index) => (
                <LessonOutlineRow
                  key={lesson.id}
                  courseId={course.id}
                  lesson={lesson}
                  index={index + 1}
                  job={jobsByLessonId.get(lesson.id)}
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="course-outline-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LessonOutlineRow({
  courseId,
  lesson,
  index,
  job,
}: {
  courseId: string;
  lesson: Lesson;
  index: number;
  job?: LessonGenerationJobSummary;
}) {
  const state = lessonState(lesson, job);
  const isRemediation = lesson.role === "remediation";
  return (
    <li className={`course-outline-row course-outline-${state.tone}${isRemediation ? " course-outline-remediation" : ""}`}>
      {isRemediation ? <span className="course-outline-insert-marker">Inserted remediation</span> : null}
      <div className="course-outline-index" aria-hidden="true">
        {String(index).padStart(2, "0")}
      </div>
      <div className="course-outline-main">
        <div className="course-outline-title-line">
          <h3>{lesson.title}</h3>
          <span className={`course-outline-pill ${state.tone}`}>{state.label}</span>
        </div>
        <div className="course-outline-meta">
          <span>{lesson.estimatedMinutes ? `~${lesson.estimatedMinutes} min` : "Time pending"}</span>
          <span>{roleLabel(lesson.role)}</span>
          <span>Updated {formatDate(lesson.updatedAt)}</span>
        </div>
      </div>
      <div className="course-outline-row-action">
        {lesson.status === "generated" ? (
          <Link href={`/course/${courseId}`}>Open</Link>
        ) : (
          <span aria-disabled="true">{state.actionLabel}</span>
        )}
      </div>
    </li>
  );
}

function lessonState(lesson: Lesson, job?: LessonGenerationJobSummary): {
  label: string;
  tone: "ready" | "locked" | "building";
  actionLabel: string;
} {
  if (job && isLessonGenerationActive(job)) {
    return { label: lessonGenerationStageLabel(job), tone: "building", actionLabel: "Building" };
  }
  if (lesson.status === "generating") {
    return { label: job ? lessonGenerationStageLabel(job) : "Generating", tone: "building", actionLabel: "Building" };
  }
  if (lesson.status === "generated") {
    return { label: lesson.progress === "completed" ? "Completed" : "Ready", tone: "ready", actionLabel: "Open" };
  }
  return { label: "Locked", tone: "locked", actionLabel: "Locked" };
}

function roleLabel(role: Lesson["role"]) {
  if (role === "remediation") return "Remediation";
  if (role === "review") return "Review";
  return "New lesson";
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
