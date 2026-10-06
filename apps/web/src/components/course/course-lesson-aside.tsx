"use client";

import Link from "next/link";
import type { LessonConceptView } from "@/lib/courses/lesson-concepts";
import type { Course } from "@/lib/courses/types";
import { formatMessage } from "@/lib/i18n/format";
import { useT } from "@/lib/i18n/client";

export type LessonPlayerSummary = {
  levelName: string;
  totalXp: number;
  nextLevelXp: number | null;
  nextLevelName: string | null;
};

export function CourseLessonAside({
  course,
  concepts,
  player,
}: {
  course: Course;
  concepts: LessonConceptView[];
  player: LessonPlayerSummary | null;
}) {
  const t = useT().course;
  const completed = course.lessons.filter((lesson) => lesson.progress === "completed").length;
  const total = course.lessons.length;
  const levelPercent = player?.nextLevelXp ? Math.min(100, Math.round((player.totalXp / player.nextLevelXp) * 100)) : 100;

  return (
    <aside className="course-lesson-aside" aria-label={t.lessonInfo}>
      <div className="course-lesson-aside-course">
        <Link href="/library" className="course-lesson-aside-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {t.backLibrary}
        </Link>
        <strong>{course.title}</strong>
        <div className="course-lesson-aside-progress">
          <span aria-hidden="true"><i style={{ width: `${total > 0 ? Math.round((completed / total) * 100) : 0}%` }} /></span>
          <em>{completed} / {total}</em>
        </div>
        <Link href={`/course/${course.id}/outline`} className="course-lesson-aside-outline">{t.viewOutline}</Link>
      </div>

      {concepts.length > 0 ? (
        <section className="course-lesson-concepts" aria-labelledby="course-lesson-concepts-title">
          <h2 id="course-lesson-concepts-title">{t.lessonConcepts}</h2>
          <ol>
            {concepts.map((concept) => (
              <li key={concept.conceptId} className={`concept-${concept.status}`}>
                <span className="course-lesson-concept-dot" aria-hidden="true" />
                <span className="course-lesson-concept-copy">
                  <strong>{concept.name}</strong>
                  <span>{t.conceptStatus[concept.status]}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {player ? (
        <section className="course-lesson-level">
          <div>
            <strong>{player.levelName}</strong>
            <span>
              {player.totalXp.toLocaleString()}
              {player.nextLevelXp ? ` / ${player.nextLevelXp.toLocaleString()}` : " XP"}
            </span>
          </div>
          <span className="course-lesson-level-bar" aria-hidden="true"><i style={{ width: `${levelPercent}%` }} /></span>
          {player.nextLevelXp && player.nextLevelName ? (
            <small>
              {formatMessage(t.nextLevelHint, {
                xp: Math.max(0, player.nextLevelXp - player.totalXp).toLocaleString(),
                level: player.nextLevelName,
              })}
            </small>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
