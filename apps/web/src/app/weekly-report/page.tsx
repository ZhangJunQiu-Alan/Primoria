import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { BoltIcon, BookIcon, CalendarIcon, StarIcon } from "@/components/profile/profile-icons";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { getProfileStats } from "@/lib/profile/stats";
import { getDictionaryForUser } from "@/lib/i18n/server";
import { formatMessage } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function WeeklyReportPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUserForRsc();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/weekly-report");
  const [{ dictionary }, stats] = await Promise.all([
    getDictionaryForUser(user?.id ?? null),
    getProfileStats({
      ownerId: user?.id ?? null,
      displayName: user?.displayName ?? null,
      email: user?.email ?? null,
    }),
  ]);
  const t = dictionary.weekly;

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="profile-detail-workspace">
        <Link href="/profile" className="profile-back-link">← {t.backProfile}</Link>
        <header className="profile-detail-header">
          <h1>{t.title}</h1>
          <div className="profile-week-switch" aria-label={t.currentWeek}>
            <span>‹</span>
            <strong>{stats.weekLabel}</strong>
            <span>›</span>
          </div>
        </header>

        <section className="weekly-summary-card">
          <div className="weekly-metrics">
            <Metric icon={<BookIcon />} value={stats.weeklyLessonsCompleted} label={t.lessonsCompleted} tone="blue" />
            <Metric icon={<BoltIcon />} value={stats.weeklyQuestionsPracticed} label={t.questionsPracticed} tone="green" />
            <Metric icon={<CalendarIcon />} value={stats.weeklyActivityEvents} label={t.recordedEvents} tone="aqua" />
            <Metric icon={<StarIcon />} value={stats.weeklyXp} label={t.xpEarned} tone="gold" />
            <Metric icon={<span className="profile-lightbulb">C</span>} value={stats.coursesWorkedOn.length} label={t.coursesMetric} tone="blue" />
          </div>
          <div className="weekly-active-days">
            <span>{t.activeDays}</span>
            <strong>{formatMessage(t.daysActive, { days: stats.activeDaysThisWeek })}</strong>
            <div><span style={{ width: `${Math.max(4, (stats.activeDaysThisWeek / 7) * 100)}%` }} /></div>
          </div>
        </section>

        <section className="profile-panel">
          <h2>{t.dailyBreakdown}</h2>
          <div className="weekly-days">
            {stats.weekDays.map((day) => (
              <div key={`${day.label}-${day.date}`}>
                <strong>{day.label}</strong>
                <span className={day.activity > 0 ? "active" : ""}>{day.activity > 0 ? day.activity : "-"}</span>
                <em>{day.date}</em>
              </div>
            ))}
          </div>
          <div className="weekly-legend">
            <span><i />{t.noActivity}</span>
            <span><i className="light" />{t.light}</span>
            <span><i className="active" />{t.active}</span>
          </div>
        </section>

        <section className="profile-highlight-card">
          <span className="profile-trophy">T</span>
          <div>
            <strong>{t.bestDay}</strong>
            <h2>{stats.bestWeekDay?.display ?? t.noActivityYet}</h2>
          </div>
          <p>{stats.bestWeekDay?.activity ?? 0}<span>{t.events}</span></p>
        </section>

        <section className="profile-panel">
          <h2>{t.coursesWorkedOn}</h2>
          <div className="profile-course-stack">
            {stats.coursesWorkedOn.length ? stats.coursesWorkedOn.map((course) => (
              <Link key={course.id} href={`/course/${encodeURIComponent(course.id)}/outline`} className="profile-course-row">
                <strong>{course.title}</strong>
                <span>{formatMessage(t.courseRow, { lessons: course.lessons, questions: course.questions, events: course.activityEvents })}</span>
                <em>{course.activityEvents}</em>
              </Link>
            )) : <p className="profile-empty-copy">{t.noCourses}</p>}
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ icon, value, label, tone }: { icon: ReactNode; value: ReactNode; label: string; tone: string }) {
  return (
    <div className={`weekly-metric ${tone}`}>
      <span>{icon}</span>
      <strong>{value}</strong>
      <em>{label}</em>
    </div>
  );
}
