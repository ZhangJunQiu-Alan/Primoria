"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { isLessonGenerationActive } from "@/lib/courses/lesson-generation-labels";

// Poll a course's lesson-generation jobs (engineering doc §13.1): every 2s while
// any job is queued/running, `cache: no-store`, aborting on unmount. Polling
// stops automatically once nothing is active and resumes if `setJobs` reveals a
// new active job (e.g. after an enqueue).
export function useLessonGenerationJobs(
  courseId: string | null | undefined,
  initialJobs: LessonGenerationJobSummary[] = [],
) {
  const [jobs, setJobs] = useState<LessonGenerationJobSummary[]>(initialJobs);

  const jobsByLessonId = useMemo(() => {
    const map = new Map<string, LessonGenerationJobSummary>();
    for (const job of jobs) map.set(job.lessonId, job);
    return map;
  }, [jobs]);

  const hasActive = useMemo(() => jobs.some(isLessonGenerationActive), [jobs]);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!courseId) return;
      try {
        const res = await fetch(`/api/courses/${courseId}/lesson-generation-jobs`, { cache: "no-store", signal });
        if (!res.ok) return;
        const data = (await res.json()) as { jobs?: LessonGenerationJobSummary[] };
        if (Array.isArray(data.jobs)) setJobs(data.jobs);
      } catch {
        // Transient failure — the next interval recovers; keep the current view.
      }
    },
    [courseId],
  );

  useEffect(() => {
    if (!courseId || !hasActive) return;
    const controller = new AbortController();
    const interval = window.setInterval(() => void refresh(controller.signal), 2_000);
    // Defer the first poll out of the effect body so it doesn't setState synchronously.
    const kickoff = window.setTimeout(() => void refresh(controller.signal), 0);
    return () => {
      controller.abort();
      window.clearTimeout(kickoff);
      window.clearInterval(interval);
    };
  }, [courseId, hasActive, refresh]);

  return { jobs, jobsByLessonId, hasActive, setJobs, refresh };
}
