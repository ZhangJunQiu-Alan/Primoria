import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import authReducer, { setSession } from '../src/store/authSlice';
import editorReducer from '../src/store/editorSlice';

const storageState = new Map<string, string>();

const queryMocks = vi.hoisted(() => ({
  useCourseList: vi.fn(),
  useCreateCourse: vi.fn(),
  useUpdateCourse: vi.fn(),
  useDeleteCourse: vi.fn(),
  useDuplicateCourse: vi.fn(),
  useImportCourse: vi.fn(),
  useAddLesson: vi.fn(),
  useDeleteLesson: vi.fn(),
}));

const authFns = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

const supabaseTableFns = vi.hoisted(() => ({
  from: vi.fn(),
  profileMaybeSingle: vi.fn(),
  profileUpsert: vi.fn(),
  userSettingsMaybeSingle: vi.fn(),
  userSettingsUpsert: vi.fn(),
}));

vi.mock('@/queries/courses', () => queryMocks);

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: authFns,
    from: supabaseTableFns.from,
  },
}));

import { DashboardPage } from '../src/pages/dashboard/DashboardPage';

function installLocalStorageMock() {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      get length() {
        return storageState.size;
      },
      getItem(key: string) {
        return storageState.get(key) ?? null;
      },
      key(index: number) {
        return Array.from(storageState.keys())[index] ?? null;
      },
      removeItem(key: string) {
        storageState.delete(key);
      },
      setItem(key: string, value: string) {
        storageState.set(key, String(value));
      },
    },
  });
}

function makeStore() {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      editor: editorReducer,
    },
  });

  store.dispatch(
    setSession({
      user: {
        id: 'author-1',
        email: 'author@primoria.dev',
      } as never,
      session: null,
    }),
  );

  return store;
}

function renderDashboard(initialEntry = '/dashboard') {
  const user = userEvent.setup();
  const store = makeStore();

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/" element={<div>Landing route</div>} />
          <Route path="/login" element={<div>Login route</div>} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/editor/:courseId" element={<div>Editor route</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

  return { user, store };
}

const courses = [
  {
    id: 'course-1',
    title: 'Botanical Motion Basics',
    description: 'Build a short motion course with layered scenes.',
    thumbnail_url: null,
    status: 'draft',
    created_at: '2026-03-19T01:00:00.000Z',
    updated_at: '2026-03-19T03:00:00.000Z',
    difficulty_level: 'beginner',
    estimated_minutes: 90,
    price_tier: 'free',
    price: 0,
    tags: ['motion', 'visual'],
    lessons: [
      {
        id: 'lesson-1',
        title: 'Scene blocking',
        sort_key: 1000,
        duration_seconds: 600,
        type: 'interactive',
        updated_at: '2026-03-19T03:00:00.000Z',
      },
    ],
  },
  {
    id: 'course-2',
    title: 'Systems Thinking for Authors',
    description: 'A published workflow course for course teams.',
    thumbnail_url: 'https://example.com/course.png',
    status: 'published',
    created_at: '2026-03-18T01:00:00.000Z',
    updated_at: '2026-03-18T04:00:00.000Z',
    difficulty_level: 'intermediate',
    estimated_minutes: 120,
    price_tier: 'premium',
    price: 12.5,
    tags: ['systems'],
    lessons: [
      {
        id: 'lesson-2',
        title: 'Feedback loops',
        sort_key: 1000,
        duration_seconds: 900,
        type: 'interactive',
        updated_at: '2026-03-18T04:00:00.000Z',
      },
      {
        id: 'lesson-3',
        title: 'Operating cadence',
        sort_key: 2000,
        duration_seconds: 900,
        type: 'interactive',
        updated_at: '2026-03-18T04:00:00.000Z',
      },
    ],
  },
];

beforeEach(() => {
  storageState.clear();
  installLocalStorageMock();
  authFns.signOut.mockReset();
  authFns.signOut.mockResolvedValue({ error: null });
  supabaseTableFns.from.mockReset();
  supabaseTableFns.profileMaybeSingle.mockReset();
  supabaseTableFns.profileUpsert.mockReset();
  supabaseTableFns.userSettingsMaybeSingle.mockReset();
  supabaseTableFns.userSettingsUpsert.mockReset();
  window.localStorage?.removeItem?.('primoria_builder_settings');

  supabaseTableFns.profileMaybeSingle.mockResolvedValue({
    data: {
      avatar_url: null,
      role: 'admin',
      username: 'author',
    },
    error: null,
  });
  supabaseTableFns.profileUpsert.mockResolvedValue({ error: null });
  supabaseTableFns.userSettingsMaybeSingle.mockResolvedValue({
    data: {
      accessibility_mode: false,
      language: 'en',
      marketing_emails: false,
      notification_daily_reminder: false,
      notification_reminder_time: '09:00:00',
    },
    error: null,
  });
  supabaseTableFns.userSettingsUpsert.mockResolvedValue({ error: null });
  supabaseTableFns.from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: supabaseTableFns.profileMaybeSingle,
          }),
        }),
        upsert: supabaseTableFns.profileUpsert,
      };
    }

    if (table === 'user_settings') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: supabaseTableFns.userSettingsMaybeSingle,
          }),
        }),
        upsert: supabaseTableFns.userSettingsUpsert,
      };
    }

    throw new Error(`Unexpected table access: ${table}`);
  });

  queryMocks.useCourseList.mockReturnValue({
    data: courses,
    isLoading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue({ error: null }),
    isRefetching: false,
  });

  queryMocks.useCreateCourse.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({
      id: 'course-new',
      title: 'New course',
    }),
    isPending: false,
  });

  queryMocks.useUpdateCourse.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  });

  queryMocks.useDeleteCourse.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  });

  queryMocks.useDuplicateCourse.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({
      course: { id: 'course-copy' },
    }),
    isPending: false,
  });

  queryMocks.useImportCourse.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({
      course: { id: 'course-imported' },
    }),
    isPending: false,
  });

  queryMocks.useAddLesson.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  });

  queryMocks.useDeleteLesson.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  });
});

