import type { ViewerAchievement, ViewerFollowCounts, ViewerStats } from '@/shared/api/viewer/types';

type AchievementMetric =
  | 'streak'
  | 'lessonsCompleted'
  | 'coursesCompleted'
  | 'totalXp'
  | 'following'
  | 'followers'
  | 'binary';

type AchievementPresentation = {
  slug: string;
  name: string;
  assetPath: string;
  description: string;
  category: string;
  progressMetric: AchievementMetric;
  target: number;
};

type ProgressView = {
  current: number;
  target: number;
  ratio: number;
  requirement: string;
  isUnlocked: boolean;
  counterLabel: string;
};

const ASSET_ROOT = '/achievements';

export const ACHIEVEMENT_CATEGORY_ORDER = ['all', 'learning', 'streak', 'challenge', 'social'] as const;

const PRESENTATIONS: AchievementPresentation[] = [
  {
    slug: 'followers_10',
    name: '社交蝴蝶',
    assetPath: `${ASSET_ROOT}/social_butterfly.png`,
    description: '关注 10 位学习者、导师或互助伙伴。',
    category: 'social',
    progressMetric: 'following',
    target: 10,
  },
  {
    slug: 'xp_100',
    name: 'XP 猎手',
    assetPath: `${ASSET_ROOT}/xp_hunter.png`,
    description: '在学习旅程中累计获得 100 点经验值。',
    category: 'learning',
    progressMetric: 'totalXp',
    target: 100,
  },
  {
    slug: 'courses_5',
    name: '征服者',
    assetPath: `${ASSET_ROOT}/conqueror.png`,
    description: '完整完成 5 门课程。',
    category: 'learning',
    progressMetric: 'coursesCompleted',
    target: 5,
  },
  {
    slug: 'streak_7',
    name: '热力连击',
    assetPath: `${ASSET_ROOT}/hot_streak.png`,
    description: '连续 7 天保持学习节奏。',
    category: 'streak',
    progressMetric: 'streak',
    target: 7,
  },
  {
    slug: 'lessons_100',
    name: '深潜者',
    assetPath: `${ASSET_ROOT}/deep_diver.png`,
    description: '累计完成 100 节课程内容。',
    category: 'learning',
    progressMetric: 'lessonsCompleted',
    target: 100,
  },
  {
    slug: 'perfect_lesson',
    name: '满分通关',
    assetPath: `${ASSET_ROOT}/perfect_score.png`,
    description: '在一节课程或一次测验中拿到满分。',
    category: 'challenge',
    progressMetric: 'binary',
    target: 1,
  },
  {
    slug: 'multi_subject',
    name: '博学者',
    assetPath: `${ASSET_ROOT}/polymath.png`,
    description: '完成 3 个不同学科方向的课程。',
    category: 'learning',
    progressMetric: 'coursesCompleted',
    target: 3,
  },
  {
    slug: 'speed_lesson',
    name: '夜航学霸',
    assetPath: `${ASSET_ROOT}/night_owl.png`,
    description: '在深夜学习时段完成一次课程学习。',
    category: 'challenge',
    progressMetric: 'binary',
    target: 1,
  },
  {
    slug: 'social_follow',
    name: '学习搭子',
    assetPath: `${ASSET_ROOT}/study_buddy.png`,
    description: '关注你的第一位学习伙伴。',
    category: 'social',
    progressMetric: 'following',
    target: 1,
  },
  {
    slug: 'courses_50',
    name: '引路人',
    assetPath: `${ASSET_ROOT}/the_mentor.png`,
    description: '收获至少 1 位关注你的学习者。',
    category: 'social',
    progressMetric: 'followers',
    target: 1,
  },
  {
    slug: 'first_follow',
    name: '初次连线',
    assetPath: `${ASSET_ROOT}/first_handshake.png`,
    description: '建立你的第一条学习社交连接。',
    category: 'social',
    progressMetric: 'following',
    target: 1,
  },
  {
    slug: 'streak_30',
    name: '钢铁意志',
    assetPath: `${ASSET_ROOT}/collaborator.png`,
    description: '连续 30 天保持每日学习。',
    category: 'streak',
    progressMetric: 'streak',
    target: 30,
  },
  {
    slug: 'first_lesson',
    name: '重新上路',
    assetPath: `${ASSET_ROOT}/back_on_the_saddle.png`,
    description: '完成你的第一节课程内容。',
    category: 'learning',
    progressMetric: 'lessonsCompleted',
    target: 1,
  },
  {
    slug: 'daily_tasks_30',
    name: '清晨节奏',
    assetPath: `${ASSET_ROOT}/early_bird.png`,
    description: '建立连续 5 天的晨间学习节奏。',
    category: 'streak',
    progressMetric: 'streak',
    target: 5,
  },
  {
    slug: 'first_course',
    name: '第一门课程',
    assetPath: `${ASSET_ROOT}/feedback_loop.png`,
    description: '完整完成你的第一门课程。',
    category: 'learning',
    progressMetric: 'coursesCompleted',
    target: 1,
  },
  {
    slug: 'xp_500',
    name: '超额完成者',
    assetPath: `${ASSET_ROOT}/overachiever.png`,
    description: '累计获得 500 点经验值。',
    category: 'challenge',
    progressMetric: 'totalXp',
    target: 500,
  },
];

const PRESENTATION_BY_SLUG = new Map(PRESENTATIONS.map((presentation) => [presentation.slug, presentation]));

const SLUG_ALIASES: Record<string, string> = {
  'week-streak': 'streak_7',
  week_streak: 'streak_7',
  'first-course': 'first_course',
};

