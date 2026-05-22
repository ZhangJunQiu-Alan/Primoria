import Link from "next/link";
import { notFound } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { CourseDetailClient } from "@/components/course/course-detail-client";
import { getCourse } from "@/lib/courses/store";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = getCourse(id);
  if (!course) notFound();

  return (
    <main className="app-shell">
      <TutorNavRail />
      <section className="workspace course-workspace">
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
        <CourseDetailClient initialCourse={course} />
      </section>
    </main>
  );
}
