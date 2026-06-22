"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CourseSummary } from "@/lib/courses/types";
import type { CourseGenerationJobSummary } from "@/lib/courses/generation-jobs";

type LibraryEntry =
  | { kind: "course"; id: string; updatedAt: number; course: CourseSummary }
  | { kind: "job"; id: string; updatedAt: number; job: CourseGenerationJobSummary };

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

export function CourseLibraryGrid({
  initialCourses,
  initialJobs,
}: {
  initialCourses: CourseSummary[];
  initialJobs: CourseGenerationJobSummary[];
}) {
  const [courses, setCourses] = useState(initialCourses);
  const [jobs, setJobs] = useState(initialJobs);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [statusFilters, setStatusFilters] = useState<StatusFilterValue[]>([]);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: "updated", direction: "desc" });
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const hasRunningJobs = jobs.some((job) => job.status === "queued" || job.status === "running");

  useEffect(() => {
    if (!hasRunningJobs) return;
    let cancelled = false;

    async function refresh() {
      try {
        const [coursesResponse, jobsResponse] = await Promise.all([
          fetch("/api/courses", { cache: "no-store" }),
          fetch("/api/course-generation-jobs", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (coursesResponse.ok) {
          const data = (await coursesResponse.json()) as { courses?: CourseSummary[] };
          setCourses(Array.isArray(data.courses) ? data.courses : []);
        }
        if (jobsResponse.ok) {
          const data = (await jobsResponse.json()) as { jobs?: CourseGenerationJobSummary[] };
          setJobs(Array.isArray(data.jobs) ? data.jobs : []);
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
  }, [hasRunningJobs]);

  const entries = useMemo(() => {
    const readyCourseIds = new Set(courses.map((course) => course.id));
    const visibleJobs = jobs.filter((job) => !readyCourseIds.has(job.courseId));
    return [
      ...visibleJobs.map((job): LibraryEntry => ({ kind: "job", id: job.id, updatedAt: job.updatedAt, job })),
      ...courses.map((course): LibraryEntry => ({ kind: "course", id: course.id, updatedAt: course.updatedAt, course })),
    ].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [courses, jobs]);

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
  const courseCount = courses.length;
  const runningCount = jobs.filter((job) => job.status === "queued" || job.status === "running").length;
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

  if (entries.length === 0) {
    return (
      <div className="library-empty">
        <p>No courses yet.</p>
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
          sort={sort}
          onSort={updateSort}
          statusFilters={statusFilters}
          statusFilterOpen={statusFilterOpen}
          onStatusFilterOpenChange={setStatusFilterOpen}
          onToggleStatusFilter={toggleStatusFilter}
          onClearStatusFilters={clearStatusFilters}
        />
      ) : (
        <CourseCards entries={visibleEntries} />
      )}

      {filteredEntries.length > 0 ? (
        <footer className="library-table-footer">
          <span>
            Showing {visibleEntries.length} of {filteredEntries.length} item{filteredEntries.length === 1 ? "" : "s"}
            {" · "}
            {courseCount} course{courseCount === 1 ? "" : "s"}
            {runningCount > 0 ? ` · ${runningCount} building` : ""}
          </span>
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
    </section>
  );
}

function CourseTable({
  entries,
  sort,
  onSort,
  statusFilters,
  statusFilterOpen,
  onStatusFilterOpenChange,
  onToggleStatusFilter,
  onClearStatusFilters,
}: {
  entries: LibraryEntry[];
  sort: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
  statusFilters: StatusFilterValue[];
  statusFilterOpen: boolean;
  onStatusFilterOpenChange: (open: boolean) => void;
  onToggleStatusFilter: (value: StatusFilterValue) => void;
  onClearStatusFilters: () => void;
}) {
  return (
    <div className="library-table-card">
      <table className="library-course-table">
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
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            entry.kind === "course" ? <CourseRow key={`course-${entry.id}`} course={entry.course} /> : <CourseJobRow key={`job-${entry.id}`} job={entry.job} />
          ))}
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

function CourseCards({ entries }: { entries: LibraryEntry[] }) {
  return (
    <ul className="library-card-list">
      {entries.map((entry) => (
        <li key={`${entry.kind}-${entry.id}`}>
          {entry.kind === "course" ? <CourseCard course={entry.course} /> : <CourseJobCard job={entry.job} />}
        </li>
      ))}
    </ul>
  );
}

function CourseRow({ course }: { course: CourseSummary }) {
  const status = courseStatus(course);
  const progress = lessonProgress(course);
  const currentLesson = course.currentLesson?.title ?? "No lesson planned yet";
  return (
    <tr>
      <td>
        <div className="library-course-name">
          <CourseThumb title={course.title} />
          <div>
            <Link href={`/course/${course.id}`} className="library-course-title">{course.title}</Link>
            <p>{course.summary}</p>
            <span>{shortId(course.id)} · {course.lessonCount} lessons</span>
          </div>
        </div>
      </td>
      <td>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </td>
      <td>
        <ProgressMeter completed={progress.completed} total={progress.total} />
      </td>
      <td>
        <div className="library-current-lesson">
          <strong>{currentLesson}</strong>
          <span>{lessonStateText(course)}</span>
        </div>
      </td>
      <td className="library-number-cell">{course.lessonCount}</td>
      <td className="library-date-cell">{formatDate(course.updatedAt)}</td>
      <td>
        <div className="library-row-actions">
          <Link href={`/course/${course.id}`} className="library-row-action primary">
            {progress.completed > 0 || course.generatedLessonCount > 0 ? "Continue" : "Open"}
          </Link>
          <Link href={`/course/${course.id}`} className="library-row-action">
            Review
          </Link>
          <span className="library-row-more" aria-hidden="true">
            <MoreIcon />
          </span>
        </div>
      </td>
    </tr>
  );
}

function CourseJobRow({ job }: { job: CourseGenerationJobSummary }) {
  const isFailed = job.status === "failed";
  return (
    <tr className={isFailed ? "library-row-failed" : "library-row-generating"}>
      <td>
        <div className="library-course-name">
          <CourseThumb title={job.topic} pending />
          <div>
            <strong className="library-course-title">{job.topic}</strong>
            <p>{isFailed ? job.lastError || "Primoria could not finish this course." : "Primoria is planning the course path and first lesson."}</p>
            <span>{shortId(job.courseId)} · course job</span>
          </div>
        </div>
      </td>
      <td>
        <StatusPill tone={isFailed ? "danger" : "working"}>
          {isFailed ? "Failed" : job.status === "queued" ? "Queued" : "Generating"}
        </StatusPill>
      </td>
      <td>
        <ProgressMeter completed={0} total={1} muted />
      </td>
      <td>
        <div className="library-current-lesson">
          <strong>{isFailed ? "Generation stopped" : "Preparing first lesson"}</strong>
          <span>{isFailed ? "Not saved as a course" : `Attempt ${Math.max(job.attempts, 1)}`}</span>
        </div>
      </td>
      <td className="library-number-cell">—</td>
      <td className="library-date-cell">{formatDate(job.updatedAt)}</td>
      <td>
        <div className="library-row-actions">
          <button type="button" className="library-row-action primary" disabled>
            {isFailed ? "Retry soon" : "Building"}
          </button>
        </div>
      </td>
    </tr>
  );
}

function CourseCard({ course }: { course: CourseSummary }) {
  const status = courseStatus(course);
  const progress = lessonProgress(course);
  return (
    <article className="library-course-card">
      <div className="library-course-card-head">
        <CourseThumb title={course.title} />
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>
      <Link href={`/course/${course.id}`} className="library-course-title">{course.title}</Link>
      <p>{course.summary}</p>
      <ProgressMeter completed={progress.completed} total={progress.total} />
      <div className="library-course-card-meta">
        <span>{course.currentLesson?.title ?? "No lesson planned yet"}</span>
        <span>{course.lessonCount} lessons</span>
      </div>
    </article>
  );
}

function CourseJobCard({ job }: { job: CourseGenerationJobSummary }) {
  const isFailed = job.status === "failed";
  return (
    <article
      className={`library-course-card library-card ${isFailed ? "library-card-failed" : "library-card-generating"}`}
      aria-busy={isFailed ? undefined : true}
    >
      <div className="library-course-card-head">
        <CourseThumb title={job.topic} pending />
        <StatusPill tone={isFailed ? "danger" : "working"}>
          {isFailed ? "Failed" : job.status === "queued" ? "Queued" : "Generating"}
        </StatusPill>
      </div>
      <strong className="library-course-title">{job.topic}</strong>
      <p>{isFailed ? job.lastError || "Primoria could not finish this course." : "Primoria is composing the first lesson."}</p>
      <div className="library-course-card-meta">
        <span>{isFailed ? "Not saved as a course" : `Attempt ${Math.max(job.attempts, 1)}`}</span>
        <span>{shortId(job.courseId)}</span>
      </div>
    </article>
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

function lessonStateText(course: CourseSummary) {
  const lesson = course.currentLesson;
  if (!lesson) return "Course outline is empty";
  if (lesson.status === "planned") return "Lazy generation when opened";
  if (lesson.status === "generating") return "Lesson is generating";
  if (lesson.progress === "completed") return "Completed";
  return "Generated lesson";
}

function searchableText(entry: LibraryEntry) {
  if (entry.kind === "job") {
    return `${entry.job.topic} ${entry.job.status} ${entry.job.courseId}`.toLowerCase();
  }
  const lessonTitles = entry.course.lessons.map((lesson) => lesson.title).join(" ");
  return `${entry.course.title} ${entry.course.topic} ${entry.course.summary} ${entry.course.id} ${lessonTitles}`.toLowerCase();
}

function entryStatusFilterValue(entry: LibraryEntry): StatusFilterValue {
  if (entry.kind === "job") {
    return entry.job.status === "failed" ? "no_lessons" : "in_progress";
  }
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
    return key === "progress" ? 0 : -1;
  }
  if (key === "lessons") return entry.course.lessonCount;
  const progress = lessonProgress(entry.course);
  return progress.total > 0 ? progress.completed / progress.total : 0;
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function shortId(id: string) {
  return id.includes("_") ? id.split("_").slice(0, 2).join("_") : id.slice(0, 8);
}

function initials(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "C";
  const ascii = words.filter((word) => /^[a-z0-9]/i.test(word));
  const source = ascii.length > 0 ? ascii : words;
  return source.slice(0, 2).map((word) => word.slice(0, 1).toUpperCase()).join("");
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
