"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CourseSummary } from "@/lib/courses/types";
import type { LessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { isLessonGenerationActive, lessonGenerationStageLabel } from "@/lib/courses/lesson-generation-labels";

type LibraryEntry =
  | { kind: "course"; id: string; updatedAt: number; course: CourseSummary }
  | { kind: "job"; id: string; updatedAt: number; job: LessonGenerationJobSummary };

type ViewMode = "table" | "cards";
type StatusFilterValue = "no_lessons" | "not_started" | "in_progress" | "reviewing" | "done";
type SortKey = "progress" | "lessons" | "updated";
type SortDirection = "asc" | "desc";

const STATUS_FILTERS: { value: StatusFilterValue; label: string }[] = [
  { value: "no_lessons", label: "No Lessons" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "reviewing", label: "Reviewing" },
  { value: "done", label: "Done" },
];

const PAGE_SIZE = 10;
const INITIAL_REFRESH_WINDOW_MS = 45_000;

export function CourseLibraryGrid({
  initialCourses,
  initialLessonJobs = [],
}: {
  initialCourses: CourseSummary[];
  initialLessonJobs?: LessonGenerationJobSummary[];
}) {
  const [courses, setCourses] = useState(initialCourses);
  const [lessonJobs, setLessonJobs] = useState(initialLessonJobs);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [statusFilters, setStatusFilters] = useState<StatusFilterValue[]>([]);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: "updated", direction: "desc" });
  const [page, setPage] = useState(1);
  const [initialRefreshOpen, setInitialRefreshOpen] = useState(true);
  const [openCourseMenuId, setOpenCourseMenuId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<CourseSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseSummary | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const shouldPoll = initialRefreshOpen || lessonJobs.some(isLessonGenerationActive);

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
    if (!openCourseMenuId) return;
    function closeMenu(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".library-row-actions")) return;
      setOpenCourseMenuId(null);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenCourseMenuId(null);
    }
    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openCourseMenuId]);

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
      ].sort((a, b) => b.updatedAt - a.updatedAt);
    },
    [courses, lessonJobs],
  );

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    const queryFiltered = normalizedQuery
      ? entries.filter((entry) => searchableText(entry).includes(normalizedQuery))
      : entries;
    const statusFiltered = statusFilters.length === 0
      ? queryFiltered
      : queryFiltered.filter((entry) => statusFilters.includes(entryStatusFilterValue(entry)));
    return sortEntries(statusFiltered, sort);
  }, [entries, normalizedQuery, sort, statusFilters]);

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasActiveFilters = statusFilters.length > 0;

  function toggleStatusFilter(value: StatusFilterValue) {
    setStatusFilters((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
    setPage(1);
  }

  function clearStatusFilters() {
    setStatusFilters([]);
    setPage(1);
  }

  function updateSort(key: SortKey) {
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
      if (!response.ok) throw new Error(data.error ?? "Could not delete this course.");
      setCourses((current) => current.filter((course) => course.id !== deleteTarget.id));
      setLessonJobs((current) => current.filter((job) => job.courseId !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete this course.");
    } finally {
      setDeletePending(false);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="library-empty">
        <p>{initialRefreshOpen ? "Checking for course builds…" : "No courses yet."}</p>
        <Link href="/" className="library-empty-action">Create your first course from the tutor</Link>
      </div>
    );
  }

  return (
    <section className="library-course-browser" aria-label="Course library">
      <div className="library-toolbar">
        <label className="library-search">
          <SearchIcon />
          <span className="sr-only">Search courses</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search courses..."
            type="search"
          />
          <kbd>⌘K</kbd>
        </label>

        <div className="library-toolbar-actions">
          <div className="library-view-toggle" aria-label="Course library view">
            <button
              type="button"
              className={viewMode === "cards" ? "active" : ""}
              onClick={() => {
                setViewMode("cards");
                setPage(1);
              }}
              aria-pressed={viewMode === "cards"}
              title="Compact cards"
            >
              <GridIcon />
            </button>
            <button
              type="button"
              className={viewMode === "table" ? "active" : ""}
              onClick={() => {
                setViewMode("table");
                setPage(1);
              }}
              aria-pressed={viewMode === "table"}
              title="Table"
            >
              <ListIcon />
            </button>
          </div>
          <Link href="/" className="library-create-course">
            <PlusIcon />
            <span>Create Course</span>
          </Link>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="library-empty library-search-empty">
          <p>
            {deferredQuery.trim() || hasActiveFilters
              ? "No courses match the current search or filters."
              : "No courses yet."}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              clearStatusFilters();
            }}
          >
            Clear filters
          </button>
        </div>
      ) : viewMode === "table" ? (
        <CourseTable
          entries={visibleEntries}
          lessonJobByCourse={lessonJobByCourse}
          sort={sort}
          onSort={updateSort}
          statusFilters={statusFilters}
          statusFilterOpen={statusFilterOpen}
          onStatusFilterOpenChange={setStatusFilterOpen}
          onToggleStatusFilter={toggleStatusFilter}
          onClearStatusFilters={clearStatusFilters}
          openCourseMenuId={openCourseMenuId}
          onCourseMenuOpenChange={setOpenCourseMenuId}
          onShareCourse={requestShareCourse}
          onDeleteCourse={requestDeleteCourse}
        />
      ) : (
        <CourseCards entries={visibleEntries} lessonJobByCourse={lessonJobByCourse} />
      )}

      {filteredEntries.length > 0 ? (
        <footer className="library-table-footer">
          <div className="library-pagination" aria-label="Library pagination">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage <= 1}>
              <ChevronLeftIcon />
            </button>
            <span>{currentPage}</span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              disabled={currentPage >= pageCount}
            >
              <ChevronRightIcon />
            </button>
            <small>{PAGE_SIZE} / page</small>
          </div>
        </footer>
      ) : null}
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
    </section>
  );
}

