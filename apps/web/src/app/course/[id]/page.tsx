import Link from "next/link";
import { notFound } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { CopilotKitProvider } from "@/components/copilot-provider";
import { CourseDetailClient } from "@/components/course/course-detail-client";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { getCourse } from "@/lib/courses/store";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const course = await getCourse(id, user?.id ?? null);
  if (!course) notFound();
  const copilotEnabled = !isAuthEnabled() || Boolean(user);

  return (
    <main className="app-shell">
      <TutorNavRail />
      <section className="workspace course-workspace" style={{ ["--course-sidebar-width" as string]: "410px" }}>
        <header className="course-header">
          <div>
            <Link href="/library" className="course-back">← Library</Link>
            <h1>{course.title}</h1>
            <p className="course-summary-text">{course.summary}</p>
            <span className="course-meta-line">
              {course.blocks.length} blocks · ~{course.estimatedMinutes} min
            </span>
          </div>
        </header>
        <CopilotKitProvider enabled={copilotEnabled}>
          <CourseDetailClient initialCourse={course} copilotEnabled={copilotEnabled} />
        </CopilotKitProvider>
      </section>
    </main>
  );
}