function normalizeSlug(rawSlug: string) {
  const normalized = rawSlug.trim().toLowerCase().replace(/-/g, '_');
  return SLUG_ALIASES[normalized] ?? normalized;
}

function normalizeCategory(category: string) {
  const normalized = category.trim().toLowerCase();
  if (normalized.includes('streak')) return 'streak';
  if (normalized.includes('challenge')) return 'challenge';
  if (normalized.includes('social')) return 'social';
  return 'learning';
}

export function achievementPresentation(achievement: ViewerAchievement) {
  return PRESENTATION_BY_SLUG.get(normalizeSlug(achievement.slug));
}

export function achievementSortIndex(achievement: ViewerAchievement) {
  const slug = normalizeSlug(achievement.slug);
  const index = PRESENTATIONS.findIndex((presentation) => presentation.slug === slug);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function achievementDisplayName(achievement: ViewerAchievement) {
  return achievementPresentation(achievement)?.name || achievement.name.trim() || '未命名成就';
}

export function achievementDisplayDescription(achievement: ViewerAchievement) {
  return achievementPresentation(achievement)?.description || achievement.description.trim() || '完成对应学习目标即可解锁。';
}

export function achievementDisplayCategory(achievement: ViewerAchievement) {
  return achievementPresentation(achievement)?.category || normalizeCategory(achievement.category);
}

export function achievementCategoryLabel(category: string) {
  switch (normalizeCategory(category)) {
    case 'streak':
      return '连击';
    case 'challenge':
      return '挑战';
    case 'social':
      return '社交';
    default:
      return '学习';
  }
}

export function achievementStatusLabel(isUnlocked: boolean) {
  return isUnlocked ? '已解锁' : '进行中';
}

export function achievementPinnedLabel() {
  return '已精选';
}

export function achievementBadgeAssetPath(achievement: ViewerAchievement) {
  const presentation = achievementPresentation(achievement);
  if (presentation) {
    return presentation.assetPath;
  }

  switch (achievementDisplayCategory(achievement)) {
    case 'streak':
      return `${ASSET_ROOT}/category_streak.png`;
    case 'challenge':
      return `${ASSET_ROOT}/category_challenge.png`;
    case 'social':
      return `${ASSET_ROOT}/category_social.png`;
    default:
      return `${ASSET_ROOT}/category_learning.png`;
  }
}

export function usesCuratedAchievementBadge(achievement: ViewerAchievement) {
  return Boolean(achievementPresentation(achievement));
}

export function achievementProgress(
  achievement: ViewerAchievement,
  stats: ViewerStats | undefined,
  followCounts: ViewerFollowCounts | undefined,
): ProgressView {
  const presentation = achievementPresentation(achievement);
  const streak = Number(stats?.current_streak ?? 0);
  const lessonsCompleted = Number(stats?.lessons_completed ?? 0);
  const coursesCompleted = Number(stats?.courses_completed ?? 0);
  const totalXp = Number(stats?.total_xp ?? 0);
  const following = Number(followCounts?.following ?? 0);
  const followers = Number(followCounts?.followers ?? 0);

  const presentationTarget = presentation?.target ?? 1;
  let current = achievement.earned_at ? presentationTarget : 0;
  let target = presentationTarget;

  switch (presentation?.progressMetric ?? normalizeSlug(achievement.slug)) {
    case 'streak':
    case 'streak_3':
      current = streak;
      target = presentation?.target ?? 3;
      break;
    case 'streak_7':
      current = streak;
      target = 7;
      break;
    case 'streak_30':
      current = streak;
      target = 30;
      break;
    case 'streak_100':
      current = streak;
      target = 100;
      break;
    case 'lessonsCompleted':
    case 'first_lesson':
      current = lessonsCompleted;
      target = presentation?.target ?? 1;
      break;
    case 'lessons_100':
      current = lessonsCompleted;
      target = 100;
      break;
    case 'coursesCompleted':
    case 'first_course':
      current = coursesCompleted;
      target = presentation?.target ?? 1;
      break;
    case 'courses_5':
      current = coursesCompleted;
      target = 5;
      break;
    case 'courses_50':
      current = coursesCompleted;
      target = 50;
      break;
    case 'multi_subject':
      current = coursesCompleted;
      target = 3;
      break;
    case 'totalXp':
    case 'xp_100':
      current = totalXp;
      target = presentation?.target ?? 100;
      break;
    case 'xp_500':
      current = totalXp;
      target = 500;
      break;
    case 'following':
    case 'first_follow':
    case 'social_follow':
      current = following;
      target = presentation?.target ?? 1;
      break;
    case 'followers':
    case 'followers_10':
      current = followers;
      target = presentation?.target ?? 10;
      break;
    case 'binary':
      current = achievement.earned_at ? 1 : 0;
      target = 1;
      break;
    default:
      current = achievement.earned_at ? 1 : 0;
      target = 1;
      break;
  }

  if (achievement.earned_at && current < target) {
    current = target;
  }

  const safeCurrent = Math.max(0, Math.min(current, target));
  const ratio = target <= 0 ? 0 : Math.max(0, Math.min(safeCurrent / target, 1));
  const requirement = achievementDisplayDescription(achievement);
  const isUnlocked = Boolean(achievement.earned_at) || safeCurrent >= target;

  return {
    current: safeCurrent,
    target,
    ratio,
    requirement,
    isUnlocked,
    counterLabel: `${safeCurrent}/${target}`,
  };
}
