import Link from "next/link";
import { redirect } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { ProfileEditModal } from "@/components/profile/profile-edit-modal";
import { BoltIcon, BookIcon, CalendarIcon, ChartIcon, FlameIcon, StarIcon } from "@/components/profile/profile-icons";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { getProfileStats } from "@/lib/profile/stats";
import { getCurrentDictionary } from "@/lib/i18n/server";
import { formatMessage } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/profile");

  const { dictionary } = await getCurrentDictionary();
  const t = dictionary.profile;

  const stats = await getProfileStats({
    ownerId: user?.id ?? null,
    displayName: user?.displayName ?? null,
    email: user?.email ?? null,
  });

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="profile-workspace">
        <div className="profile-hero-card">
          <div className="profile-hero-identity">
            <div className="profile-avatar-xl" aria-hidden="true">{stats.initial}</div>
            <div className="profile-identity-copy">
              <span className="profile-eyebrow">{t.learnerProfile}</span>
              <h1>{stats.displayName}</h1>
              <p>{stats.email ?? t.fallbackRecord}</p>
            </div>
          </div>
          <div className="profile-hero-action">
            <ProfileEditModal initialDisplayName={stats.displayName} />
          </div>
          <div className="profile-score-row" aria-label={t.progressSummary}>
            <span><FlameIcon /> <strong>{stats.streakDays}</strong><em>{t.dayStreak}</em></span>
            <span><StarIcon /> <strong>{stats.xp}</strong><em>{t.totalXp}</em></span>
            <span><BookIcon /> <strong>{stats.lessonsCompleted}</strong><em>{t.lessonsDone}</em></span>
            <span><BoltIcon /> <strong>{stats.questionsPracticed}</strong><em>{t.questions}</em></span>
          </div>
        </div>

        <section className="profile-section">
          <div className="profile-section-header">
            <div>
              <span className="profile-eyebrow">{t.progress}</span>
              <h2>{t.myProgress}</h2>
              <p>{t.progressCopy}</p>
            </div>
          </div>
          <div className="profile-list-card">
            <Link href="/weekly-report" className="profile-list-row">
              <span className="profile-list-icon"><CalendarIcon /></span>
              <span className="profile-list-copy">
                <strong>{t.weeklyReport}</strong>
                <em>{formatMessage(t.activeDays, { days: stats.activeDaysThisWeek, events: stats.weeklyActivityEvents })}</em>
              </span>
              <span className="profile-list-arrow" aria-hidden="true">›</span>
            </Link>
            <Link href="/stats" className="profile-list-row">
              <span className="profile-list-icon"><ChartIcon /></span>
              <span className="profile-list-copy">
                <strong>{t.learningStats}</strong>
                <em>{formatMessage(t.statsSummary, { lessons: stats.lessonsCompleted, questions: stats.questionsPracticed, courses: stats.courseCount })}</em>
              </span>
              <span className="profile-list-arrow" aria-hidden="true">›</span>
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
