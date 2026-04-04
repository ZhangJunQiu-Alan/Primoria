import type { ViewerParentChild, ViewerParentReport } from '@/shared/api/viewer/types';
import { supabase } from '@/shared/api/supabase';
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

  const { data, error } = await supabase.rpc('generate_child_binding_code');
  if (error) {
    throw error;
  }
  if (Array.isArray(data)) {
    return (data[0] ?? null) as Record<string, string> | null;
  }
  return (data as Record<string, string> | null) ?? null;
}

export async function bindChildWithCode(code: string) {
  if (usesViewerFixtures()) {
    return { ok: Boolean(code.trim()) };
  }

  const { data, error } = await supabase.rpc('bind_child_with_code', { p_code: code.trim() });
  return { ok: !error && Boolean(Array.isArray(data) ? data[0] : data) };
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

  const { data, error } = await supabase.rpc('unbind_child', { p_child_id: childId });
  return { ok: !error && data === true };
}

export async function fetchParentChildrenOverview(): Promise<ViewerParentChild[]> {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return [...readFixtureState().parentChildren];
  }

  const { data, error } = await supabase.rpc('get_parent_children_overview');
  if (error) {
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((child) => ({
    child_id: String(child.child_id ?? ''),
    child_name: String(child.username ?? 'Child'),
    avatar_url: typeof child.avatar_url === 'string' ? child.avatar_url : '',
    total_xp: Number(child.xp_points ?? 0),
    current_streak: Number(child.streak_days ?? 0),
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

  const { data, error } = await supabase.rpc('get_parent_child_report', { p_child_id: childId });
  if (error) {
    throw error;
  }
  const report = (data ?? {}) as Record<string, unknown>;
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
