"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { msg, useI18n } from "@/lib/i18n/client";
import type { FolderCourseState } from "@/lib/materials/folder-course";

type CreateResponse = { courseId?: string; error?: string };
type SyncResponse = { added?: number; error?: string };

// The subject folder's one course (docs/product/subject-folders.md §4.4):
// build it from the folder KG, continue it, or sync concepts that later
// lectures added.
export function FolderCourseCard({
  folderId,
  ready,
  course,
  onChange,
}: {
  folderId: string;
  ready: boolean;
  course: FolderCourseState | null;
  onChange: () => void;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.folderCourse;
  const router = useRouter();
  const [busy, setBusy] = useState<"build" | "sync" | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  async function build() {
    setBusy("build");
    setNotice(null);
    try {
      const res = await fetch(`/api/folders/${encodeURIComponent(folderId)}/course`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as CreateResponse;
      if (!res.ok || !body.courseId) throw new Error("create failed");
      router.push(`/course/${body.courseId}`);
    } catch {
      setNotice({ tone: "error", text: t.buildFailed });
      setBusy(null);
    }
  }

  async function sync() {
    setBusy("sync");
    setNotice(null);
    try {
      const res = await fetch(`/api/folders/${encodeURIComponent(folderId)}/course/sync`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as SyncResponse;
      if (!res.ok || typeof body.added !== "number") throw new Error("sync failed");
      setNotice({ tone: "info", text: msg(t.synced, { count: body.added }) });
      onChange();
    } catch {
      setNotice({ tone: "error", text: t.syncFailed });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="materials-list-card folder-course" aria-label={t.title}>
      <header className="materials-list-header">
        <span>{course ? course.title : t.title}</span>
        {course ? <span>{msg(t.lessons, { count: course.lessonCount })}</span> : null}
      </header>
      <div className="folder-quiz-body">
        {course ? (
          <>
            <p className="folder-graph-empty">{course.newConceptCount > 0 ? msg(t.newConcepts, { count: course.newConceptCount }) : t.upToDate}</p>
            <div className="folder-quiz-start">
              <Link className="library-create-course" href={`/course/${course.courseId}`}>{t.open}</Link>
              {course.newConceptCount > 0 ? (
                <button type="button" className="materials-delete" disabled={busy !== null} onClick={() => void sync()}>
                  {busy === "sync" ? t.syncing : t.sync}
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <p className="folder-graph-empty">{ready ? t.intro : t.needsGraph}</p>
            <div className="folder-quiz-start">
              <button type="button" className="library-create-course" disabled={!ready || busy !== null} onClick={() => void build()}>
                {busy === "build" ? t.building : t.build}
              </button>
            </div>
          </>
        )}
        {notice ? (
          <p className={notice.tone === "error" ? "folder-quiz-error" : "folder-quiz-note"} role={notice.tone === "error" ? "alert" : "status"}>
            {notice.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}
