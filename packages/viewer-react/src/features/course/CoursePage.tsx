import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { enrollInCourse, fetchCourseDetail } from '@/shared/api/viewer/catalogApi';
import { ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { PageContainer } from '@/shared/layout/PageContainer';
import { SurfaceCard } from '@/shared/layout/SurfaceCard';
import { trackViewerAnalyticsEventOnce } from '@/shared/api/viewer/analyticsEvents';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { useAppSelector } from '@/shared/state/store';
import { useViewerCopy } from '@/shared/theme/copy';

export function CoursePage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const language = useProductLanguage();
  const copy = useViewerCopy();
  const courseId = params.courseId ?? '';

  const detailQuery = useQuery({
    queryKey: ['viewer', 'course', courseId, user?.id],
    queryFn: () => fetchCourseDetail(courseId, user?.id),
    enabled: Boolean(courseId),
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollInCourse(courseId, user?.id ?? 'demo-user'),
    onSuccess: async (enrollment) => {
      captureViewerEvent('viewer_course_enrolled', { courseId });
      queryClient.setQueryData(['viewer', 'course', courseId, user?.id], (current: {
        course?: unknown;
        lessons?: unknown[];
        completed_lesson_ids?: string[];
        enrollment?: Record<string, unknown> | null;
      } | undefined) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          enrollment: current.enrollment ?? enrollment,
        };
      });
      await queryClient.invalidateQueries({ queryKey: ['viewer', 'course', courseId, user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['viewer', 'enrollments', user?.id] });
    },
    onError: (error) => {
      captureViewerError(error, { area: 'course_enroll', courseId });
    },
  });

  const detail = detailQuery.data;
  const course = detail?.course;
  const isEnrolled = Boolean(detail?.enrollment);
  const lessons = detail?.lessons ?? [];

  useEffect(() => {
    if (!course?.id) {
      return;
    }

    trackViewerAnalyticsEventOnce(`${location.key}:course:${course.id}`, 'course_view', {
      courseId: course.id,
    });
  }, [course?.id, location.key]);

  if (detailQuery.isLoading) {
    return (
      <PageContainer title={copy.course.pageTitle} subtitle={copy.course.loading}>
        <LoadingStateCard />
      </PageContainer>
    );
  }

  if (detailQuery.error) {
    return (
      <PageContainer title={copy.course.pageTitle} subtitle={copy.course.unavailable}>
        <ErrorStateCard
          message={detailQuery.error instanceof Error ? detailQuery.error.message : undefined}
          onRetry={() => void detailQuery.refetch()}
        />
      </PageContainer>
    );
  }

  if (!course) {
    return (
      <PageContainer title={copy.course.pageTitle} subtitle={copy.course.loading}>
        <SurfaceCard>
          <p className="text-sm font-semibold text-[var(--viewer-text-muted)]">{copy.common.loading}</p>
        </SurfaceCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={course.title}
      subtitle={course.description}
      actions={
        isEnrolled ? (
          <span className="viewer-botanical-pill border-[#c8dbcb] bg-[#edf5ec] text-[#5c7d60]">
            {copy.course.enrolled}
          </span>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              className="viewer-botanical-button viewer-botanical-button--primary"
              onClick={() => enrollMutation.mutate()}
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending ? copy.course.enrolling : copy.course.enroll}
            </button>
            {enrollMutation.error instanceof Error ? (
              <span className="text-xs font-semibold text-rose-600">{enrollMutation.error.message}</span>
            ) : null}
          </div>
        )
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <SurfaceCard className="overflow-hidden p-0">
          <div className="relative overflow-hidden rounded-[inherit] bg-[linear-gradient(135deg,#f7f2e7_0%,#eef4ec_34%,#f4ebdf_68%,#efe6dc_100%)] p-6 md:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.7),transparent_26%),radial-gradient(circle_at_82%_24%,rgba(168,197,172,0.18),transparent_24%),radial-gradient(circle_at_76%_86%,rgba(196,149,106,0.12),transparent_24%)]" />
            <div className="relative">
              <p className="viewer-botanical-eyebrow">{course.subjects.name}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="viewer-botanical-pill">{course.difficulty_level}</span>
                <span className="viewer-botanical-pill">{course.estimated_minutes} min</span>
                {course.tags.slice(0, 3).map((tag: string) => (
                  <span key={tag} className="viewer-botanical-pill bg-[rgba(255,255,255,0.72)]">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-8 grid gap-3 md:grid-cols-3">
                <div className="rounded-[24px] border border-[#dfd3c4] bg-[rgba(255,255,255,0.52)] px-4 py-4">
                  <p className="viewer-botanical-eyebrow text-[0.7rem]">{copy.course.difficulty}</p>
                  <p className="mt-3 text-xl font-semibold text-[#3d342a]">{language === 'zh-CN' ? (course.difficulty_level === 'beginner' ? '入门' : course.difficulty_level === 'intermediate' ? '进阶' : course.difficulty_level === 'advanced' ? '挑战' : course.difficulty_level) : course.difficulty_level}</p>
                </div>
                <div className="rounded-[24px] border border-[#dfd3c4] bg-[rgba(255,255,255,0.52)] px-4 py-4">
                  <p className="viewer-botanical-eyebrow text-[0.7rem]">{copy.course.estimated}</p>
                  <p className="mt-3 text-xl font-semibold text-[#3d342a]">{language === 'zh-CN' ? `${course.estimated_minutes} 分钟` : `${course.estimated_minutes} min`}</p>
                </div>
                <div className="rounded-[24px] border border-[#dfd3c4] bg-[rgba(255,255,255,0.52)] px-4 py-4">
                  <p className="viewer-botanical-eyebrow text-[0.7rem]">{copy.course.subject}</p>
                  <p className="mt-3 text-xl font-semibold text-[#3d342a]">{course.subjects.name}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-6 pb-6 pt-5 md:px-7">
            <div className="rounded-[24px] border border-[#e4d8ca] bg-[rgba(255,252,247,0.88)] p-5">
              <p className="viewer-botanical-eyebrow text-[0.72rem]">{copy.course.noteLabel}</p>
              <p className="mt-3 text-sm font-medium leading-7 text-[#71655b]">
                {copy.course.noteBody}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {isEnrolled ? (
                <span className="viewer-botanical-pill border-[#c8dbcb] bg-[#edf5ec] text-[#5c7d60]">
                  {copy.course.enrolled}
                </span>
              ) : (
                <span className="viewer-botanical-pill border-[#e2d5c2] bg-[#fbf7f0] text-[#8b7153]">
                  {copy.course.locked}
                </span>
              )}
              <Link to="/library" className="viewer-botanical-button viewer-botanical-button--secondary">
                {copy.course.backToLibrary}
              </Link>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="viewer-botanical-heading text-[2rem]">{copy.course.lessonList}</h2>
            {!isEnrolled ? (
              <span className="viewer-botanical-pill text-[0.7rem]">{copy.course.locked}</span>
            ) : null}
          </div>
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-[26px] border border-[#dfd3c4] bg-[rgba(255,252,247,0.88)] px-4 py-4 shadow-[0_10px_24px_rgba(90,70,50,0.06)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="viewer-botanical-eyebrow text-[0.68rem]">
                      {copy.course.lessonLabel.replace('{index}', String((lesson.sort_key as number) + 1))}
                    </p>
                    <h3 className="mt-2 text-[1.55rem] font-semibold text-[#3d342a]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                      {lesson.title}
                    </h3>
                  </div>
                  {isEnrolled ? (
                    <button
                      type="button"
                      className="viewer-botanical-button viewer-botanical-button--primary"
                      onClick={() => navigate(`/lesson/${lesson.id}`)}
                    >
                      {copy.course.startLesson}
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="viewer-botanical-button viewer-botanical-button--secondary"
                      disabled
                    >
                      {copy.course.enroll}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </PageContainer>
  );
}
