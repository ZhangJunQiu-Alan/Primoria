import { DEFAULT_VIEWER_LANGUAGE, normalizeViewerLanguage, type ViewerLanguage } from '@/shared/i18n/locale';
import type { ViewerAchievement, ViewerFollowCounts, ViewerStats } from '@/shared/api/viewer/types';
import { publicAssetPath } from '@/shared/utils/publicAsset';

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
  name: Record<ViewerLanguage, string>;
  assetPath: string;
  description: Record<ViewerLanguage, string>;
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

const ASSET_ROOT = publicAssetPath('achievements');

export const ACHIEVEMENT_CATEGORY_ORDER = ['all', 'learning', 'streak', 'challenge', 'social'] as const;

const PRESENTATIONS: AchievementPresentation[] = [
  {
    slug: 'followers_10',
    name: { 'zh-CN': '社交蝴蝶', en: 'Social Butterfly' },
    assetPath: `${ASSET_ROOT}/social_butterfly.png`,
    description: {
      'zh-CN': '关注 10 位学习者、导师或互助伙伴。',
      en: 'Follow 10 learners, mentors, or study partners.',
    },
    category: 'social',
    progressMetric: 'following',
    target: 10,
  },
  {
    slug: 'xp_100',
    name: { 'zh-CN': 'XP 猎手', en: 'XP Hunter' },
    assetPath: `${ASSET_ROOT}/xp_hunter.png`,
    description: {
      'zh-CN': '在学习旅程中累计获得 100 点经验值。',
      en: 'Earn 100 total XP on your learning journey.',
    },
    category: 'learning',
    progressMetric: 'totalXp',
    target: 100,
  },
  {
    slug: 'courses_5',
    name: { 'zh-CN': '征服者', en: 'Conqueror' },
    assetPath: `${ASSET_ROOT}/conqueror.png`,
    description: {
      'zh-CN': '完整完成 5 门课程。',
      en: 'Fully complete 5 courses.',
    },
    category: 'learning',
    progressMetric: 'coursesCompleted',
    target: 5,
  },
  {
    slug: 'streak_7',
    name: { 'zh-CN': '热力连击', en: 'Hot Streak' },
    assetPath: `${ASSET_ROOT}/hot_streak.png`,
    description: {
      'zh-CN': '连续 7 天保持学习节奏。',
      en: 'Keep your learning rhythm going for 7 days in a row.',
    },
    category: 'streak',
    progressMetric: 'streak',
    target: 7,
  },
  {
    slug: 'lessons_100',
    name: { 'zh-CN': '深潜者', en: 'Deep Diver' },
    assetPath: `${ASSET_ROOT}/deep_diver.png`,
    description: {
      'zh-CN': '累计完成 100 节课程内容。',
      en: 'Complete 100 lesson segments.',
    },
    category: 'learning',
    progressMetric: 'lessonsCompleted',
    target: 100,
  },
  {
    slug: 'perfect_lesson',
    name: { 'zh-CN': '满分通关', en: 'Perfect Score' },
    assetPath: `${ASSET_ROOT}/perfect_score.png`,
    description: {
      'zh-CN': '在一节课程或一次测验中拿到满分。',
      en: 'Earn a perfect score in a lesson or quiz.',
    },
    category: 'challenge',
    progressMetric: 'binary',
    target: 1,
  },
  {
    slug: 'multi_subject',
    name: { 'zh-CN': '博学者', en: 'Polymath' },
    assetPath: `${ASSET_ROOT}/polymath.png`,
    description: {
      'zh-CN': '完成 3 个不同学科方向的课程。',
      en: 'Complete courses across 3 different subjects.',
    },
    category: 'learning',
    progressMetric: 'coursesCompleted',
    target: 3,
  },
  {
    slug: 'speed_lesson',
    name: { 'zh-CN': '夜航学霸', en: 'Night Owl Scholar' },
    assetPath: `${ASSET_ROOT}/night_owl.png`,
    description: {
      'zh-CN': '在深夜学习时段完成一次课程学习。',
      en: 'Complete a lesson during a late-night study session.',
    },
    category: 'challenge',
    progressMetric: 'binary',
    target: 1,
  },
  {
    slug: 'social_follow',
    name: { 'zh-CN': '学习搭子', en: 'Study Buddy' },
    assetPath: `${ASSET_ROOT}/study_buddy.png`,
    description: {
      'zh-CN': '关注你的第一位学习伙伴。',
      en: 'Follow your first study partner.',
    },
    category: 'social',
    progressMetric: 'following',
    target: 1,
  },
  {
    slug: 'courses_50',
    name: { 'zh-CN': '引路人', en: 'Mentor Signal' },
    assetPath: `${ASSET_ROOT}/the_mentor.png`,
    description: {
      'zh-CN': '收获至少 1 位关注你的学习者。',
      en: 'Gain at least 1 learner follower.',
    },
    category: 'social',
    progressMetric: 'followers',
    target: 1,
  },
  {
    slug: 'first_follow',
    name: { 'zh-CN': '初次连线', en: 'First Connection' },
    assetPath: `${ASSET_ROOT}/first_handshake.png`,
    description: {
      'zh-CN': '建立你的第一条学习社交连接。',
      en: 'Create your first social learning connection.',
    },
    category: 'social',
    progressMetric: 'following',
    target: 1,
  },
  {
    slug: 'streak_30',
    name: { 'zh-CN': '钢铁意志', en: 'Iron Will' },
    assetPath: `${ASSET_ROOT}/collaborator.png`,
    description: {
      'zh-CN': '连续 30 天保持每日学习。',
      en: 'Keep up daily learning for 30 straight days.',
    },
    category: 'streak',
    progressMetric: 'streak',
    target: 30,
  },
  {
    slug: 'first_lesson',
    name: { 'zh-CN': '重新上路', en: 'Back on Track' },
    assetPath: `${ASSET_ROOT}/back_on_the_saddle.png`,
    description: {
      'zh-CN': '完成你的第一节课程内容。',
      en: 'Complete your first lesson segment.',
    },
    category: 'learning',
    progressMetric: 'lessonsCompleted',
    target: 1,
  },
  {
    slug: 'daily_tasks_30',
    name: { 'zh-CN': '清晨节奏', en: 'Early Bird' },
    assetPath: `${ASSET_ROOT}/early_bird.png`,
    description: {
      'zh-CN': '建立连续 5 天的晨间学习节奏。',
      en: 'Build a 5-day morning study rhythm.',
    },
    category: 'streak',
    progressMetric: 'streak',
    target: 5,
  },
  {
    slug: 'first_course',
    name: { 'zh-CN': '第一门课程', en: 'First Course' },
    assetPath: `${ASSET_ROOT}/feedback_loop.png`,
    description: {
      'zh-CN': '完整完成你的第一门课程。',
      en: 'Fully complete your first course.',
    },
    category: 'learning',
    progressMetric: 'coursesCompleted',
    target: 1,
  },
  {
    slug: 'xp_500',
    name: { 'zh-CN': '超额完成者', en: 'Overachiever' },
    assetPath: `${ASSET_ROOT}/overachiever.png`,
    description: {
      'zh-CN': '累计获得 500 点经验值。',
      en: 'Earn 500 total XP.',
    },
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

function resolveAchievementLanguage(language?: ViewerLanguage): ViewerLanguage {
  if (language) {
    return language;
  }
  if (typeof document !== 'undefined') {
    return normalizeViewerLanguage(document.documentElement.lang);
  }
  return DEFAULT_VIEWER_LANGUAGE;
}

export function achievementPresentation(achievement: ViewerAchievement) {
  return PRESENTATION_BY_SLUG.get(normalizeSlug(achievement.slug));
}

export function achievementSortIndex(achievement: ViewerAchievement) {
  const slug = normalizeSlug(achievement.slug);
  const index = PRESENTATIONS.findIndex((presentation) => presentation.slug === slug);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function achievementDisplayName(achievement: ViewerAchievement, language?: ViewerLanguage) {
  const resolvedLanguage = resolveAchievementLanguage(language);
  return (
    achievementPresentation(achievement)?.name[resolvedLanguage]
    || achievement.name.trim()
    || (resolvedLanguage === 'zh-CN' ? '未命名成就' : 'Untitled achievement')
  );
}

export function achievementDisplayDescription(achievement: ViewerAchievement, language?: ViewerLanguage) {
  const resolvedLanguage = resolveAchievementLanguage(language);
  return (
    achievementPresentation(achievement)?.description[resolvedLanguage]
    || achievement.description.trim()
    || (resolvedLanguage === 'zh-CN'
      ? '完成对应学习目标即可解锁。'
      : 'Complete the matching learning goal to unlock this achievement.')
  );
}

export function achievementDisplayCategory(achievement: ViewerAchievement) {
  return achievementPresentation(achievement)?.category || normalizeCategory(achievement.category);
}

export function achievementCategoryLabel(category: string, language?: ViewerLanguage) {
  const resolvedLanguage = resolveAchievementLanguage(language);
  switch (normalizeCategory(category)) {
    case 'streak':
      return resolvedLanguage === 'zh-CN' ? '连击' : 'Streak';
    case 'challenge':
      return resolvedLanguage === 'zh-CN' ? '挑战' : 'Challenge';
    case 'social':
      return resolvedLanguage === 'zh-CN' ? '社交' : 'Social';
    default:
      return resolvedLanguage === 'zh-CN' ? '学习' : 'Learning';
  }
}

export function achievementStatusLabel(isUnlocked: boolean, language?: ViewerLanguage) {
  const resolvedLanguage = resolveAchievementLanguage(language);
  if (resolvedLanguage === 'zh-CN') {
    return isUnlocked ? '已解锁' : '进行中';
  }
  return isUnlocked ? 'Unlocked' : 'In progress';
}

export function achievementPinnedLabel(language?: ViewerLanguage) {
  return resolveAchievementLanguage(language) === 'zh-CN' ? '已精选' : 'Pinned';
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
  language?: ViewerLanguage,
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
  const requirement = achievementDisplayDescription(achievement, language);
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
