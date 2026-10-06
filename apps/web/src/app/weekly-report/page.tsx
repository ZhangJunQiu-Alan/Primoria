import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { ChevronRightIcon } from "@/components/profile/profile-icons";
import { mondayFirstWeekdays } from "@/components/profile/weekday";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { getProfileStats } from "@/lib/profile/stats";
import { getDictionaryForUser } from "@/lib/i18n/server";
import { formatMessage } from "@/lib/i18n/format";

export const dynamic = "force-dynamic";

export default async function WeeklyReportPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUserForRsc();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/weekly-report");
  const { language, dictionary } = await getDictionaryForUser(user?.id ?? null);
  const stats = await getProfileStats({
    ownerId: user?.id ?? null,
    displayName: user?.displayName ?? null,
    email: user?.email ?? null,
    locale: language,
  });
  const t = dictionary.weekly;
  const weekdays = mondayFirstWeekdays(language);
  const peak = Math.max(0, ...stats.weekDays.map((day) => day.activity));
  const peakIndex = peak > 0 ? stats.weekDays.findIndex((day) => day.activity === peak) : -1;

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="profile-detail-workspace">
        <header className="profile-page-header has-aside">
          <div>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <span className="profile-week-chip" aria-label={t.currentWeek}>{stats.weekLabel}</span>
        </header>

        <dl className="profile-metric-strip">
          <Metric label={t.lessonsCompleted} value={stats.weeklyLessonsCompleted} />
          <Metric label={t.questionsPracticed} value={stats.weeklyQuestionsPracticed} />
          <Metric label={t.recordedEvents} value={stats.weeklyActivityEvents} />
          <Metric label={t.xpEarned} value={stats.weeklyXp.toLocaleString(language)} />
          <Metric label={t.coursesMetric} value={stats.coursesWorkedOn.length} />
        </dl>

        <div className="weekly-grid">
          <section className="profile-panel weekly-chart-panel" aria-labelledby="weekly-breakdown-title">
            <h2 id="weekly-breakdown-title" className="profile-block-title">{t.dailyBreakdown}</h2>
            <div className="weekly-days">
              {stats.weekDays.map((day, index) => (
                <div key={`${day.label}-${day.date}`} className={index === peakIndex ? "peak" : day.activity > 0 ? "active" : ""}>
                  <span className="weekly-bar-value">{day.activity > 0 ? day.activity : ""}</span>
                  <span className="weekly-bar" aria-hidden="true">
                    <i style={{ height: peak > 0 && day.activity > 0 ? `${Math.max(6, (day.activity / peak) * 100)}%` : undefined }} />
                  </span>
                  <strong>{weekdays[index]}</strong>
                  <em>{day.date}</em>
                </div>
              ))}
            </div>
          </section>

          <div className="weekly-side">
            <section className="profile-panel weekly-active-days">
              <span className="profile-block-title">{t.activeDays}</span>
              <strong>{formatMessage(t.daysActive, { days: stats.activeDaysThisWeek })}</strong>
              <div className="weekly-day-segments" aria-hidden="true">
                {stats.weekDays.map((day) => <i key={`${day.label}-${day.date}`} className={day.activity > 0 ? "on" : ""} />)}
              </div>
            </section>
            <section className="profile-panel profile-highlight-card">
              <span className="profile-block-title">{t.bestDay}</span>
              <h2>{stats.bestWeekDay?.display ?? t.noActivityYet}</h2>
              <p>{stats.bestWeekDay?.activity ?? 0} {t.events}</p>
            </section>
          </div>
        </div>

        <section className="profile-block" aria-labelledby="weekly-courses-title">
          <h2 id="weekly-courses-title" className="profile-block-title">{t.coursesWorkedOn}</h2>
          <div className="profile-course-stack">
            {stats.coursesWorkedOn.length ? stats.coursesWorkedOn.map((course) => (
              <Link key={course.id} href={`/course/${encodeURIComponent(course.id)}/outline`} className="profile-course-row">
                <span>
                  <strong>{course.title}</strong>
                  <em>{formatMessage(t.courseRow, { lessons: course.lessons, questions: course.questions, events: course.activityEvents })}</em>
                </span>
                <span className="profile-course-count">{course.activityEvents}</span>
                <ChevronRightIcon />
              </Link>
            )) : <p className="profile-empty-copy">{t.noCourses}</p>}
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
