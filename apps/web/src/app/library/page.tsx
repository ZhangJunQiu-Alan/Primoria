import Link from "next/link";
import { listCourses } from "@/lib/courses/store";
import { listActiveLessonGenerationJobsByOwner } from "@/lib/courses/lesson-generation-jobs";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { CourseLibraryGrid } from "@/components/library/course-library-grid";
import { getDictionaryForUser } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUserForRsc();
  const shouldGate = authEnabled && !user;
  const libraryDataPromise = shouldGate
    ? Promise.resolve({ courses: [], lessonJobs: [] })
    : Promise.all([listCourses(user?.id), listActiveLessonGenerationJobsByOwner(user?.id)])
        .then(([courses, lessonJobs]) => ({ courses, lessonJobs }));
  const [{ dictionary: t }, { courses, lessonJobs }] = await Promise.all([
    getDictionaryForUser(user?.id ?? null),
    libraryDataPromise,
  ]);

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
