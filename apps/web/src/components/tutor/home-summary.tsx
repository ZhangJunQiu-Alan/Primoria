"use client";

import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, type CSSProperties } from "react";
import { ArrowIcon } from "@/components/arrow-icon";
import type { HomeFeaturedCourse } from "@/lib/courses/home-track";
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

export type HomeQuest = {
  code: string;
  description: string;
  progress: number;
  target: number;
  xpReward: number;
  completed: boolean;
};

export type HomeSummary = {
  learnerName: string | null;
  featured: HomeFeaturedCourse | null;
  /** Other unfinished courses, most recent first. */
  courses: HomeCourseSummary[];
  courseCount: number;
  streakDays: number;
  quests: HomeQuest[];
  levelName: string;
  totalXp: number;
  nextLevelName: string | null;
  nextLevelXp: number | null;
  levelProgress: number;
};

const HomeSummaryContext = createContext<HomeSummary | null>(null);

export const HomeSummaryProvider = HomeSummaryContext.Provider;

export function useHomeSummary() {
  return useContext(HomeSummaryContext);
}

function CheckMark({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** The lessons-and-today grid under the home composer. */
export function HomeSummarySection({ onPickGoal }: { onPickGoal?: (goal: string) => void }) {
  const t = useT();
  const summary = useHomeSummary();
  if (!summary) return null;
  const copy = t.tutor.home;
  const questsDone = summary.quests.filter((quest) => quest.completed).length;

  return (
    <section className="home-summary">
      <div>
        <div className="home-section-head">
          <h2>{t.tutor.continueLearning}</h2>
          {summary.courseCount > 0 ? <Link href="/library">{t.tutor.allCourses}</Link> : null}
        </div>
        {summary.featured ? (
          <>
            <FeaturedCourse course={summary.featured} />
            {summary.courses.length > 0 ? (
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
            ) : null}
          </>
        ) : (
          <article className="home-card home-empty">
            <figure className="home-empty-figure">
              <Image src="/onboarding/illustrations/goal.svg" alt="" fill sizes="170px" unoptimized />
            </figure>
            <div>
              <h3>{copy.emptyTitle}</h3>
              <p>{copy.emptyBody}</p>
              <div className="home-empty-goals">
                {copy.emptyGoals.map((goal) => (
                  <button key={goal} type="button" onClick={() => onPickGoal?.(goal)}>
                    {goal}
                  </button>
                ))}
              </div>
            </div>
          </article>
        )}
      </div>

      <aside>
        <div className="home-section-head">
          <h2>{copy.today}</h2>
          <span>{copy.resets}</span>
        </div>
        <div className="home-card home-today">
          <div className="home-streak">
            <b>{summary.streakDays}</b>
            <span>
              <strong>{copy.streakUnit}</strong>
              <small>{summary.streakDays > 0 ? copy.streakKeep : copy.streakStart}</small>
            </span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22c4 0 7-2.8 7-6.8 0-3.2-2-5.6-3.6-7.2.2 2-1 3.4-2.2 3.4C13 8.5 12 5 9.5 2.5 9.8 6 5 9 5 15.2 5 19.2 8 22 12 22z" />
            </svg>
          </div>
          <div className="home-quests">
            <div className="home-quests-label">
              <span>{copy.quests}</span>
              <span>{questsDone} / {summary.quests.length}</span>
            </div>
            {summary.quests.map((quest) => (
              <div key={quest.code} className="home-quest" data-done={quest.completed}>
                <i>{quest.completed ? <CheckMark size={11} /> : null}</i>
                <p>{quest.description}</p>
                <span className="home-quest-xp">+{quest.xpReward} XP</span>
                {quest.target > 1 ? (
                  <span className="home-quest-progress">
                    <span className="home-continue-bar" aria-hidden="true">
                      <i style={{ width: `${Math.round((quest.progress / quest.target) * 100)}%` }} />
                    </span>
                    <span>{quest.progress}/{quest.target}</span>
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          <div className="home-rank">
            <div>
              <strong>{summary.levelName}</strong>
              <span>{summary.totalXp.toLocaleString()} XP</span>
            </div>
            <span className="home-rank-bar" aria-hidden="true">
              <i style={{ width: `${Math.round(summary.levelProgress * 100)}%` }} />
            </span>
            <p>
              {summary.nextLevelName && summary.nextLevelXp !== null
                ? formatMessage(copy.rankTo, { name: summary.nextLevelName, xp: Math.max(0, summary.nextLevelXp - summary.totalXp) })
                : copy.rankMax}
            </p>
          </div>
        </div>
      </aside>
    </section>
  );
}

function FeaturedCourse({ course }: { course: HomeFeaturedCourse }) {
  const t = useT();
  const copy = t.tutor.home;
  const count = course.stops.length;
  const doneInWindow = course.stops.filter((stop) => stop.state === "done").length;
  const trackStyle = {
    "--home-track-count": count,
    "--home-track-progress": count > 1 ? Math.min(1, doneInWindow / (count - 1)) : 0,
  } as CSSProperties;
  const windowEnd = course.windowStart + count - 1;
  return (
    <article className="home-card home-featured">
      <div className="home-featured-top">
        <div>
          <span>{formatMessage(copy.courseMeta, { done: course.completed, total: course.total })}</span>
          <h3>{course.title}</h3>
        </div>
        {course.currentNumber !== null ? (
          <Link className="home-resume" href={`/course/${course.id}`}>
            {formatMessage(course.currentStarted || course.completed > 0 ? copy.resume : copy.start, { number: course.currentNumber })}
            <ArrowIcon size={15} />
          </Link>
        ) : null}
      </div>
      <ol className="home-track" style={trackStyle}>
        <span className="home-track-fill" aria-hidden="true" />
        {course.stops.map((stop) => (
          <li key={stop.id} className="home-track-stop" data-state={stop.state}>
            <i>{stop.state === "done" ? <CheckMark /> : null}</i>
            <span>{stop.title}</span>
            {stop.state === "now" ? <small>{course.currentStarted ? copy.inProgress : copy.upNext}</small> : null}
          </li>
        ))}
      </ol>
      {course.total > count ? (
        <p className="home-track-window">{formatMessage(copy.lessonWindow, { from: course.windowStart, to: windowEnd, total: course.total })}</p>
      ) : null}
    </article>
  );
}
