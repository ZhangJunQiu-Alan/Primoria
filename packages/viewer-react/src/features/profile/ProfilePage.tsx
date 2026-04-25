import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpenText, ChevronRight, Flame, Menu, Sparkles, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession } from '@/features/auth/authSlice';
import { useBootSplashGate } from '@/shared/boot/bootSplash';
import { supabase } from '@/shared/api/supabase';
import {
  fetchAchievements,
  fetchDailyXpHistory,
  fetchFollowCounts,
  fetchPinnedAchievementIds,
  fetchUserStats,
  fetchViewerProfile,
} from '@/shared/api/viewer/profileApi';
import { ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import type { ViewerAchievement } from '@/shared/api/viewer/types';
import { formatViewerMonthYear, formatViewerNumber } from '@/shared/i18n/format';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { useAppDispatch, useAppSelector } from '@/shared/state/store';
import { cn } from '@/shared/utils/cn';
import { clearDemoRole } from '@/shared/utils/demoMode';
import {
  achievementBadgeAssetPath,
  achievementCategoryLabel,
  achievementDisplayCategory,
  achievementDisplayName,
  achievementProgress,
  achievementSortIndex,
} from './achievementPresentation';

type HeatmapCell = {
  key: string;
  value: number;
  inRange: boolean;
  isToday: boolean;
};

type HeatmapWeek = {
  key: string;
  days: HeatmapCell[];
};

type HeatmapMonthMarker = {
  label: string;
  weekIndex: number;
};

function formatMemberSince(dateString: string | undefined, language: 'zh-CN' | 'en') {
  if (!dateString) return language === 'zh-CN' ? '加入于 2026年2月' : 'Joined Feb 2026';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return language === 'zh-CN' ? '加入于 2026年2月' : 'Joined Feb 2026';
  return language === 'zh-CN'
    ? `加入于 ${formatViewerMonthYear(date, language)}`
    : `Joined ${formatViewerMonthYear(date, language)}`;
}

function formatCompactStat(value: number, language: 'zh-CN' | 'en') {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 10000) return `${Math.round(value / 1000)}K`;
  return formatViewerNumber(value, language);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildGithubHeatmap(history: Map<string, number>, language: 'zh-CN' | 'en') {
  const today = startOfUtcDay(new Date());
  const firstDay = addUtcDays(today, -364);
  const weekAlignedStart = addUtcDays(firstDay, -firstDay.getUTCDay());
  const totalWeeks = 53;
  const weeks: HeatmapWeek[] = [];
  const monthFormatter = new Intl.DateTimeFormat(language === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: language === 'zh-CN' ? 'numeric' : 'short',
  });

  for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex += 1) {
    const days: HeatmapCell[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const current = addUtcDays(weekAlignedStart, weekIndex * 7 + dayIndex);
      const key = dateKey(current);
      const inRange = current >= firstDay && current <= today;
      days.push({
        key,
        value: inRange ? history.get(key) ?? 0 : 0,
        inRange,
        isToday: key === dateKey(today),
      });
    }
    weeks.push({
      key: `${weekIndex}-${days[0]?.key ?? 'week'}`,
      days,
    });
  }

  const markers: HeatmapMonthMarker[] = [];
  const seenMonths = new Set<string>();
  weeks.forEach((week, weekIndex) => {
    const firstVisibleDay = week.days.find((day) => day.inRange && day.key.slice(8, 10) === '01');
    const fallbackDay = weekIndex === 0 ? week.days.find((day) => day.inRange) : null;
    const markerDay = firstVisibleDay ?? fallbackDay;
    if (!markerDay) {
      return;
    }
    const monthKey = markerDay.key.slice(0, 7);
    if (seenMonths.has(monthKey)) {
      return;
    }
    seenMonths.add(monthKey);
    markers.push({
      label: monthFormatter.format(new Date(`${monthKey}-01T00:00:00Z`)),
      weekIndex,
    });
  });

  return { weeks, markers };
}

function contributionTone(value: number) {
  if (value >= 180) return 'bg-[#5c7d60]';
  if (value >= 120) return 'bg-[#7a9e7e]';
  if (value >= 70) return 'bg-[#a8c5ac]';
  if (value > 0) return 'bg-[#d8e6d6]';
  return 'bg-[#ebe3d6]';
}

