import type {
  ViewerAchievement,
  ViewerFollowCounts,
  ViewerProfile,
  ViewerStats,
} from '@/shared/api/viewer/types';
import { supabase } from '@/shared/api/supabase';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { loadFixtureStore } from '@/shared/api/viewer/fixtureLoader';

export async function fetchViewerProfile(userId: string): Promise<ViewerProfile> {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return readFixtureState().profile;
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    throw error;
  }
  return {
    id: String(data?.id ?? userId),
    username: String(data?.username ?? ''),
    bio: String(data?.bio ?? ''),
    avatar_url: String(data?.avatar_url ?? ''),
    cover_image_url: String(data?.cover_image_url ?? ''),
    role: String(data?.role ?? 'user'),
    created_at: String(data?.created_at ?? ''),
    pinned_achievement_ids: Array.isArray(data?.pinned_achievement_ids)
      ? data.pinned_achievement_ids.map((value: unknown) => String(value))
      : [],
  };
}

export async function updateProfile(userId: string, payload: Partial<ViewerProfile>) {
  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    patchFixtureState((state) => ({
      ...state,
      profile: {
        ...state.profile,
        ...payload,
        id: userId,
        pinned_achievement_ids: Array.isArray(payload.pinned_achievement_ids)
          ? payload.pinned_achievement_ids.slice(0, 3)
          : state.profile.pinned_achievement_ids,
      },
    }));
    return { ok: true };
  }

  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  return { ok: !error, error };
}

export async function fetchAchievements(userId?: string): Promise<ViewerAchievement[]> {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return [...readFixtureState().achievements];
  }

  const { data: all, error: allError } = await supabase
    .from('achievements')
    .select('id, slug, name, description, category, rarity')
    .order('rarity', { ascending: true });
  if (allError) {
    throw allError;
  }

  if (!userId) {
    return (all ?? []).map((achievement) => ({
      id: String(achievement.id ?? ''),
      slug: String(achievement.slug ?? ''),
      name: String(achievement.name ?? ''),
      description: String(achievement.description ?? ''),
      category: String(achievement.category ?? ''),
      rarity: String(achievement.rarity ?? 'common'),
      earned_at: null,
    }));
  }

  const { data: earned, error: earnedError } = await supabase
    .from('user_achievements')
    .select('achievement_id, earned_at')
    .eq('user_id', userId);
  if (earnedError) {
    throw earnedError;
  }

  const earnedMap = new Map((earned ?? []).map((row) => [String(row.achievement_id), String(row.earned_at)]));
  return (all ?? []).map((achievement) => ({
    id: String(achievement.id ?? ''),
    slug: String(achievement.slug ?? ''),
    name: String(achievement.name ?? ''),
    description: String(achievement.description ?? ''),
    category: String(achievement.category ?? ''),
    rarity: String(achievement.rarity ?? 'common'),
    earned_at: earnedMap.get(String(achievement.id)) ?? null,
  }));
}

export async function fetchPinnedAchievementIds(userId?: string) {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return [...readFixtureState().profile.pinned_achievement_ids];
  }
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('pinned_achievement_ids')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return Array.isArray(data?.pinned_achievement_ids)
    ? data.pinned_achievement_ids.map((value) => String(value))
    : [];
}

export async function savePinnedAchievementIds(userId: string, ids: string[]) {
  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    patchFixtureState((state) => ({
      ...state,
      profile: { ...state.profile, id: userId, pinned_achievement_ids: ids.slice(0, 3) },
    }));
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ pinned_achievement_ids: ids.slice(0, 3) })
    .eq('id', userId);
  if (error) {
    throw error;
  }
}

export async function fetchUserStats(userId?: string): Promise<ViewerStats> {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return readFixtureState().stats;
  }
  if (!userId) {
    return {
      current_streak: 0,
      longest_streak: 0,
      courses_completed: 0,
      lessons_completed: 0,
      total_xp: 0,
      total_study_minutes: 0,
      last_activity_date: null,
    };
  }

  const [{ data: statsData, error: statsError }, { data: lessonRows, error: lessonError }] = await Promise.all([
    supabase
      .from('user_stats')
      .select('current_streak, longest_streak, courses_completed, lessons_completed, total_xp, last_activity_date')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('lesson_completions').select('time_spent_seconds').eq('user_id', userId),
  ]);

  if (statsError) {
    throw statsError;
  }
  if (lessonError) {
    throw lessonError;
  }

  const totalStudyMinutes = (lessonRows ?? []).reduce(
    (total, row) => total + Math.round(Number(row.time_spent_seconds ?? 0) / 60),
    0,
  );

  return {
    current_streak: Number(statsData?.current_streak ?? 0),
    longest_streak: Number(statsData?.longest_streak ?? 0),
    courses_completed: Number(statsData?.courses_completed ?? 0),
    lessons_completed: Number(statsData?.lessons_completed ?? 0),
    total_xp: Number(statsData?.total_xp ?? 0),
    total_study_minutes: totalStudyMinutes,
    last_activity_date: typeof statsData?.last_activity_date === 'string' ? statsData.last_activity_date : null,
  };
}

export async function fetchFollowCounts(userId?: string): Promise<ViewerFollowCounts> {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return readFixtureState().followCounts;
  }
  if (!userId) {
    return { following: 0, followers: 0 };
  }

  const [{ data: following, error: followingError }, { data: followers, error: followersError }] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', userId),
    supabase.from('follows').select('follower_id').eq('following_id', userId),
  ]);

  if (followingError) {
    throw followingError;
  }
  if (followersError) {
    throw followersError;
  }

  return {
    following: following?.length ?? 0,
    followers: followers?.length ?? 0,
  };
}

export async function fetchDailyXpHistory(userId?: string) {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return new Map(readFixtureState().xpHistory.map((entry) => [entry.date, entry.xp]));
  }
  if (!userId) {
    return new Map<string, number>();
  }

  const { data, error } = await supabase
    .from('xp_transactions')
    .select('amount, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(90);
  if (error) {
    throw error;
  }

  const byDate = new Map<string, number>();
  for (const row of data ?? []) {
    const key = String(row.created_at).slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + Number(row.amount ?? 0));
  }
  return byDate;
}
