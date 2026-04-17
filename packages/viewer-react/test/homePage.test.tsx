import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/react';
import { readFixtureState, writeFixtureState } from '@/shared/api/viewer/fixtureStore';
import { VIEWER_PREFERENCES_STORAGE_KEY } from '@/shared/state/preferencesSlice';
import { renderRoute } from './renderApp';

describe('HomePage', () => {
  it('selects the most recently accessed in-progress course and lets the learner switch it', async () => {
    const fixture = readFixtureState();
    const courseA = {
      ...fixture.courses[0],
      id: 'course-a',
      title: 'Physics Lab Sprint',
      slug: 'physics-lab-sprint',
      thumbnail_url: 'https://example.com/course-a-cover.png',
    };
    const courseB = {
      ...fixture.courses[0],
      id: 'course-b',
      title: 'Data Signals Studio',
      slug: 'data-signals-studio',
      difficulty_level: 'intermediate',
      thumbnail_url: 'https://example.com/course-b-cover.png',
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
    expect(within(currentCourseCard).getByTestId('home-current-course-cover')).toHaveAttribute(
      'src',
      'https://example.com/course-b-cover.png',
    );
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
    expect(
      within(await screen.findByTestId('home-current-course-card', {}, { timeout: 10000 })).getByTestId(
        'home-current-course-cover',
      ),
    ).toHaveAttribute('src', 'https://example.com/course-a-cover.png');
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

  it('shows the no-current-course state and preserves the live2d stage', async () => {
    const fixture = readFixtureState();
    writeFixtureState({
      ...fixture,
      enrollments: [],
      completedLessonIds: [],
    });

    renderRoute('/home', 'user');

    expect(screen.queryByRole('heading', { name: /今天开始学习/i })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /还没有当前学习课程/i })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /去找课程/i })).toHaveAttribute('href', '/library');
    expect(screen.queryByTestId('home-course-switcher')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-current-course-cover')).not.toBeInTheDocument();
    expect(await screen.findByTestId('home-live2d-stage')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^中文$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^English$/i })).not.toBeInTheDocument();
  });

  it('hides the home companion and swaps the ai tutor cta by persona', async () => {
    const fixture = readFixtureState();
    window.localStorage.setItem(
      VIEWER_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        language: 'zh-CN',
        aiTutorPersona: 'coach',
        homeCompanionEnabled: false,
      }),
    );
    writeFixtureState({
      ...fixture,
      enrollments: [],
      completedLessonIds: [],
    });

    renderRoute('/home', 'user');

    expect(await screen.findByRole('link', { name: /让导师给我下一步/i })).toHaveAttribute('href', '/ai-tutor');
    expect(screen.queryByTestId('home-live2d-stage')).not.toBeInTheDocument();
  });

  it('applies persona-specific tutor guidance copy on the current course card', async () => {
    const fixture = readFixtureState();
    window.localStorage.setItem(
      VIEWER_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        language: 'zh-CN',
        aiTutorPersona: 'socratic',
        homeCompanionEnabled: true,
      }),
    );
    const course = {
      ...fixture.courses[0],
      id: 'course-persona',
      title: 'Persona Course',
      slug: 'persona-course',
      description: '',
    };

    writeFixtureState({
      ...fixture,
      courses: [course],
      enrollments: [
        {
          course_id: course.id,
          status: 'in_progress',
          progress_bp: 3600,
          last_accessed_at: '2026-04-04T10:00:00Z',
          courses: course,
        },
      ],
      completedLessonIds: [],
    });

    renderRoute('/home', 'user');

    const currentCourseCard = await screen.findByTestId('home-current-course-card', {}, { timeout: 10000 });
    expect(within(currentCourseCard).getByText(/用一个问题帮你把关键点想清楚/i)).toBeInTheDocument();
    expect(within(currentCourseCard).getByText(/先用一个问题带你理清关键点/i)).toBeInTheDocument();
  });

  it('switches courses from the card edge controls and persists the selected course', async () => {
    const fixture = readFixtureState();
    const courseA = {
      ...fixture.courses[0],
      id: 'course-edge-a',
      title: 'Edge Course A',
      slug: 'edge-course-a',
    };
    const courseB = {
      ...fixture.courses[0],
      id: 'course-edge-b',
      title: 'Edge Course B',
      slug: 'edge-course-b',
    };
    const courseC = {
      ...fixture.courses[0],
      id: 'course-edge-c',
      title: 'Edge Course C',
      slug: 'edge-course-c',
    };

    writeFixtureState({
      ...fixture,
      courses: [courseA, courseB, courseC],
      enrollments: [
        {
          course_id: courseA.id,
          status: 'in_progress',
          progress_bp: 1800,
          last_accessed_at: '2026-04-05T10:00:00Z',
          courses: courseA,
        },
        {
          course_id: courseB.id,
          status: 'in_progress',
          progress_bp: 4200,
          last_accessed_at: '2026-04-04T10:00:00Z',
          courses: courseB,
        },
        {
          course_id: courseC.id,
          status: 'in_progress',
          progress_bp: 7600,
          last_accessed_at: '2026-04-03T10:00:00Z',
          courses: courseC,
        },
      ],
      completedLessonIds: [],
    });

    const user = userEvent.setup();
    renderRoute('/home', 'user');

    const currentCourseCard = await screen.findByTestId('home-current-course-card', {}, { timeout: 10000 });
    expect(within(currentCourseCard).getByText(/Edge Course A/i)).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /下一门课程/i }));
    expect(
      within(await screen.findByTestId('home-current-course-card', {}, { timeout: 10000 })).getByText(
        /Edge Course B/i,
      ),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem('viewer.home.current-course:demo-user')).toBe('course-edge-b');

    await user.click(await screen.findByRole('button', { name: /上一门课程/i }));
    expect(
      within(await screen.findByTestId('home-current-course-card', {}, { timeout: 10000 })).getByText(
        /Edge Course A/i,
      ),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem('viewer.home.current-course:demo-user')).toBe('course-edge-a');
  });

  it('opens the companion popover on click and closes it when clicking outside', async () => {
    const user = userEvent.setup();
    renderRoute('/home', 'user');

    const companionStage = await screen.findByTestId('home-live2d-stage');
    await user.click(companionStage);

    expect(await screen.findByTestId('home-companion-popover')).toBeInTheDocument();

    await user.click(await screen.findByTestId('home-companion-dismiss-layer'));
    expect(screen.queryByTestId('home-companion-popover')).not.toBeInTheDocument();
  });

  it('opens the community notes context from the companion popover', async () => {
    const user = userEvent.setup();
    renderRoute('/home', 'user');

    await user.click(await screen.findByTestId('home-live2d-stage'));
    await user.click(await screen.findByRole('button', { name: /查看课程相关笔记/i }));

    expect(await screen.findByText(/^一起学$/i, {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByTestId('community-companion-context')).toBeInTheDocument();
  });
});
