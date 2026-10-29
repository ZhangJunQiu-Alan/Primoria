"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { CourseSummary } from "@/lib/courses/types";
import type { LessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import {
  PENDING_COURSE_BUILDS_EVENT,
  readPendingCourseBuilds,
  removePendingCourseBuild,
  type PendingCourseBuild,
} from "@/lib/courses/course-build-session";
import { isLessonGenerationActive, lessonGenerationStageLabel } from "@/lib/courses/lesson-generation-labels";
import { msg, useI18n } from "@/lib/i18n/client";
import type { I18nDictionary } from "@/lib/i18n/dictionaries";
import { ArrowIcon } from "@/components/arrow-icon";
import { CourseCover } from "./course-cover";

type LibraryEntry =
  | { kind: "course"; id: string; updatedAt: number; course: CourseSummary }
  | { kind: "job"; id: string; updatedAt: number; job: LessonGenerationJobSummary }
  | { kind: "pending"; id: string; updatedAt: number; build: PendingCourseBuild };

type ViewMode = "cards" | "list";
type CourseStatus = "no_lessons" | "not_started" | "in_progress" | "reviewing" | "done";
type LibraryTab = "all" | "active" | "todo" | "done";
type SortKey = "progress" | "lessons" | "updated";
type SortDirection = "asc" | "desc";
type Tone = "idle" | "active" | "reviewing" | "done" | "planned" | "working" | "danger";

const TABS: LibraryTab[] = ["all", "active", "todo", "done"];
const SORT_KEYS: SortKey[] = ["updated", "progress", "lessons"];
// Reviewing is a kind of in progress; an empty outline is still a course to start.
const TAB_OF_STATUS: Record<CourseStatus, Exclude<LibraryTab, "all">> = {
  in_progress: "active",
  reviewing: "active",
  not_started: "todo",
  no_lessons: "todo",
  done: "done",
};

const PAGE_SIZE = 12;
const INITIAL_REFRESH_WINDOW_MS = 45_000;
const MAX_PROGRESS_SEGMENTS = 16;
const DAY_MS = 86_400_000;

export function CourseLibraryGrid({
  initialCourses,
  initialLessonJobs = [],
  onboardingIncomplete = false,
}: {
  initialCourses: CourseSummary[];
  initialLessonJobs?: LessonGenerationJobSummary[];
  onboardingIncomplete?: boolean;
}) {
  const { dictionary: t, language } = useI18n();
  const [courses, setCourses] = useState(initialCourses);
  const [lessonJobs, setLessonJobs] = useState(initialLessonJobs);
  const [pendingBuilds, setPendingBuilds] = useState<PendingCourseBuild[]>([]);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [tab, setTab] = useState<LibraryTab>("all");
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: "updated", direction: "desc" });
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [initialRefreshOpen, setInitialRefreshOpen] = useState(() => initialLessonJobs.some(isLessonGenerationActive));
  const [openCourseMenuId, setOpenCourseMenuId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<CourseSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseSummary | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const searchRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);
  const shouldPoll = initialRefreshOpen
    || lessonJobs.some(isLessonGenerationActive)
    || pendingBuilds.some((build) => build.status === "building" || build.status === "ready");

  // Map each course to its outstanding lesson job (first/lazy generation), preferring
  // an active job over a failed one (engineering doc §13.5).
  const lessonJobByCourse = useMemo(() => {
    const map = new Map<string, LessonGenerationJobSummary>();
    for (const job of lessonJobs) {
      const existing = map.get(job.courseId);
      if (!existing || (isLessonGenerationActive(job) && !isLessonGenerationActive(existing))) map.set(job.courseId, job);
    }
    return map;
  }, [lessonJobs]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setInitialRefreshOpen(false), INITIAL_REFRESH_WINDOW_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    function refreshPendingBuilds() {
      setPendingBuilds(readPendingCourseBuilds());
    }
    refreshPendingBuilds();
    window.addEventListener(PENDING_COURSE_BUILDS_EVENT, refreshPendingBuilds);
    return () => window.removeEventListener(PENDING_COURSE_BUILDS_EVENT, refreshPendingBuilds);
  }, []);

  useEffect(() => {
    const courseIds = new Set(courses.map((course) => course.id));
    const syncedBuilds = pendingBuilds.filter((build) => build.courseId && courseIds.has(build.courseId));
    if (syncedBuilds.length === 0) return;
    for (const build of syncedBuilds) removePendingCourseBuild(build.id);
  }, [courses, pendingBuilds]);

  useEffect(() => {
    if (!openCourseMenuId && !sortMenuOpen) return;
    function closeMenus(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".library-menu-anchor")) return;
      setOpenCourseMenuId(null);
      setSortMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenCourseMenuId(null);
      setSortMenuOpen(false);
    }
    document.addEventListener("click", closeMenus);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeMenus);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openCourseMenuId, sortMenuOpen]);

  // "/" jumps to search, as on most catalogue pages.
  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (!searchRef.current) return;
      event.preventDefault();
      searchRef.current.focus();
    }
    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    if (!shouldPoll) return;
    let cancelled = false;

    async function refresh() {
      try {
        const [coursesResponse, lessonJobsResponse] = await Promise.all([
          fetch("/api/courses", { cache: "no-store" }),
          fetch("/api/lesson-generation-jobs", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (coursesResponse.ok) {
          const data = (await coursesResponse.json()) as { courses?: CourseSummary[] };
          setCourses(Array.isArray(data.courses) ? data.courses : []);
        }
        if (lessonJobsResponse.ok) {
          const data = (await lessonJobsResponse.json()) as { jobs?: LessonGenerationJobSummary[] };
          setLessonJobs(Array.isArray(data.jobs) ? data.jobs : []);
        }
      } catch {
        // Keep the current library view; the next interval can recover.
      }
    }

    const interval = window.setInterval(() => {
      void refresh();
    }, 2_500);
    void refresh();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [shouldPoll]);

  const entries = useMemo(
    () => {
      const courseIds = new Set(courses.map((course) => course.id));
      return [
        ...courses.map((course): LibraryEntry => ({ kind: "course", id: course.id, updatedAt: course.updatedAt, course })),
        ...lessonJobs
          .filter((job) => !courseIds.has(job.courseId))
          .map((job): LibraryEntry => ({ kind: "job", id: job.id, updatedAt: job.updatedAt, job })),
        ...pendingBuilds
          .filter((build) => !build.courseId || !courseIds.has(build.courseId))
          .map((build): LibraryEntry => ({ kind: "pending", id: build.id, updatedAt: build.updatedAt, build })),
      ].sort((a, b) => b.updatedAt - a.updatedAt);
    },
    [courses, lessonJobs, pendingBuilds],
  );

  const tabCounts = useMemo(() => {
    const counts: Record<LibraryTab, number> = { all: entries.length, active: 0, todo: 0, done: 0 };
    for (const entry of entries) counts[TAB_OF_STATUS[entryStatus(entry)]] += 1;
    return counts;
  }, [entries]);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    const queryFiltered = normalizedQuery
      ? entries.filter((entry) => searchableText(entry).includes(normalizedQuery))
      : entries;
    const tabFiltered = tab === "all"
      ? queryFiltered
      : queryFiltered.filter((entry) => TAB_OF_STATUS[entryStatus(entry)] === tab);
    return sortEntries(tabFiltered, sort);
  }, [entries, normalizedQuery, sort, tab]);

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleEntries = filteredEntries.slice(pageStart, pageStart + PAGE_SIZE);

  function selectTab(value: LibraryTab) {
    setTab(value);
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setTab("all");
    setPage(1);
  }

  function chooseSort(key: SortKey) {
    setSort({ key, direction: "desc" });
    setSortMenuOpen(false);
    setPage(1);
  }

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
    setPage(1);
  }

  function requestDeleteCourse(course: CourseSummary) {
    setOpenCourseMenuId(null);
    setDeleteError(null);
    setDeleteTarget(course);
  }

  function requestShareCourse(course: CourseSummary) {
    setOpenCourseMenuId(null);
    setShareTarget(course);
  }

  async function confirmDeleteCourse() {
    if (!deleteTarget) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/courses/${deleteTarget.id}`, { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t.library.removeCourseCopy);
      setCourses((current) => current.filter((course) => course.id !== deleteTarget.id));
      setLessonJobs((current) => current.filter((job) => job.courseId !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : t.library.removeCourseCopy);
    } finally {
      setDeletePending(false);
    }
  }

  const menuProps = {
    openCourseMenuId,
    onCourseMenuOpenChange: (courseId: string | null) => {
      setSortMenuOpen(false);
      setOpenCourseMenuId(courseId);
    },
    onShareCourse: requestShareCourse,
    onDeleteCourse: requestDeleteCourse,
  };

  if (entries.length === 0) {
    // Onboarding-incomplete users land at the onboarding flow on "/", so point
    // them there explicitly instead of promising a course creator.
    return (
      <div className="library-shelf">
        <LibraryHeader courses={[]} t={t} />
        <section className="library-shelf-empty">
          <figure>
            <Image src="/library/empty-shelf.svg" alt="" fill sizes="(max-width: 900px) 100vw, 420px" unoptimized />
          </figure>
          <div>
            <h2>
              {initialRefreshOpen
                ? t.library.checkingBuilds
                : onboardingIncomplete
                  ? t.library.finishOnboardingTitle
                  : t.library.emptyTitle}
            </h2>
            {initialRefreshOpen ? null : (
              <p>{onboardingIncomplete ? t.library.finishOnboardingCopy : t.library.emptyBody}</p>
            )}
            <div className="library-actions">
              <Link href="/" className="library-button primary">
                {onboardingIncomplete ? t.library.finishOnboardingCta : t.library.emptyCta}
                <ArrowIcon size={15} />
              </Link>
              {onboardingIncomplete ? null : (
                <Link href="/materials" className="library-button">
                  <UploadIcon />
                  {t.library.buildFromMaterials}
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="library-shelf">
      <LibraryHeader courses={courses} t={t} />

      <section className="library-course-browser" aria-label={t.library.courseLibrary}>
        <div className="library-toolbar">
          <div className="library-tabs" role="group" aria-label={t.library.filterCoursesByStatus}>
            {TABS.map((value) => (
              <button
                key={value}
                type="button"
                className="library-tab"
                aria-pressed={tab === value}
                onClick={() => selectTab(value)}
              >
                {t.library.tabs[value]}
                <small>{tabCounts[value]}</small>
              </button>
            ))}
          </div>

          <div className="library-tools">
            <label className="library-search">
              <SearchIcon />
              <span className="sr-only">{t.library.search}</span>
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={t.library.search}
                type="search"
              />
              <kbd aria-hidden="true">/</kbd>
            </label>

            <div className="library-menu-anchor">
              <button
                type="button"
                className="library-sort-trigger"
                aria-haspopup="menu"
                aria-expanded={sortMenuOpen}
                aria-label={`${t.library.sortBy}: ${t.library.sorts[sort.key]}`}
                onClick={() => {
                  setOpenCourseMenuId(null);
                  setSortMenuOpen((open) => !open);
                }}
              >
                <SortIcon />
                <span>{t.library.sorts[sort.key]}</span>
                <ChevronDownIcon />
              </button>
              {sortMenuOpen ? (
                <div className="library-menu" role="menu">
                  {SORT_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={sort.key === key}
                      onClick={() => chooseSort(key)}
                    >
                      {t.library.sorts[key]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="library-view-toggle" role="group" aria-label={t.library.courseView}>
              <button
                type="button"
                aria-pressed={viewMode === "cards"}
                aria-label={t.library.viewCards}
                title={t.library.viewCards}
                onClick={() => setViewMode("cards")}
              >
                <GridIcon />
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "list"}
                aria-label={t.library.viewList}
                title={t.library.viewList}
                onClick={() => setViewMode("list")}
              >
                <ListIcon />
              </button>
            </div>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="library-no-match">
            <SearchIcon size={26} />
            <strong>
              {deferredQuery.trim()
                ? msg(t.library.noCoursesMatchQuery, { query: deferredQuery.trim() })
                : t.library.noCoursesInView}
            </strong>
            <p>{t.library.noCoursesMatchBody}</p>
            <button type="button" onClick={clearFilters}>
              {t.library.clearFilters}
            </button>
          </div>
        ) : viewMode === "cards" ? (
          <ul className="library-card-list">
            {visibleEntries.map((entry) => (
              <li key={`${entry.kind}-${entry.id}`}>
                {entry.kind === "course" ? (
                  <CourseCard course={entry.course} lessonJob={lessonJobByCourse.get(entry.id)} now={now} language={language} t={t} {...menuProps} />
                ) : entry.kind === "job" ? (
                  <JobCard job={entry.job} now={now} language={language} t={t} />
                ) : (
                  <PendingBuildCard build={entry.build} t={t} />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="library-list" role="table" aria-label={t.library.courseLibrary}>
            <div className="library-list-head" role="row">
              <span role="columnheader">{t.library.name}</span>
              <span role="columnheader">{t.library.status}</span>
              <span role="columnheader" aria-sort={ariaSort(sort, "progress")}>
                <SortHeaderButton label={t.library.progress} sortKey="progress" activeSort={sort} onSort={toggleSort} />
              </span>
              <span role="columnheader" className="library-list-next">{t.library.currentLesson}</span>
              <span role="columnheader" aria-sort={ariaSort(sort, "updated")}>
                <SortHeaderButton label={t.library.updated} sortKey="updated" activeSort={sort} onSort={toggleSort} />
              </span>
              <span role="columnheader" className="sr-only">{t.library.actions}</span>
            </div>
            {visibleEntries.map((entry, index) =>
              entry.kind === "course" ? (
                <CourseRow
                  key={`course-${entry.id}`}
                  course={entry.course}
                  lessonJob={lessonJobByCourse.get(entry.id)}
                  menuPlacement={index >= visibleEntries.length - 2 && index > 1 ? "up" : "down"}
                  now={now}
                  language={language}
                  t={t}
                  {...menuProps}
                />
              ) : entry.kind === "job" ? (
                <JobRow key={`job-${entry.id}`} job={entry.job} now={now} language={language} t={t} />
              ) : (
                <PendingBuildRow key={`pending-${entry.id}`} build={entry.build} t={t} />
              ),
            )}
          </div>
        )}

        {filteredEntries.length > 0 ? (
          <footer className="library-pager">
            <span>
              {msg(t.library.pageRange, {
                from: pageStart + 1,
                to: pageStart + visibleEntries.length,
                total: filteredEntries.length,
              })}
            </span>
            {pageCount > 1 ? (
              <div>
                <button
                  type="button"
                  aria-label={t.library.previousPage}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  aria-label={t.library.nextPage}
                  onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                  disabled={currentPage >= pageCount}
                >
                  <ChevronRightIcon />
                </button>
              </div>
            ) : null}
          </footer>
        ) : null}
      </section>

      {shareTarget ? (
        <ShareCourseDialog
          course={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      ) : null}
      {deleteTarget ? (
        <DeleteCourseDialog
          course={deleteTarget}
          pending={deletePending}
          error={deleteError}
          onCancel={() => {
            if (deletePending) return;
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          onConfirm={confirmDeleteCourse}
        />
      ) : null}
    </div>
  );
}

function LibraryHeader({ courses, t }: { courses: CourseSummary[]; t: I18nDictionary }) {
  const active = courses.filter((course) => TAB_OF_STATUS[courseStatus(course)] === "active").length;
  const finished = courses.filter((course) => courseStatus(course) === "done").length;
  const lessonsDone = courses.reduce((sum, course) => sum + course.completedLessonCount, 0);
  const lessonsTotal = courses.reduce((sum, course) => sum + course.lessonCount, 0);
  return (
    <header className="library-head">
      <div>
        <span className="library-kicker">{t.library.pageTitle}</span>
        <h1>{t.library.heading}</h1>
        {courses.length > 0 ? (
          <p className="library-stats">
            <span style={{ "--library-dot": "var(--amber)" } as CSSProperties}>{msg(t.library.statsActive, { count: active })}</span>
            <span style={{ "--library-dot": "var(--pine)" } as CSSProperties}>{msg(t.library.statsDone, { count: finished })}</span>
            <span style={{ "--library-dot": "var(--line-strong)" } as CSSProperties}>
              {msg(t.library.statsLessons, { done: lessonsDone, total: lessonsTotal })}
            </span>
          </p>
        ) : null}
      </div>
      {courses.length > 0 ? (
        <div className="library-actions">
          <Link href="/materials" className="library-button">
            <UploadIcon />
            {t.library.buildFromMaterials}
          </Link>
          <Link href="/" className="library-button primary">
            <PlusIcon />
            {t.library.createCourse}
          </Link>
        </div>
      ) : null}
    </header>
  );
}

type MenuProps = {
  openCourseMenuId: string | null;
  onCourseMenuOpenChange: (courseId: string | null) => void;
  onShareCourse: (course: CourseSummary) => void;
  onDeleteCourse: (course: CourseSummary) => void;
};

type CourseView = {
  tone: Tone;
  label: string;
  note: ReactNode;
  noteTone?: "quiet" | "danger";
  action: string;
  building: boolean;
  failed: boolean;
};

function describeCourse(course: CourseSummary, lessonJob: LessonGenerationJobSummary | undefined, t: I18nDictionary): CourseView {
  const status = courseStatus(course);
  if (lessonJob && isLessonGenerationActive(lessonJob)) {
    return { tone: "working", label: t.library.writingLesson, note: lessonGenerationStageLabel(lessonJob), noteTone: "quiet", action: course.completedLessonCount > 0 ? t.common.continue : t.common.open, building: true, failed: false };
  }
  if (lessonJob?.status === "failed") {
    return { tone: "danger", label: t.library.lessonFailed, note: lessonJob.lastError ?? t.library.generationFailed, noteTone: "danger", action: t.common.open, building: false, failed: true };
  }
  const tone: Tone = status === "in_progress" ? "active" : status === "not_started" ? "idle" : status === "no_lessons" ? "planned" : status;
  const label = t.library.statusLabels[status];
  if (status === "done") return { tone, label, note: t.library.finishedNote, noteTone: "quiet", action: t.library.reviewCourse, building: false, failed: false };
  if (status === "no_lessons") return { tone, label, note: t.library.noLessonPlanned, noteTone: "quiet", action: t.common.open, building: false, failed: false };
  const next = course.currentLesson?.title;
  const note = next ? (
    <>
      <em>{status === "not_started" ? t.library.startWith : t.library.upNext}</em>
      <span>{next}</span>
    </>
  ) : t.library.noLessonPlanned;
  return { tone, label, note, action: status === "not_started" ? t.library.startCourse : t.common.continue, building: false, failed: false };
}

function CourseCard({
  course,
  lessonJob,
  now,
  language,
  t,
  openCourseMenuId,
  onCourseMenuOpenChange,
  onShareCourse,
  onDeleteCourse,
}: { course: CourseSummary; lessonJob?: LessonGenerationJobSummary; now: number; language: string; t: I18nDictionary } & MenuProps) {
  const view = describeCourse(course, lessonJob, t);
  const kicker = course.fromMaterials ? t.library.fromMaterials : course.topic && course.topic !== course.title ? course.topic : null;
  const meta = [kicker, course.lessonCount > 0 ? msg(t.outline.lessonsCount, { count: course.lessonCount }) : null].filter(Boolean).join(" · ");
  const jobActive = view.building && lessonJob;
  return (
    <article className={`library-card${view.building ? " library-card-generating" : view.failed ? " library-card-failed" : ""}`}>
      <div className="library-card-cover">
        <CourseCover title={course.title} topic={course.topic} fromMaterials={course.fromMaterials} coverUrl={course.coverUrl} sizes="(max-width: 900px) 100vw, 360px" />
        <StatusChip tone={view.tone}>{view.label}</StatusChip>
      </div>
      <div className="library-card-body">
        {meta ? <span className="library-card-meta">{meta}</span> : null}
        <Link href={`/course/${course.id}/outline`} className="library-card-title">{course.title}</Link>
        <ProgressMeter
          completed={jobActive ? lessonJob.progressCompleted : course.completedLessonCount}
          total={jobActive ? Math.max(lessonJob.progressTotal, 1) : course.lessonCount}
          current={view.tone === "active" || view.tone === "reviewing" ? course.completedLessonCount : null}
        />
        <p className={`library-card-note${view.noteTone ? ` ${view.noteTone}` : ""}`}>{view.note}</p>
      </div>
      <div className="library-card-foot">
        <time suppressHydrationWarning dateTime={new Date(course.updatedAt).toISOString()}>{msg(t.library.updatedAt, { when: relativeDay(course.updatedAt, now, language, t) })}</time>
        <span className="library-card-go">
          {view.action}
          <ArrowIcon size={14} />
        </span>
        <CourseMenu course={course} placement="up" t={t} open={openCourseMenuId === course.id} onOpenChange={onCourseMenuOpenChange} onShare={onShareCourse} onDelete={onDeleteCourse} />
      </div>
    </article>
  );
}

function JobCard({ job, now, language, t }: { job: LessonGenerationJobSummary; now: number; language: string; t: I18nDictionary }) {
  const jobActive = isLessonGenerationActive(job);
  const jobFailed = job.status === "failed";
  return (
    <article className={`library-card${jobFailed ? " library-card-failed" : " library-card-generating"}`}>
      <div className="library-card-cover">
        <CourseCover title={t.library.buildingCourse} />
        <StatusChip tone={jobFailed ? "danger" : "working"}>{jobFailed ? t.library.lessonFailed : t.library.buildingCourse}</StatusChip>
      </div>
      <div className="library-card-body">
        <span className="library-card-meta">{t.library.firstLesson}</span>
        <Link href={`/course/${job.courseId}/outline`} className="library-card-title">{t.library.buildingCourse}</Link>
        {jobActive ? <ProgressMeter completed={job.progressCompleted} total={Math.max(job.progressTotal, 1)} /> : <span className="library-progress" />}
        <p className={`library-card-note ${jobFailed ? "danger" : "quiet"}`}>
          {jobFailed ? job.lastError ?? t.library.generationFailed : jobActive ? lessonGenerationStageLabel(job) : t.library.syncing}
        </p>
      </div>
      <div className="library-card-foot">
        <time suppressHydrationWarning dateTime={new Date(job.updatedAt).toISOString()}>{msg(t.library.updatedAt, { when: relativeDay(job.updatedAt, now, language, t) })}</time>
        <span className="library-card-go">
          {t.common.open}
          <ArrowIcon size={14} />
        </span>
      </div>
    </article>
  );
}

function pendingBuildCopy(build: PendingCourseBuild, t: I18nDictionary) {
  if (build.status === "building") {
    return { status: t.library.preparingCourse, detail: t.library.preparingCourseCopy, failed: false };
  }
  if (build.status === "ready") {
    return { status: t.library.courseBuildReady, detail: t.library.buildingCourseCopy, failed: false };
  }
  const timedOut = build.errorCode === "positioning_timeout" || build.errorCode === "course_build_timeout";
  return {
    status: t.library.courseBuildFailed,
    detail: timedOut ? t.library.courseBuildTimedOut : t.library.courseBuildFailedCopy,
    failed: true,
  };
}

function PendingBuildCard({ build, t }: { build: PendingCourseBuild; t: I18nDictionary }) {
  const copy = pendingBuildCopy(build, t);
  const title = build.title || build.topic;
  const href = build.courseId ? `/course/${encodeURIComponent(build.courseId)}/outline` : "/";
  return (
    <article className={`library-card ${copy.failed ? "library-card-failed" : "library-card-generating"}`}>
      <div className="library-card-cover">
        <CourseCover title={title} topic={build.topic} />
        <StatusChip tone={copy.failed ? "danger" : "working"}>{copy.status}</StatusChip>
      </div>
      <div className="library-card-body">
        {build.topic && build.topic !== title ? <span className="library-card-meta">{build.topic}</span> : null}
        <Link href={href} className="library-card-title">{title}</Link>
        {copy.failed ? <span className="library-progress" /> : <IndeterminateMeter />}
        <p className={`library-card-note ${copy.failed ? "danger" : "quiet"}`}>{copy.detail}</p>
      </div>
      <div className="library-card-foot">
        <time>{t.library.startedJustNow}</time>
        <span className="library-card-go">
          {build.courseId ? t.common.open : t.library.returnTutor}
          <ArrowIcon size={14} />
        </span>
      </div>
    </article>
  );
}

function CourseRow({
  course,
  lessonJob,
  menuPlacement,
  now,
  language,
  t,
  openCourseMenuId,
  onCourseMenuOpenChange,
  onShareCourse,
  onDeleteCourse,
}: {
  course: CourseSummary;
  lessonJob?: LessonGenerationJobSummary;
  menuPlacement: "up" | "down";
  now: number;
  language: string;
  t: I18nDictionary;
} & MenuProps) {
  const view = describeCourse(course, lessonJob, t);
  const jobActive = view.building && lessonJob;
  return (
    <div className={`library-row${view.building ? " library-row-generating" : view.failed ? " library-row-failed" : ""}`} role="row">
      <div className="library-row-name" role="cell">
        <span className="library-row-thumb">
          <CourseCover title={course.title} topic={course.topic} fromMaterials={course.fromMaterials} coverUrl={course.coverUrl} sizes="64px" />
        </span>
        <span>
          {course.fromMaterials || (course.topic && course.topic !== course.title) ? (
            <span className="library-card-meta">{course.fromMaterials ? t.library.fromMaterials : course.topic}</span>
          ) : null}
          <Link href={`/course/${course.id}/outline`}>{course.title}</Link>
        </span>
      </div>
      <span role="cell"><StatusLabel tone={view.tone}>{view.label}</StatusLabel></span>
      <span role="cell">
        <ProgressMeter
          completed={jobActive ? lessonJob.progressCompleted : course.completedLessonCount}
          total={jobActive ? Math.max(lessonJob.progressTotal, 1) : course.lessonCount}
          current={view.tone === "active" || view.tone === "reviewing" ? course.completedLessonCount : null}
        />
      </span>
      <span role="cell" className={`library-row-note library-list-next${view.noteTone ? ` ${view.noteTone}` : ""}`}>{view.note}</span>
      <time role="cell" suppressHydrationWarning dateTime={new Date(course.updatedAt).toISOString()}>{relativeDay(course.updatedAt, now, language, t)}</time>
      <div className="library-row-actions" role="cell">
        <Link href={`/course/${course.id}/outline`} className="library-row-action">{view.action}</Link>
        <CourseMenu course={course} placement={menuPlacement} t={t} open={openCourseMenuId === course.id} onOpenChange={onCourseMenuOpenChange} onShare={onShareCourse} onDelete={onDeleteCourse} />
      </div>
    </div>
  );
}

function JobRow({ job, now, language, t }: { job: LessonGenerationJobSummary; now: number; language: string; t: I18nDictionary }) {
  const jobActive = isLessonGenerationActive(job);
  const jobFailed = job.status === "failed";
  return (
    <div className={`library-row${jobFailed ? " library-row-failed" : " library-row-generating"}`} role="row">
      <div className="library-row-name" role="cell">
        <span className="library-row-thumb"><CourseCover title={t.library.buildingCourse} /></span>
        <span><Link href={`/course/${job.courseId}/outline`}>{t.library.buildingCourse}</Link></span>
      </div>
      <span role="cell"><StatusLabel tone={jobFailed ? "danger" : "working"}>{jobFailed ? t.library.lessonFailed : t.library.buildingCourse}</StatusLabel></span>
      <span role="cell">{jobActive ? <ProgressMeter completed={job.progressCompleted} total={Math.max(job.progressTotal, 1)} /> : null}</span>
      <span role="cell" className={`library-row-note library-list-next ${jobFailed ? "danger" : "quiet"}`}>
        {jobFailed ? job.lastError ?? t.library.generationFailed : jobActive ? lessonGenerationStageLabel(job) : t.library.syncing}
      </span>
      <time role="cell" suppressHydrationWarning dateTime={new Date(job.updatedAt).toISOString()}>{relativeDay(job.updatedAt, now, language, t)}</time>
      <div className="library-row-actions" role="cell">
        <Link href={`/course/${job.courseId}/outline`} className="library-row-action">{t.common.open}</Link>
      </div>
    </div>
  );
}

function PendingBuildRow({ build, t }: { build: PendingCourseBuild; t: I18nDictionary }) {
  const copy = pendingBuildCopy(build, t);
  const title = build.title || build.topic;
  const href = build.courseId ? `/course/${encodeURIComponent(build.courseId)}/outline` : "/";
  return (
    <div className={`library-row ${copy.failed ? "library-row-failed" : "library-row-generating"}`} role="row">
      <div className="library-row-name" role="cell">
        <span className="library-row-thumb"><CourseCover title={title} topic={build.topic} /></span>
        <span><Link href={href}>{title}</Link></span>
      </div>
      <span role="cell"><StatusLabel tone={copy.failed ? "danger" : "working"}>{copy.status}</StatusLabel></span>
      <span role="cell">{copy.failed ? null : <IndeterminateMeter />}</span>
      <span role="cell" className={`library-row-note library-list-next ${copy.failed ? "danger" : "quiet"}`}>{copy.detail}</span>
      <time role="cell">{t.library.startedJustNow}</time>
      <div className="library-row-actions" role="cell">
        <Link href={href} className="library-row-action">{build.courseId ? t.common.open : t.library.returnTutor}</Link>
      </div>
    </div>
  );
}

function CourseMenu({
  course,
  placement,
  open,
  onOpenChange,
  onShare,
  onDelete,
  t,
}: {
  course: CourseSummary;
  placement: "up" | "down";
  open: boolean;
  onOpenChange: (courseId: string | null) => void;
  onShare: (course: CourseSummary) => void;
  onDelete: (course: CourseSummary) => void;
  t: I18nDictionary;
}) {
  return (
    <div className="library-menu-anchor library-more">
      <button
        type="button"
        className="library-more-trigger"
        aria-label={msg(t.library.moreActions, { title: course.title })}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(open ? null : course.id);
        }}
      >
        <MoreIcon />
      </button>
      {open ? (
        <div className={`library-menu${placement === "up" ? " drop-up" : ""}`} role="menu" aria-label={msg(t.library.moreActions, { title: course.title })}>
          <Link href={`/course/${course.id}`} role="menuitem">
            <LessonIcon />
            {t.library.openCurrentLesson}
          </Link>
          {course.fromMaterials ? null : (
            <button type="button" role="menuitem" onClick={() => onShare(course)}>
              <ShareIcon />
              {t.library.shareCourse}
            </button>
          )}
          <hr />
          <button type="button" className="danger" role="menuitem" onClick={() => onDelete(course)}>
            <TrashIcon />
            {t.library.removeCourse}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SortHeaderButton({
  label,
  sortKey,
  activeSort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeSort: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
}) {
  const active = activeSort.key === sortKey;
  return (
    <button
      type="button"
      className="library-sort-header"
      data-active={active || undefined}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active ? <ChevronDownIcon size={12} up={activeSort.direction === "asc"} /> : <SortIcon size={12} />}
    </button>
  );
}

function ariaSort(sort: { key: SortKey; direction: SortDirection }, key: SortKey) {
  if (sort.key !== key) return undefined;
  return sort.direction === "asc" ? "ascending" : "descending";
}

type ShareDialogState =
  | { phase: "loading" }
  | { phase: "off" }
  | { phase: "active"; sharePath: string }
  | { phase: "error"; message: string };

function ShareCourseDialog({
  course,
  onClose,
}: {
  course: CourseSummary;
  onClose: () => void;
}) {
  const { dictionary: t } = useI18n();
  const [state, setState] = useState<ShareDialogState>({ phase: "loading" });
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/courses/${course.id}/share`);
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { share: { sharePath: string } | null };
        if (cancelled) return;
        setState(body.share ? { phase: "active", sharePath: body.share.sharePath } : { phase: "off" });
      } catch {
        if (!cancelled) setState({ phase: "error", message: t.library.shareLoadFailed });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [course.id, t.library.shareLoadFailed]);

  const shareUrl = state.phase === "active" && typeof window !== "undefined" ? `${window.location.origin}${state.sharePath}` : "";

  async function mutateShare(method: "POST" | "DELETE") {
    if (busy) return;
    setBusy(true);
    setCopyState("idle");
    try {
      const res = await fetch(`/api/courses/${course.id}/share`, { method });
      if (!res.ok) throw new Error(String(res.status));
      if (method === "DELETE") {
        setState({ phase: "off" });
      } else {
        const body = (await res.json()) as { share: { sharePath: string } };
        setState({ phase: "active", sharePath: body.share.sharePath });
      }
    } catch {
      setState({ phase: "error", message: t.library.shareActionFailed });
    } finally {
      setBusy(false);
    }
  }

  async function copyShareLink() {
    try {
      await copyTextToClipboard(shareUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div
      className="library-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="library-dialog" role="dialog" aria-modal="true" aria-labelledby="share-course-title">
        <button type="button" className="library-dialog-close" onClick={onClose} aria-label={t.library.closeShare}>
          <CloseIcon />
        </button>
        <div className="library-dialog-cover">
          <CourseCover title={course.title} topic={course.topic} fromMaterials={course.fromMaterials} coverUrl={course.coverUrl} sizes="460px" />
        </div>
        <div className="library-dialog-body">
          <span className="library-kicker">{t.library.shareCourse}</span>
          <h2 id="share-course-title">{course.title}</h2>
          {state.phase === "loading" ? <p aria-busy="true">…</p> : null}
          {state.phase === "error" ? <p role="alert" className="library-dialog-error">{state.message}</p> : null}
          {state.phase === "off" ? (
            <>
              <p>{msg(t.library.shareOffCopy, { title: course.title })}</p>
              <div className="library-dialog-actions">
                <button type="button" className="library-button primary" disabled={busy} onClick={() => mutateShare("POST")}>
                  <ShareIcon />
                  {t.library.shareCreate}
                </button>
              </div>
            </>
          ) : null}
          {state.phase === "active" ? (
            <>
              <p>{msg(t.library.shareCopy, { title: course.title })}</p>
              <div className="library-share-link">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  aria-label={t.library.shareLink}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button type="button" className="library-button" onClick={copyShareLink}>
                  <CopyIcon />
                  {copyState === "copied" ? t.library.copied : copyState === "failed" ? t.library.copyFailed : t.library.copy}
                </button>
              </div>
              <span className="library-share-live">{t.library.shareLive}</span>
              <div className="library-dialog-actions">
                <button type="button" className="library-button plain danger" disabled={busy} onClick={() => mutateShare("DELETE")}>
                  {t.library.shareRevoke}
                </button>
                <button type="button" className="library-button" disabled={busy} onClick={() => mutateShare("POST")}>
                  {t.library.shareUpdate}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DeleteCourseDialog({
  course,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  course: CourseSummary;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { dictionary: t } = useI18n();
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onCancel]);
  return (
    <div className="library-dialog-backdrop" role="presentation">
      <div className="library-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-course-title">
        <div className="library-dialog-body">
          <span className="library-kicker">{t.library.removeCourse}</span>
          <h2 id="delete-course-title">{msg(t.library.deleteCourseTitle, { title: course.title })}</h2>
          <p>{t.library.removeCourseCopy}</p>
          {error ? <p role="alert" className="library-dialog-error">{error}</p> : null}
          <div className="library-dialog-actions">
            <button type="button" className="library-button plain" onClick={onCancel} disabled={pending}>
              {t.common.cancel}
            </button>
            <button type="button" className="library-button danger-fill" onClick={onConfirm} disabled={pending}>
              <TrashIcon />
              {pending ? t.library.deleting : t.library.deletePermanently}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`library-chip library-status-${tone}`}><i aria-hidden="true" />{children}</span>;
}

function StatusLabel({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`library-status library-status-${tone}`}><i aria-hidden="true" />{children}</span>;
}

/** Lessons as segments (done, the current one, the rest); long courses as one bar. */
function ProgressMeter({ completed, total, current = null }: { completed: number; total: number; current?: number | null }) {
  const width = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return (
    <div className="library-progress">
      {total > 0 && total <= MAX_PROGRESS_SEGMENTS ? (
        <div className="library-progress-segments" style={{ "--library-segments": total } as CSSProperties} aria-hidden="true">
          {Array.from({ length: total }, (_, index) => (
            <i key={index} className={index < completed ? "done" : index === current ? "now" : undefined} />
          ))}
        </div>
      ) : (
        <div className="library-progress-bar" aria-hidden="true">
          <i style={{ width: `${width}%` }} />
        </div>
      )}
      <span>{completed}/{total}</span>
    </div>
  );
}

function IndeterminateMeter() {
  return (
    <div className="library-progress">
      <div className="library-progress-bar working" aria-hidden="true"><i /></div>
    </div>
  );
}

function courseStatus(course: CourseSummary): CourseStatus {
  if (course.lessonCount === 0) return "no_lessons";
  if (course.completedLessonCount >= course.lessonCount) return "done";
  if (course.lessons.some((lesson) => lesson.role === "review")) return "reviewing";
  if (course.lessons.some((lesson) => lesson.progress === "in_progress") || course.completedLessonCount > 0) return "in_progress";
  return "not_started";
}

function entryStatus(entry: LibraryEntry): CourseStatus {
  if (entry.kind === "job") return isLessonGenerationActive(entry.job) ? "in_progress" : "no_lessons";
  if (entry.kind === "pending") return entry.build.status === "failed" ? "no_lessons" : "in_progress";
  return courseStatus(entry.course);
}

function searchableText(entry: LibraryEntry) {
  if (entry.kind === "job") {
    return `building course ${entry.job.courseId} ${entry.job.lessonId} ${entry.job.id} ${entry.job.stage} ${entry.job.status}`.toLowerCase();
  }
  if (entry.kind === "pending") {
    return `${entry.build.topic} ${entry.build.title ?? ""} ${entry.build.status}`.toLowerCase();
  }
  const lessonTitles = entry.course.lessons.map((lesson) => lesson.title).join(" ");
  return `${entry.course.title} ${entry.course.topic} ${entry.course.summary} ${entry.course.id} ${lessonTitles}`.toLowerCase();
}

function sortEntries(entries: LibraryEntry[], sort: { key: SortKey; direction: SortDirection }) {
  const direction = sort.direction === "asc" ? 1 : -1;
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const diff = sortValue(a.entry, sort.key) - sortValue(b.entry, sort.key);
      if (diff !== 0) return diff * direction;
      const updatedDiff = b.entry.updatedAt - a.entry.updatedAt;
      if (updatedDiff !== 0) return updatedDiff;
      return a.index - b.index;
    })
    .map(({ entry }) => entry);
}

function sortValue(entry: LibraryEntry, key: SortKey) {
  if (key === "updated") return entry.updatedAt;
  if (entry.kind === "job") {
    if (key === "lessons") return 1;
    return Math.min(1, entry.job.progressCompleted / Math.max(entry.job.progressTotal, 1));
  }
  if (entry.kind === "pending") {
    if (key === "lessons") return 0;
    return entry.build.status === "ready" ? 1 : 0;
  }
  if (key === "lessons") return entry.course.lessonCount;
  return entry.course.lessonCount > 0 ? entry.course.completedLessonCount / entry.course.lessonCount : 0;
}

/** "today", "yesterday", "3 days ago", then a short date. */
function relativeDay(value: number, now: number, language: string, t: I18nDictionary) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.ceil((startOfToday.getTime() - value) / DAY_MS));
  if (days === 0) return t.library.when.today;
  if (days === 1) return t.library.when.yesterday;
  if (days < 7) return msg(t.library.when.daysAgo, { count: days });
  const zh = language.startsWith("zh");
  const sameYear = new Date(value).getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat(zh ? "zh-CN" : "en", {
    month: zh ? "long" : "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(new Date(value));
}

async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("Clipboard copy failed");
}

function Icon({ size = 16, strokeWidth = 1.7, children }: { size?: number; strokeWidth?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function SearchIcon({ size = 16 }: { size?: number }) {
  return <Icon size={size} strokeWidth={1.8}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>;
}

function SortIcon({ size = 14 }: { size?: number }) {
  return <Icon size={size} strokeWidth={1.8}><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></Icon>;
}

function ChevronDownIcon({ size = 14, up = false }: { size?: number; up?: boolean }) {
  return <Icon size={size} strokeWidth={1.8}><path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} /></Icon>;
}

function ChevronLeftIcon() {
  return <Icon size={15} strokeWidth={1.9}><path d="m15 18-6-6 6-6" /></Icon>;
}

function ChevronRightIcon() {
  return <Icon size={15} strokeWidth={1.9}><path d="m9 18 6-6-6-6" /></Icon>;
}

function GridIcon() {
  return <Icon><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></Icon>;
}

function ListIcon() {
  return <Icon strokeWidth={1.8}><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></Icon>;
}

function PlusIcon() {
  return <Icon size={17} strokeWidth={1.9}><path d="M12 5v14M5 12h14" /></Icon>;
}

function UploadIcon() {
  return <Icon size={17}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M12 17v-6M9 14l3-3 3 3" /></Icon>;
}

function LessonIcon() {
  return <Icon><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20" /></Icon>;
}

function ShareIcon() {
  return <Icon><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></Icon>;
}

function TrashIcon() {
  return <Icon><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></Icon>;
}

function CopyIcon() {
  return <Icon><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></Icon>;
}

function CloseIcon() {
  return <Icon><path d="M6 6l12 12M18 6L6 18" /></Icon>;
}

function MoreIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}
