import Link from "next/link";
import { notFound } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { CopilotKitProvider } from "@/components/copilot-provider";
import { CourseDetailClient } from "@/components/course/course-detail-client";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { getCourse } from "@/lib/courses/store";
import { listLessonGenerationJobsByCourse } from "@/lib/courses/lesson-generation-jobs";
import { currentCourseLesson, currentLessonBlocks } from "@/lib/courses/types";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lessonId?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const requestedLessonId = Array.isArray(query.lessonId) ? query.lessonId[0] : query.lessonId;
  const user = await getCurrentUser();
  const course = await getCourse(id, user?.id ?? null);
  if (!course) notFound();
  const copilotEnabled = !isAuthEnabled() || Boolean(user);
  const lessonJobs = await listLessonGenerationJobsByCourse(id, user?.id ?? null);
  const currentLesson = currentCourseLesson(course, requestedLessonId);
  const visibleBlocks = currentLessonBlocks(course, requestedLessonId);
  const visibleMinutes = currentLesson?.estimatedMinutes ?? course.estimatedMinutes;

  return (
    <main className="app-shell">
      <TutorNavRail />
      <section className="workspace course-workspace" style={{ ["--course-sidebar-width" as string]: "410px" }}>
        <header className="course-header">
          <div>
            <Link href="/library" className="course-back">← Library</Link>
            <h1>{course.title}</h1>
            <p className="course-summary-text">{course.summary}</p>
            <div className="course-status-row" aria-label="Course lesson status">
              <span className="course-status-pill">当前 lesson</span>
              {currentLesson ? <span>{currentLesson.title}</span> : null}
              <span>{visibleBlocks.length} blocks</span>
              <span>约 {visibleMinutes} min</span>
            </div>
          </div>
        </header>
        <CopilotKitProvider>
          <CourseDetailClient
            initialCourse={course}
            initialLessonId={requestedLessonId ?? null}
            initialLessonJobs={lessonJobs}
            copilotEnabled={copilotEnabled}
          />
        </CopilotKitProvider>
      </section>
    </main>
  );
}
