import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { BoltIcon, BookIcon, CalendarIcon, ClockIcon, FlameIcon, StarIcon } from "@/components/profile/profile-icons";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { formatLearningTime, getProfileStats } from "@/lib/profile/stats";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/stats");
  const stats = await getProfileStats({
    ownerId: user?.id ?? null,
    displayName: user?.displayName ?? null,
    email: user?.email ?? null,
  });

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="profile-detail-workspace">
        <Link href="/profile" className="profile-back-link">← Back to Profile</Link>
        <h1 className="profile-detail-title">Detailed Statistics</h1>

        <section className="profile-panel activity-panel">
          <h2>Daily Activity (Last 30 Days)</h2>
          <div className="activity-heatmap" aria-label="Daily activity over the last 30 days">
            <div className="activity-week-labels">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
            </div>
            <div className="activity-grid">
              {stats.heatmapDays.map((day) => (
                <span
                  key={day.key}
                  className={day.activity > 3 ? "level-3" : day.activity > 1 ? "level-2" : day.activity > 0 ? "level-1" : ""}
                  title={`${day.key}: ${day.activity} events`}
                />
              ))}
            </div>
          </div>
        </section>

        <ProfileStatSection title="Today's Summary">
          <StatCard icon={<BookIcon />} title="Lessons" value={stats.todayLessonsCompleted} detail="Lessons completed today" tone="blue" />
          <StatCard icon={<BoltIcon />} title="Questions" value={stats.todayQuestionsPracticed} detail="Questions practiced today" tone="green" />
          <StatCard icon={<ClockIcon />} title="Activity" value={stats.todayActivityEvents} detail="Recorded learning events today" tone="orange" />
          <StatCard icon={<FlameIcon />} title="Current Streak" value={`${stats.streakDays} day${stats.streakDays === 1 ? "" : "s"}`} detail="Keep it up!" tone="flame" />
          <StatCard icon={<StarIcon />} title="XP Earned" value={stats.todayXp} detail="XP earned today" tone="gold" />
        </ProfileStatSection>

        <ProfileStatSection title="Lifetime Statistics">
          <StatCard icon={<BookIcon />} title="Lessons Completed" value={stats.lessonsCompleted} detail="Total lessons finished" tone="blue" />
          <StatCard icon={<BoltIcon />} title="Questions Practiced" value={stats.questionsPracticed} detail="Total questions practiced" tone="green" />
          <StatCard icon={<CalendarIcon />} title="Active Learning Days" value={stats.activeDaysLast30} detail="Active days in the last 30 days" tone="aqua" />
          <StatCard icon={<ClockIcon />} title="Planned Lesson Time" value={formatLearningTime(stats.plannedLessonMinutes)} detail="Estimated minutes in your courses" tone="orange" />
          <StatCard icon={<StarIcon />} title="Total XP" value={stats.xp} detail="All-time XP earned" tone="gold" />
        </ProfileStatSection>
      </section>
    </main>
  );
}

function ProfileStatSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="profile-stat-section">
      <h2>{title}</h2>
      <div className="profile-stat-grid">{children}</div>
    </section>
  );
}

function StatCard({
  icon,
  title,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  detail: string;
  tone: string;
}) {
  return (
    <article className="profile-stat-card">
      <span className={`profile-stat-icon ${tone}`}>{icon}</span>
      <h3>{title}</h3>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}
