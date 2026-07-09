import { notFound } from "next/navigation";
import { CourseOutlineView } from "@/components/course/course-outline-view";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { getCourse } from "@/lib/courses/store";
import { listLessonGenerationJobsByCourse } from "@/lib/courses/lesson-generation-jobs";

export const dynamic = "force-dynamic";

export default async function CourseOutlinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUserForRsc();
  const [course, jobs] = await Promise.all([
    getCourse(id, user?.id ?? null),
    listLessonGenerationJobsByCourse(id, user?.id ?? null),
  ]);
  if (!course) notFound();

  return (
    <main className="app-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="workspace course-outline-workspace">
        <CourseOutlineView course={course} initialJobs={jobs} />
      </section>
    </main>
  );
}
