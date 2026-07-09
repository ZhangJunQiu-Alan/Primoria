import { notFound } from "next/navigation";
import { CopilotKitProvider } from "@/components/copilot-provider";
import { CourseDetailClient } from "@/components/course/course-detail-client";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
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
  const user = await getCurrentUser();
  const course = await getCourse(id, user?.id ?? null);
  if (!course) notFound();
  const copilotEnabled = !isAuthEnabled() || Boolean(user);
  const lessonJobs = await listLessonGenerationJobsByCourse(id, user?.id ?? null);

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
