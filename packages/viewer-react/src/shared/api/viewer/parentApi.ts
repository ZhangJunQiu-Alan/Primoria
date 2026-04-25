import type { ViewerParentChild, ViewerParentReport } from '@/shared/api/viewer/types';
import { fetchAgentJson } from '@/shared/api/agentService';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { loadFixtureStore } from '@/shared/api/viewer/fixtureLoader';

export async function generateChildBindingCode() {
  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    const code = {
      code: 'DEMO-2419',
      expires_at: '2026-03-30T21:30:00Z',
    };
    patchFixtureState((state) => ({ ...state, bindingCode: code }));
    return code;
  }
  return fetchAgentJson<Record<string, string>>('/v1/viewer/parent/binding-code', {
    method: 'POST',
  });
}

export async function bindChildWithCode(code: string) {
  if (usesViewerFixtures()) {
    return { ok: Boolean(code.trim()) };
  }
  return fetchAgentJson<{ ok: boolean }>('/v1/viewer/parent/bind', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function unbindChild(childId: string) {
  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    patchFixtureState((state) => ({
      ...state,
      parentChildren: state.parentChildren.filter((child) => child.child_id !== childId),
    }));
    return { ok: true };
  }
  return fetchAgentJson<{ ok: boolean }>('/v1/viewer/parent/unbind', {
    method: 'POST',
    body: JSON.stringify({ child_id: childId }),
  });
}

export async function fetchParentChildrenOverview(): Promise<ViewerParentChild[]> {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return [...readFixtureState().parentChildren];
  }
  const payload = await fetchAgentJson<{ children: Array<Record<string, unknown>> }>('/v1/viewer/parent/children');
  return (payload.children ?? []).map((child) => ({
    child_id: String(child.child_id ?? ''),
    child_name: String(child.username ?? child.child_name ?? 'Child'),
    avatar_url: typeof child.avatar_url === 'string' ? child.avatar_url : '',
    total_xp: Number(child.xp_points ?? child.total_xp ?? 0),
    current_streak: Number(child.streak_days ?? child.current_streak ?? 0),
    lessons_completed: Number(child.lessons_completed ?? 0),
    courses_completed: Number(child.courses_completed ?? 0),
    last_active_at: typeof child.last_active_at === 'string' ? child.last_active_at : null,
  }));
}

export async function fetchParentChildReport(childId: string): Promise<ViewerParentReport | null> {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return readFixtureState().parentReports[childId] ?? null;
  }
  const report = await fetchAgentJson<Record<string, unknown>>(`/v1/viewer/parent/reports/${childId}`);
  const stats = (report.stats ?? {}) as Record<string, unknown>;
  const dailyBreakdown = Array.isArray(report.activity_trend)
    ? (report.activity_trend as Array<Record<string, unknown>>).map((entry) => ({
        date: String(entry.date ?? ''),
        minutes: 0,
        xp: Number(entry.xp_points ?? 0),
      }))
    : [];
  return {
    child_id: String(report.child_id ?? childId),
    summary: {
      study_minutes: 0,
      lessons_completed: Number(stats.lessons_completed ?? 0),
      courses_completed: Number(stats.courses_completed ?? 0),
      streak: Number(stats.current_streak ?? 0),
      total_xp: Number(stats.total_xp ?? 0),
    },
    daily_breakdown: dailyBreakdown,
    courses: Array.isArray(report.courses)
      ? (report.courses as Array<Record<string, unknown>>).map((course) => ({
          course_id: String(course.course_id ?? ''),
          title: String(course.title ?? ''),
          status: String(course.status ?? 'in_progress'),
          progress_percentage: Number(course.progress_percentage ?? 0),
          completed_lessons: Number(course.completed_lessons ?? 0),
          last_accessed_at: typeof course.last_accessed_at === 'string' ? course.last_accessed_at : null,
        }))
      : [],
    recent_lessons: Array.isArray(report.recent_lessons)
      ? (report.recent_lessons as Array<Record<string, unknown>>).map((lesson) => ({
          lesson_id: String(lesson.lesson_id ?? ''),
          lesson_title: String(lesson.lesson_title ?? ''),
          score: Number(lesson.score ?? 0),
          correct_count: Number(lesson.correct_count ?? 0),
          total_count: Number(lesson.total_count ?? 0),
          completed_at: typeof lesson.completed_at === 'string' ? lesson.completed_at : null,
        }))
      : [],
  };
}
