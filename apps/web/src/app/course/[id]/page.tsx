import { notFound } from "next/navigation";
import { CourseDetailClient } from "@/components/course/course-detail-client";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { getCourse } from "@/lib/courses/store";
import { listLessonGenerationJobsByCourse } from "@/lib/courses/lesson-generation-jobs";
import { loadLessonConcepts } from "@/lib/courses/lesson-concepts";
import { getGamificationProfile } from "@/lib/gamification/store";
import { resolveUiLanguageForUser } from "@/lib/i18n/server";

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
  const [lessonConcepts, player] = await Promise.all([
    loadLessonConcepts(course, user?.id ?? null),
    user
      ? resolveUiLanguageForUser(user.id)
          .then((language) => getGamificationProfile(user.id, language))
          .then(({ player }) => ({
            levelName: player.levelName,
            totalXp: player.totalXp,
            nextLevelXp: player.nextLevelXp,
            nextLevelName: player.nextLevelName,
          }))
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  return (
    <main className="app-shell course-app-shell">
      <section className="workspace course-workspace">
        <CourseDetailClient
          initialCourse={course}
          initialLessonId={requestedLessonId ?? null}
          initialLessonJobs={lessonJobs}
          copilotEnabled={copilotEnabled}
          lessonConcepts={lessonConcepts}
          player={player}
        />
      </section>
    </main>
  );
}
