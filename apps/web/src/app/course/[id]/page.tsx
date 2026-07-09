import { notFound } from "next/navigation";
import { CopilotKitProvider } from "@/components/copilot-provider";
import { CourseDetailClient } from "@/components/course/course-detail-client";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { getCourse } from "@/lib/courses/store";
import { listLessonGenerationJobsByCourse } from "@/lib/courses/lesson-generation-jobs";

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
  const user = await getCurrentUserForRsc();
  const [course, lessonJobs] = await Promise.all([
    getCourse(id, user?.id ?? null),
    listLessonGenerationJobsByCourse(id, user?.id ?? null),
  ]);
  if (!course) notFound();
  const copilotEnabled = !isAuthEnabled() || Boolean(user);

  return (
    <main className="app-shell course-app-shell">
      <section className="workspace course-workspace">
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
