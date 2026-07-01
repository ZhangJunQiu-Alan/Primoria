import Link from "next/link";
import { listCourses } from "@/lib/courses/store";
import { listActiveLessonGenerationJobsByOwner } from "@/lib/courses/lesson-generation-jobs";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { CourseLibraryGrid } from "@/components/library/course-library-grid";
import { getCurrentDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();
  const { dictionary: t } = await getCurrentDictionary();
  const shouldGate = authEnabled && !user;
  const [courses, lessonJobs] = shouldGate
    ? [[], []]
    : await Promise.all([listCourses(user?.id), listActiveLessonGenerationJobsByOwner(user?.id)]);

  return (
    <main className="app-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="workspace library-workspace">
        {shouldGate ? (
          <div className="library-empty library-auth-empty">
            <span className="course-block-tag">{t.library.privateWorkspace}</span>
            <h2>{t.library.signInTitle}</h2>
            <p>{t.library.signInCopy}</p>
            <div className="auth-required-actions">
              <Link href="/auth/sign-in">{t.common.signIn}</Link>
              <Link href="/auth/sign-up">{t.common.signUp}</Link>
            </div>
          </div>
        ) : (
          <CourseLibraryGrid initialCourses={courses} initialLessonJobs={lessonJobs} />
        )}
      </section>
    </main>
  );
}