function StatBlock({
  icon,
  iconBoxClass,
  value,
  label,
}: {
  icon: ReactNode;
  iconBoxClass: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#ddd3c3]', iconBoxClass)}>{icon}</div>
      <div className="flex min-w-0 items-end gap-2.5">
        <div className="shrink-0 text-[2.05rem] font-semibold leading-none text-[#3d342a]">{value}</div>
        <div className="truncate pb-0.5 text-[0.92rem] font-bold leading-none text-[#8d8176]">{label}</div>
      </div>
    </div>
  );
}

function AchievementSlot({
  achievement,
  language,
  emptyLabel,
}: {
  achievement: ViewerAchievement | null;
  language: 'zh-CN' | 'en';
  emptyLabel: string;
}) {
  return (
    <div
      title={achievement ? achievementDisplayName(achievement, language) : emptyLabel}
      className={cn(
        'flex h-[5rem] w-[5rem] items-center justify-center rounded-[20px] border bg-[rgba(255,252,247,0.88)]',
        achievement
          ? 'border-[#ddd3c3] shadow-[0_12px_28px_rgba(90,70,50,0.08)]'
          : 'border-dashed border-[#cdbfaf] bg-transparent shadow-none',
      )}
    >
      {achievement ? (
        <div className="flex h-full w-full items-center justify-center rounded-[16px] bg-white p-2.5">
          <img
            src={achievementBadgeAssetPath(achievement)}
            alt={achievementDisplayName(achievement, language)}
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="text-center text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#9b8e85]">{emptyLabel}</div>
      )}
    </div>
  );
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const language = useProductLanguage();
  const isChinese = language === 'zh-CN';
  const user = useAppSelector((state) => state.auth.user);
  const heatmapViewportRef = useRef<HTMLDivElement | null>(null);
  const heatmapDragStateRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [heatmapCellSize, setHeatmapCellSize] = useState(14);
  const [isDraggingHeatmap, setIsDraggingHeatmap] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileText = isChinese
    ? {
        learner: '学习者',
        emptySlot: '待添加',
        confirmSignOut: '确定退出登录吗？',
        openProfileMenu: '打开个人菜单',
        settings: '设置',
        about: '关于',
        help: '帮助',
        signOut: '退出登录',
        courses: '课程',
        totalXp: '总经验值',
        dayStreak: '天连击',
        fans: '粉丝',
        learningActivity: '学习热力图',
        thisYearXp: (xp: number) => `今年 ${xp} XP`,
        less: '少',
        more: '多',
        weekdays: ['日', '一', '二', '三', '四', '五', '六'],
        achievements: '我的成就',
        viewAll: '查看全部',
        allComplete: '你已完成全部成就，继续学习会有更多内容加入。',
        unlocked: '已解锁',
      }
    : {
        learner: 'Learner',
        emptySlot: 'Open slot',
        confirmSignOut: 'Sign out now?',
        openProfileMenu: 'Open profile menu',
        settings: 'Settings',
        about: 'About',
        help: 'Help',
        signOut: 'Sign out',
        courses: 'Courses',
        totalXp: 'Total XP',
        dayStreak: 'Day streak',
        fans: 'Fans',
        learningActivity: 'Learning activity',
        thisYearXp: (xp: number) => `${xp} XP this year`,
        less: 'Less',
        more: 'More',
        weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
        achievements: 'My achievements',
        viewAll: 'View all',
        allComplete: 'You have completed every achievement. Keep learning and more will be added.',
        unlocked: 'Unlocked',
      };

  const profileQuery = useQuery({
    queryKey: ['viewer', 'profile', user?.id],
    queryFn: () => fetchViewerProfile(user?.id ?? ''),
    enabled: Boolean(user),
  });
  const statsQuery = useQuery({
    queryKey: ['viewer', 'stats', user?.id],
    queryFn: () => fetchUserStats(user?.id),
    enabled: Boolean(user),
  });
  const followQuery = useQuery({
    queryKey: ['viewer', 'follow-counts', user?.id],
    queryFn: () => fetchFollowCounts(user?.id),
    enabled: Boolean(user),
  });
  const achievementsQuery = useQuery({
    queryKey: ['viewer', 'achievements', user?.id],
    queryFn: () => fetchAchievements(user?.id),
    enabled: Boolean(user),
  });
  const pinnedQuery = useQuery({
    queryKey: ['viewer', 'achievement-pins', user?.id],
    queryFn: () => fetchPinnedAchievementIds(user?.id),
    enabled: Boolean(user),
  });
  const xpHistoryQuery = useQuery({
    queryKey: ['viewer', 'xp-history', user?.id],
    queryFn: () => fetchDailyXpHistory(user?.id),
    enabled: Boolean(user),
  });

  const profile = profileQuery.data;
  const stats = statsQuery.data;
  const followCounts = followQuery.data;
  const achievements = achievementsQuery.data ?? [];

  const profileError = [
    profileQuery.error,
    statsQuery.error,
    followQuery.error,
    achievementsQuery.error,
    pinnedQuery.error,
    xpHistoryQuery.error,
  ].find((error) => error instanceof Error);

  const pinnedAchievements = useMemo(() => {
    const pinnedIds = pinnedQuery.data ?? [];
    return pinnedIds
      .map((id) => achievements.find((achievement) => achievement.id === id) ?? null)
      .filter((achievement): achievement is ViewerAchievement => Boolean(achievement));
  }, [achievements, pinnedQuery.data]);

  const pinnedSlots = useMemo(
    () => Array.from({ length: 3 }, (_, index) => pinnedAchievements[index] ?? null),
    [pinnedAchievements],
  );

  const heatmapData = useMemo(
    () => buildGithubHeatmap(xpHistoryQuery.data ?? new Map<string, number>(), language),
    [language, xpHistoryQuery.data],
  );

  const totalXpThisYear = useMemo(() => {
    const year = new Date().getFullYear();
    return Array.from((xpHistoryQuery.data ?? new Map<string, number>()).entries()).reduce((sum, [key, value]) => {
      return key.startsWith(`${year}-`) ? sum + value : sum;
    }, 0);
  }, [xpHistoryQuery.data]);

  const showcaseAchievements = useMemo(() => {
    const progressById = new Map(
      achievements.map((achievement) => [
        achievement.id,
        achievementProgress(achievement, stats, followCounts, language),
      ]),
    );

    const pending = achievements
      .filter((achievement) => !progressById.get(achievement.id)?.isUnlocked)
      .sort((left, right) => {
        const leftProgress = progressById.get(left.id);
        const rightProgress = progressById.get(right.id);
        const ratioDelta = (rightProgress?.ratio ?? 0) - (leftProgress?.ratio ?? 0);
        if (Math.abs(ratioDelta) > 0.0001) {
          return ratioDelta;
        }
        return achievementSortIndex(left) - achievementSortIndex(right);
      });

    if (pending.length > 0) {
      return pending.slice(0, 4);
    }

    return [...achievements]
      .sort((left, right) => achievementSortIndex(left) - achievementSortIndex(right))
      .slice(0, 4);
  }, [achievements, followCounts, language, stats]);

  useBootSplashGate(Boolean(profileError || (
    profileQuery.data &&
    statsQuery.data &&
    followQuery.data &&
    achievementsQuery.data &&
    pinnedQuery.data &&
    xpHistoryQuery.data
  )));

  const displayName = profile?.username || user?.displayName || profileText.learner;
  const handle = profile?.username ? `@${profile.username}` : `@${displayName}`;
  const weekCount = heatmapData.weeks.length || 53;
  const cellGap = 4;
  const labelColumnWidth = 20;
  const labelGap = 12;
  const heatmapInnerPadding = 8;
  const heatmapRightPadding = 12;
  const gridWidth = weekCount * heatmapCellSize + Math.max(weekCount - 1, 0) * cellGap;
  const heatmapContentWidth = gridWidth + labelColumnWidth + labelGap + heatmapInnerPadding + heatmapRightPadding;

  useEffect(() => {
    const viewport = heatmapViewportRef.current;
    if (!viewport) {
      return;
    }

    const updateCellSize = () => {
      const viewportWidth = viewport.clientWidth;
      if (!viewportWidth) {
        return;
      }

      const usableWidth = viewportWidth - labelColumnWidth - labelGap - heatmapInnerPadding - heatmapRightPadding;
      const nextCellSize = Math.floor((usableWidth - Math.max(weekCount - 1, 0) * cellGap) / weekCount);
      setHeatmapCellSize(Math.max(12, Math.min(24, nextCellSize)));
    };

    updateCellSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateCellSize);
      return () => window.removeEventListener('resize', updateCellSize);
    }

    const observer = new ResizeObserver(() => {
      updateCellSize();
    });
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [cellGap, labelColumnWidth, labelGap, heatmapInnerPadding, heatmapRightPadding, weekCount]);

  const handleHeatmapPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = heatmapViewportRef.current;
    if (!viewport || viewport.scrollWidth <= viewport.clientWidth) {
      return;
    }

    heatmapDragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: viewport.scrollLeft,
    };

    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setIsDraggingHeatmap(true);
  };

  const handleHeatmapPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = heatmapViewportRef.current;
    const dragState = heatmapDragStateRef.current;
    if (!viewport || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    viewport.scrollLeft = dragState.startScrollLeft - (event.clientX - dragState.startX);
  };

  const stopHeatmapDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (heatmapDragStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    if (typeof event.currentTarget.releasePointerCapture === 'function' && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    heatmapDragStateRef.current = null;
    setIsDraggingHeatmap(false);
  };

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isProfileMenuOpen]);

  async function handleSignOut() {
    setIsProfileMenuOpen(false);
    if (!window.confirm(profileText.confirmSignOut)) {
      return;
    }
    clearDemoRole();
    dispatch(clearSession());
    queryClient.clear();
    try {
      await supabase.auth.signOut();
    } catch {
      // Demo and offline flows should still exit cleanly.
    }
    navigate('/', { replace: true });
  }

  if (
    profileQuery.isLoading ||
    statsQuery.isLoading ||
    followQuery.isLoading ||
    achievementsQuery.isLoading ||
    pinnedQuery.isLoading ||
    xpHistoryQuery.isLoading
  ) {
    return (
      <div className="px-5 py-6 md:px-6 md:py-7">
        <LoadingStateCard />
      </div>
    );
  }

  if (profileError instanceof Error) {
    return (
      <div className="px-5 py-6 md:px-6 md:py-7">
        <ErrorStateCard
          message={profileError.message}
          onRetry={() => {
            void profileQuery.refetch();
            void statsQuery.refetch();
            void followQuery.refetch();
            void achievementsQuery.refetch();
            void pinnedQuery.refetch();
            void xpHistoryQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-[92%] max-w-[1060px] px-0 py-4 md:w-[82%] md:py-5">
      <section className="viewer-panel rounded-[30px]">
        <div className="relative">
          <div className="relative h-[156px] overflow-hidden rounded-t-[30px] bg-[linear-gradient(120deg,#7f5f49_0%,#c4956a_28%,#e8cfab_56%,#a8c5ac_78%,#7a9e7e_100%)]">
            {profile?.cover_image_url ? (
              <img src={profile.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_56%_44%,rgba(255,243,173,0.95),rgba(255,243,173,0.08)_28%,rgba(255,255,255,0)_52%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,20,10,0.04),rgba(24,20,10,0.22))]" />
            <div className="absolute -left-10 bottom-[-3rem] h-40 w-40 rounded-full bg-white/12 blur-[10px]" />
          </div>
          <div ref={profileMenuRef} className="absolute right-5 top-5 z-20">
            <button
              type="button"
              aria-label={profileText.openProfileMenu}
              className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(255,252,247,0.28)] text-white backdrop-blur transition hover:bg-[rgba(255,252,247,0.36)]"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
            >
              <Menu size={24} />
            </button>

            {isProfileMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] w-[14rem] overflow-hidden rounded-[24px] border border-[#ddd3c3] bg-[rgba(254,250,245,0.97)] shadow-[0_22px_48px_rgba(90,70,50,0.14)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between border-b border-[#efe4d7] px-5 py-4 text-left text-[1.02rem] font-semibold text-[#3d342a] transition hover:bg-[#faf4ea]"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/settings');
                  }}
                >
                  <span>{profileText.settings}</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between border-b border-[#efe4d7] px-5 py-4 text-left text-[1.02rem] font-semibold text-[#3d342a] transition hover:bg-[#faf4ea]"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/support/terms');
                  }}
                >
                  <span>{profileText.about}</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between border-b border-[#efe4d7] px-5 py-4 text-left text-[1.02rem] font-semibold text-[#3d342a] transition hover:bg-[#faf4ea]"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/support/help');
                  }}
                >
                  <span>{profileText.help}</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-[1.02rem] font-semibold text-[#8a5c53] transition hover:bg-[#fbefed]"
                  onClick={() => {
                    void handleSignOut();
                  }}
                >
                  <span>{profileText.signOut}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-4 pb-6 md:px-6">
          <div className="relative -mt-8 flex flex-wrap items-end gap-3">
            <div className="relative h-[5.2rem] w-[5.2rem] overflow-hidden rounded-[20px] border-[3px] border-white bg-[linear-gradient(135deg,#e8cfab,#c4956a)] shadow-[0_14px_30px_rgba(196,149,106,0.22)]">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[1.95rem] font-black text-white">
                  {displayName.slice(0, 1)}
                </div>
              )}
              <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-white bg-[#20c488]" />
            </div>

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 pb-1">
              {pinnedSlots.map((achievement, index) => (
                <AchievementSlot
                  key={achievement?.id ?? `slot-${index}`}
                  achievement={achievement}
                  language={language}
                  emptyLabel={profileText.emptySlot}
                />
              ))}
            </div>
          </div>

          <div className="mt-3">
            <h1 className="text-[1.95rem] font-semibold tracking-[-0.04em] text-[#3d342a]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{displayName}</h1>
            <p className="mt-1.5 text-[0.82rem] font-medium text-[#7f7368]">
              {handle}
              <span className="mx-2">{'·'}</span>
              {formatMemberSince(profile?.created_at, language)}
            </p>
          </div>

          <div className="mt-6 rounded-[24px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] px-4 py-3 shadow-[0_18px_42px_rgba(90,70,50,0.08)]">
            <div className="grid gap-3 md:grid-cols-2">
              <StatBlock
                icon={<BookOpenText size={28} />}
                iconBoxClass="bg-[#edf5ec] text-[#5c7d60]"
                value={formatCompactStat(stats?.courses_completed ?? 0, language)}
                label={profileText.courses}
              />
              <StatBlock
                icon={<Sparkles size={28} />}
                iconBoxClass="bg-[#fbf3e6] text-[#9a6f3f]"
                value={formatCompactStat(stats?.total_xp ?? 0, language)}
                label={profileText.totalXp}
              />
              <div className="border-t border-[#edf2f8] pt-3 md:border-t">
                <StatBlock
                  icon={<Flame size={28} />}
                  iconBoxClass="bg-[#f7ede2] text-[#b46f53]"
                  value={formatCompactStat(stats?.current_streak ?? 0, language)}
                  label={profileText.dayStreak}
                />
              </div>
              <div className="border-t border-[#edf2f8] pt-3 md:border-t">
                <StatBlock
                  icon={<Users size={28} />}
                  iconBoxClass="bg-[#f3edf7] text-[#7f6f88]"
                  value={formatCompactStat(followCounts?.followers ?? 0, language)}
                  label={profileText.fans}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] p-4 shadow-[0_18px_42px_rgba(90,70,50,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[1.76rem] font-semibold tracking-[-0.04em] text-[#3d342a]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{profileText.learningActivity}</h2>
              </div>
              <div className="text-right">
                <div className="text-[0.92rem] font-black text-[#7f7368]">{profileText.thisYearXp(totalXpThisYear)}</div>
                <div className="mt-1.5 inline-flex items-center gap-2 text-[0.7rem] font-semibold text-[#9b8e85]">
                  <span>{profileText.less}</span>
                  <div className="flex items-center gap-1">
                    {[0, 30, 80, 120, 180].map((value) => (
                      <span key={value} className={cn('h-3 w-3 rounded-[3px]', contributionTone(value))} />
                    ))}
                  </div>
                  <span>{profileText.more}</span>
                </div>
              </div>
            </div>

            <div
              ref={heatmapViewportRef}
              className={cn(
                'viewer-scrollbar-hidden mt-5 overflow-x-auto pb-1 select-none',
                isDraggingHeatmap ? 'cursor-grabbing' : 'cursor-grab',
              )}
              onPointerDown={handleHeatmapPointerDown}
              onPointerMove={handleHeatmapPointerMove}
              onPointerUp={stopHeatmapDragging}
              onPointerCancel={stopHeatmapDragging}
              style={{ touchAction: 'pan-y' }}
            >
              <div className="pr-3" style={{ minWidth: `${heatmapContentWidth}px` }}>
                <div className="relative ml-8 h-5" style={{ width: `${gridWidth}px` }}>
                  {heatmapData.markers.map((marker) => (
                    <div
                      key={`${marker.label}-${marker.weekIndex}`}
                      className="absolute top-0 whitespace-nowrap text-[0.74rem] font-black text-[#9b8e85]"
                      style={{
                        left: `${marker.weekIndex * (heatmapCellSize + cellGap)}px`,
                        transform: marker.weekIndex >= weekCount - 2 ? 'translateX(-100%)' : undefined,
                      }}
                    >
                      {marker.label}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-3">
                  <div className="grid grid-rows-7 gap-[4px] pt-[2px] text-[0.72rem] font-black text-[#9b8e85]">
                    {profileText.weekdays.map((label) => (
                      <div key={label} className="flex w-5 items-center" style={{ height: `${heatmapCellSize}px` }}>
                        {label}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-[4px]">
                    {heatmapData.weeks.map((week) => (
                      <div key={week.key} className="flex flex-col gap-[4px]">
                        {week.days.map((cell) => (
                          <div
                            key={cell.key}
                            title={cell.inRange ? `${cell.key} · ${cell.value} XP` : ''}
                            className={cn(
                              'rounded-[3px]',
                              cell.inRange ? contributionTone(cell.value) : 'bg-transparent',
                              cell.isToday ? 'ring-2 ring-[#7a9e7e] ring-offset-1 ring-offset-white' : '',
                            )}
                            style={{ height: `${heatmapCellSize}px`, width: `${heatmapCellSize}px` }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] p-4 shadow-[0_18px_42px_rgba(90,70,50,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[1.76rem] font-semibold tracking-[-0.04em] text-[#3d342a]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{profileText.achievements}</h2>
              <Link
                to="/achievements"
                className="inline-flex items-center gap-2 text-[0.88rem] font-black text-[#5c7d60] transition hover:text-[#4a674d]"
              >
                <span>{profileText.viewAll}</span>
                <ChevronRight size={18} />
              </Link>
            </div>

            {showcaseAchievements.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-[#cdbfaf] bg-[rgba(255,252,247,0.82)] px-6 py-8 text-center text-[0.98rem] font-semibold text-[#9b8e85]">
                {profileText.allComplete}
              </div>
            ) : (
              <div className="mt-5 grid gap-3 xl:grid-cols-2">
                {showcaseAchievements.map((achievement) => {
                  const progress = achievementProgress(achievement, stats, followCounts, language);
                  return (
                    <div
                      key={achievement.id}
                      className="rounded-[22px] border border-[#ddd3c3] bg-[linear-gradient(180deg,rgba(255,252,247,0.94)_0%,rgba(247,242,231,0.86)_100%)] p-4 shadow-[0_12px_28px_rgba(90,70,50,0.06)]"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-[4.2rem] w-[4.2rem] shrink-0 items-center justify-center">
                          <img
                            src={achievementBadgeAssetPath(achievement)}
                            alt={achievementDisplayName(achievement, language)}
                            className="h-full w-full object-contain"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-[1.12rem] font-black text-[#3d342a]">{achievementDisplayName(achievement, language)}</h3>
                              <div className="mt-2 inline-flex rounded-full bg-[#f3efe8] px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#7b6d62]">
                                {progress.isUnlocked
                                  ? profileText.unlocked
                                  : achievementCategoryLabel(achievementDisplayCategory(achievement), language)}
                              </div>
                            </div>
                            <div className="text-[0.82rem] font-black text-[#96877a]">{progress.counterLabel}</div>
                          </div>

                          <div className="mt-4 h-2.5 rounded-full bg-[#ebe3d6]">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,#d4b896_0%,#c4956a_100%)]"
                              style={{ width: `${progress.ratio * 100}%` }}
                            />
                          </div>

                          <p className="mt-3 text-[0.84rem] leading-6 text-[#6f6359]">{progress.requirement}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
