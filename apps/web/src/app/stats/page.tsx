import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { BoltIcon, BookIcon, CalendarIcon, ClockIcon, FlameIcon, StarIcon } from "@/components/profile/profile-icons";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { formatLearningTime, getProfileStats } from "@/lib/profile/stats";
import { getCurrentDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/stats");
  const { dictionary } = await getCurrentDictionary();
  const t = dictionary.stats;
  const stats = await getProfileStats({
    ownerId: user?.id ?? null,
    displayName: user?.displayName ?? null,
    email: user?.email ?? null,
  });

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="profile-detail-workspace">
        <Link href="/profile" className="profile-back-link">← {t.backProfile}</Link>
        <h1 className="profile-detail-title">{t.detailed}</h1>

        <section className="profile-panel activity-panel">
          <h2>{t.dailyActivity}</h2>
          <div className="activity-heatmap" aria-label={t.dailyActivity}>
            <div className="activity-week-labels">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
            </div>
            <div className="activity-grid">
              {stats.heatmapDays.map((day) => (
                <span
                  key={day.key}
                  className={day.activity > 3 ? "level-3" : day.activity > 1 ? "level-2" : day.activity > 0 ? "level-1" : ""}
                  title={`${day.key}: ${day.activity}`}
                />
              ))}
            </div>
          </div>
        </section>

        <ProfileStatSection title={t.todaySummary}>
          <StatCard icon={<BookIcon />} title={t.lessons} value={stats.todayLessonsCompleted} detail={t.lessonsToday} tone="blue" />
          <StatCard icon={<BoltIcon />} title={t.questions} value={stats.todayQuestionsPracticed} detail={t.questionsToday} tone="green" />
          <StatCard icon={<ClockIcon />} title={t.activity} value={stats.todayActivityEvents} detail={t.eventsToday} tone="orange" />
          <StatCard icon={<FlameIcon />} title={t.currentStreak} value={`${stats.streakDays} ${stats.streakDays === 1 ? t.day : t.days}`} detail={t.keepItUp} tone="flame" />
          <StatCard icon={<StarIcon />} title={t.xpEarned} value={stats.todayXp} detail={t.xpToday} tone="gold" />
        </ProfileStatSection>

        <ProfileStatSection title={t.lifetime}>
          <StatCard icon={<BookIcon />} title={t.lessonsCompleted} value={stats.lessonsCompleted} detail={t.totalLessonsFinished} tone="blue" />
          <StatCard icon={<BoltIcon />} title={t.questionsPracticed} value={stats.questionsPracticed} detail={t.totalQuestionsPracticed} tone="green" />
          <StatCard icon={<CalendarIcon />} title={t.activeLearningDays} value={stats.activeDaysLast30} detail={t.activeDaysDetail} tone="aqua" />
          <StatCard icon={<ClockIcon />} title={t.plannedLessonTime} value={formatLearningTime(stats.plannedLessonMinutes)} detail={t.plannedMinutesDetail} tone="orange" />
          <StatCard icon={<StarIcon />} title={t.totalXp} value={stats.xp} detail={t.allTimeXp} tone="gold" />
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
