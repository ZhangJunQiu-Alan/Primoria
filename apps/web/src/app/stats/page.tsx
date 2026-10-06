import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { mondayFirstColumn, mondayFirstWeekdays } from "@/components/profile/weekday";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { formatLearningTime, getProfileStats } from "@/lib/profile/stats";
import { getDictionaryForUser } from "@/lib/i18n/server";
import { formatMessage } from "@/lib/i18n/format";

export const dynamic = "force-dynamic";

function activityLevel(activity: number) {
  if (activity > 3) return "level-3";
  if (activity > 1) return "level-2";
  if (activity > 0) return "level-1";
  return "";
}

export default async function StatsPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUserForRsc();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/stats");
  const { language, dictionary } = await getDictionaryForUser(user?.id ?? null);
  const stats = await getProfileStats({
    ownerId: user?.id ?? null,
    displayName: user?.displayName ?? null,
    email: user?.email ?? null,
    locale: language,
  });
  const t = dictionary.stats;
  const weekdays = mondayFirstWeekdays(language);
  const leadingBlanks = stats.heatmapDays.length ? mondayFirstColumn(stats.heatmapDays[0].key) : 0;
  const todayKey = stats.heatmapDays.at(-1)?.key;
  const dayUnit = stats.streakDays === 1 ? t.day : t.days;

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="profile-detail-workspace">
        <header className="profile-page-header">
          <h1>{t.detailed}</h1>
          <p>{t.subtitle}</p>
        </header>

        <section className="profile-block" aria-labelledby="stats-today-title">
          <h2 id="stats-today-title" className="profile-block-title">{t.todaySummary}</h2>
          <dl className="profile-metric-strip">
            <Metric label={t.lessonsToday} value={stats.todayLessonsCompleted} />
            <Metric label={t.questionsToday} value={stats.todayQuestionsPracticed} />
            <Metric label={t.eventsToday} value={stats.todayActivityEvents} />
            <Metric label={t.currentStreak} value={stats.streakDays} unit={dayUnit} />
            <Metric label={t.xpToday} value={stats.todayXp} unit="XP" />
          </dl>
        </section>

        <section className="profile-panel activity-panel" aria-labelledby="stats-activity-title">
          <div className="activity-calendar">
            <h2 id="stats-activity-title" className="profile-block-title">{t.dailyActivity}</h2>
            <div className="activity-heatmap" role="img" aria-label={formatMessage(t.activeOf30, { days: stats.activeDaysLast30 })}>
              <div className="activity-week-labels" aria-hidden="true">
                {weekdays.map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="activity-grid" aria-hidden="true">
                {Array.from({ length: leadingBlanks }, (_, index) => <span key={`pad-${index}`} className="pad" />)}
                {stats.heatmapDays.map((day) => (
                  <span
                    key={day.key}
                    className={`${activityLevel(day.activity)}${day.key === todayKey ? " today" : ""}`}
                    title={`${day.key}: ${day.activity}`}
                  >
                    {day.day}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <aside className="activity-aside">
            <div>
              <strong>{stats.activeDaysLast30}<small> / 30</small></strong>
              <span>{t.activeDaysDetail}</span>
            </div>
            <div>
              <strong>{stats.streakDays}<small> {dayUnit}</small></strong>
              <span>{t.currentStreak}</span>
            </div>
            <div className="activity-legend" aria-hidden="true">
              <span>{t.less}</span>
              <i />
              <i className="level-1" />
              <i className="level-2" />
              <i className="level-3" />
              <span>{t.more}</span>
            </div>
          </aside>
        </section>

        <section className="profile-block" aria-labelledby="stats-lifetime-title">
          <h2 id="stats-lifetime-title" className="profile-block-title">{t.lifetime}</h2>
          <dl className="profile-metric-strip">
            <Metric label={t.lessonsCompleted} value={stats.lessonsCompleted} detail={t.totalLessonsFinished} />
            <Metric label={t.questionsPracticed} value={stats.questionsPracticed} detail={t.totalQuestionsPracticed} />
            <Metric label={t.activeLearningDays} value={stats.activeDaysLast30} detail={t.activeDaysDetail} />
            <Metric label={t.plannedLessonTime} value={formatLearningTime(stats.plannedLessonMinutes)} detail={t.plannedMinutesDetail} />
            <Metric label={t.totalXp} value={stats.xp.toLocaleString(language)} detail={t.allTimeXp} />
          </dl>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value, unit, detail }: { label: string; value: ReactNode; unit?: string; detail?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {value}
        {unit ? <small> {unit}</small> : null}
      </dd>
      {detail ? <dd className="profile-metric-detail">{detail}</dd> : null}
    </div>
  );
}