function CourseTable({
  entries,
  lessonJobByCourse,
  sort,
  onSort,
  statusFilters,
  statusFilterOpen,
  onStatusFilterOpenChange,
  onToggleStatusFilter,
  onClearStatusFilters,
  openCourseMenuId,
  onCourseMenuOpenChange,
  onShareCourse,
  onDeleteCourse,
}: {
  entries: LibraryEntry[];
  lessonJobByCourse: Map<string, LessonGenerationJobSummary>;
  sort: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
  statusFilters: StatusFilterValue[];
  statusFilterOpen: boolean;
  onStatusFilterOpenChange: (open: boolean) => void;
  onToggleStatusFilter: (value: StatusFilterValue) => void;
  onClearStatusFilters: () => void;
  openCourseMenuId: string | null;
  onCourseMenuOpenChange: (courseId: string | null) => void;
  onShareCourse: (course: CourseSummary) => void;
  onDeleteCourse: (course: CourseSummary) => void;
}) {
  return (
    <div className="library-table-card">
      <table className="library-course-table">
        <colgroup>
          <col className="library-col-name" />
          <col className="library-col-status" />
          <col className="library-col-progress" />
          <col className="library-col-current" />
          <col className="library-col-lessons" />
          <col className="library-col-updated" />
          <col className="library-col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">
              <div className="library-table-head-control">
                <span>Status</span>
                <button
                  type="button"
                  className={`library-filter-trigger${statusFilterOpen ? " active" : ""}${statusFilters.length > 0 ? " selected" : ""}`}
                  onClick={() => onStatusFilterOpenChange(!statusFilterOpen)}
                  aria-expanded={statusFilterOpen}
                  aria-label="Filter courses by status"
                >
                  <FilterIcon />
                  {statusFilters.length > 0 ? <small>{statusFilters.length}</small> : null}
                </button>
                {statusFilterOpen ? (
                  <div className="library-filter-menu">
                    <strong>Filter by Status</strong>
                    <div className="library-filter-options">
                      {STATUS_FILTERS.map((filter) => (
                        <label key={filter.value}>
                          <input
                            type="checkbox"
                            checked={statusFilters.includes(filter.value)}
                            onChange={() => onToggleStatusFilter(filter.value)}
                          />
                          <span>{filter.label}</span>
                        </label>
                      ))}
                    </div>
                    <button type="button" onClick={onClearStatusFilters} disabled={statusFilters.length === 0}>
                      Clear
                    </button>
                  </div>
                ) : null}
              </div>
            </th>
            <th scope="col">
              <SortHeaderButton label="Progress" sortKey="progress" activeSort={sort} onSort={onSort} />
            </th>
            <th scope="col">Current Lesson</th>
            <th scope="col">
              <SortHeaderButton label="Lessons" sortKey="lessons" activeSort={sort} onSort={onSort} />
            </th>
            <th scope="col">
              <SortHeaderButton label="Updated" sortKey="updated" activeSort={sort} onSort={onSort} />
            </th>
            <th scope="col" className="library-actions-header">
              <span className="library-actions-heading">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) =>
            entry.kind === "course" ? (
              <CourseRow
                key={`course-${entry.id}`}
                course={entry.course}
                lessonJob={lessonJobByCourse.get(entry.id)}
                menuOpen={openCourseMenuId === entry.id}
                menuPlacement={index === entries.length - 1 ? "up" : "down"}
                onMenuOpenChange={onCourseMenuOpenChange}
                onShareCourse={onShareCourse}
                onDeleteCourse={onDeleteCourse}
              />
            ) : (
              <JobRow key={`job-${entry.id}`} job={entry.job} />
            ),
          )}
        </tbody>
      </table>
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
  const nextDirection = active && activeSort.direction === "desc" ? "ascending" : "descending";
  return (
    <button
      type="button"
      className={`library-sort-button${active ? " active" : ""}`}
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label} ${nextDirection}`}
    >
      <span>{label}</span>
      <SortIcon direction={active ? activeSort.direction : null} />
    </button>
  );
}

function CourseCards({
  entries,
  lessonJobByCourse,
}: {
  entries: LibraryEntry[];
  lessonJobByCourse: Map<string, LessonGenerationJobSummary>;
}) {
  return (
    <ul className="library-card-list">
      {entries.map((entry) =>
        entry.kind === "course" ? (
          <li key={`course-${entry.id}`}>
            <CourseCard course={entry.course} lessonJob={lessonJobByCourse.get(entry.id)} />
          </li>
        ) : (
          <li key={`job-${entry.id}`}>
            <JobCard job={entry.job} />
          </li>
        ),
      )}
    </ul>
  );
}

function CourseRow({
  course,
  lessonJob,
  menuOpen,
  menuPlacement,
  onMenuOpenChange,
  onShareCourse,
  onDeleteCourse,
}: {
  course: CourseSummary;
  lessonJob?: LessonGenerationJobSummary;
  menuOpen: boolean;
  menuPlacement: "up" | "down";
  onMenuOpenChange: (courseId: string | null) => void;
  onShareCourse: (course: CourseSummary) => void;
  onDeleteCourse: (course: CourseSummary) => void;
}) {
  const status = courseStatus(course);
  const progress = lessonProgress(course);
  const currentLesson = course.currentLesson?.title ?? "No lesson planned yet";
  const jobActive = lessonJob ? isLessonGenerationActive(lessonJob) : false;
  const jobFailed = lessonJob?.status === "failed";
  return (
    <tr className={jobActive ? "library-row-generating" : jobFailed ? "library-row-failed" : undefined}>
      <td data-label="Name">
        <div className="library-course-name">
          <CourseThumb title={course.title} pending={jobActive} />
          <div className="library-course-copy">
            <Link href={`/course/${course.id}`} className="library-course-title">{course.title}</Link>
          </div>
        </div>
      </td>
      <td data-label="Status">
        {jobActive && lessonJob ? (
          <StatusPill tone="working">{lessonGenerationStageLabel(lessonJob)}</StatusPill>
        ) : jobFailed ? (
          <StatusPill tone="danger">Lesson failed</StatusPill>
        ) : (
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        )}
      </td>
      <td data-label="Progress">
        {jobActive && lessonJob ? (
          <ProgressMeter completed={lessonJob.progressCompleted} total={Math.max(lessonJob.progressTotal, 1)} />
        ) : (
          <ProgressMeter completed={progress.completed} total={progress.total} />
        )}
      </td>
      <td data-label="Current Lesson">
        <div className="library-current-lesson">
          <strong>{currentLesson}</strong>
          {jobActive && lessonJob ? <span>{lessonGenerationStageLabel(lessonJob)}</span> : null}
          {jobFailed ? <span>{lessonJob?.lastError ?? "Generation failed"}</span> : null}
        </div>
      </td>
      <td data-label="Lessons" className="library-number-cell">{course.lessonCount}</td>
      <td data-label="Updated" className="library-date-cell">{formatDate(course.updatedAt)}</td>
      <td data-label="Actions">
        <div className="library-row-actions">
          <Link href={`/course/${course.id}`} className="library-row-action primary">
            {progress.completed > 0 || course.generatedLessonCount > 0 ? "Continue" : "Open"}
          </Link>
          <button
            type="button"
            className={`library-row-more${menuOpen ? " active" : ""}`}
            aria-label={`More actions for ${course.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(event) => {
              event.stopPropagation();
              onMenuOpenChange(menuOpen ? null : course.id);
            }}
          >
            <MoreIcon />
          </button>
          {menuOpen ? (
            <div
              className={`library-row-menu${menuPlacement === "up" ? " drop-up" : ""}`}
              role="menu"
              aria-label={`${course.title} actions`}
            >
              <Link href={`/course/${course.id}/outline`} role="menuitem">
                View outline
              </Link>
              <button type="button" role="menuitem" onClick={() => onShareCourse(course)}>
                Share course
              </button>
              <button type="button" className="danger" role="menuitem" onClick={() => onDeleteCourse(course)}>
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function ShareCourseDialog({
  course,
  onClose,
}: {
  course: CourseSummary;
  onClose: () => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const shareUrl = useMemo(() => courseShareUrl(course.id), [course.id]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

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
      className="library-share-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="library-share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-course-title">
        <header className="library-share-header">
          <div>
            <span className="course-block-tag">Course link</span>
            <h2 id="share-course-title">Share Course</h2>
          </div>
          <button type="button" className="library-share-close" onClick={onClose} aria-label="Close share dialog">
            <CloseIcon />
          </button>
        </header>
        <div className="library-share-body">
          <p>
            Anyone with this link can preview <strong>{course.title}</strong> and import it into their account.
          </p>
          <div className="library-share-link-row">
            <input type="text" value={shareUrl} readOnly aria-label="Share course link" onFocus={(event) => event.currentTarget.select()} />
            <button type="button" onClick={copyShareLink}>
              <CopyIcon />
              <span>{copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobRow({ job }: { job: LessonGenerationJobSummary }) {
  const jobActive = isLessonGenerationActive(job);
  const jobFailed = job.status === "failed";
  const statusLabel = jobActive ? lessonGenerationStageLabel(job) : jobFailed ? "Lesson failed" : "Syncing";
  return (
    <tr className={jobActive ? "library-row-generating" : jobFailed ? "library-row-failed" : undefined}>
      <td data-label="Name">
        <div className="library-course-name">
          <CourseThumb title="Building course" pending={jobActive} />
          <div className="library-course-copy">
            <Link href={`/course/${job.courseId}`} className="library-course-title">Building course</Link>
          </div>
        </div>
      </td>
      <td data-label="Status">
        <StatusPill tone={jobFailed ? "danger" : "working"}>{statusLabel}</StatusPill>
      </td>
      <td data-label="Progress">
        <ProgressMeter completed={job.progressCompleted} total={Math.max(job.progressTotal, 1)} />
      </td>
      <td data-label="Current Lesson">
        <div className="library-current-lesson">
          <strong>First lesson</strong>
          <span>{jobFailed ? job.lastError ?? "Generation failed" : statusLabel}</span>
        </div>
      </td>
      <td data-label="Lessons" className="library-number-cell">1</td>
      <td data-label="Updated" className="library-date-cell">{formatDate(job.updatedAt)}</td>
      <td data-label="Actions">
        <div className="library-row-actions">
          <Link href={`/course/${job.courseId}`} className="library-row-action primary">
            Open
          </Link>
        </div>
      </td>
    </tr>
  );
}

function CourseCard({ course, lessonJob }: { course: CourseSummary; lessonJob?: LessonGenerationJobSummary }) {
  const status = courseStatus(course);
  const progress = lessonProgress(course);
  const jobActive = lessonJob ? isLessonGenerationActive(lessonJob) : false;
  const jobFailed = lessonJob?.status === "failed";
  return (
    <article className={`library-course-card${jobActive ? " library-card-generating" : jobFailed ? " library-card-failed" : ""}`}>
      <div className="library-course-card-head">
        <CourseThumb title={course.title} pending={jobActive} />
        {jobActive && lessonJob ? (
          <StatusPill tone="working">{lessonGenerationStageLabel(lessonJob)}</StatusPill>
        ) : jobFailed ? (
          <StatusPill tone="danger">Lesson failed</StatusPill>
        ) : (
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        )}
      </div>
      <Link href={`/course/${course.id}`} className="library-course-title">{course.title}</Link>
      <ProgressMeter
        completed={jobActive && lessonJob ? lessonJob.progressCompleted : progress.completed}
        total={jobActive && lessonJob ? Math.max(lessonJob.progressTotal, 1) : progress.total}
      />
      <div className="library-course-card-meta">
        <span>{course.currentLesson?.title ?? "No lesson planned yet"}</span>
        <span>{course.lessonCount} lessons</span>
      </div>
    </article>
  );
}

function JobCard({ job }: { job: LessonGenerationJobSummary }) {
  const jobActive = isLessonGenerationActive(job);
  const jobFailed = job.status === "failed";
  const statusLabel = jobActive ? lessonGenerationStageLabel(job) : jobFailed ? "Lesson failed" : "Syncing";
  return (
    <article className={`library-course-card${jobActive ? " library-card-generating" : jobFailed ? " library-card-failed" : ""}`}>
      <div className="library-course-card-head">
        <CourseThumb title="Building course" pending={jobActive} />
        <StatusPill tone={jobFailed ? "danger" : "working"}>{statusLabel}</StatusPill>
      </div>
      <Link href={`/course/${job.courseId}`} className="library-course-title">Building course</Link>
      <p>The course is being prepared and will fill in here as soon as the outline syncs.</p>
      <ProgressMeter completed={job.progressCompleted} total={Math.max(job.progressTotal, 1)} />
      <div className="library-course-card-meta">
        <span>First lesson</span>
        <span>{statusLabel}</span>
      </div>
    </article>
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
  return (
    <div className="library-confirm-backdrop" role="presentation">
      <div className="library-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-course-title">
        <span className="course-block-tag">Delete course</span>
        <h2 id="delete-course-title">Delete {course.title}?</h2>
        <p>
          This permanently removes the course, its lesson outline, generated lesson content, and background generation jobs.
        </p>
        {error ? <p className="library-confirm-error">{error}</p> : null}
        <div className="library-confirm-actions">
          <button type="button" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
          <button type="button" className="danger" onClick={onConfirm} disabled={pending}>
            {pending ? "Deleting..." : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseThumb({ title, pending = false }: { title: string; pending?: boolean }) {
  return (
    <span className={`library-course-thumb${pending ? " pending" : ""}`} aria-hidden="true">
      {initials(title)}
    </span>
  );
}

function StatusPill({ tone, children }: { tone: "idle" | "active" | "done" | "planned" | "working" | "danger" | "reviewing"; children: ReactNode }) {
  return <span className={`library-status-pill library-status-${tone}`}>{children}</span>;
}

function ProgressMeter({ completed, total, muted = false }: { completed: number; total: number; muted?: boolean }) {
  const safeTotal = Math.max(total, 1);
  const width = Math.min(100, Math.round((completed / safeTotal) * 100));
  return (
    <div className={`library-progress${muted ? " muted" : ""}`}>
      <span>{completed}/{total}</span>
      <div aria-hidden="true">
        <i style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function courseStatus(course: CourseSummary): { label: string; tone: "idle" | "active" | "done" | "planned" | "reviewing" } {
  const value = courseStatusFilterValue(course);
  if (value === "no_lessons") {
    return { label: "No Lessons", tone: "planned" };
  }
  if (value === "done") {
    return { label: "Done", tone: "done" };
  }
  if (value === "reviewing") {
    return { label: "Reviewing", tone: "reviewing" };
  }
  if (value === "in_progress") {
    return { label: "In Progress", tone: "active" };
  }
  return { label: "Not Started", tone: "idle" };
}

function lessonProgress(course: CourseSummary) {
  return {
    completed: course.completedLessonCount,
    total: course.lessonCount,
  };
}

function searchableText(entry: LibraryEntry) {
  if (entry.kind === "job") {
    return `building course ${entry.job.courseId} ${entry.job.lessonId} ${entry.job.id} ${entry.job.stage} ${entry.job.status}`.toLowerCase();
  }
  const lessonTitles = entry.course.lessons.map((lesson) => lesson.title).join(" ");
  return `${entry.course.title} ${entry.course.topic} ${entry.course.summary} ${entry.course.id} ${lessonTitles}`.toLowerCase();
}

function entryStatusFilterValue(entry: LibraryEntry): StatusFilterValue {
  if (entry.kind === "job") return isLessonGenerationActive(entry.job) ? "in_progress" : "no_lessons";
  return courseStatusFilterValue(entry.course);
}

function courseStatusFilterValue(course: CourseSummary): StatusFilterValue {
  if (course.lessonCount === 0) return "no_lessons";
  if (course.completedLessonCount >= course.lessonCount) return "done";
  if (course.lessons.some((lesson) => lesson.role === "review")) return "reviewing";
  if (course.lessons.some((lesson) => lesson.progress === "in_progress") || course.completedLessonCount > 0) return "in_progress";
  return "not_started";
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
    return jobProgressValue(entry.job);
  }
  if (key === "lessons") return entry.course.lessonCount;
  const progress = lessonProgress(entry.course);
  return progress.total > 0 ? progress.completed / progress.total : 0;
}

function jobProgressValue(job: LessonGenerationJobSummary) {
  const total = Math.max(job.progressTotal, 1);
  return Math.min(1, job.progressCompleted / total);
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function initials(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "C";
  const ascii = words.filter((word) => /^[a-z0-9]/i.test(word));
  const source = ascii.length > 0 ? ascii : words;
  return source.slice(0, 2).map((word) => word.slice(0, 1).toUpperCase()).join("");
}

function courseShareUrl(courseId: string) {
  const path = `/learn/${encodeURIComponent(courseId)}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
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

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16l-6.4 7.2v4.6l-3.2 1.9v-6.5L4 5z" />
    </svg>
  );
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  return (
    <svg className={direction ? `library-sort-icon ${direction}` : "library-sort-icon"} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}
