import { fetchCourseDetail } from '@/shared/api/viewer/catalogApi';
import { completeFixtureLesson, readFixtureState, writeFixtureState } from '@/shared/api/viewer/fixtureStore';
import { fetchLessonRuntime } from '@/shared/api/viewer/lessonApi';
import { DEMO_ROLE_STORAGE_KEY } from '@/shared/utils/demoMode';

describe('viewer fixture catalog', () => {
  it('returns course-specific lesson lists for seeded fixture courses', async () => {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, 'user');

    const detail = await fetchCourseDetail('course-demo-physics-motion', 'demo-user');

    expect(detail.course.title).toBe('运动与力学观察');
    expect(detail.enrollment).toBeNull();
    expect(detail.lessons.map((lesson) => lesson.title)).toEqual([
      '用图像读懂速度与位移',
      '受力分析与牛顿定律',
      '能量守恒与实验判断',
    ]);
  });

  it('builds runtime data for newly added fixture lessons', async () => {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, 'user');

    const runtime = await fetchLessonRuntime('lesson-demo-data-3');

    expect(runtime).not.toBeNull();
    expect(runtime?.courseId).toBe('course-demo-data-ai-basics');
    expect(runtime?.title).toBe('Prompt 设计与结果检查');
    expect(runtime?.pages).toHaveLength(2);
    expect(runtime?.pages[0]?.blocks[1]).toMatchObject({ type: 'fill-blank' });
  });

  it('tracks completion against the enrolled course that owns the lesson', () => {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, 'user');

    const fixture = readFixtureState();
    const physicsCourse = fixture.courses.find((course) => course.id === 'course-demo-physics-motion');
    if (!physicsCourse) {
      throw new Error('Physics fixture course missing');
    }

    writeFixtureState({
      ...fixture,
      enrollments: [
        ...fixture.enrollments,
        {
          course_id: physicsCourse.id,
          status: 'in_progress',
          progress_bp: 0,
          started_at: '2026-04-04T10:00:00Z',
          last_accessed_at: '2026-04-04T10:00:00Z',
          courses: physicsCourse,
        },
      ],
      completedLessonIds: [],
    });

    completeFixtureLesson('lesson-demo-physics-1', 2, 2, 300);

    let next = readFixtureState();
    expect(next.enrollments.find((entry) => entry.course_id === physicsCourse.id)?.progress_bp).toBe(3333);
    expect(next.enrollments.find((entry) => entry.course_id === 'course-demo-react-viewer')?.progress_bp).toBe(5200);

    completeFixtureLesson('lesson-demo-physics-2', 2, 2, 300);
    const completion = completeFixtureLesson('lesson-demo-physics-3', 2, 2, 300);

    next = readFixtureState();
    expect(next.enrollments.find((entry) => entry.course_id === physicsCourse.id)).toMatchObject({
      status: 'completed',
      progress_bp: 10000,
    });
    expect(completion.course_completed).toBe(true);
  });
});
