"use client";

import { useCallback, useEffect, useState } from "react";
import type { LearningProgressJobSummary } from "@/lib/courses/learning-progress-jobs";

// Poll a course's pending learning-progress recommendation. Polls every 4s
// (cache: no-store), aborting on unmount. Exposes the first pending recommendation
// plus accept/dismiss actions that resolve it server-side.
export function useLearningProgressRecommendation(courseId: string | null | undefined) {
  const [recommendations, setRecommendations] = useState<LearningProgressJobSummary[]>([]);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState(false);

  const pending = recommendations[0] ?? null;

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!courseId) return;
      try {
        const res = await fetch(`/api/courses/${courseId}/learning-progress/recommendation`, { cache: "no-store", signal });
        if (!res.ok) return;
        const data = (await res.json()) as { recommendations?: LearningProgressJobSummary[] };
        if (Array.isArray(data.recommendations)) setRecommendations(data.recommendations);
      } catch {
        // Transient failure — the next interval recovers.
      }
    },
    [courseId],
  );

  useEffect(() => {
    if (!courseId) return;
    const controller = new AbortController();
    const interval = window.setInterval(() => void refresh(controller.signal), 4_000);
    const kickoff = window.setTimeout(() => void refresh(controller.signal), 0);
    return () => {
      controller.abort();
      window.clearTimeout(kickoff);
      window.clearInterval(interval);
    };
  }, [courseId, refresh]);

  const resolve = useCallback(
    async (jobId: string, action: "accept" | "dismiss") => {
      if (!courseId) return null;
      setResolving(true);
      setResolveError(false);
      try {
        const res = await fetch(`/api/courses/${courseId}/learning-progress/${jobId}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          setResolveError(true);
          return null;
        }
        const data = await res.json().catch(() => null);
        if (!data) {
          setResolveError(true);
          return null;
        }
        // Drop the resolved recommendation locally so the popup closes immediately.
        setRecommendations((prev) => prev.filter((r) => r.id !== jobId));
        return data as { status?: string; kind?: string; lessonId?: string } | null;
      } finally {
        setResolving(false);
      }
    },
    [courseId],
  );

  return { pending, recommendations, resolving, resolveError, refresh, resolve };
}
