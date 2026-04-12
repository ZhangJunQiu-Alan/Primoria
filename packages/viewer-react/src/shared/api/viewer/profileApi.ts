import type {
  ViewerAchievement,
  ViewerFollowCounts,
  ViewerProfile,
  ViewerStats,
} from '@/shared/api/viewer/types';
import { fetchAgentJson } from '@/shared/api/agentService';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { loadFixtureStore } from '@/shared/api/viewer/fixtureLoader';

export async function fetchViewerProfile(userId: string): Promise<ViewerProfile> {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return readFixtureState().profile;
  }
  const data = await fetchAgentJson<Partial<ViewerProfile>>('/v1/viewer/profile');
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
  return fetchAgentJson<{ ok: boolean }>('/v1/viewer/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchAchievements(userId?: string): Promise<ViewerAchievement[]> {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return [...readFixtureState().achievements];
  }
  if (!userId) {
    return [];
  }
  const payload = await fetchAgentJson<{ achievements: ViewerAchievement[] }>('/v1/viewer/profile/achievements');
  return payload.achievements ?? [];
}

export async function fetchPinnedAchievementIds(userId?: string) {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return [...readFixtureState().profile.pinned_achievement_ids];
  }
  if (!userId) {
    return [];
  }
  const data = await fetchAgentJson<Partial<ViewerProfile>>('/v1/viewer/profile');
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
  await fetchAgentJson('/v1/viewer/profile', {
    method: 'PATCH',
    body: JSON.stringify({ pinned_achievement_ids: ids.slice(0, 3) }),
  });
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
  return fetchAgentJson<ViewerStats>('/v1/viewer/profile/stats');
}

export async function fetchFollowCounts(userId?: string): Promise<ViewerFollowCounts> {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return readFixtureState().followCounts;
  }
  if (!userId) {
    return { following: 0, followers: 0 };
  }
  return fetchAgentJson<ViewerFollowCounts>('/v1/viewer/profile/follows');
}

export async function fetchDailyXpHistory(userId?: string) {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return new Map(readFixtureState().xpHistory.map((entry) => [entry.date, entry.xp]));
  }
  if (!userId) {
    return new Map<string, number>();
  }
  const payload = await fetchAgentJson<{ entries: Array<{ amount: number; created_at: string }> }>('/v1/viewer/profile/xp-history');
  const byDate = new Map<string, number>();
  for (const row of payload.entries ?? []) {
    const key = String(row.created_at).slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + Number(row.amount ?? 0));
  }
  return byDate;
}
