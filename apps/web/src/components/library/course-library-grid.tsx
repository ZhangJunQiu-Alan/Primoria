"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CourseSummary } from "@/lib/courses/types";
import type { CourseGenerationJobSummary } from "@/lib/courses/generation-jobs";

type LibraryEntry =
  | { kind: "course"; id: string; updatedAt: number; course: CourseSummary }
  | { kind: "job"; id: string; updatedAt: number; job: CourseGenerationJobSummary };

export function CourseLibraryGrid({
  initialCourses,
  initialJobs,
}: {
  initialCourses: CourseSummary[];
  initialJobs: CourseGenerationJobSummary[];
}) {
  const [courses, setCourses] = useState(initialCourses);
  const [jobs, setJobs] = useState(initialJobs);
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

  if (entries.length === 0) {
    return (
      <div className="library-empty">
        <p>No courses yet.</p>
      </div>
    );
  }

  return (
    <ul className="library-grid">
      {entries.map((entry) => (
        <li key={`${entry.kind}-${entry.id}`}>
          {entry.kind === "course" ? <CourseCard course={entry.course} /> : <CourseJobCard job={entry.job} />}
        </li>
      ))}
    </ul>
  );
}

function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <Link href={`/course/${course.id}`} className="library-card">
      <strong>{course.title}</strong>
      <p className="library-card-summary">{course.summary}</p>
      <span className="library-card-meta">
        {course.outline.length} blocks · v{course.version} · ~{course.estimatedMinutes} min
      </span>
    </Link>
  );
}

function CourseJobCard({ job }: { job: CourseGenerationJobSummary }) {
  const isFailed = job.status === "failed";
  return (
    <article
      className={`library-card ${isFailed ? "library-card-failed" : "library-card-generating"}`}
      aria-busy={isFailed ? undefined : true}
    >
      <div className="library-card-status">
        {isFailed ? <span className="library-card-error-dot" aria-hidden="true" /> : <span className="tool-spinner" aria-hidden="true" />}
        <span>{isFailed ? "Generation failed" : job.status === "queued" ? "Queued" : "Generating"}</span>
      </div>
      <strong>{job.topic}</strong>
      <p className="library-card-summary">
        {isFailed
          ? job.lastError || "Primoria could not finish this course."
          : "Primoria is composing the course. You can leave this page and come back later."}
      </p>
      <span className="library-card-meta">
        {isFailed ? "Not saved as a course" : `Attempt ${Math.max(job.attempts, 1)} · course will appear here automatically`}
      </span>
    </article>
  );
}
