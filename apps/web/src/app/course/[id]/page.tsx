import Link from "next/link";
import { notFound } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { CopilotKitProvider } from "@/components/copilot-provider";
import { CourseDetailClient } from "@/components/course/course-detail-client";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { getCourse } from "@/lib/courses/store";
import { listLessonGenerationJobsByCourse } from "@/lib/courses/lesson-generation-jobs";
import { courseBlocks } from "@/lib/courses/types";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const course = await getCourse(id, user?.id ?? null);
  if (!course) notFound();
  const copilotEnabled = !isAuthEnabled() || Boolean(user);
  const lessonJobs = await listLessonGenerationJobsByCourse(id, user?.id ?? null);

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
              <span className="course-status-pill">当前课程</span>
              <span>{courseBlocks(course).length} blocks</span>
              <span>约 {course.estimatedMinutes} min</span>
            </div>
          </div>
        </header>
        <CopilotKitProvider enabled={copilotEnabled}>
          <CourseDetailClient initialCourse={course} initialLessonJobs={lessonJobs} copilotEnabled={copilotEnabled} />
        </CopilotKitProvider>
      </section>
    </main>
  );
}