describe('DashboardPage', () => {
  it('renders the author home by default and switches to the data center tab', async () => {
    const { user } = renderDashboard();

    expect(screen.getByRole('heading', { name: /learning overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^home$/i })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: /^data center$/i }));

    expect(screen.getByRole('heading', { name: /data center overview/i })).toBeInTheDocument();
    expect(screen.getByText(/course type distribution/i)).toBeInTheDocument();
  });

  it('renders the botanical course workspace with live course data', async () => {
    const { user } = renderDashboard();

    await user.click(screen.getByRole('button', { name: /^course management$/i }));

    expect(
      screen.getByRole('heading', {
        name: /course management workspace/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/botanical motion basics/i)).toBeInTheDocument();
    expect(screen.getByText(/systems thinking for authors/i)).toBeInTheDocument();
    expect(screen.getByText(/needs content/i)).toBeInTheDocument();
    expect(screen.getByText(/feedback loops/i)).toBeInTheDocument();
  });

  it('filters the catalog locally and shows the no-results state', async () => {
    const { user } = renderDashboard('/dashboard?tab=course');

    await user.type(screen.getByLabelText(/search courses/i), 'chemistry');

    expect(screen.getByRole('heading', { name: /no matching courses/i })).toBeInTheDocument();
    expect(screen.queryByText(/botanical motion basics/i)).not.toBeInTheDocument();
  });

  it('creates a course from the dashboard dialog and routes into the editor', async () => {
    const createMutation = vi.fn().mockResolvedValue({
      id: 'course-new',
      title: 'Floral Layout Systems',
    });
    queryMocks.useCreateCourse.mockReturnValue({
      mutateAsync: createMutation,
      isPending: false,
    });

    const { user } = renderDashboard('/dashboard?tab=course');

    await user.click(screen.getByRole('button', { name: /^create course$/i }));

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/course title/i), 'Floral Layout Systems');
    await user.click(within(dialog).getByRole('button', { name: /^create course$/i }));

    expect(createMutation).toHaveBeenCalledWith({
      title: 'Floral Layout Systems',
      description: undefined,
      thumbnailUrl: undefined,
      difficultyLevel: 'beginner',
      estimatedMinutes: null,
      priceTier: 'free',
      price: 0,
      userId: 'author-1',
    });
  });

  it('prevents deleting the last lesson and surfaces a clear notice', async () => {
    const { user } = renderDashboard('/dashboard?tab=course');

    await user.hover(screen.getByText(/scene blocking/i));
    await user.click(screen.getByRole('button', { name: /delete scene blocking/i }));

    expect(screen.getByText(/at least one lesson/i)).toBeInTheDocument();
  });

  it('opens the settings center from the avatar menu and removes the dashboard shortcut', async () => {
    const { user } = renderDashboard();

    await user.click(screen.getByRole('button', { name: /open account menu/i }));

    expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /dashboard/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: /settings/i }));

    expect(await screen.findByText(/^settings$/i)).toBeInTheDocument();
    expect(await screen.findByDisplayValue('author@primoria.dev')).toBeInTheDocument();
  });

  it('saves account settings to Supabase from the React settings center', async () => {
    const { user } = renderDashboard();

    await user.click(screen.getByRole('button', { name: /open account menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /settings/i }));

    const displayNameField = await screen.findByLabelText(/display name/i);
    const avatarField = screen.getByLabelText(/avatar url/i);

    await user.clear(displayNameField);
    await user.type(displayNameField, 'gardenauthor');
    await user.type(avatarField, 'https://example.com/avatar.png');
    await user.click(screen.getByRole('button', { name: /^save account$/i }));

    await waitFor(() => {
      expect(supabaseTableFns.profileUpsert).toHaveBeenCalledWith(
        {
          avatar_url: 'https://example.com/avatar.png',
          id: 'author-1',
          username: 'gardenauthor',
        },
        { onConflict: 'id' },
      );
    });

    expect(supabaseTableFns.userSettingsUpsert).toHaveBeenCalledWith(
      {
        accessibility_mode: false,
        language: 'en',
        user_id: 'author-1',
      },
      { onConflict: 'user_id' },
    );
  });

  it('stores browser-scoped workflow settings in local storage', async () => {
    const { user } = renderDashboard();

    await user.click(screen.getByRole('button', { name: /open account menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /settings/i }));

    await screen.findByText(/^settings$/i);
    await user.click(screen.getByRole('button', { name: /workflow/i }));
    await user.selectOptions(screen.getByLabelText(/default difficulty/i), 'advanced');
    await user.click(screen.getByRole('button', { name: /^save workflow$/i }));

    const raw = window.localStorage.getItem('primoria_builder_settings');
    expect(raw).toContain('"defaultDifficulty":"advanced"');
  });
});
