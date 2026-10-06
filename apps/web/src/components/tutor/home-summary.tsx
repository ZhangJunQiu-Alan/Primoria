"use client";

import Link from "next/link";
import { createContext, useContext } from "react";
import { formatMessage } from "@/lib/i18n/format";
import { useT } from "@/lib/i18n/client";

export type HomeCourseSummary = {
  id: string;
  title: string;
  topic: string;
  currentLessonTitle: string | null;
  completed: number;
  total: number;
};

export type HomeSummary = {
  courses: HomeCourseSummary[];
  courseCount: number;
  streakDays: number;
  questsCompleted: number;
  questsTotal: number;
  levelName: string;
  totalXp: number;
};

const HomeSummaryContext = createContext<HomeSummary | null>(null);

export const HomeSummaryProvider = HomeSummaryContext.Provider;

export function useHomeSummary() {
  return useContext(HomeSummaryContext);
}

export function HomeSummarySection() {
  const t = useT();
  const summary = useHomeSummary();
  if (!summary) return null;

  return (
    <div className="home-summary">
      {summary.courses.length > 0 ? (
        <section className="home-continue" aria-labelledby="home-continue-title">
          <div className="home-section-head">
            <h2 id="home-continue-title">{t.tutor.continueLearning}</h2>
            <Link href="/library">{t.tutor.allCourses}</Link>
          </div>
          <div className="home-continue-list">
            {summary.courses.map((course) => {
              const width = course.total > 0 ? Math.round((course.completed / course.total) * 100) : 0;
              return (
                <Link key={course.id} href={`/course/${course.id}`} className="home-continue-row">
                  <span className="home-continue-copy">
                    <strong>{course.title}</strong>
                    <span>
                      {course.currentLessonTitle
                        ? formatMessage(t.tutor.nextLesson, { title: course.currentLessonTitle })
                        : course.topic}
                    </span>
                  </span>
                  <span className="home-continue-bar" aria-hidden="true">
                    <i style={{ width: `${width}%` }} />
                  </span>
                  <span className="home-continue-ratio">{course.completed} / {course.total}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <dl className="home-stats">
        <div>
          <dt>{t.tutor.streakDays}</dt>
          <dd>{summary.streakDays}</dd>
        </div>
        <div>
          <dt>{t.tutor.dailyQuests}</dt>
          <dd>
            {summary.questsCompleted}
            <small> / {summary.questsTotal}</small>
          </dd>
        </div>
        <div>
          <dt>{summary.levelName}</dt>
          <dd>
            {summary.totalXp.toLocaleString()}
            <small> XP</small>
          </dd>
        </div>
      </dl>
    </div>
  );
}
