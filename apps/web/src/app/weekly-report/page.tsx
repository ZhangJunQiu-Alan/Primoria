import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { BoltIcon, BookIcon, ClockIcon, StarIcon } from "@/components/profile/profile-icons";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { formatLearningTime, getProfileStats } from "@/lib/profile/stats";

export const dynamic = "force-dynamic";

export default async function WeeklyReportPage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/weekly-report");
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
        <header className="profile-detail-header">
          <h1>Weekly Report</h1>
          <div className="profile-week-switch" aria-label="Current week">
            <span>‹</span>
            <strong>Jun 29 - Jul 5</strong>
            <span>›</span>
          </div>
        </header>

        <section className="weekly-summary-card">
          <div className="weekly-metrics">
            <Metric icon={<BookIcon />} value={stats.lessonsCompleted} label="Lessons completed" tone="blue" />
            <Metric icon={<BoltIcon />} value={stats.questionsPracticed} label="Questions practiced" tone="green" />
            <Metric icon={<ClockIcon />} value={formatLearningTime(stats.learningMinutes)} label="Learning time" tone="orange" />
            <Metric icon={<StarIcon />} value={stats.xp} label="XP earned" tone="gold" />
            <Metric icon={<span className="profile-lightbulb">?</span>} value={stats.cardsCollected} label="Cards collected" tone="blue" />
          </div>
          <div className="weekly-active-days">
            <span>Active Days</span>
            <strong>{stats.activeDaysThisWeek}/7 days</strong>
            <div><span style={{ width: `${Math.max(4, (stats.activeDaysThisWeek / 7) * 100)}%` }} /></div>
          </div>
        </section>

        <section className="profile-panel">
          <h2>Daily Breakdown</h2>
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
            <span><i />No activity</span>
            <span><i className="light" />Light</span>
            <span><i className="active" />Active</span>
          </div>
        </section>

        <section className="profile-highlight-card">
          <span className="profile-trophy">T</span>
          <div>
            <strong>Best Day of the Week</strong>
            <h2>Monday, Jun 29</h2>
          </div>
          <p>{Math.max(0, ...stats.weekDays.map((day) => day.activity))}<span>events</span></p>
        </section>

        <section className="profile-panel">
          <h2>Courses Worked On</h2>
          <div className="profile-course-stack">
            {stats.coursesWorkedOn.length ? stats.coursesWorkedOn.map((course) => (
              <Link key={course.id} href={`/course/${encodeURIComponent(course.id)}/outline`} className="profile-course-row">
                <strong>{course.title}</strong>
                <span>{course.lessons} lessons · {course.questions} questions</span>
                <em>{formatLearningTime(course.minutes)}</em>
              </Link>
            )) : <p className="profile-empty-copy">No course activity yet.</p>}
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
