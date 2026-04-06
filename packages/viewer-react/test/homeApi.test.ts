import { fetchViewerHomePayload } from '@/shared/api/viewer/homeApi';
import { readFixtureState, writeFixtureState } from '@/shared/api/viewer/fixtureStore';

describe('fetchViewerHomePayload', () => {
  it('resolves the selected course from fixtures and returns the compact detail payload', async () => {
    const fixture = readFixtureState();
    const courseA = {
      ...fixture.courses[0],
      id: 'home-api-a',
      title: 'Signals A',
      slug: 'signals-a',
    };
    const courseB = {
      ...fixture.courses[0],
      id: 'home-api-b',
      title: 'Signals B',
      slug: 'signals-b',
    };

    writeFixtureState({
      ...fixture,
      courses: [courseA, courseB],
      enrollments: [
        {
          course_id: courseA.id,
          status: 'in_progress',
          progress_bp: 2200,
          last_accessed_at: '2026-04-04T10:00:00Z',
          courses: courseA,
        },
        {
          course_id: courseB.id,
          status: 'in_progress',
          progress_bp: 6100,
          last_accessed_at: '2026-04-05T10:00:00Z',
          courses: courseB,
        },
      ],
      completedLessonIds: ['lesson-demo-1'],
    });

    const fallbackPayload = await fetchViewerHomePayload('demo-user', 'missing-course');
    expect(fallbackPayload.resolved_selected_course_id).toBe(courseB.id);
    expect(fallbackPayload.selected_course_detail?.course.id).toBe(courseB.id);
    expect(fallbackPayload.selected_course_detail?.completed_lesson_ids).toContain('lesson-demo-1');
    expect(fallbackPayload.in_progress_enrollments.map((entry) => entry.course_id)).toEqual([courseB.id, courseA.id]);

    const explicitPayload = await fetchViewerHomePayload('demo-user', courseA.id);
    expect(explicitPayload.resolved_selected_course_id).toBe(courseA.id);
    expect(explicitPayload.selected_course_detail?.course.id).toBe(courseA.id);
    expect(explicitPayload.selected_course_detail?.lessons.length).toBeGreaterThan(0);
  });
});
