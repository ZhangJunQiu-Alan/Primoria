import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpenText, ChevronRight, Flame, Menu, Sparkles, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession } from '@/features/auth/authSlice';
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

function formatMemberSince(dateString?: string) {
  if (!dateString) return '加入于 2026年2月';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '加入于 2026年2月';
  return `加入于 ${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function formatCompactStat(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 10000) return `${Math.round(value / 1000)}K`;
  return value.toLocaleString();
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

function buildGithubHeatmap(history: Map<string, number>) {
  const today = startOfUtcDay(new Date());
  const firstDay = addUtcDays(today, -364);
  const weekAlignedStart = addUtcDays(firstDay, -firstDay.getUTCDay());
  const totalWeeks = 53;
  const weeks: HeatmapWeek[] = [];

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
      label: `${Number(markerDay.key.slice(5, 7))}月`,
      weekIndex,
    });
  });

  return { weeks, markers };
}

function contributionTone(value: number) {
  if (value >= 180) return 'bg-[#216e39]';
  if (value >= 120) return 'bg-[#30a14e]';
  if (value >= 70) return 'bg-[#40c463]';
  if (value > 0) return 'bg-[#9be9a8]';
  return 'bg-[#ebedf0]';
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
    <div className="flex items-center gap-3.5">
      <div className={cn('flex h-12 w-12 items-center justify-center rounded-[16px]', iconBoxClass)}>{icon}</div>
      <div>
        <div className="text-[2.05rem] font-black text-[#1c2436]">{value}</div>
        <div className="text-[0.92rem] font-bold text-[#95a1b6]">{label}</div>
      </div>
    </div>
  );
}

function AchievementSlot({ achievement }: { achievement: ViewerAchievement | null }) {
  return (
    <div
      title={achievement ? achievementDisplayName(achievement) : '空位'}
      className={cn(
        'flex h-[5rem] w-[5rem] items-center justify-center rounded-[20px] border bg-[#f8fbff]',
        achievement
          ? 'border-[#dbe4f2] shadow-[0_12px_28px_rgba(83,110,162,0.08)]'
          : 'border-dashed border-[#adc1dd] bg-transparent shadow-none',
      )}
    >
      {achievement ? (
        <div className="flex h-full w-full items-center justify-center rounded-[16px] bg-white p-2.5">
          <img
            src={achievementBadgeAssetPath(achievement)}
            alt={achievementDisplayName(achievement)}
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="text-center text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#90a2bf]">{'待添加'}</div>
      )}
    </div>
  );
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const heatmapViewportRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [heatmapCellSize, setHeatmapCellSize] = useState(14);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

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
    () => buildGithubHeatmap(xpHistoryQuery.data ?? new Map<string, number>()),
    [xpHistoryQuery.data],
  );

  const totalXpThisYear = useMemo(() => {
    const year = new Date().getFullYear();
    return Array.from((xpHistoryQuery.data ?? new Map<string, number>()).entries()).reduce((sum, [key, value]) => {
      return key.startsWith(`${year}-`) ? sum + value : sum;
    }, 0);
  }, [xpHistoryQuery.data]);

  const showcaseAchievements = useMemo(() => {
    const progressById = new Map(
      achievements.map((achievement) => [achievement.id, achievementProgress(achievement, stats, followCounts)]),
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
  }, [achievements, followCounts, stats]);

  const displayName = profile?.username || user?.displayName || '学习者';
  const handle = profile?.username ? `@${profile.username}` : `@${displayName}`;
  const weekCount = heatmapData.weeks.length || 53;
  const cellGap = 4;
  const labelColumnWidth = 20;
  const labelGap = 12;
  const heatmapInnerPadding = 8;
  const gridWidth = weekCount * heatmapCellSize + Math.max(weekCount - 1, 0) * cellGap;
  const heatmapContentWidth = gridWidth + labelColumnWidth + labelGap + heatmapInnerPadding;

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

      const usableWidth = viewportWidth - labelColumnWidth - labelGap - heatmapInnerPadding;
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
  }, [cellGap, labelColumnWidth, labelGap, heatmapInnerPadding, weekCount]);

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
    if (!window.confirm('确定退出登录吗？')) {
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
    <div className="mx-auto w-[84%] px-0 py-5 md:py-6">
      <section className="viewer-panel overflow-hidden rounded-[30px]">
        <div className="relative h-[194px] overflow-hidden bg-[linear-gradient(120deg,#24180d_0%,#b67d16_25%,#ffd16c_52%,#ff8d21_78%,#cb431d_100%)]">
          {profile?.cover_image_url ? (
            <img src={profile.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_56%_44%,rgba(255,243,173,0.95),rgba(255,243,173,0.08)_28%,rgba(255,255,255,0)_52%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,20,10,0.04),rgba(24,20,10,0.22))]" />
          <div className="absolute -left-10 bottom-[-3rem] h-40 w-40 rounded-full bg-white/12 blur-[10px]" />
          <div ref={profileMenuRef} className="absolute right-5 top-5 z-20">
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/18 text-white backdrop-blur transition hover:bg-white/24"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
            >
              <Menu size={24} />
            </button>

            {isProfileMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] w-[14rem] overflow-hidden rounded-[24px] border border-[#e1e8f4] bg-white shadow-[0_22px_48px_rgba(54,78,129,0.14)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between border-b border-[#edf2f7] px-5 py-4 text-left text-[1.02rem] font-semibold text-[#111827] transition hover:bg-[#f8fbff]"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/settings');
                  }}
                >
                  <span>{'设置'}</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between border-b border-[#edf2f7] px-5 py-4 text-left text-[1.02rem] font-semibold text-[#111827] transition hover:bg-[#f8fbff]"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/support/terms');
                  }}
                >
                  <span>{'关于'}</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between border-b border-[#edf2f7] px-5 py-4 text-left text-[1.02rem] font-semibold text-[#111827] transition hover:bg-[#f8fbff]"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/support/help');
                  }}
                >
                  <span>{'帮助'}</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-[1.02rem] font-semibold text-[#111827] transition hover:bg-[#fff7f7]"
                  onClick={() => {
                    void handleSignOut();
                  }}
                >
                  <span>{'退出登录'}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-5 pb-7 md:px-8">
          <div className="relative -mt-10 flex flex-wrap items-end gap-3">
            <div className="relative h-[6.4rem] w-[6.4rem] overflow-hidden rounded-[24px] border-[3px] border-white bg-[linear-gradient(135deg,#ffe16b,#ff9c1f)] shadow-[0_16px_36px_rgba(255,172,44,0.22)]">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[2.35rem] font-black text-white">
                  {displayName.slice(0, 1)}
                </div>
              )}
              <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-white bg-[#20c488]" />
            </div>

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 pb-1">
              {pinnedSlots.map((achievement, index) => (
                <AchievementSlot key={achievement?.id ?? `slot-${index}`} achievement={achievement} />
              ))}
            </div>
          </div>

          <div className="mt-3">
            <h1 className="text-[2.05rem] font-black tracking-[-0.05em] text-[#1a2233]">{displayName}</h1>
            <p className="mt-2 text-[0.92rem] font-medium text-[#72809c]">
              {handle}
              <span className="mx-2">{'·'}</span>
              {formatMemberSince(profile?.created_at)}
            </p>
          </div>

          <div className="mt-7 rounded-[26px] border border-[#e7edf6] bg-white p-5 shadow-[0_18px_42px_rgba(83,110,162,0.08)]">
            <div className="grid gap-5 md:grid-cols-2">
              <StatBlock
                icon={<BookOpenText size={28} />}
                iconBoxClass="bg-[#dff8e9] text-[#1dbd71]"
                value={formatCompactStat(stats?.courses_completed ?? 0)}
                label="课程"
              />
              <StatBlock
                icon={<Sparkles size={28} />}
                iconBoxClass="bg-[#eef1ff] text-[#5c65ef]"
                value={formatCompactStat(stats?.total_xp ?? 0)}
                label="总经验值"
              />
              <div className="border-t border-[#edf2f8] pt-5 md:border-t">
                <StatBlock
                  icon={<Flame size={28} />}
                  iconBoxClass="bg-[#fff3d6] text-[#f1a81a]"
                  value={formatCompactStat(stats?.current_streak ?? 0)}
                  label="天连击"
                />
              </div>
              <div className="border-t border-[#edf2f8] pt-5 md:border-t">
                <StatBlock
                  icon={<Users size={28} />}
                  iconBoxClass="bg-[#ffe8f3] text-[#f06cb1]"
                  value={formatCompactStat(followCounts?.followers ?? 0)}
                  label="粉丝"
                />
              </div>
            </div>
          </div>

          <div className="mt-7 rounded-[26px] border border-[#e7edf6] bg-white p-5 shadow-[0_18px_42px_rgba(83,110,162,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[1.72rem] font-black tracking-[-0.04em] text-[#1c2436]">{'学习热力图'}</h2>
                <p className="mt-2 text-[0.88rem] font-medium text-[#93a1b9]">{'过去 12 个月的每日学习活跃度'}</p>
              </div>
              <div className="text-right">
                <div className="text-[1.02rem] font-black text-[#7f8ea8]">{`今年 ${totalXpThisYear} XP`}</div>
                <div className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[#9aa7bd]">
                  <span>{'少'}</span>
                  <div className="flex items-center gap-1">
                    {[0, 30, 80, 120, 180].map((value) => (
                      <span key={value} className={cn('h-3 w-3 rounded-[3px]', contributionTone(value))} />
                    ))}
                  </div>
                  <span>{'多'}</span>
                </div>
              </div>
            </div>

            <div ref={heatmapViewportRef} className="mt-7 overflow-x-auto pb-2">
              <div style={{ minWidth: `${heatmapContentWidth}px` }}>
                <div className="relative ml-8 h-5" style={{ width: `${gridWidth}px` }}>
                  {heatmapData.markers.map((marker) => (
                    <div
                      key={`${marker.label}-${marker.weekIndex}`}
                      className="absolute top-0 text-[0.78rem] font-black text-[#97a6bf]"
                      style={{ left: `${marker.weekIndex * (heatmapCellSize + cellGap)}px` }}
                    >
                      {marker.label}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-3">
                  <div className="grid grid-rows-7 gap-[4px] pt-[2px] text-[0.78rem] font-black text-[#97a6bf]">
                    {['日', '一', '二', '三', '四', '五', '六'].map((label) => (
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
                              cell.isToday ? 'ring-2 ring-[#7ab97d] ring-offset-1 ring-offset-white' : '',
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

          <div className="mt-7 rounded-[26px] border border-[#e7edf6] bg-white p-5 shadow-[0_18px_42px_rgba(83,110,162,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[1.72rem] font-black tracking-[-0.04em] text-[#1c2436]">{'我的成就'}</h2>
              <Link
                to="/achievements"
                className="inline-flex items-center gap-2 text-[0.96rem] font-black text-[#554cf4] transition hover:text-[#4337eb]"
              >
                <span>{'查看全部'}</span>
                <ChevronRight size={18} />
              </Link>
            </div>

            {showcaseAchievements.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-[#d9e3ef] bg-[#fbfdff] px-6 py-8 text-center text-[0.98rem] font-semibold text-[#95a1b6]">
                {'你已完成全部成就，继续学习会有更多内容加入。'}
              </div>
            ) : (
              <div className="mt-5 grid gap-3 xl:grid-cols-2">
                {showcaseAchievements.map((achievement) => {
                  const progress = achievementProgress(achievement, stats, followCounts);
                  return (
                    <div
                      key={achievement.id}
                      className="rounded-[22px] border border-[#e4ebf5] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-4 shadow-[0_12px_28px_rgba(83,110,162,0.06)]"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-[4.2rem] w-[4.2rem] shrink-0 items-center justify-center">
                          <img
                            src={achievementBadgeAssetPath(achievement)}
                            alt={achievementDisplayName(achievement)}
                            className="h-full w-full object-contain"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-[0.98rem] font-black text-[#243046]">{achievementDisplayName(achievement)}</h3>
                              <div className="mt-2 inline-flex rounded-full bg-[#f2f6fb] px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#7b8ba5]">
                                {progress.isUnlocked ? '已解锁' : achievementCategoryLabel(achievementDisplayCategory(achievement))}
                              </div>
                            </div>
                            <div className="text-[0.82rem] font-black text-[#94a3b8]">{progress.counterLabel}</div>
                          </div>

                          <div className="mt-4 h-2.5 rounded-full bg-[#e8edf4]">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,#fcd34d_0%,#f59e0b_100%)]"
                              style={{ width: `${progress.ratio * 100}%` }}
                            />
                          </div>

                          <p className="mt-3 text-[0.84rem] leading-6 text-[#6f7d97]">{progress.requirement}</p>
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
