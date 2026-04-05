import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/react';
import { readFixtureState, writeFixtureState } from '@/shared/api/viewer/fixtureStore';
import { renderRoute } from './renderApp';

describe('HomePage', () => {
  it('selects the most recently accessed in-progress course and lets the learner switch it', async () => {
    const fixture = readFixtureState();
    const courseA = {
      ...fixture.courses[0],
      id: 'course-a',
      title: 'Physics Lab Sprint',
      slug: 'physics-lab-sprint',
    };
    const courseB = {
      ...fixture.courses[0],
      id: 'course-b',
      title: 'Data Signals Studio',
      slug: 'data-signals-studio',
      difficulty_level: 'intermediate',
    };

    writeFixtureState({
      ...fixture,
      courses: [courseA, courseB],
      enrollments: [
        {
          course_id: courseA.id,
          status: 'in_progress',
          progress_bp: 3200,
          last_accessed_at: '2026-04-02T10:00:00Z',
          courses: courseA,
        },
        {
          course_id: courseB.id,
          status: 'in_progress',
          progress_bp: 6800,
          last_accessed_at: '2026-04-04T10:00:00Z',
          courses: courseB,
        },
      ],
      completedLessonIds: [],
    });

    const user = userEvent.setup();
    renderRoute('/home', 'user');

    const currentCourseCard = await screen.findByTestId('home-current-course-card', {}, { timeout: 10000 });
    expect(within(currentCourseCard).getByText(/Data Signals Studio/i)).toBeInTheDocument();
    expect(
      await within(currentCourseCard).findByTestId('home-continue-link', {}, { timeout: 10000 }),
    ).toHaveAttribute('href', '/lesson/lesson-demo-1');

    const switcher = await screen.findByTestId('home-course-switcher');
    await user.click(within(switcher).getByRole('button', { name: /Physics Lab Sprint/i }));

    expect(
      within(await screen.findByTestId('home-current-course-card', {}, { timeout: 10000 })).getByText(
        /Physics Lab Sprint/i,
      ),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem('viewer.home.current-course:demo-user')).toBe('course-a');
  });

  it('routes the primary CTA to the first unfinished lesson', async () => {
    const fixture = readFixtureState();
    const course = {
      ...fixture.courses[0],
      id: 'course-focus',
      title: 'Course Focus',
      slug: 'course-focus',
    };

    writeFixtureState({
      ...fixture,
      courses: [course],
      enrollments: [
        {
          course_id: course.id,
          status: 'in_progress',
          progress_bp: 7800,
          last_accessed_at: '2026-04-04T10:00:00Z',
          courses: course,
        },
      ],
      completedLessonIds: ['lesson-demo-1'],
    });

    renderRoute('/home', 'user');
    const currentCourseCard = await screen.findByTestId('home-current-course-card', {}, { timeout: 10000 });
    expect(
      await within(currentCourseCard).findByTestId('home-continue-link', {}, { timeout: 10000 }),
    ).toHaveAttribute('href', '/lesson/lesson-demo-2');
  });

  it('falls back to course review when the selected course is fully complete', async () => {
    const fixture = readFixtureState();
    const course = {
      ...fixture.courses[0],
      id: 'course-finished',
      title: 'Course Finished',
      slug: 'course-finished',
    };

    writeFixtureState({
      ...fixture,
      courses: [course],
      enrollments: [
        {
          course_id: course.id,
          status: 'in_progress',
          progress_bp: 10000,
          last_accessed_at: '2026-04-04T10:00:00Z',
          courses: course,
        },
      ],
      completedLessonIds: ['lesson-demo-1', 'lesson-demo-2'],
    });

    renderRoute('/home', 'user');
    const currentCourseCard = await screen.findByTestId('home-current-course-card', {}, { timeout: 10000 });
    expect(
      await within(currentCourseCard).findByTestId('home-continue-link', {}, { timeout: 10000 }),
    ).toHaveAttribute('href', `/course/${course.id}`);
  });

  it('shows the no-current-course state and preserves the ai coach and live2d stage', async () => {
    const fixture = readFixtureState();
    writeFixtureState({
      ...fixture,
      enrollments: [],
      completedLessonIds: [],
    });

    renderRoute('/home', 'user');

    expect(await screen.findByRole('heading', { name: /今天开始学习/i })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /浏览课程/i })).toHaveAttribute('href', '/library');
    expect(screen.queryByTestId('home-course-switcher')).not.toBeInTheDocument();
    expect(await screen.findByTestId('home-live2d-stage')).toBeInTheDocument();
    expect(await screen.findByTestId('home-coach-card')).toBeInTheDocument();
    expect(await screen.findByText(/先挑一门你愿意继续的课/i)).toBeInTheDocument();
  });
});
