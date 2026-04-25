import { useQuery } from '@tanstack/react-query';
import { fetchAgentJson } from '@/shared/api/agentService';

export interface DashboardAnalyticsSummary {
  weekly_learners: number;
  total_study_hours: number;
  current_completion_rate: number;
  completion_delta_pct: number;
  published_viewers: number;
  average_completion_rate: number;
}

export interface DashboardAnalyticsDailyCompletion {
  date: string;
  completion_rate: number;
}

export interface DashboardAnalyticsMonthlyActivity {
  month_start: string;
  active_learners: number;
  completion_rate: number;
}

export interface DashboardAnalyticsCourseMetric {
  course_id: string;
  views: number;
  students: number;
  comments: number;
  completion_rate: number;
  last_activity_at: string | null;
}

export interface DashboardAnalyticsPayload {
  summary: DashboardAnalyticsSummary;
  home_daily_completion: DashboardAnalyticsDailyCompletion[];
  monthly_activity_completion: DashboardAnalyticsMonthlyActivity[];
  course_metrics: DashboardAnalyticsCourseMetric[];
}

function toNumber(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function normalizeSummary(value: unknown): DashboardAnalyticsSummary {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};

  return {
    weekly_learners: Math.max(0, Math.round(toNumber(record.weekly_learners))),
    total_study_hours: Math.max(0, Math.round(toNumber(record.total_study_hours))),
    current_completion_rate: Math.max(0, Math.min(1, toNumber(record.current_completion_rate))),
    completion_delta_pct: toNumber(record.completion_delta_pct),
    published_viewers: Math.max(0, Math.round(toNumber(record.published_viewers))),
    average_completion_rate: Math.max(0, Math.min(1, toNumber(record.average_completion_rate))),
  };
}

function normalizeDailyCompletion(value: unknown): DashboardAnalyticsDailyCompletion {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};

  return {
    date: typeof record.date === 'string' ? record.date : '',
    completion_rate: Math.max(0, Math.min(1, toNumber(record.completion_rate))),
  };
}

function normalizeMonthlyActivity(value: unknown): DashboardAnalyticsMonthlyActivity {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};

  return {
    month_start: typeof record.month_start === 'string' ? record.month_start : '',
    active_learners: Math.max(0, Math.round(toNumber(record.active_learners))),
    completion_rate: Math.max(0, Math.min(1, toNumber(record.completion_rate))),
  };
}

function normalizeCourseMetric(value: unknown): DashboardAnalyticsCourseMetric {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};

  return {
    course_id: typeof record.course_id === 'string' ? record.course_id : '',
    views: Math.max(0, Math.round(toNumber(record.views))),
    students: Math.max(0, Math.round(toNumber(record.students))),
    comments: Math.max(0, Math.round(toNumber(record.comments))),
    completion_rate: Math.max(0, Math.min(1, toNumber(record.completion_rate))),
    last_activity_at: toStringOrNull(record.last_activity_at),
  };
}

export const emptyDashboardAnalytics: DashboardAnalyticsPayload = {
  summary: {
    weekly_learners: 0,
    total_study_hours: 0,
    current_completion_rate: 0,
    completion_delta_pct: 0,
    published_viewers: 0,
    average_completion_rate: 0,
  },
  home_daily_completion: [],
  monthly_activity_completion: [],
  course_metrics: [],
};

export const dashboardAnalyticsKeys = {
  all: ['dashboard-analytics'] as const,
  detail: (userId: string) => ['dashboard-analytics', userId] as const,
};

export function normalizeDashboardAnalyticsPayload(value: unknown): DashboardAnalyticsPayload {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};

  return {
    summary: normalizeSummary(record.summary),
    home_daily_completion: Array.isArray(record.home_daily_completion)
      ? record.home_daily_completion.map(normalizeDailyCompletion).filter((entry) => Boolean(entry.date))
      : [],
    monthly_activity_completion: Array.isArray(record.monthly_activity_completion)
      ? record.monthly_activity_completion.map(normalizeMonthlyActivity).filter((entry) => Boolean(entry.month_start))
      : [],
    course_metrics: Array.isArray(record.course_metrics)
      ? record.course_metrics.map(normalizeCourseMetric).filter((entry) => Boolean(entry.course_id))
      : [],
  };
}

export function useDashboardAnalytics(userId: string | undefined) {
  return useQuery({
    queryKey: dashboardAnalyticsKeys.detail(userId ?? ''),
    enabled: Boolean(userId),
    queryFn: async () => {
      const data = await fetchAgentJson<unknown>('/v1/viewer/dashboard/analytics');
      return normalizeDashboardAnalyticsPayload(data);
    },
  });
}
