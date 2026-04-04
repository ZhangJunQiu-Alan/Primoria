import { demoProfile, type DemoProfile } from '@/shared/data/demoViewerData';
import { getDemoRole } from '@/shared/utils/demoMode';

const DEMO_PROFILE_STORAGE_KEY = 'primoria.viewer.demo-profile';

function cloneProfile(profile: DemoProfile): DemoProfile {
  return {
    ...profile,
    pinned_achievement_ids: [...profile.pinned_achievement_ids],
  };
}

export function readDemoProfile(): DemoProfile {
  const baseProfile = cloneProfile(demoProfile);
  const role = getDemoRole();

  if (typeof window === 'undefined') {
    return role ? { ...baseProfile, role } : baseProfile;
  }

  try {
    const raw = window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEY);
    if (!raw) {
      return role ? { ...baseProfile, role } : baseProfile;
    }

    const parsed = JSON.parse(raw) as Partial<DemoProfile>;
    return {
      ...baseProfile,
      ...parsed,
      role: role ?? parsed.role ?? baseProfile.role,
      pinned_achievement_ids: Array.isArray(parsed.pinned_achievement_ids)
        ? parsed.pinned_achievement_ids.filter((item): item is string => typeof item === 'string')
        : [...baseProfile.pinned_achievement_ids],
    };
  } catch {
    return role ? { ...baseProfile, role } : baseProfile;
  }
}

export function persistDemoProfilePatch(patch: Partial<DemoProfile>) {
  if (typeof window === 'undefined') {
    return;
  }

  const current = readDemoProfile();
  const next: DemoProfile = {
    ...current,
    ...patch,
    pinned_achievement_ids: Array.isArray(patch.pinned_achievement_ids)
      ? patch.pinned_achievement_ids.slice(0, 3)
      : current.pinned_achievement_ids,
  };

  window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEY, JSON.stringify(next));
}
