import Link from "next/link";
import { redirect } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { ProfileEditModal } from "@/components/profile/profile-edit-modal";
import { CalendarIcon, ChartIcon, FlameIcon, StarIcon } from "@/components/profile/profile-icons";
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
          <div className="profile-avatar-xl" aria-hidden="true">{stats.initial}</div>
          <h1>{stats.displayName}</h1>
          <div className="profile-score-row" aria-label="Profile progress summary">
            <span><FlameIcon /> <strong>{stats.streakDays}</strong><em>Days</em></span>
            <span><StarIcon /> <strong>{stats.xp}</strong><em>XP</em></span>
          </div>
          <ProfileEditModal initialDisplayName={stats.displayName} />
        </div>

        <section className="profile-section">
          <h2>My Progress</h2>
          <div className="profile-list-card">
            <Link href="/weekly-report" className="profile-list-row">
              <CalendarIcon />
              <span>Weekly Report</span>
              <strong aria-hidden="true">›</strong>
            </Link>
            <Link href="/stats" className="profile-list-row">
              <ChartIcon />
              <span>Learning Stats</span>
              <strong aria-hidden="true">›</strong>
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
