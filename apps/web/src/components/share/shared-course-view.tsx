"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BlockRenderer } from "@/components/course/block-renderer";
import { msg, useT } from "@/lib/i18n/client";
import { loginPathWithNext } from "@/lib/auth/routes";
import { sortedCourseLessons, type Course, type Lesson } from "@/lib/courses/types";

type ImportState = { phase: "idle" | "importing" } | { phase: "failed"; message: string };

export function SharedCourseView({ token, course, signedIn }: { token: string; course: Course; signedIn: boolean }) {
  const t = useT();
  const router = useRouter();
  const lessons = useMemo(() => sortedCourseLessons(course), [course]);
  const firstReadable = lessons.find((lesson) => Array.isArray(lesson.blocks) && lesson.blocks.length > 0) ?? null;
  const [activeLessonId, setActiveLessonId] = useState<string | null>(firstReadable?.id ?? null);
  const [importState, setImportState] = useState<ImportState>({ phase: "idle" });

  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? firstReadable;
  const sharePath = `/share/${encodeURIComponent(token)}`;

  async function importCourse() {
    if (importState.phase === "importing") return;
    setImportState({ phase: "importing" });
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(token)}/import`, { method: "POST" });
      if (res.ok) {
        const body = (await res.json()) as { courseId: string };
        router.push(`/course/${body.courseId}`);
        return;
      }
      if (res.status === 401 || res.status === 503) {
        router.push(loginPathWithNext(sharePath));
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setImportState({
        phase: "failed",
        message: body?.error === "duplicate_subject" ? t.share.duplicateSubject : t.share.importFailed,
      });
    } catch {
      setImportState({ phase: "failed", message: t.share.importFailed });
    }
  }

  return (
    <main className="share-shell">
      <header className="share-topbar">
        <Link className="share-brand" href="/welcome">
          {t.common.brand}
        </Link>
        {signedIn ? (
          <button type="button" className="share-import" onClick={importCourse} disabled={importState.phase === "importing"}>
            {importState.phase === "importing" ? t.share.importing : t.share.importCta}
          </button>
        ) : (
          <Link className="share-import" href={loginPathWithNext(sharePath)}>
            {t.share.importSignIn}
          </Link>
        )}
      </header>

      <section className="share-hero">
        <p className="share-eyebrow">{t.share.eyebrow}</p>
        <h1>{course.title}</h1>
        {course.summary ? <p className="share-summary">{course.summary}</p> : null}
        <p className="share-meta">
          <span>{msg(t.share.lessonCount, { count: lessons.length })}</span>
          {course.estimatedMinutes > 0 ? <span>{msg(t.share.estimatedMinutes, { minutes: course.estimatedMinutes })}</span> : null}
        </p>
        <p className="share-note">{t.share.previewNote}</p>
        {importState.phase === "failed" ? (
          <p className="share-error" role="alert">
            {importState.message}
          </p>
        ) : null}
      </section>

      <div className="share-layout">
        <nav className="share-lesson-nav" aria-label={t.share.outlineTitle}>
          <h2>{t.share.outlineTitle}</h2>
          <ol>
            {lessons.map((lesson) => (
              <LessonNavItem
                key={lesson.id}
                lesson={lesson}
                active={lesson.id === activeLesson?.id}
                plannedLabel={t.share.plannedLesson}
                onSelect={() => setActiveLessonId(lesson.id)}
              />
            ))}
          </ol>
        </nav>

        <section className="share-lesson-body">
          {activeLesson?.blocks?.length ? (
            <>
              <h2 className="share-lesson-title">{activeLesson.title}</h2>
              {activeLesson.blocks.map((block) => (
                <BlockRenderer key={block.id} block={block} contentLanguage={course.language ?? null} />
              ))}
            </>
          ) : (
            <p className="share-empty">{t.share.emptyLesson}</p>
          )}
        </section>
      </div>
    </main>
  );
}

function LessonNavItem({
  lesson,
  active,
  plannedLabel,
  onSelect,
}: {
  lesson: Lesson;
  active: boolean;
  plannedLabel: string;
  onSelect: () => void;
}) {
  const readable = Array.isArray(lesson.blocks) && lesson.blocks.length > 0;
  return (
    <li>
      <button
        type="button"
        className={`share-lesson-item${active ? " active" : ""}${readable ? "" : " planned"}`}
        onClick={onSelect}
        disabled={!readable}
      >
        <span>{lesson.title}</span>
        {readable ? null : <em>{plannedLabel}</em>}
      </button>
    </li>
  );
}
