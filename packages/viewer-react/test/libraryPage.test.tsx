import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ViewerCourse, ViewerSubject } from '@/shared/api/viewer/types';
import { renderRoute } from './renderApp';

const { mockFetchSubjects, mockFetchCourses, mockFetchOwnedCourses } = vi.hoisted(() => ({
  mockFetchSubjects: vi.fn(),
  mockFetchCourses: vi.fn(),
  mockFetchOwnedCourses: vi.fn(),
}));

vi.mock('@/shared/api/viewer/catalogApi', async () => {
  const actual = await vi.importActual<typeof import('@/shared/api/viewer/catalogApi')>(
    '@/shared/api/viewer/catalogApi',
  );

  return {
    ...actual,
    fetchSubjects: mockFetchSubjects,
    fetchCourses: mockFetchCourses,
    fetchOwnedCourses: mockFetchOwnedCourses,
  };
});

describe('LibraryPage', () => {
  const subjectAll: ViewerSubject = {
    id: 'subject-general',
    name: 'Physics',
    color_hex: '#7a9e7e',
  };
  const coursePhysics: ViewerCourse = {
    id: 'course-physics',
    title: '运动与力学观察',
    slug: 'physics-observation',
    description: 'Physics foundation',
    thumbnail_url: null,
    content_language: 'zh-CN',
    difficulty_level: 'beginner',
    estimated_minutes: 54,
    tags: ['physics'],
    subject_id: subjectAll.id,
    subjects: subjectAll,
    published_at: '2026-04-01T00:00:00Z',
  };
  const courseData: ViewerCourse = {
    ...coursePhysics,
    id: 'course-data',
    title: '数据与 AI 入门',
    slug: 'data-ai-intro',
    description: 'Data path',
    tags: ['data', 'ai'],
  };

  beforeEach(() => {
    mockFetchSubjects.mockReset();
    mockFetchCourses.mockReset();
    mockFetchOwnedCourses.mockReset();
    mockFetchSubjects.mockResolvedValue([subjectAll, { ...subjectAll, id: 'subject-data', name: 'Data Science & AI' }]);
    mockFetchCourses.mockImplementation(async ({ searchQuery }: { searchQuery?: string }) => {
      const normalized = searchQuery?.trim().toLowerCase() ?? '';
      if (!normalized) {
        return [coursePhysics, courseData];
      }
      if (normalized.includes('不存在')) {
        return [];
      }
      return [courseData];
    });
    mockFetchOwnedCourses.mockResolvedValue([]);
  });

  it('filters courses by subject and search query', async () => {
    const user = userEvent.setup();
    renderRoute('/library', 'user');

    expect(await screen.findByText(/课程库/i, {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /physics/i }, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /data science & ai/i }, { timeout: 10000 })).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /physics/i }, { timeout: 10000 }));
    expect(await screen.findByText(/运动与力学观察/i)).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /^全部$/i }, { timeout: 10000 }));
    const searchBox = await screen.findByRole('textbox', { name: /搜索/i });

    await user.type(searchBox, '数据与 AI');
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });
    expect(await screen.findByText(/数据与 ai 入门/i)).toBeInTheDocument();

    await user.clear(searchBox);
    await user.type(searchBox, '不存在的测试课');
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });
    expect(await screen.findByText(/没有匹配的课程/i)).toBeInTheDocument();
  });

  it('keeps the previous course grid visible while a new search is still in flight', async () => {
    let resolveSearch: ((courses: ViewerCourse[]) => void) | undefined;
    mockFetchCourses.mockImplementation(({ searchQuery }: { searchQuery?: string }) => {
      const normalized = searchQuery?.trim().toLowerCase() ?? '';
      if (!normalized) {
        return Promise.resolve([coursePhysics, courseData]);
      }

      return new Promise<ViewerCourse[]>((resolve) => {
        resolveSearch = resolve;
      });
    });

    const user = userEvent.setup();
    renderRoute('/library', 'user');

    expect(await screen.findByText(/运动与力学观察/i)).toBeInTheDocument();
    const searchBox = await screen.findByRole('textbox', { name: /搜索/i });

    await user.clear(searchBox);
    await user.type(searchBox, '数据');
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });

    expect(screen.getByText(/运动与力学观察/i)).toBeInTheDocument();
    expect(screen.getByText(/正在更新结果/i)).toBeInTheDocument();

    const settleSearch = resolveSearch;
    if (!settleSearch) {
      throw new Error('Expected delayed search resolver to be available.');
    }
    settleSearch([courseData]);
    expect(await screen.findByText(/数据与 ai 入门/i)).toBeInTheDocument();
  });

  it('applies companion recommendation ranking from query params', async () => {
    const currentCourse: ViewerCourse = {
      ...coursePhysics,
      id: 'course-current',
      title: '当前课程',
      difficulty_level: 'beginner',
      estimated_minutes: 42,
    };
    const harderCourse: ViewerCourse = {
      ...coursePhysics,
      id: 'course-harder',
      title: '进阶推荐',
      difficulty_level: 'intermediate',
      estimated_minutes: 48,
    };
    const advancedCourse: ViewerCourse = {
      ...coursePhysics,
      id: 'course-advanced',
      title: '挑战推荐',
      difficulty_level: 'advanced',
      estimated_minutes: 58,
    };

    mockFetchCourses.mockResolvedValue([currentCourse, advancedCourse, harderCourse]);

    renderRoute(
      '/library?source=home-companion&subjectId=subject-general&recommendFrom=course-current&recommendPace=harder',
      'user',
    );

    expect(await screen.findByTestId('library-companion-banner')).toBeInTheDocument();

    const courseHeadings = await screen.findAllByRole('heading', { level: 3 });
    expect(courseHeadings.map((heading) => heading.textContent)).toEqual(['进阶推荐', '挑战推荐', '当前课程']);
  });

  it('renders owned courses above all courses, toggles the section, and links into the course page', async () => {
    const user = userEvent.setup();
    const ownedCourse: ViewerCourse = {
      ...coursePhysics,
      id: 'owned-course',
      title: '我的 Python 草稿',
      slug: 'my-python-draft',
      description: 'Owned course summary',
      estimated_minutes: 600,
      tags: ['owned-tag'],
    };
    mockFetchOwnedCourses.mockResolvedValue([ownedCourse]);

    const { locationRef } = renderRoute('/library', 'user');

    expect(await screen.findByRole('heading', { name: /自有课程/i }, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /全部课程/i }, { timeout: 10000 })).toBeInTheDocument();

    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(['自有课程', '全部课程']);

    const ownedLink = screen.getByRole('link', { name: /我的 python 草稿/i });
    expect(ownedLink).toHaveAttribute('href', '/course/owned-course');
    expect(screen.queryByText(/owned course summary/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/10 小时/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/owned-tag/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /折叠自有课程/i }));
    expect(screen.queryByText(/我的 python 草稿/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /展开自有课程/i }));
    expect(await screen.findByText(/我的 python 草稿/i)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /我的 python 草稿/i }));
    await waitFor(() => {
      expect(locationRef.pathname).toBe('/course/owned-course');
    });
  });

  it('applies subject and search filters to both owned and public courses', async () => {
    const user = userEvent.setup();
    const subjectData: ViewerSubject = {
      id: 'subject-data',
      name: 'Data Science & AI',
      color_hex: '#9481A8',
    };
    const publicPhysics = coursePhysics;
    const publicData: ViewerCourse = {
      ...courseData,
      id: 'public-data',
      title: '公开数据课程',
      subject_id: subjectData.id,
      subjects: subjectData,
    };
    const ownedPhysics: ViewerCourse = {
      ...coursePhysics,
      id: 'owned-physics',
      title: '我的物理课程',
      slug: 'owned-physics',
      description: 'Owned physics',
    };
    const ownedData: ViewerCourse = {
      ...courseData,
      id: 'owned-data',
      title: '我的数据课程',
      slug: 'owned-data',
      description: 'Owned data',
      subject_id: subjectData.id,
      subjects: subjectData,
    };

    mockFetchSubjects.mockResolvedValue([subjectAll, subjectData]);
    mockFetchCourses.mockImplementation(
      async ({ searchQuery, subjectId }: { searchQuery?: string; subjectId?: string }) => {
        const normalized = searchQuery?.trim().toLowerCase() ?? '';
        return [publicPhysics, publicData].filter((course) => {
          const subjectMatch = !subjectId || course.subject_id === subjectId;
          const searchMatch =
            !normalized ||
            course.title.toLowerCase().includes(normalized) ||
            course.description.toLowerCase().includes(normalized);
          return subjectMatch && searchMatch;
        });
      },
    );
    mockFetchOwnedCourses.mockImplementation(
      async ({ searchQuery, subjectId }: { searchQuery?: string; subjectId?: string }) => {
        const normalized = searchQuery?.trim().toLowerCase() ?? '';
        return [ownedPhysics, ownedData].filter((course) => {
          const subjectMatch = !subjectId || course.subject_id === subjectId;
          const searchMatch =
            !normalized ||
            course.title.toLowerCase().includes(normalized) ||
            course.description.toLowerCase().includes(normalized);
          return subjectMatch && searchMatch;
        });
      },
    );

    renderRoute('/library', 'user');

    expect(await screen.findByText(/我的物理课程/i)).toBeInTheDocument();
    expect(await screen.findByText(/公开数据课程/i)).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /data science & ai/i }, { timeout: 10000 }));
    expect(await screen.findByText(/我的数据课程/i)).toBeInTheDocument();
    expect(await screen.findByText(/公开数据课程/i)).toBeInTheDocument();
    expect(screen.queryByText(/我的物理课程/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/运动与力学观察/i)).not.toBeInTheDocument();

    const searchBox = await screen.findByRole('textbox', { name: /搜索/i });
    await user.clear(searchBox);
    await user.type(searchBox, '我的');
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });

    expect(await screen.findByText(/我的数据课程/i)).toBeInTheDocument();
    expect(screen.queryByText(/公开数据课程/i)).not.toBeInTheDocument();
  });

  it('hides the owned courses section when the user has no authored courses', async () => {
    renderRoute('/library', 'user');

    expect(await screen.findByRole('heading', { name: /全部课程/i }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /自有课程/i })).not.toBeInTheDocument();
  });
});
