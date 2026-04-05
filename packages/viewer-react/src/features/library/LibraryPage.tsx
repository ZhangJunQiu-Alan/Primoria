import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpenText,
  Code2,
  Cpu,
  FlaskConical,
  GraduationCap,
  LayoutGrid,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchCourses, fetchSubjects } from '@/shared/api/viewer/catalogApi';
import { ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { useViewerCopy } from '@/shared/theme/copy';
import { cn } from '@/shared/utils/cn';

function subjectVisual(name: string, index: number) {
  const normalized = name.toLowerCase();
  if (normalized === '全部' || normalized === 'all') {
    return {
      icon: LayoutGrid,
      outline: 'border-[#b8d0ba]',
      iconBox: 'bg-[linear-gradient(145deg,#a8c5ac_0%,#7a9e7e_100%)] text-white shadow-[0_12px_24px_rgba(122,158,126,0.22)]',
      chipText: 'text-[#6e6156]',
      activeCard:
        'border-[#b9d1bc] bg-[linear-gradient(180deg,rgba(235,243,232,0.96)_0%,rgba(223,240,224,0.88)_100%)] text-[#5c7d60] shadow-[0_16px_30px_rgba(122,158,126,0.14)]',
      courseWash: 'from-[#e5f0e3] via-[#f7f2e8] to-[#f2eadc]',
      badgeTone: 'bg-[#edf5ec] text-[#5c7d60] border-[#c8dbcb]',
    };
  }
  if (normalized.includes('physics') || normalized.includes('earth') || normalized.includes('chem')) {
    return {
      icon: FlaskConical,
      outline: 'border-[#d8c8ab]',
      iconBox: 'bg-[#fbf0df] text-[#b58248]',
      chipText: 'text-[#6e6156]',
      activeCard:
        'border-[#e0cfb2] bg-[linear-gradient(180deg,#fdf4e6_0%,#f5e3c5_100%)] text-[#9a6f3f] shadow-[0_16px_30px_rgba(196,149,106,0.14)]',
      courseWash: 'from-[#f8ecd9] via-[#f6f0e5] to-[#ebe5d7]',
      badgeTone: 'bg-[#fbf3e6] text-[#986c3e] border-[#ead2af]',
    };
  }
  if (normalized.includes('math') || normalized.includes('engineer') || normalized.includes('cs')) {
    return {
      icon: Code2,
      outline: 'border-[#cfdbce]',
      iconBox: 'bg-[#edf5ec] text-[#678569]',
      chipText: 'text-[#6e6156]',
      activeCard:
        'border-[#c7d8c9] bg-[linear-gradient(180deg,#eef5ed_0%,#ddebdc_100%)] text-[#5c7d60] shadow-[0_16px_30px_rgba(122,158,126,0.14)]',
      courseWash: 'from-[#e2efe1] via-[#f6f0e5] to-[#eee3d8]',
      badgeTone: 'bg-[#edf5ec] text-[#5c7d60] border-[#c8dbcb]',
    };
  }
  if (normalized.includes('bio')) {
    return {
      icon: GraduationCap,
      outline: 'border-[#d0ddcc]',
      iconBox: 'bg-[#eef5ec] text-[#709071]',
      chipText: 'text-[#6e6156]',
      activeCard:
        'border-[#cad9c7] bg-[linear-gradient(180deg,#edf5ec_0%,#dceadb_100%)] text-[#5c7d60] shadow-[0_16px_30px_rgba(122,158,126,0.14)]',
      courseWash: 'from-[#e4efe0] via-[#f3ede2] to-[#ece3d7]',
      badgeTone: 'bg-[#edf5ec] text-[#5f7f61] border-[#c8dbcb]',
    };
  }
  if (normalized.includes('data')) {
    return {
      icon: BookOpenText,
      outline: 'border-[#dacde1]',
      iconBox: 'bg-[#f4eef7] text-[#85718f]',
      chipText: 'text-[#6e6156]',
      activeCard:
        'border-[#d7cbdf] bg-[linear-gradient(180deg,#f5eff7_0%,#ebe2f0_100%)] text-[#7a6a83] shadow-[0_16px_30px_rgba(169,154,180,0.16)]',
      courseWash: 'from-[#f0e8f3] via-[#f6efe5] to-[#eee6dc]',
      badgeTone: 'bg-[#f3edf7] text-[#7f6f88] border-[#dbcde3]',
    };
  }
  const choices = [
    {
      icon: Code2,
      outline: 'border-[#cfdbce]',
      iconBox: 'bg-[#edf5ec] text-[#678569]',
      chipText: 'text-[#6e6156]',
      activeCard:
        'border-[#c7d8c9] bg-[linear-gradient(180deg,#eef5ed_0%,#ddebdc_100%)] text-[#5c7d60] shadow-[0_16px_30px_rgba(122,158,126,0.14)]',
      courseWash: 'from-[#e2efe1] via-[#f6f0e5] to-[#eee3d8]',
      badgeTone: 'bg-[#edf5ec] text-[#5c7d60] border-[#c8dbcb]',
    },
    {
      icon: Cpu,
      outline: 'border-[#d9d2c3]',
      iconBox: 'bg-[#f3efe8] text-[#8e7862]',
      chipText: 'text-[#6e6156]',
      activeCard:
        'border-[#ded1be] bg-[linear-gradient(180deg,#f8f1e6_0%,#ede1ce_100%)] text-[#8d6c45] shadow-[0_16px_30px_rgba(196,149,106,0.14)]',
      courseWash: 'from-[#f2e7d7] via-[#f6f0e4] to-[#ebe5d9]',
      badgeTone: 'bg-[#fbf3e6] text-[#9a6f3f] border-[#ead2af]',
    },
  ];
  return choices[index % choices.length];
}

function formatDuration(minutes: number, language: 'zh-CN' | 'en') {
  if (minutes >= 60) {
    const hours = Math.max(1, Math.round((minutes / 60) * 10) / 10);
    return language === 'zh-CN' ? `${hours} 小时` : `${hours}h`;
  }
  return language === 'zh-CN' ? `${minutes} 分钟` : `${minutes}m`;
}

function formatDifficulty(level: string, language: 'zh-CN' | 'en') {
  const normalized = level.trim().toLowerCase();
  if (!normalized) {
    return language === 'zh-CN' ? '开放' : 'Open';
  }
  if (language === 'zh-CN') {
    if (normalized === 'beginner') return '入门';
    if (normalized === 'intermediate') return '进阶';
    if (normalized === 'advanced') return '挑战';
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function LibraryPage() {
  const language = useProductLanguage();
  const copy = useViewerCopy();
  const [query, setQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const subjectsQuery = useQuery({
    queryKey: ['viewer', 'subjects'],
    queryFn: fetchSubjects,
  });
  const coursesQuery = useQuery({
    queryKey: ['viewer', 'courses', deferredQuery, selectedSubjectId],
    queryFn: () => fetchCourses({ searchQuery: deferredQuery, subjectId: selectedSubjectId ?? undefined }),
  });

  const subjects = subjectsQuery.data ?? [];
  const courses = coursesQuery.data ?? [];

  const subjectButtons = useMemo(
    () => [{ id: null, name: copy.library.allSubjects }, ...subjects],
    [copy.library.allSubjects, subjects],
  );

  const requestError =
    (subjectsQuery.error instanceof Error && subjectsQuery.error.message) ||
    (coursesQuery.error instanceof Error && coursesQuery.error.message) ||
    '';

  return (
    <div className="mx-auto w-full max-w-[1320px] px-5 py-6 md:px-8 md:py-8">
      <section className="viewer-panel overflow-hidden rounded-b-[30px] rounded-t-none px-0 pb-4 pt-0 md:pb-5">
        <label className="flex items-center gap-2.5 rounded-b-[22px] rounded-t-none border-b border-[#ddd3c3] bg-[rgba(255,252,247,0.92)] px-5 py-3.5 text-[#9b8e85] shadow-[inset_0_1px_3px_rgba(90,70,50,0.05)] md:px-6">
          <Search size={20} />
          <input
            aria-label={copy.common.search}
            className="min-w-0 flex-1 border-0 bg-transparent text-[0.92rem] font-medium text-[#3d342a] outline-none placeholder:text-[#aa9d93]"
            placeholder={copy.library.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="px-4 pt-4 md:px-5 md:pt-5">
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-3">
              {subjectButtons.map((subject, index) => {
                const isActive = selectedSubjectId === subject.id || (!selectedSubjectId && subject.id === null);
                const visual = subjectVisual(subject.name, index);
                const Icon = visual.icon;

                return (
                  <button
                    key={subject.id ?? 'all'}
                    type="button"
                    className={cn(
                      'flex min-w-[6.25rem] flex-col items-center gap-2 rounded-[24px] border px-3.5 py-3 transition',
                      isActive
                        ? visual.activeCard
                        : 'border-[#e1d7c8] bg-[rgba(255,252,247,0.8)] text-[#6e6156] hover:border-[#d2c6b6] hover:bg-[#faf4ea]',
                    )}
                    onClick={() => setSelectedSubjectId(subject.id)}
                  >
                    <div
                      className={cn(
                        'flex h-11 w-14 items-center justify-center rounded-[16px] border',
                        isActive ? 'border-white/20 bg-[rgba(255,255,255,0.55)] text-current' : `${visual.outline} ${visual.iconBox}`,
                      )}
                    >
                      <Icon size={20} />
                    </div>
                    <span className={cn('text-[0.78rem] font-semibold leading-4', isActive ? 'text-current' : visual.chipText)}>
                      {subject.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8">
        <h2
          className="text-[2.2rem] font-semibold tracking-[-0.04em] text-[#3d342a]"
          style={{ fontFamily: '"Cormorant Garamond", serif' }}
        >
          {copy.library.allCourses}
        </h2>
      </div>

      {subjectsQuery.isLoading || coursesQuery.isLoading ? <LoadingStateCard /> : null}
      {requestError ? (
        <ErrorStateCard
          message={requestError}
          onRetry={() => {
            void subjectsQuery.refetch();
            void coursesQuery.refetch();
          }}
        />
      ) : null}
      {!subjectsQuery.isLoading && !coursesQuery.isLoading && !requestError && courses.length === 0 ? (
        <div className="mt-4 rounded-[26px] border border-[#ddd3c3] bg-[rgba(254,250,245,0.88)] p-6 shadow-[0_18px_44px_rgba(90,70,50,0.08)]">
          <p className="text-[0.92rem] font-medium text-[#7a6f66]">{copy.library.noResults}</p>
        </div>
      ) : null}

      {!subjectsQuery.isLoading && !coursesQuery.isLoading && !requestError && courses.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course, index) => {
            const subjectName = course.subjects?.name || (language === 'zh-CN' ? '综合' : 'General');
            const visual = subjectVisual(subjectName, index);
            return (
              <Link
                key={course.id}
                to={`/course/${course.id}`}
                className="group viewer-panel flex h-full flex-col overflow-hidden rounded-[30px] p-0 transition hover:-translate-y-1 hover:shadow-[0_26px_54px_rgba(90,70,50,0.13)]"
              >
                <div
                  className={cn(
                    'relative flex h-36 items-center justify-center overflow-hidden border-b border-[#e4d8ca] bg-gradient-to-br xl:h-40',
                    visual.courseWash,
                  )}
                  style={
                    course.thumbnail_url
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(61,52,42,0.08), rgba(61,52,42,0.08)), url(${course.thumbnail_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined
                  }
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.55),transparent_40%),radial-gradient(circle_at_80%_75%,rgba(196,149,106,0.16),transparent_32%)]" />
                  <span className={cn('absolute left-4 top-4 rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em]', visual.badgeTone)}>
                    {subjectName}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3
                    className="text-[1.4rem] font-semibold leading-[1.08] text-[#3d342a] xl:text-[1.5rem]"
                    style={{ fontFamily: '"Cormorant Garamond", serif' }}
                  >
                    {course.title}
                  </h3>
                  <p className="mt-3 min-h-[4.15rem] text-[0.94rem] leading-7 text-[#6f6359]">
                    {course.description || '从这门课开始建立你的节奏，逐步进入完整学习路径。'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#ddd3c3] bg-[#faf4ea] px-3 py-1 text-[0.76rem] font-medium text-[#7a6b5e]">
                      {formatDifficulty(course.difficulty_level, language)}
                    </span>
                    <span className="rounded-full border border-[#ddd3c3] bg-[#faf4ea] px-3 py-1 text-[0.76rem] font-medium text-[#7a6b5e]">
                      {formatDuration(course.estimated_minutes, language)}
                    </span>
                    {course.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[#ddd3c3] bg-[rgba(255,255,255,0.66)] px-3 py-1 text-[0.76rem] font-medium text-[#8c7f74]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
