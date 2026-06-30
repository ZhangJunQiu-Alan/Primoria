import Link from "next/link";
import { redirect } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { ProfileEditModal } from "@/components/profile/profile-edit-modal";
import { BoltIcon, BookIcon, CalendarIcon, ChartIcon, FlameIcon, StarIcon } from "@/components/profile/profile-icons";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { getProfileStats } from "@/lib/profile/stats";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/profile");

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
              <span className="profile-eyebrow">Learner Profile</span>
              <h1>{stats.displayName}</h1>
              <p>{stats.email ?? "Your adaptive Primoria learning record."}</p>
            </div>
          </div>
          <div className="profile-hero-action">
            <ProfileEditModal initialDisplayName={stats.displayName} />
          </div>
          <div className="profile-score-row" aria-label="Profile progress summary">
            <span><FlameIcon /> <strong>{stats.streakDays}</strong><em>Day streak</em></span>
            <span><StarIcon /> <strong>{stats.xp}</strong><em>Total XP</em></span>
            <span><BookIcon /> <strong>{stats.lessonsCompleted}</strong><em>Lessons done</em></span>
            <span><BoltIcon /> <strong>{stats.questionsPracticed}</strong><em>Questions</em></span>
          </div>
        </div>

        <section className="profile-section">
          <div className="profile-section-header">
            <div>
              <span className="profile-eyebrow">Progress</span>
              <h2>My Progress</h2>
              <p>Track your weekly rhythm, completed lessons, quiz practice, and recorded learning activity.</p>
            </div>
          </div>
          <div className="profile-list-card">
            <Link href="/weekly-report" className="profile-list-row">
              <span className="profile-list-icon"><CalendarIcon /></span>
              <span className="profile-list-copy">
                <strong>Weekly Report</strong>
                <em>{stats.activeDaysThisWeek}/7 active days this week · {stats.weeklyActivityEvents} recorded events</em>
              </span>
              <span className="profile-list-arrow" aria-hidden="true">›</span>
            </Link>
            <Link href="/stats" className="profile-list-row">
              <span className="profile-list-icon"><ChartIcon /></span>
              <span className="profile-list-copy">
                <strong>Learning Stats</strong>
                <em>{stats.lessonsCompleted} lessons completed · {stats.questionsPracticed} quiz questions practiced · {stats.courseCount} courses</em>
              </span>
              <span className="profile-list-arrow" aria-hidden="true">›</span>
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
