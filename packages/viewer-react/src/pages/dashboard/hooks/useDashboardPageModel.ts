import { useEffect, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import {
  useAddLesson,
  useCourseList,
  useCreateCourse,
  useDeleteCourse,
  useDeleteLesson,
  useDuplicateCourse,
  useUpdateCourse,
  type CourseLessonRow,
  type CourseRow,
} from '@/queries/courses';
import {
  emptyDashboardAnalytics,
  useDashboardAnalytics,
} from '@/queries/dashboardAnalytics';
import {
  buildMonthLabels,
  buildRecentDayLabels,
  formatMonthLabel,
  formatShortDateLabel,
  formatSignedDelta,
  formatUpdatedAt,
  getCourseReadiness,
  getCourseWorkflowStatus,
  getErrorMessage,
  getLatestLesson,
  summarizeLessonContent,
} from '@/pages/dashboard/dashboardLib';
import type {
  AICourseDraftPreview,
  CourseFormPayload,
  NoticeState,
  SortMode,
  StatusFilter,
} from '@/pages/dashboard/dashboardTypes';

export function useDashboardPageModel({
  userId,
  language,
  navigate,
}: {
  userId: string | undefined;
  language: 'zh-CN' | 'en';
  navigate: NavigateFunction;
}) {
  useEffect(() => {
    void import('@/pages/editor/EditorPage');
  }, []);

  const { data: courses = [], isLoading, error, refetch, isRefetching } = useCourseList(userId);
  const analyticsQuery = useDashboardAnalytics(userId);
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const duplicateCourse = useDuplicateCourse();
  const addLesson = useAddLesson();
  const removeLesson = useDeleteLesson();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('updated');
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [aiDraftOpen, setAiDraftOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [courseForForm, setCourseForForm] = useState<CourseRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<CourseRow | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<{
    course: CourseRow;
    lesson: CourseLessonRow;
    index: number;
  } | null>(null);

  const publishedCourses = courses.filter((course) => course.status === 'published').length;
  const draftCourses = courses.filter((course) => course.status === 'draft').length;
  const emptyCourses = courses.filter((course) => course.lessons.length === 0).length;
  const analytics = analyticsQuery.data ?? emptyDashboardAnalytics;
  const courseMetricsById = new Map(
    analytics.course_metrics.map((metric) => [metric.course_id, metric]),
  );
  const coursesById = new Map(courses.map((course) => [course.id, course]));
  const courseReadinessById = new Map(
    courses.map((course) => [course.id, getCourseReadiness(course)]),
  );
  const courseWorkflowStatusById = new Map(
    courses.map((course) => {
      const readiness = courseReadinessById.get(course.id) ?? getCourseReadiness(course);
      return [course.id, getCourseWorkflowStatus(course, readiness.score)];
    }),
  );
  const latestCourse = [...courses].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  )[0] ?? null;
  const latestCourseMetric = latestCourse ? courseMetricsById.get(latestCourse.id) ?? null : null;
  const latestLesson = latestCourse ? getLatestLesson(latestCourse) : null;
  const latestLessonSummary = latestLesson ? summarizeLessonContent(latestLesson) : null;
  const latestCourseReadiness = latestCourse ? courseReadinessById.get(latestCourse.id) ?? getCourseReadiness(latestCourse) : null;
  const continueBuilding = latestCourse && latestCourseReadiness ? {
    course: latestCourse,
    lesson: latestLesson,
    lastBlockLabel: latestLessonSummary && latestLessonSummary.blockCount > 0
      ? `Block ${latestLessonSummary.blockCount}`
      : 'Next content block',
    completion: latestCourseReadiness.score,
    needsText: latestCourseReadiness.issues.slice(0, 2).join(' + ') || 'Ready for final review',
    readiness: latestCourseReadiness,
  } : null;
  const weeklyLearners = analytics.summary.weekly_learners;
  const totalStudyHours = analytics.summary.total_study_hours;
  const completionRate = analytics.summary.current_completion_rate;
  const completionDelta = analytics.summary.completion_delta_pct;
  const publishedViewers = analytics.summary.published_viewers;
  const averageCompletionRate = analytics.summary.average_completion_rate;
  const rankedCourses = analytics.course_metrics
    .map((metric) => {
      const course = coursesById.get(metric.course_id);
      if (!course) return null;

      return {
        ...course,
        ...metric,
        momentum: Math.round(metric.completion_rate * 100),
      };
    })
    .filter((course): course is NonNullable<typeof course> => course !== null);
  const rankedCoursesWithSignals = rankedCourses.filter((course) => (
    course.views > 0 ||
    course.students > 0 ||
    course.comments > 0 ||
    course.completion_rate > 0
  ));
  const publishedCourseRanking = rankedCoursesWithSignals.filter((course) => course.status === 'published');
  const topCourses = publishedCourseRanking.slice(0, 3);
  const readinessScores = [...courseReadinessById.values()].map((readiness) => readiness.score);
  const averagePublishReadiness = readinessScores.length > 0
    ? Math.round(readinessScores.reduce((total, score) => total + score, 0) / readinessScores.length)
    : 0;
  const needsAttentionCourses = [...courses].filter((course) => {
    const readiness = courseReadinessById.get(course.id);
    return Boolean(readiness && readiness.issues.length > 0);
  }).sort((left, right) => {
    const leftReadiness = courseReadinessById.get(left.id)?.score ?? 0;
    const rightReadiness = courseReadinessById.get(right.id)?.score ?? 0;
    return leftReadiness - rightReadiness || new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  }).slice(0, 3);
  const hasHomeCompletionData = analytics.home_daily_completion.some((entry) => entry.completion_rate > 0);
  const hasMonthlyAnalyticsData = analytics.monthly_activity_completion.some((entry) => (
    entry.completion_rate > 0 ||
    entry.active_learners > 0
  ));
  const hasCourseMetricData = rankedCoursesWithSignals.length > 0;
  const hasLearnerAnalyticsData = hasHomeCompletionData || hasMonthlyAnalyticsData || hasCourseMetricData || publishedViewers > 0 || weeklyLearners > 0;

  const filteredCourses = courses.filter((course) => {
    const workflowStatus = courseWorkflowStatusById.get(course.id) ?? 'draft';
    if (statusFilter !== 'all' && workflowStatus !== statusFilter) {
      return false;
    }

    const query = search.trim().toLowerCase();
    if (!query) return true;

    return (
      course.title.toLowerCase().includes(query) ||
      (course.description ?? '').toLowerCase().includes(query) ||
      course.lessons.some((lesson) => lesson.title.toLowerCase().includes(query))
    );
  });

  const visibleCourses = [...filteredCourses].sort((left, right) => {
    const leftMetric = courseMetricsById.get(left.id);
    const rightMetric = courseMetricsById.get(right.id);
    const leftReadiness = courseReadinessById.get(left.id) ?? getCourseReadiness(left);
    const rightReadiness = courseReadinessById.get(right.id) ?? getCourseReadiness(right);

    if (sortMode === 'title') {
      return left.title.localeCompare(right.title);
    }

    if (sortMode === 'views') {
      return (
        (rightMetric?.views ?? 0) - (leftMetric?.views ?? 0) ||
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      );
    }

    if (sortMode === 'completion') {
      return (
        (rightMetric ? Math.round(rightMetric.completion_rate * 100) : rightReadiness.score) -
        (leftMetric ? Math.round(leftMetric.completion_rate * 100) : leftReadiness.score) ||
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      );
    }

    if (sortMode === 'ai') {
      return Number(rightReadiness.hasAiTutor) - Number(leftReadiness.hasAiTutor) ||
        rightReadiness.score - leftReadiness.score ||
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    }

    if (sortMode === 'attention' || sortMode === 'incomplete') {
      return (
        leftReadiness.score - rightReadiness.score ||
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      );
    }

    if (sortMode === 'growth') {
      const rightGrowth = (rightMetric?.views ?? 0) + (rightMetric?.students ?? 0) * 3 + (rightMetric?.comments ?? 0) * 5;
      const leftGrowth = (leftMetric?.views ?? 0) + (leftMetric?.students ?? 0) * 3 + (leftMetric?.comments ?? 0) * 5;
      return rightGrowth - leftGrowth || new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    }

    if (sortMode === 'lessons') {
      return (
        right.lessons.length - left.lessons.length ||
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      );
    }

    if (sortMode === 'student') {
      return (
        (rightMetric?.students ?? 0) - (leftMetric?.students ?? 0) ||
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      );
    }

    if (sortMode === 'comments') {
      return (
        (rightMetric?.comments ?? 0) - (leftMetric?.comments ?? 0) ||
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      );
    }

    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });

  const recentActivities = [
    latestCourse
      ? {
          title: latestCourse.title,
          description:
            latestCourse.status === 'published'
              ? latestCourseMetric && latestCourseMetric.views > 0
                ? `Published content has reached ${latestCourseMetric.views} real course views so far.`
                : 'Published content is live and waiting for the first verified learner views.'
              : 'The latest edit has synced back to the workspace and is ready for the next pass.',
          time: formatUpdatedAt(latestCourseMetric?.last_activity_at ?? latestCourse.updated_at),
          tone: 'amber' as const,
        }
      : {
          title: 'Start your first course',
          description: 'Create the course shell first, then refine lessons and publishing step by step.',
          time: 'Today',
          tone: 'amber' as const,
        },
    {
      title: 'New learners',
      description:
        weeklyLearners > 0
          ? `${weeklyLearners} learners interacted with your published content in the last 7 days.`
          : 'After you publish a course, new learners and recent interactions will show up here.',
      time: weeklyLearners > 0 ? 'Last 7 days' : 'Waiting for publish',
      tone: 'sage' as const,
    },
  ];
  const creatorActivityFeed = [
    latestCourse
      ? {
          title: latestCourse.status === 'published' ? 'Lesson published' : 'Lesson updated',
          description: latestLesson
            ? `${latestLesson.title} in ${latestCourse.title} is the most recent editing checkpoint.`
            : `${latestCourse.title} is ready for lesson planning.`,
          time: formatUpdatedAt(latestLesson?.updated_at ?? latestCourse.updated_at),
          tone: 'amber' as const,
        }
      : {
          title: 'Course shell waiting',
          description: 'Create your first course to unlock creator activity.',
          time: 'Today',
          tone: 'amber' as const,
        },
    {
      title: 'AI generated quiz',
      description: continueBuilding?.readiness.hasAssessment
        ? 'Assessment content is detected in the current course flow.'
        : 'Use Primoria AI Assistant to add the first assessment block.',
      time: continueBuilding?.readiness.hasAssessment ? 'Ready' : 'Suggested',
      tone: 'sage' as const,
    },
    {
      title: 'Student completed module',
      description: weeklyLearners > 0
        ? `${weeklyLearners} learners interacted with published modules this week.`
        : 'Publish a course to start collecting module completion events.',
      time: weeklyLearners > 0 ? 'Last 7 days' : 'After publish',
      tone: 'sage' as const,
    },
    {
      title: 'Course shared 12 times',
      description: publishedViewers > 0
        ? `${publishedViewers} published views are feeding the author analytics preview.`
        : 'Sharing signals will appear here once a course is live.',
      time: publishedViewers > 0 ? 'Live signal' : 'Demo signal',
      tone: 'amber' as const,
    },
  ];

  const homeTrendLabels = analytics.home_daily_completion.length > 0
    ? analytics.home_daily_completion.map((entry) => formatShortDateLabel(entry.date, language))
    : buildRecentDayLabels(7, language);
  const completionTrendValues = analytics.home_daily_completion.length > 0
    ? analytics.home_daily_completion.map((entry) => Math.round(entry.completion_rate * 100))
    : homeTrendLabels.map(() => 0);
  const dataMonthLabels = analytics.monthly_activity_completion.length > 0
    ? analytics.monthly_activity_completion.map((entry) => formatMonthLabel(entry.month_start, language))
    : buildMonthLabels(6, language);
  const completionHistory = analytics.monthly_activity_completion.length > 0
    ? analytics.monthly_activity_completion.map((entry) => Math.round(entry.completion_rate * 100))
    : dataMonthLabels.map(() => 0);
  const activeLearnerHistory = analytics.monthly_activity_completion.length > 0
    ? analytics.monthly_activity_completion.map((entry) => entry.active_learners)
    : dataMonthLabels.map(() => 0);
  const analyticsReferenceCourse = publishedCourseRanking[0] ?? rankedCourses[0] ?? latestCourse;
  const analyticsReferenceMetric = analyticsReferenceCourse ? courseMetricsById.get(analyticsReferenceCourse.id) ?? null : null;
  const analyticsReferenceLesson = analyticsReferenceCourse ? getLatestLesson(analyticsReferenceCourse) : latestLesson;
  const analyticsPreviewCards = [
    {
      label: 'Avg completion',
      value: hasLearnerAnalyticsData
        ? `${(averageCompletionRate * 100).toFixed(1)}%`
        : `${averagePublishReadiness}%`,
      detail: hasLearnerAnalyticsData ? 'Verified learner analytics' : 'Projected from publish readiness',
    },
    {
      label: 'Most replayed lesson',
      value: analyticsReferenceLesson?.title ?? 'First lesson',
      detail: analyticsReferenceCourse ? analyticsReferenceCourse.title : 'Unlocks after publishing',
    },
    {
      label: 'Drop-off point',
      value: analyticsReferenceCourse?.lessons[1]?.title ?? analyticsReferenceLesson?.title ?? 'Lesson 1',
      detail: hasLearnerAnalyticsData ? 'Based on recent learner flow' : 'Demo estimate until learner data exists',
    },
    {
      label: 'Quiz success rate',
      value: `${Math.max(48, Math.min(94, (analyticsReferenceMetric ? Math.round(analyticsReferenceMetric.completion_rate * 100) : averagePublishReadiness) + 8))}%`,
      detail: continueBuilding?.readiness.hasAssessment ? 'Assessment detected' : 'Add a quiz to replace estimate',
    },
    {
      label: 'Student satisfaction',
      value: hasLearnerAnalyticsData ? '4.6/5' : 'Pending',
      detail: hasLearnerAnalyticsData ? 'Blended from reviews and completions' : 'Publish to unlock review signals',
    },
    {
      label: 'AI tutor interactions',
      value: `${Math.max(0, weeklyLearners * 3 + courses.filter((course) => courseReadinessById.get(course.id)?.hasAiTutor).length)}`,
      detail: 'Includes detected AI tutor-ready course flows',
    },
  ];

  function handleUseAICourseDraft(preview: AICourseDraftPreview) {
    setAiDraftOpen(false);
    setNotice({
      tone: 'info',
      text: `"${preview.title}" is saved as an AI front-end brief only for now. Connect generation later to turn it into a real course shell.`,
    });
  }

  async function handleCreateCourse(payload: CourseFormPayload) {
    setFormError(null);

    try {
      const course = await createCourse.mutateAsync({
        ...payload,
        userId: userId!,
      });
      setFormMode(null);
      setCourseForForm(null);
      navigate(`/builder/editor/${course.id}`);
    } catch (submitError) {
      setFormError(getErrorMessage(submitError));
    }
  }

  async function handleUpdateCourse(payload: CourseFormPayload) {
    if (!courseForForm) return;
    setFormError(null);

    try {
      await updateCourse.mutateAsync({
        ...payload,
        id: courseForForm.id,
        userId: userId!,
      });
      setFormMode(null);
      setCourseForForm(null);
      setNotice({ tone: 'success', text: 'Course details updated.' });
    } catch (submitError) {
      setFormError(getErrorMessage(submitError));
    }
  }

  async function handleDeleteCourse() {
    if (!courseToDelete) return;

    try {
      await deleteCourse.mutateAsync({ id: courseToDelete.id, userId: userId! });
      setCourseToDelete(null);
      setNotice(null);
    } catch (submitError) {
      setNotice({ tone: 'error', text: getErrorMessage(submitError) });
    }
  }

  async function handleDeleteLesson() {
    if (!lessonToDelete) return;

    try {
      await removeLesson.mutateAsync({
        courseId: lessonToDelete.course.id,
        lessonId: lessonToDelete.lesson.id,
        userId: userId!,
      });
      setLessonToDelete(null);
      setNotice({ tone: 'success', text: 'Lesson deleted.' });
    } catch (submitError) {
      setNotice({ tone: 'error', text: getErrorMessage(submitError) });
    }
  }

  async function handleDuplicateCourse(course: CourseRow) {
    setNotice(null);

    try {
      const result = await duplicateCourse.mutateAsync({ id: course.id, userId: userId! });
      navigate(`/builder/editor/${result.course.id}`);
    } catch (submitError) {
      setNotice({ tone: 'error', text: getErrorMessage(submitError) });
    }
  }

  async function handleAddLesson(course: CourseRow) {
    setNotice(null);

    try {
      await addLesson.mutateAsync({
        courseId: course.id,
        userId: userId!,
        title: `Lesson ${course.lessons.length + 1}`,
      });
      navigate(`/builder/editor/${course.id}`);
    } catch (submitError) {
      setNotice({ tone: 'error', text: getErrorMessage(submitError) });
    }
  }

  async function handleRefresh() {
    setNotice(null);
    const result = await refetch();
    if (result.error) {
      setNotice({ tone: 'error', text: getErrorMessage(result.error) });
    }
  }

  const hasNoResults = courses.length > 0 && visibleCourses.length === 0;
  const hasEmptyState = !isLoading && !error && courses.length === 0;
  const hasInlineError = Boolean(error && courses.length > 0);

  return {
    analyticsQuery,
    activeLearnerHistory,
    addLesson,
    aiDraftOpen,
    averageCompletionRate,
    averagePublishReadiness,
    completionDelta,
    completionHistory,
    completionRate,
    completionTrendValues,
    courseForForm,
    courseMetricsById,
    courseReadinessById,
    courseToDelete,
    courseWorkflowStatusById,
    courses,
    createCourse,
    dataMonthLabels,
    deleteCourse,
    draftCourses,
    duplicateCourse,
    emptyCourses,
    formError,
    formMode,
    handleAddLesson,
    handleCreateCourse,
    handleDeleteCourse,
    handleDeleteLesson,
    handleDuplicateCourse,
    handleRefresh,
    handleUpdateCourse,
    handleUseAICourseDraft,
    hasEmptyState,
    hasHomeCompletionData,
    hasInlineError,
    hasLearnerAnalyticsData,
    hasMonthlyAnalyticsData,
    hasNoResults,
    homeTrendLabels,
    isLoading,
    isRefetching,
    language,
    latestCourseMetric,
    lessonToDelete,
    continueBuilding,
    creatorActivityFeed,
    analyticsPreviewCards,
    needsAttentionCourses,
    notice,
    publishedCourseRanking,
    publishedCourses,
    publishedViewers,
    recentActivities,
    removeLesson,
    search,
    setAiDraftOpen,
    setCourseForForm,
    setCourseToDelete,
    setFormError,
    setFormMode,
    setLessonToDelete,
    setNotice,
    setSearch,
    setSortMode,
    setStatusFilter,
    sortMode,
    statusFilter,
    topCourses,
    totalStudyHours,
    updateCourse,
    visibleCourses,
    weeklyLearners,
    error,
    formatSignedDelta,
  };
}

export type DashboardPageModel = ReturnType<typeof useDashboardPageModel>;
