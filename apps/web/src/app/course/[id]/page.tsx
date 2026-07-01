import Link from "next/link";
import { notFound } from "next/navigation";
import { CopilotKitProvider } from "@/components/copilot-provider";
import { CourseDetailClient } from "@/components/course/course-detail-client";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { getCourse } from "@/lib/courses/store";
import { listLessonGenerationJobsByCourse } from "@/lib/courses/lesson-generation-jobs";
import { currentCourseLesson, currentLessonBlocks } from "@/lib/courses/types";
import { getCurrentDictionary } from "@/lib/i18n/server";
import { formatMessage } from "@/lib/i18n/dictionaries";

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
  const lessonTitle = currentLesson?.title ?? course.title;
  const { dictionary } = await getCurrentDictionary();
  const t = dictionary.course;

  return (
    <main className="app-shell course-app-shell">
      <section className="workspace course-workspace" style={{ ["--course-sidebar-width" as string]: "410px" }}>
        <header className="course-header">
          <div>
            <Link href="/library" className="course-back">← {t.backLibrary}</Link>
            <h1>{lessonTitle}</h1>
            <div className="course-status-row" aria-label={t.lessonStatus}>
              <span>{formatMessage(t.blocks, { count: visibleBlocks.length })}</span>
              <span>{formatMessage(t.minutes, { minutes: visibleMinutes })}</span>
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
