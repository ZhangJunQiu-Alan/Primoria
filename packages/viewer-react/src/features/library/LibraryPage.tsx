import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpenText,
  ChevronRight,
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
import { viewerCopy } from '@/shared/theme/copy';
import { cn } from '@/shared/utils/cn';

function subjectVisual(name: string, index: number) {
  const normalized = name.toLowerCase();
  if (normalized === '全部') {
    return {
      icon: LayoutGrid,
      ring: 'border-[#5f54f3]/30',
      iconBox: 'bg-[#7a6ff7] text-white shadow-none',
      chipText: 'text-white',
      activeCard: 'bg-[#564af1] text-white shadow-none',
    };
  }
  if (normalized.includes('physics') || normalized.includes('earth') || normalized.includes('chem')) {
    return {
      icon: FlaskConical,
      ring: 'border-[#a6e5ca]',
      iconBox: 'bg-[#e7fbf3] text-[#18b76a]',
      chipText: 'text-[#56657f]',
      activeCard: 'bg-[#40c98c] text-white shadow-[0_18px_32px_rgba(64,201,140,0.26)]',
    };
  }
  if (normalized.includes('math') || normalized.includes('engineer') || normalized.includes('cs')) {
    return {
      icon: Code2,
      ring: 'border-[#b8c9ff]',
      iconBox: 'bg-[#edf3ff] text-[#4c79f7]',
      chipText: 'text-[#56657f]',
      activeCard: 'bg-[#5375f6] text-white shadow-[0_18px_32px_rgba(83,117,246,0.26)]',
    };
  }
  if (normalized.includes('bio')) {
    return {
      icon: GraduationCap,
      ring: 'border-[#a5ebba]',
      iconBox: 'bg-[#edfbf1] text-[#32be66]',
      chipText: 'text-[#56657f]',
      activeCard: 'bg-[#3ec772] text-white shadow-[0_18px_32px_rgba(62,199,114,0.24)]',
    };
  }
  if (normalized.includes('data')) {
    return {
      icon: BookOpenText,
      ring: 'border-[#c6bbff]',
      iconBox: 'bg-[#f1ecff] text-[#7b5bee]',
      chipText: 'text-[#56657f]',
      activeCard: 'bg-[#7b5bee] text-white shadow-[0_18px_32px_rgba(123,91,238,0.26)]',
    };
  }
  const choices = [
    {
      icon: Code2,
      ring: 'border-[#b8c9ff]',
      iconBox: 'bg-[#edf3ff] text-[#4c79f7]',
      chipText: 'text-[#56657f]',
      activeCard: 'bg-[#5375f6] text-white shadow-[0_18px_32px_rgba(83,117,246,0.26)]',
    },
    {
      icon: Cpu,
      ring: 'border-[#b2e9f5]',
      iconBox: 'bg-[#eafafd] text-[#1db1dd]',
      chipText: 'text-[#56657f]',
      activeCard: 'bg-[#1db1dd] text-white shadow-[0_18px_32px_rgba(29,177,221,0.26)]',
    },
  ];
  return choices[index % choices.length];
}

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.max(1, Math.round((minutes / 60) * 10) / 10);
    return `${hours}h`;
  }
  return `${minutes}m`;
}

export function LibraryPage() {
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
    () => [{ id: null, name: viewerCopy.library.allSubjects }, ...subjects],
    [subjects],
  );

  const requestError =
    (subjectsQuery.error instanceof Error && subjectsQuery.error.message) ||
    (coursesQuery.error instanceof Error && coursesQuery.error.message) ||
    '';

  return (
    <div className="mx-auto w-[84%] px-0 py-5 md:py-6">
      <section className="viewer-panel rounded-[28px] px-4 py-4">
        <label className="flex items-center gap-2.5 rounded-[20px] border border-[#d9e3f0] bg-[#fafcff] px-4 py-3.5 text-[#a0aac1]">
          <Search size={20} />
          <input
            aria-label={viewerCopy.common.search}
            className="min-w-0 flex-1 border-0 bg-transparent text-[0.9rem] font-semibold text-[#2a3349] outline-none placeholder:text-[#a6b3cb]"
            placeholder="搜索课程..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="mt-5 overflow-x-auto pb-1">
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
                    'flex min-w-[5.5rem] flex-col items-center gap-2 rounded-[19px] px-3 py-2.5 transition',
                    isActive ? visual.activeCard : 'bg-white text-[#57647d]',
                  )}
                  onClick={() => setSelectedSubjectId(subject.id)}
                >
                  <div
                    className={cn(
                      'flex h-10 w-14 items-center justify-center rounded-[14px] border-2',
                      isActive ? 'border-white/18 bg-white/12 text-current' : `${visual.ring} ${visual.iconBox}`,
                    )}
                  >
                    <Icon size={20} />
                  </div>
                  <span className={cn('text-[0.78rem] font-black leading-4', isActive ? 'text-white' : visual.chipText)}>
                    {subject.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mt-8">
        <h2 className="text-[1.55rem] font-black tracking-[-0.05em] text-[#172032]">{'全部课程'}</h2>
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
        <div className="mt-4 rounded-[24px] border border-[#e4ebf5] bg-white p-5 shadow-[0_18px_44px_rgba(86,109,160,0.08)]">
          <p className="text-[0.9rem] font-semibold text-[#7a87a0]">{viewerCopy.library.noResults}</p>
        </div>
      ) : null}

      {!subjectsQuery.isLoading && !coursesQuery.isLoading && !requestError && courses.length > 0 ? (
        <div className="mt-4 grid max-w-[560px] gap-3">
          {courses.map((course, index) => {
            const visual = subjectVisual(course.subjects.name, index);
            const Icon = visual.icon;
            return (
              <Link
                key={course.id}
                to={`/course/${course.id}`}
                className="group flex items-center gap-3 rounded-[22px] border border-[#e7edf6] bg-white p-4 shadow-[0_18px_44px_rgba(86,109,160,0.08)] transition hover:translate-y-[-1px] hover:border-[#d8e4f5]"
              >
                <div className={cn('flex h-[4rem] w-[4rem] shrink-0 items-center justify-center rounded-[18px] border-2', visual.ring, visual.iconBox)}>
                  <Icon size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[0.86rem] font-black text-[#20293d]">{course.title}</h3>
                  <p className="mt-1 text-[0.76rem] font-medium text-[#7f8ca5]">
                    {course.difficulty_level.charAt(0).toUpperCase() + course.difficulty_level.slice(1)}
                    <span className="mx-2">·</span>
                    {formatDuration(course.estimated_minutes)}
                  </p>
                </div>
                <ChevronRight size={20} className="text-[#c0c9db] transition group-hover:text-[#4f6ff5]" />
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
