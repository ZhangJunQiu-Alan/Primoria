import Link from "next/link";
import { listCourses } from "@/lib/courses/store";
import { listCourseGenerationJobs } from "@/lib/courses/generation-jobs";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { CourseLibraryGrid } from "@/components/library/course-library-grid";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();
  const shouldGate = authEnabled && !user;
  const [courses, courseGenerationJobs] = shouldGate
    ? [[], []]
    : await Promise.all([listCourses(user?.id), listCourseGenerationJobs(user?.id)]);

  return (
    <main className="app-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="workspace library-workspace">
        {shouldGate ? (
          <div className="library-empty library-auth-empty">
            <span className="course-block-tag">Private workspace</span>
            <h2>Sign in to view your Library</h2>
            <p>Your courses, chat threads, and settings are tied to your account.</p>
            <div className="auth-required-actions">
              <Link href="/auth/sign-in">Sign in</Link>
              <Link href="/auth/sign-up">Create account</Link>
            </div>
          </div>
        ) : (
          <CourseLibraryGrid initialCourses={courses} initialJobs={courseGenerationJobs} />
        )}
      </section>
    </main>
  );
}
