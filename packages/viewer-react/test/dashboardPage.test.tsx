import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { setSession } from '@/features/auth/authSlice';
import { createAppStore } from '@/shared/state/store';

const mockUseCourseList = vi.fn();
const mockUseDashboardAnalytics = vi.fn();

vi.mock('@/queries/courses', () => ({
  useCourseList: (...args: unknown[]) => mockUseCourseList(...args),
  useCreateCourse: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateCourse: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useDeleteCourse: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useDuplicateCourse: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useAddLesson: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useDeleteLesson: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock('@/queries/dashboardAnalytics', () => ({
  emptyDashboardAnalytics: {
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
  },
  useDashboardAnalytics: (...args: unknown[]) => mockUseDashboardAnalytics(...args),
}));

const courseRows = [
  {
    id: 'course-1',
    title: 'Algebra Foundations',
    description: 'Linear equations and variables.',
    thumbnail_url: null,
    status: 'published',
    published_at: '2026-04-01T08:00:00.000Z',
    created_at: '2026-03-12T08:00:00.000Z',
    updated_at: '2026-04-03T08:00:00.000Z',
    difficulty_level: 'beginner',
    estimated_minutes: 90,
    price_tier: 'free',
    price: 0,
    tags: ['Math'],
    lessons: [
      {
        id: 'lesson-1',
        title: 'Variables 101',
        sort_key: 0,
        duration_seconds: 900,
        type: 'interactive',
        updated_at: '2026-04-03T08:00:00.000Z',
      },
    ],
  },
  {
    id: 'course-2',
    title: 'Biology Lab Notes',
    description: 'Cells and membranes.',
    thumbnail_url: null,
    status: 'published',
    published_at: '2026-03-20T08:00:00.000Z',
    created_at: '2026-03-01T08:00:00.000Z',
    updated_at: '2026-04-02T08:00:00.000Z',
    difficulty_level: 'intermediate',
    estimated_minutes: 120,
    price_tier: 'premium',
    price: 24,
    tags: ['Science'],
    lessons: [
      {
        id: 'lesson-2',
        title: 'Cell Membrane',
        sort_key: 0,
        duration_seconds: 1200,
        type: 'interactive',
        updated_at: '2026-04-02T08:00:00.000Z',
      },
    ],
  },
  {
    id: 'course-3',
    title: 'Writing Draft Workshop',
    description: 'Outline and editing drills.',
    thumbnail_url: null,
    status: 'draft',
    published_at: null,
    created_at: '2026-02-20T08:00:00.000Z',
    updated_at: '2026-04-04T08:00:00.000Z',
    difficulty_level: 'beginner',
    estimated_minutes: 60,
    price_tier: 'free',
    price: 0,
    tags: ['Writing'],
    lessons: [
      {
        id: 'lesson-3',
        title: 'Outline First',
        sort_key: 0,
        duration_seconds: 600,
        type: 'article',
        updated_at: '2026-04-04T08:00:00.000Z',
      },
    ],
  },
];

const analyticsPayload = {
  summary: {
    weekly_learners: 48,
    total_study_hours: 126,
    current_completion_rate: 0.74,
    completion_delta_pct: 12.5,
    published_viewers: 204,
    average_completion_rate: 0.68,
  },
  home_daily_completion: [
    { date: '2026-03-29', completion_rate: 0.51 },
    { date: '2026-03-30', completion_rate: 0.57 },
    { date: '2026-03-31', completion_rate: 0.63 },
    { date: '2026-04-01', completion_rate: 0.66 },
    { date: '2026-04-02', completion_rate: 0.7 },
    { date: '2026-04-03', completion_rate: 0.72 },
    { date: '2026-04-04', completion_rate: 0.74 },
  ],
  monthly_activity_completion: [
    { month_start: '2025-11-01', active_learners: 4, completion_rate: 0.35 },
    { month_start: '2025-12-01', active_learners: 7, completion_rate: 0.42 },
    { month_start: '2026-01-01', active_learners: 11, completion_rate: 0.5 },
    { month_start: '2026-02-01', active_learners: 16, completion_rate: 0.56 },
    { month_start: '2026-03-01', active_learners: 22, completion_rate: 0.62 },
    { month_start: '2026-04-01', active_learners: 28, completion_rate: 0.68 },
  ],
  course_metrics: [
    {
      course_id: 'course-2',
      views: 120,
      students: 18,
      comments: 7,
      completion_rate: 0.76,
      last_activity_at: '2026-04-04T09:00:00.000Z',
    },
    {
      course_id: 'course-1',
      views: 84,
      students: 12,
      comments: 2,
      completion_rate: 0.64,
      last_activity_at: '2026-04-03T09:00:00.000Z',
    },
    {
      course_id: 'course-3',
      views: 0,
      students: 3,
      comments: 9,
      completion_rate: 0.2,
      last_activity_at: '2026-04-04T08:00:00.000Z',
    },
  ],
};

function renderDashboard(route: string) {
  const store = createAppStore();
  store.dispatch(
    setSession({
      user: {
        id: 'author-1',
        email: 'author@primoria.dev',
        displayName: 'Author Prime',
      },
      role: 'author',
      source: 'demo',
    }),
  );

  mockUseCourseList.mockReturnValue({
    data: courseRows,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isRefetching: false,
  });

  mockUseDashboardAnalytics.mockReturnValue({
    data: analyticsPayload,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <DashboardPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe('DashboardPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders home and data tabs from real analytics payloads', async () => {
    const user = userEvent.setup();
    renderDashboard('/builder/dashboard');

    const weeklyCard = screen.getByText('Weekly learners').closest('article');
    expect(weeklyCard).not.toBeNull();
    expect(within(weeklyCard as HTMLElement).getByText('48')).toBeInTheDocument();
    expect(screen.getByText('Views: 120 · Students: 18')).toBeInTheDocument();
    expect(screen.getByText('+12.5% vs last week')).toBeInTheDocument();
    expect(screen.queryByText('Create new course')).not.toBeInTheDocument();
    expect(screen.queryByText('Continue editing')).not.toBeInTheDocument();
    expect(screen.queryByText('View analytics')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /学习表现|learning performance/i }));

    const publishedViewersCard = await screen.findByText('Published viewers');
    expect(within(publishedViewersCard.closest('article') as HTMLElement).getByText('204')).toBeInTheDocument();
    expect(screen.getByText('Average completion')).toBeInTheDocument();
    expect(screen.getByText('68.0%')).toBeInTheDocument();
    expect(screen.getByText('Biology Lab Notes')).toBeInTheDocument();
    expect(screen.getByText('120 views')).toBeInTheDocument();
  });

  it('supports student and comment sort modes for the simplified course list', async () => {
    const user = userEvent.setup();
    renderDashboard('/builder/dashboard?tab=course');

    const sortSelect = screen.getByLabelText('Sort');
    await user.selectOptions(sortSelect, 'student');

    const courseList = screen.getByLabelText('Course list');
    let headings = within(courseList).getAllByRole('heading', { level: 2 }).map((node) => node.textContent);
    expect(headings.slice(0, 3)).toEqual([
      'Biology Lab Notes',
      'Algebra Foundations',
      'Writing Draft Workshop',
    ]);

    await user.selectOptions(sortSelect, 'comments');
    headings = within(courseList).getAllByRole('heading', { level: 2 }).map((node) => node.textContent);
    expect(headings.slice(0, 3)).toEqual([
      'Writing Draft Workshop',
      'Biology Lab Notes',
      'Algebra Foundations',
    ]);
  });

  it('opens the AI draft dialog and saves a front-end course brief notice', async () => {
    const user = userEvent.setup();
    renderDashboard('/builder/dashboard?tab=course');

    await user.click(screen.getByRole('button', { name: /create with ai/i }));

    expect(await screen.findByRole('heading', { name: /ai course draft/i })).toBeInTheDocument();

    const topicInput = screen.getByLabelText('Course topic');
    await user.clear(topicInput);
    await user.type(topicInput, 'Forces in Motion');

    const preview = screen.getByTestId('dashboard-ai-course-preview');
    expect(within(preview).getByRole('heading', { name: 'Forces in Motion' })).toBeInTheDocument();
    expect(within(preview).getByText(/front-end only/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /use this brief/i }));

    expect(await screen.findByText(/saved as an ai front-end brief only/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /ai course draft/i })).not.toBeInTheDocument();
  });
});
