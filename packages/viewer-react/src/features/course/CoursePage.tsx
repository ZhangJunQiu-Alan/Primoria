import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { enrollInCourse, fetchCourseDetail } from '@/shared/api/viewer/catalogApi';
import { ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { PageContainer } from '@/shared/layout/PageContainer';
import { SurfaceCard } from '@/shared/layout/SurfaceCard';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { useAppSelector } from '@/shared/state/store';
import { viewerCopy } from '@/shared/theme/copy';

export function CoursePage() {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
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

  if (detailQuery.isLoading) {
    return (
      <PageContainer title="Course" subtitle="Loading course detail…">
        <LoadingStateCard />
      </PageContainer>
    );
  }

  if (detailQuery.error) {
    return (
      <PageContainer title="Course" subtitle="Course detail is unavailable.">
        <ErrorStateCard
          message={detailQuery.error instanceof Error ? detailQuery.error.message : undefined}
          onRetry={() => void detailQuery.refetch()}
        />
      </PageContainer>
    );
  }

  if (!course) {
    return (
      <PageContainer title="Course" subtitle="Loading course detail…">
        <SurfaceCard>
          <p className="text-sm font-semibold text-[var(--viewer-text-muted)]">Loading…</p>
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
          <span className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            {viewerCopy.course.enrolled}
          </span>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              className="rounded-2xl bg-[var(--viewer-primary)] px-5 py-3 text-sm font-black text-white"
              onClick={() => enrollMutation.mutate()}
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending ? 'Enrolling…' : viewerCopy.course.enroll}
            </button>
            {enrollMutation.error instanceof Error ? (
              <span className="text-xs font-semibold text-rose-600">{enrollMutation.error.message}</span>
            ) : null}
          </div>
        )
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl bg-indigo-50 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Difficulty</p>
              <p className="mt-2 text-xl font-black text-indigo-900">{course.difficulty_level}</p>
            </div>
            <div className="rounded-3xl bg-cyan-50 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600">Estimated</p>
              <p className="mt-2 text-xl font-black text-cyan-900">{course.estimated_minutes} min</p>
            </div>
            <div className="rounded-3xl bg-amber-50 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Subject</p>
              <p className="mt-2 text-xl font-black text-amber-900">{course.subjects.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {course.tags.map((tag: string) => (
              <span key={tag} className="rounded-full bg-[var(--viewer-surface-muted)] px-3 py-1 text-xs font-bold text-[var(--viewer-text-muted)]">
                {tag}
              </span>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[var(--viewer-text)]">Lesson list</h2>
            {!isEnrolled ? (
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--viewer-text-muted)]">{viewerCopy.course.locked}</span>
            ) : null}
          </div>
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="rounded-3xl border border-[var(--viewer-border)] px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">
                      Lesson {(lesson.sort_key as number) + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-[var(--viewer-text)]">{lesson.title}</h3>
                  </div>
                  {isEnrolled ? (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--viewer-primary)] px-4 py-3 text-sm font-black text-white"
                      onClick={() => navigate(`/lesson/${lesson.id}`)}
                    >
                      {viewerCopy.course.startLesson}
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded-2xl border border-[var(--viewer-border)] px-4 py-3 text-sm font-black text-[var(--viewer-text-muted)]"
                      disabled
                    >
                      {viewerCopy.course.enroll}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Link to="/library" className="text-sm font-semibold text-[var(--viewer-primary)]">
            Back to library
          </Link>
        </SurfaceCard>
      </div>
    </PageContainer>
  );
}
