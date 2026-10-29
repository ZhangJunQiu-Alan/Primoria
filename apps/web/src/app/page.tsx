import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { LandingPage } from "@/components/landing/landing-page";
import { getLearnerOnboardingState } from "@/lib/learner-profile/store";
import { buildHomeFeaturedCourse } from "@/lib/courses/home-track";
import { listCourses } from "@/lib/courses/store";
import { getGamificationProfile } from "@/lib/gamification/store";
import { resolveUiLanguageForUser } from "@/lib/i18n/server";
import type { HomeSummary } from "@/components/tutor/home-summary";

/** Featured course plus up to two others. */
const HOME_CONTINUE_LIMIT = 3;

async function loadHomeSummary(userId: string, learnerName: string | null): Promise<HomeSummary | null> {
  try {
    const language = await resolveUiLanguageForUser(userId);
    const [courses, gamification] = await Promise.all([
      listCourses(userId),
      getGamificationProfile(userId, language),
    ]);
    const recent = [...courses]
      .filter((course) => course.lessonCount > 0 && course.completedLessonCount < course.lessonCount)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, HOME_CONTINUE_LIMIT);
    const [featured, ...others] = recent;
    const { player } = gamification;
    return {
      learnerName,
      featured: featured ? buildHomeFeaturedCourse(featured) : null,
      courses: others.map((course) => ({
        id: course.id,
        title: course.title,
        topic: course.topic,
        currentLessonTitle: course.currentLesson?.title ?? null,
        completed: course.completedLessonCount,
        total: course.lessonCount,
      })),
      courseCount: courses.length,
      streakDays: player.currentStreak,
      quests: gamification.quests.map((quest) => ({
        code: quest.code,
        description: quest.description,
        progress: quest.progress,
        target: quest.target,
        xpReward: quest.xpReward,
        completed: quest.completed,
      })),
      levelName: player.levelName,
      totalXp: player.totalXp,
      nextLevelName: player.nextLevelName,
      nextLevelXp: player.nextLevelXp,
      levelProgress: player.levelProgress,
    };
  } catch {
    // The summary is decorative; a read failure must never block the tutor.
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUserForRsc();

  if (authEnabled && !user) return <LandingPage />;

  if (authEnabled && user) {
    const onboarding = await getLearnerOnboardingState(user.id);
    if (!onboarding.complete) {
      const { OnboardingClient } = await import("@/components/onboarding/onboarding-client");
      return (
        <main className="app-shell onboarding-app-shell">
          <OnboardingClient initialState={onboarding} />
        </main>
      );
    }
  }

  const { TutorWorkspaceClient } = await import("@/components/tutor/tutor-workspace-client");
  const homeSummary = user ? await loadHomeSummary(user.id, user.displayName ?? null) : null;

  return (
    <main className="app-shell">
      <TutorWorkspaceClient initialAuthState={{ authEnabled, user, loaded: true }} homeSummary={homeSummary} />
    </main>
  );
}
