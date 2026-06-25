import { notFound } from "next/navigation";
import { CourseOutlineView } from "@/components/course/course-outline-view";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { getCurrentUser } from "@/lib/auth/session";
import { getCourse } from "@/lib/courses/store";
import { listLessonGenerationJobsByCourse } from "@/lib/courses/lesson-generation-jobs";

export const dynamic = "force-dynamic";

export default async function CourseOutlinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const course = await getCourse(id, user?.id ?? null);
  if (!course) notFound();
  const jobs = await listLessonGenerationJobsByCourse(id, user?.id ?? null);

  return (
    <main className="app-shell">
      <TutorNavRail />
      <section className="workspace course-outline-workspace">
        <CourseOutlineView course={course} initialJobs={jobs} />
      </section>
    </main>
  );
}
