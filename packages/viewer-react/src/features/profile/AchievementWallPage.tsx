import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Pin, Sparkles, Trophy } from 'lucide-react';
import type { ViewerAchievement } from '@/shared/api/viewer/types';
import {
  fetchAchievements,
  fetchFollowCounts,
  fetchPinnedAchievementIds,
  fetchUserStats,
  savePinnedAchievementIds,
} from '@/shared/api/viewer/profileApi';
import { ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { useAppSelector } from '@/shared/state/store';
import { cn } from '@/shared/utils/cn';
import {
  ACHIEVEMENT_CATEGORY_ORDER,
  achievementBadgeAssetPath,
  achievementCategoryLabel,
  achievementDisplayCategory,
  achievementDisplayName,
  achievementPinnedLabel,
  achievementProgress,
  achievementSortIndex,
  achievementStatusLabel,
} from './achievementPresentation';

type AchievementEntry = {
  achievement: ViewerAchievement;
  pinned: boolean;
  progress: ReturnType<typeof achievementProgress>;
  category: string;
};

function categoryTheme(category: string) {
  switch (category) {
    case 'streak':
      return {
        pill: 'bg-[#fbf3e6] text-[#9a6f3f]',
        glow: 'from-[#f7e8cf] to-[#fff8ef]',
        bar: 'from-[#d4b896] to-[#c4956a]',
      };
    case 'challenge':
      return {
        pill: 'bg-[#f3edf7] text-[#7f6f88]',
        glow: 'from-[#eee5f4] to-[#faf7fc]',
        bar: 'from-[#a99ab4] to-[#8d7a98]',
      };
    case 'social':
      return {
        pill: 'bg-[#f7edea] text-[#b56b63]',
        glow: 'from-[#f3d7d2] to-[#fdf6f4]',
        bar: 'from-[#d3a399] to-[#c4807a]',
      };
    default:
      return {
        pill: 'bg-[#edf5ec] text-[#5c7d60]',
        glow: 'from-[#e4efe1] to-[#fbfffc]',
        bar: 'from-[#a8c5ac] to-[#7a9e7e]',
      };
  }
}

function formatUnlockedAt(dateString?: string | null) {
  if (!dateString) return '刚刚收入展柜';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '已完成解锁';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日解锁`;
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  hint: string;
  className: string;
}) {
  return (
    <div className={cn('rounded-[26px] border px-5 py-5 shadow-[0_18px_42px_rgba(90,70,50,0.08)]', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="viewer-botanical-eyebrow text-[0.72rem]">{label}</div>
        <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#ddd3c3] bg-white/75 text-[#4a4037]">{icon}</div>
      </div>
      <div className="mt-5 text-[2.4rem] font-semibold tracking-[-0.04em] text-[#3d342a]">{value}</div>
      <div className="mt-2 text-[0.92rem] font-semibold leading-6 text-[#7e7166]">{hint}</div>
    </div>
  );
}

function FeaturedAchievementCard({
  entry,
  manageMode,
  onTogglePin,
}: {
  entry: AchievementEntry;
  manageMode: boolean;
  onTogglePin: (id: string) => void;
}) {
  const theme = categoryTheme(entry.category);

  return (
    <button
      type="button"
      disabled={!manageMode}
      className={cn(
        'group flex h-full flex-col rounded-[30px] border border-[#ddd3c3] bg-[linear-gradient(180deg,rgba(255,252,247,0.94)_0%,rgba(247,242,231,0.88)_100%)] p-5 text-left shadow-[0_18px_42px_rgba(90,70,50,0.08)] transition',
        manageMode ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(90,70,50,0.12)]' : 'cursor-default',
        entry.pinned ? 'ring-2 ring-[#7a9e7e]' : '',
      )}
      onClick={() => onTogglePin(entry.achievement.id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={cn('flex h-[5.4rem] w-[5.4rem] items-center justify-center rounded-[24px] bg-gradient-to-br p-3 shadow-[inset_0_0_0_1px_rgba(215,227,240,0.7)]', theme.glow)}>
          <img
            src={achievementBadgeAssetPath(entry.achievement)}
            alt={achievementDisplayName(entry.achievement)}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className={cn('rounded-full px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em]', theme.pill)}>
            {achievementCategoryLabel(entry.category)}
          </span>
          <span className="rounded-full bg-[#edf5ec] px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#5c7d60]">
            {achievementPinnedLabel()}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-[1.5rem] font-semibold tracking-[-0.03em] text-[#3d342a]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
          {achievementDisplayName(entry.achievement)}
        </h3>
        <p className="mt-3 text-[0.94rem] leading-7 text-[#6f6359]">{entry.progress.requirement}</p>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <div className="text-[2rem] font-semibold tracking-[-0.04em] text-[#3d342a]">{entry.progress.counterLabel}</div>
          <div className="mt-1 text-[0.78rem] font-black uppercase tracking-[0.14em] text-[#9b8e85]">
            {achievementStatusLabel(entry.progress.isUnlocked)}
          </div>
        </div>
        {manageMode ? (
          <div className="rounded-full border border-[#ddd3c3] px-3 py-2 text-[0.78rem] font-bold text-[#7f7368]">
            {'点击取消精选'}
          </div>
        ) : null}
      </div>

      <div className="mt-4 h-2.5 rounded-full bg-[#ebe3d6]">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r', theme.bar)}
          style={{ width: `${Math.max(entry.progress.ratio * 100, 6)}%` }}
        />
      </div>
    </button>
  );
}

function FeaturedPlaceholder({ manageMode }: { manageMode: boolean }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-[30px] border border-dashed border-[#cdbfaf] bg-[linear-gradient(180deg,rgba(255,252,247,0.92)_0%,rgba(247,242,231,0.88)_100%)] p-5">
      <div>
        <div className="flex h-[5.4rem] w-[5.4rem] items-center justify-center rounded-[24px] border border-dashed border-[#cdbfaf] bg-white/70 text-[#9b8e85]">
          <Pin size={24} />
        </div>
        <h3 className="mt-5 text-[1.5rem] font-semibold tracking-[-0.03em] text-[#3d342a]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{'预留展位'}</h3>
        <p className="mt-3 text-[0.92rem] leading-7 text-[#7c6f64]">
          {manageMode ? '从下方卡片中点选成就，把它加入顶部精选展示区。' : '开启“管理精选”后，可以把喜欢的成就固定到这里。'}
        </p>
      </div>
      <div className="mt-6 rounded-full border border-dashed border-[#cdbfaf] px-4 py-2 text-[0.76rem] font-black uppercase tracking-[0.14em] text-[#9b8e85]">
        {'等待点亮'}
      </div>
    </div>
  );
}

function ProgressAchievementCard({
  entry,
  manageMode,
  onTogglePin,
}: {
  entry: AchievementEntry;
  manageMode: boolean;
  onTogglePin: (id: string) => void;
}) {
  const theme = categoryTheme(entry.category);

  return (
    <button
      type="button"
      disabled={!manageMode}
      className={cn(
        'flex h-full flex-col rounded-[24px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] p-4 text-left shadow-[0_16px_34px_rgba(90,70,50,0.06)] transition',
        manageMode ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(90,70,50,0.1)]' : 'cursor-default',
        entry.pinned ? 'ring-2 ring-[#7a9e7e]' : '',
      )}
      onClick={() => onTogglePin(entry.achievement.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn('rounded-full px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em]', theme.pill)}>
          {achievementCategoryLabel(entry.category)}
        </span>
        {entry.pinned ? (
          <span className="rounded-full bg-[#edf5ec] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#5c7d60]">
            {achievementPinnedLabel()}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-start gap-4">
        <div className={cn('flex h-[4.6rem] w-[4.6rem] shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br p-3 shadow-[inset_0_0_0_1px_rgba(217,229,243,0.72)]', theme.glow)}>
          <img
            src={achievementBadgeAssetPath(entry.achievement)}
            alt={achievementDisplayName(entry.achievement)}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[1.26rem] font-black tracking-[-0.03em] text-[#3d342a]">
              {achievementDisplayName(entry.achievement)}
            </h3>
            <span className="text-[0.94rem] font-black text-[#8b7d72]">{entry.progress.counterLabel}</span>
          </div>

          <div className="mt-4 h-2.5 rounded-full bg-[#ebe3d6]">
            <div
              className={cn('h-full rounded-full bg-gradient-to-r', theme.bar)}
              style={{ width: `${Math.max(entry.progress.ratio * 100, 2)}%` }}
            />
          </div>

          <p className="mt-3 text-[0.9rem] leading-7 text-[#6f6359]">{entry.progress.requirement}</p>
          <div className="mt-3 text-[0.72rem] font-black uppercase tracking-[0.14em] text-[#9b8e85]">
            {achievementStatusLabel(entry.progress.isUnlocked)}
          </div>
        </div>
      </div>
    </button>
  );
}

function UnlockedAchievementCard({
  entry,
  manageMode,
  onTogglePin,
}: {
  entry: AchievementEntry;
  manageMode: boolean;
  onTogglePin: (id: string) => void;
}) {
  const theme = categoryTheme(entry.category);

  return (
    <button
      type="button"
      disabled={!manageMode}
      className={cn(
        'flex h-full items-center gap-4 rounded-[22px] border border-[#dfe7f3] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] px-4 py-4 text-left shadow-[0_14px_28px_rgba(83,110,162,0.06)] transition',
        manageMode ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(83,110,162,0.1)]' : 'cursor-default',
        entry.pinned ? 'ring-2 ring-[#7a9e7e]' : '',
      )}
      onClick={() => onTogglePin(entry.achievement.id)}
    >
      <div className={cn('flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br p-3 shadow-[inset_0_0_0_1px_rgba(217,229,243,0.72)]', theme.glow)}>
        <img
          src={achievementBadgeAssetPath(entry.achievement)}
          alt={achievementDisplayName(entry.achievement)}
          className="h-full w-full object-contain"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-1 text-[0.66rem] font-black uppercase tracking-[0.14em]', theme.pill)}>
            {achievementCategoryLabel(entry.category)}
          </span>
          <span className="rounded-full bg-[#eef8f1] px-2.5 py-1 text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#14874b]">
            {achievementStatusLabel(true)}
          </span>
          {entry.pinned ? (
          <span className="rounded-full bg-[#edf5ec] px-2.5 py-1 text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#5c7d60]">
            {achievementPinnedLabel()}
          </span>
          ) : null}
        </div>
        <h3 className="mt-3 text-[1.12rem] font-black tracking-[-0.03em] text-[#3d342a]">
          {achievementDisplayName(entry.achievement)}
        </h3>
        <div className="mt-2 text-[0.86rem] font-semibold leading-6 text-[#7f7368]">
          {formatUnlockedAt(entry.achievement.earned_at)}
        </div>
      </div>

      <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#f3efe8] text-[#7f7368] md:flex">
        <CheckCircle2 size={19} />
      </div>
    </button>
  );
}

export function AchievementWallPage() {
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const [manageMode, setManageMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [localPinnedIds, setLocalPinnedIds] = useState<string[]>([]);

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

  const savePinsMutation = useMutation({
    mutationFn: (ids: string[]) => savePinnedAchievementIds(user?.id ?? 'demo-user', ids),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['viewer', 'achievement-pins', user?.id] });
      captureViewerEvent('viewer_achievement_pins_saved', { count: localPinnedIds.length });
    },
    onError: (error) => {
      captureViewerError(error, { area: 'achievement_pins_save' });
    },
  });

  useEffect(() => {
    setLocalPinnedIds(pinnedQuery.data ?? []);
  }, [pinnedQuery.data]);

  const achievements = achievementsQuery.data ?? [];
  const pinnedIds = localPinnedIds;

  const entries = useMemo<AchievementEntry[]>(() => {
    return achievements
      .map((achievement) => ({
        achievement,
        pinned: pinnedIds.includes(achievement.id),
        progress: achievementProgress(achievement, statsQuery.data, followQuery.data),
        category: achievementDisplayCategory(achievement),
      }))
      .sort((left, right) => {
        if (left.progress.isUnlocked !== right.progress.isUnlocked) {
          return left.progress.isUnlocked ? 1 : -1;
        }

        const ratioDelta = right.progress.ratio - left.progress.ratio;
        if (Math.abs(ratioDelta) > 0.0001) {
          return ratioDelta;
        }

        return achievementSortIndex(left.achievement) - achievementSortIndex(right.achievement);
      });
  }, [achievements, followQuery.data, pinnedIds, statsQuery.data]);

  const filteredEntries = useMemo(() => {
    if (selectedCategory === 'all') {
      return entries;
    }
    return entries.filter((entry) => entry.category === selectedCategory);
  }, [entries, selectedCategory]);

  const featuredEntries = useMemo(() => {
    const filteredIds =
      selectedCategory === 'all'
        ? pinnedIds
        : pinnedIds.filter((id) =>
            entries.some((entry) => entry.achievement.id === id && entry.category === selectedCategory),
          );
    return filteredIds
      .map((id) => entries.find((entry) => entry.achievement.id === id) ?? null)
      .filter((entry): entry is AchievementEntry => Boolean(entry))
      .slice(0, 3);
  }, [entries, pinnedIds, selectedCategory]);

  const featuredSlots = useMemo(
    () => Array.from({ length: 3 }, (_, index) => featuredEntries[index] ?? null),
    [featuredEntries],
  );

  const inProgressEntries = filteredEntries.filter((entry) => !entry.progress.isUnlocked);
  const unlockedEntries = filteredEntries.filter((entry) => entry.progress.isUnlocked);

  const summary = useMemo(() => {
    const unlockedCount = entries.filter((entry) => entry.progress.isUnlocked).length;
    return {
      unlockedCount,
      activeCount: Math.max(entries.length - unlockedCount, 0),
      pinnedCount: pinnedIds.length,
    };
  }, [entries, pinnedIds.length]);

  if (achievementsQuery.isLoading || pinnedQuery.isLoading || statsQuery.isLoading || followQuery.isLoading) {
    return (
      <div className="px-5 py-6 md:px-6 md:py-7">
        <LoadingStateCard />
      </div>
    );
  }

  const pageError =
    (achievementsQuery.error instanceof Error && achievementsQuery.error.message) ||
    (pinnedQuery.error instanceof Error && pinnedQuery.error.message) ||
    (statsQuery.error instanceof Error && statsQuery.error.message) ||
    (followQuery.error instanceof Error && followQuery.error.message) ||
    '';

  if (pageError) {
    return (
      <div className="px-5 py-6 md:px-6 md:py-7">
        <ErrorStateCard
          message={pageError}
          onRetry={() => {
            void achievementsQuery.refetch();
            void pinnedQuery.refetch();
            void statsQuery.refetch();
            void followQuery.refetch();
          }}
        />
      </div>
    );
  }

  function togglePin(id: string) {
    if (!manageMode) return;
    const next = pinnedIds.includes(id) ? pinnedIds.filter((item) => item !== id) : [...pinnedIds, id].slice(0, 3);
    setLocalPinnedIds(next);
    captureViewerEvent('viewer_achievement_pin_toggled', { achievementId: id, pinned: !pinnedIds.includes(id) });
    void savePinsMutation.mutate(next);
  }

  return (
    <div className="mx-auto w-[90%] max-w-[1360px] px-0 py-6 md:py-7">
      <section className="rounded-[36px] border border-[#ddd3c3] bg-[linear-gradient(180deg,rgba(255,252,247,0.96)_0%,rgba(247,242,231,0.98)_100%)] p-6 shadow-[0_24px_58px_rgba(90,70,50,0.1)] md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-[44rem]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] px-4 py-2 text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#8b7d72]">
              <Sparkles size={14} />
              {'成就展示墙'}
            </div>
            <h1 className="mt-5 text-[3rem] font-semibold tracking-[-0.04em] text-[#3d342a] md:text-[3.4rem]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
              {'成就馆'}
            </h1>
            <p className="mt-4 max-w-[40rem] text-[1rem] leading-8 text-[#6f6359]">
              {'把学习里程碑、连击节奏和社交成长陈列在同一面展示墙里。先固定你最想保留的徽章，再持续点亮下面的进度。'}
            </p>
          </div>

          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-2 rounded-[18px] px-5 py-3 text-[0.94rem] font-black shadow-[0_16px_36px_rgba(90,70,50,0.14)] transition',
              manageMode
                ? 'bg-[#5e5148] text-white hover:bg-[#4f433b]'
                : 'bg-[linear-gradient(145deg,#a8c5ac_0%,#7a9e7e_100%)] text-white hover:brightness-[1.02]',
            )}
            onClick={() => setManageMode((current) => !current)}
          >
            <Pin size={16} />
            {manageMode ? '完成整理' : '管理精选'}
          </button>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          <SummaryCard
            icon={<CheckCircle2 size={20} />}
            label="已解锁"
            value={summary.unlockedCount}
            hint="已经收入展柜、随时可以回顾的成就。"
            className="border-[#d6dfcf] bg-[linear-gradient(135deg,#edf5ec_0%,#fffdf9_78%)]"
          />
          <SummaryCard
            icon={<Clock3 size={20} />}
            label="进行中"
            value={summary.activeCount}
            hint="距离点亮只差一点，再推进一小步。"
            className="border-[#ddd3e3] bg-[linear-gradient(135deg,#f3edf7_0%,#fffdf9_78%)]"
          />
          <SummaryCard
            icon={<Trophy size={20} />}
            label="已精选"
            value={summary.pinnedCount}
            hint="顶部陈列区最多保留 3 枚你最想展示的徽章。"
            className="border-[#e7d0b3] bg-[linear-gradient(135deg,#fbf3e6_0%,#fffdf9_78%)]"
          />
        </div>

        <div className="mt-8 rounded-[30px] border border-[#ddd3c3] bg-white/78 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[2.1rem] font-semibold tracking-[-0.04em] text-[#3d342a]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{'精选展位'}</h2>
              <p className="mt-2 text-[0.92rem] font-medium text-[#7f7368]">
                {manageMode ? '当前处于精选整理模式，点击卡片即可加入或移出顶部展示区。' : '把你最想保留的 3 枚徽章放在这里，作为个人学习陈列。'}
              </p>
            </div>
            <div className="rounded-full bg-[#f3efe8] px-4 py-2 text-[0.76rem] font-black uppercase tracking-[0.16em] text-[#7f7368]">
              {selectedCategory === 'all' ? '全部类别' : `${achievementCategoryLabel(selectedCategory)}分类`}
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {featuredSlots.map((entry, index) =>
              entry ? (
                <FeaturedAchievementCard
                  key={entry.achievement.id}
                  entry={entry}
                  manageMode={manageMode}
                  onTogglePin={togglePin}
                />
              ) : (
                <FeaturedPlaceholder key={`placeholder-${index}`} manageMode={manageMode} />
              ),
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2.5">
          {ACHIEVEMENT_CATEGORY_ORDER.map((category) => (
            <button
              key={category}
              type="button"
              className={cn(
                'rounded-full px-4 py-2.5 text-[0.88rem] font-black transition',
                selectedCategory === category
                  ? 'bg-[linear-gradient(145deg,#a8c5ac_0%,#7a9e7e_100%)] text-white shadow-[0_12px_26px_rgba(122,158,126,0.22)]'
                  : 'border border-[#ddd3c3] bg-white text-[#7f7368] hover:border-[#cdbfaf] hover:text-[#5f544b]',
              )}
              onClick={() => setSelectedCategory(category)}
            >
              {category === 'all' ? '全部' : achievementCategoryLabel(category)}
            </button>
          ))}
        </div>

        <div className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[1.9rem] font-black tracking-[-0.05em] text-[#1d2638]">{'进行中成就'}</h2>
              <p className="mt-2 text-[0.92rem] font-medium text-[#7c8ba6]">
                {'优先点亮最接近完成的目标，让展示墙更快变得丰富。'}
              </p>
            </div>
            <div className="text-[0.82rem] font-black uppercase tracking-[0.16em] text-[#9aa7bd]">
              {`${inProgressEntries.length} 项待完成`}
            </div>
          </div>

          {inProgressEntries.length === 0 ? (
            <div className="mt-5 rounded-[26px] border border-dashed border-[#ccd7e8] bg-[#fbfdff] px-6 py-10 text-center text-[0.98rem] font-semibold text-[#93a1b8]">
              {'当前筛选下没有进行中的成就，试试切换分类，或继续学习去解锁新的目标。'}
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {inProgressEntries.map((entry) => (
                <ProgressAchievementCard
                  key={entry.achievement.id}
                  entry={entry}
                  manageMode={manageMode}
                  onTogglePin={togglePin}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[1.9rem] font-black tracking-[-0.05em] text-[#1d2638]">{'已解锁藏品'}</h2>
              <p className="mt-2 text-[0.92rem] font-medium text-[#7c8ba6]">
                {'已经完成的徽章会沉淀在这里，成为你持续学习留下的纪念。'}
              </p>
            </div>
            <div className="text-[0.82rem] font-black uppercase tracking-[0.16em] text-[#9aa7bd]">
              {`${unlockedEntries.length} 项已收入`}
            </div>
          </div>

          {unlockedEntries.length === 0 ? (
            <div className="mt-5 rounded-[26px] border border-dashed border-[#ccd7e8] bg-[#fbfdff] px-6 py-10 text-center text-[0.98rem] font-semibold text-[#93a1b8]">
              {'还没有已解锁成就，先从一门课程或一次连击开始。'}
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {unlockedEntries.map((entry) => (
                <UnlockedAchievementCard
                  key={entry.achievement.id}
                  entry={entry}
                  manageMode={manageMode}
                  onTogglePin={togglePin}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
